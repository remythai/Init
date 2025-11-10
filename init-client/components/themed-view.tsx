import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useMemo } from 'react';

export type ThemedViewProps = ViewProps & {
  variant?: 'default' | 'card' | 'muted';
};

export function ThemedView({ style, variant = 'default', ...otherProps }: ThemedViewProps) {
  const { theme } = useTheme();

  const backgroundColor = useMemo(() => {
    const variants = {
      default: theme.colors.background,
      card: theme.colors.card,
      muted: theme.colors.muted,
    };
    return variants[variant];
  }, [theme.colors.background, theme.colors.card, theme.colors.muted, variant]);

  const baseStyle: ViewStyle = { backgroundColor };

  return <View style={[baseStyle, style]} {...otherProps} />;
}