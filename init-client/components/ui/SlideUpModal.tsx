import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface SlideUpModalProps {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
  overlayColor?: string;
  position?: 'bottom' | 'center';
  fullScreen?: boolean;
  dismissOnOverlay?: boolean;
}

export function SlideUpModal({
  visible,
  onRequestClose,
  children,
  overlayColor = 'rgba(0,0,0,0.5)',
  position = 'bottom',
  fullScreen = false,
  dismissOnOverlay = true,
}: SlideUpModalProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
    }
  }, [visible]);

  if (fullScreen) {
    return (
      <Modal visible={visible} animationType="none" transparent={false} statusBarTranslucent onRequestClose={onRequestClose}>
        <Animated.View style={[styles.fullScreen, { transform: [{ translateY: slideAnim }] }]}>
          {children}
        </Animated.View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent onRequestClose={onRequestClose}>
      <View style={[styles.overlay, { backgroundColor: overlayColor, justifyContent: position === 'center' ? 'center' : 'flex-end' }]}>
        {dismissOnOverlay && <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} />}
        <Animated.View style={{ width: '100%', transform: [{ translateY: slideAnim }] }}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
  },
  fullScreen: {
    flex: 1,
  },
});
