import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/context/ThemeContext';
import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { type Theme } from '@/constants/theme';

interface AuthButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  label: string;
}

export function AuthButton({ onPress, disabled, loading, label }: AuthButtonProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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

const createStyles = (theme: Theme) => StyleSheet.create({
  button: {
    backgroundColor: theme.colors.accentSolid,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  buttonText: {
    color: theme.colors.accentSolidText,
    fontWeight: '600',
    fontSize: 15,
    fontFamily: 'Poppins',
  },
});
