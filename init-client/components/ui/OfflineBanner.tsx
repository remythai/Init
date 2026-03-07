// components/ui/OfflineBanner.tsx
import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface OfflineBannerProps {
  isConnected: boolean;
}

export function OfflineBanner({ isConnected }: OfflineBannerProps) {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const [visible, setVisible] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const wasDisconnected = useRef(false);

  useEffect(() => {
    if (!isConnected) {
      wasDisconnected.current = true;
      setVisible(true);
      setShowReconnected(false);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
    } else if (wasDisconnected.current) {
      setShowReconnected(true);
      setTimeout(() => {
        Animated.timing(slideAnim, { toValue: -50, duration: 300, useNativeDriver: true }).start(() => {
          setVisible(false);
          setShowReconnected(false);
          wasDisconnected.current = false;
        });
      }, 2000);
    }
  }, [isConnected]);

  if (!visible) return null;

  const bgColor = showReconnected ? '#22C55E' : theme.colors.destructive;

  return (
    <Animated.View style={[styles.banner, { backgroundColor: bgColor, transform: [{ translateY: slideAnim }] }]}>
      <MaterialIcons
        name={showReconnected ? 'wifi' : 'wifi-off'}
        size={16}
        color="#FFF"
      />
      <Text style={styles.text}>
        {showReconnected ? 'Connexion rétablie' : 'Pas de connexion'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  text: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
