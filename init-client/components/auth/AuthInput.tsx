import { View, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/context/ThemeContext';

interface AuthInputProps extends TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}

export function AuthInput({ label, value, onChangeText, ...props }: AuthInputProps) {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    formGroup: {
      gap: theme.spacing.sm,
    },
    label: {
      marginBottom: theme.spacing.xs,
    },
    input: {
      backgroundColor: theme.colors.inputBackground,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      fontSize: theme.fontSizes.base,
      color: theme.colors.foreground,
      fontFamily: theme.fonts.primary,
    },
  });

  return (
    <View style={styles.formGroup}>
      <ThemedText variant="label" style={styles.label}>
        {label}
      </ThemedText>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={theme.colors.mutedForeground}
        {...props}
      />
    </View>
  );
}
