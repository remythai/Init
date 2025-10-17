// components/themed-text.tsx
import { StyleSheet, Text, type TextProps } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export type ThemedTextProps = TextProps & {
  variant?: 'default' | 'title' | 'semibold' | 'subtitle' | 'link' | 'h1' | 'h2' | 'h3' | 'label' | 'small';
};

export function ThemedText({
  style,
  variant = 'default',
  ...rest
}: ThemedTextProps) {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    h1: {
      fontSize: theme.fontSizes['2xl'],
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.foreground,
      fontFamily: theme.fonts.heading,
      lineHeight: theme.fontSizes['2xl'] * 1.5,
    },
    h2: {
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.foreground,
      fontFamily: theme.fonts.heading,
      lineHeight: theme.fontSizes.xl * 1.5,
    },
    h3: {
      fontSize: theme.fontSizes.lg,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.foreground,
      fontFamily: theme.fonts.heading,
      lineHeight: theme.fontSizes.lg * 1.5,
    },
    default: {
      fontSize: theme.fontSizes.base,
      lineHeight: theme.fontSizes.base * 1.5,
      color: theme.colors.foreground,
      fontFamily: theme.fonts.primary,
      fontWeight: theme.fontWeights.normal,
    },
    semibold: {
      fontSize: theme.fontSizes.base,
      lineHeight: theme.fontSizes.base * 1.5,
      fontWeight: theme.fontWeights.semibold,
      color: theme.colors.foreground,
      fontFamily: theme.fonts.primary,
    },
    title: {
      fontSize: 32,
      fontWeight: theme.fontWeights.bold,
      lineHeight: 32,
      color: theme.colors.foreground,
      fontFamily: theme.fonts.heading,
    },
    subtitle: {
      fontSize: 20,
      fontWeight: theme.fontWeights.bold,
      color: theme.colors.foreground,
      fontFamily: theme.fonts.heading,
    },
    link: {
      lineHeight: 30,
      fontSize: theme.fontSizes.base,
      color: theme.colors.primary,
      fontFamily: theme.fonts.primary,
      fontWeight: theme.fontWeights.medium,
    },
    label: {
      fontSize: theme.fontSizes.base,
      fontWeight: theme.fontWeights.medium,
      color: theme.colors.foreground,
      fontFamily: theme.fonts.primary,
    },
    small: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.normal,
      color: theme.colors.mutedForeground,
      fontFamily: theme.fonts.primary,
      lineHeight: theme.fontSizes.sm * 1.5,
    },
  });

  return (
    <Text
      style={[
        styles[variant],
        style,
      ]}
      {...rest}
    />
  );
}