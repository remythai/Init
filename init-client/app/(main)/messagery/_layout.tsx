import { Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

export default function MessageryLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: theme.colors.card },
      }}
    >
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}