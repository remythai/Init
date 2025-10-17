// components/themed-view.tsx
import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export type ThemedViewProps = ViewProps & {
  variant?: 'default' | 'card' | 'muted';
};

export function ThemedView({ style, variant = 'default', ...otherProps }: ThemedViewProps) {
  const { theme } = useTheme();

  const backgroundColor = {
    default: theme.colors.background,
    card: theme.colors.card,
    muted: theme.colors.muted,
  }[variant];

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}