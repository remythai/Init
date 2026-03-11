import { useTheme } from '@/context/ThemeContext';
import { Stack } from 'expo-router';

export default function OrgaLayout() {
  const { theme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
