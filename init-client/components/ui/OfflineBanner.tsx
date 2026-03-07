// components/ui/OfflineBanner.tsx
import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface OfflineBannerProps {
  isConnected: boolean;
}

export function OfflineBanner({ isConnected }: OfflineBannerProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const [visible, setVisible] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const wasDisconnected = useRef(false);
  const hasEverConnected = useRef(false);

  useEffect(() => {
    if (isConnected) {
      hasEverConnected.current = true;

      if (wasDisconnected.current) {
        // Was disconnected, now reconnected — show success briefly
        setShowReconnected(true);
        setTimeout(() => {
          Animated.timing(slideAnim, { toValue: -100, duration: 300, useNativeDriver: true }).start(() => {
            setVisible(false);
            setShowReconnected(false);
            wasDisconnected.current = false;
          });
        }, 2000);
      }
    } else {
      // Only show "no connection" if we had connected before (avoids initial false positive)
      if (!hasEverConnected.current) return;

      wasDisconnected.current = true;
      setVisible(true);
      setShowReconnected(false);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
    }
  }, [isConnected]);

  if (!visible) return null;

  const bgColor = showReconnected ? '#22C55E' : theme.colors.destructive;

  return (
    <Animated.View style={[styles.banner, { backgroundColor: bgColor, paddingTop: insets.top + 4, transform: [{ translateY: slideAnim }] }]}>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 6,
    paddingHorizontal: 12,
  },
  text: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
