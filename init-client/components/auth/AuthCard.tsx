import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface AuthCardProps {
  children: React.ReactNode;
}

export function AuthCard({ children }: AuthCardProps) {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
  });

  return <View style={styles.card}>{children}</View>;
}
