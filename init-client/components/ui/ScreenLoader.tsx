import { useTheme } from '@/context/ThemeContext';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

interface ScreenLoaderProps {
  color?: string;
}

export function ScreenLoader({ color }: ScreenLoaderProps) {
  const { theme } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={color ?? theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
