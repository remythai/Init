// components/auth/AuthError.tsx
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/context/ThemeContext';

interface AuthErrorProps {
  message: string;
}

export function AuthError({ message }: AuthErrorProps) {
  const { theme } = useTheme();

  if (!message) return null;

  const styles = StyleSheet.create({
    errorContainer: {
      backgroundColor: theme.colors.destructive,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    errorText: {
      color: theme.colors.destructiveForeground,
      fontSize: theme.fontSizes.sm,
    },
  });

  return (
    <View style={styles.errorContainer}>
      <ThemedText style={styles.errorText}>{message}</ThemedText>
    </View>
  );
}
