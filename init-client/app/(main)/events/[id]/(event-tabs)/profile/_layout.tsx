//app/(main)/events/[id]/(event-tabs)/profile/_layout.tsx
import { Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

export default function EventProfileLayout() {
  const { theme } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: theme.colors.background } }} />
  );
}
