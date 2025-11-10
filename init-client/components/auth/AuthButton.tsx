import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/context/ThemeContext';
import { Pressable, StyleSheet } from 'react-native';

interface AuthButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  label: string;
}

export function AuthButton({ onPress, disabled, loading, label }: AuthButtonProps) {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    button: {
      backgroundColor: 'rgb(48, 48, 48);',
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      marginTop: theme.spacing.lg,
    },
    buttonText: {
      color: 'rgb(245, 245, 245)',
      fontWeight: '600',
    },
  });

  return (
    <Pressable
      style={[styles.button, disabled && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <ThemedText style={styles.buttonText}>
        {loading ? `${label} en cours...` : label}
      </ThemedText>
    </Pressable>
  );
}