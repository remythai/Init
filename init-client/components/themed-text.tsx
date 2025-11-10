import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useMemo } from 'react';

export type ThemedTextProps = TextProps & {
  variant?: 'default' | 'title' | 'semibold' | 'subtitle' | 'link' | 'h1' | 'h2' | 'h3' | 'label' | 'small';
};

export function ThemedText({
  style,
  variant = 'default',
  ...rest
}: ThemedTextProps) {
  const { theme } = useTheme();

  const variantStyle = useMemo((): TextStyle => {
    const { fontSizes, fontWeights, colors, fonts } = theme;

    const variants: Record<string, TextStyle> = {
      h1: {
        fontSize: fontSizes['2xl'],
        fontWeight: fontWeights.medium as TextStyle['fontWeight'],
        color: colors.foreground,
        fontFamily: fonts.heading,
        lineHeight: fontSizes['2xl'] * 1.5,
      },
      h2: {
        fontSize: fontSizes.xl,
        fontWeight: fontWeights.medium as TextStyle['fontWeight'],
        color: colors.foreground,
        fontFamily: fonts.heading,
        lineHeight: fontSizes.xl * 1.5,
      },
      h3: {
        fontSize: fontSizes.lg,
        fontWeight: fontWeights.medium as TextStyle['fontWeight'],
        color: colors.foreground,
        fontFamily: fonts.heading,
        lineHeight: fontSizes.lg * 1.5,
      },
      default: {
        fontSize: fontSizes.base,
        lineHeight: fontSizes.base * 1.5,
        color: colors.foreground,
        fontFamily: fonts.primary,
        fontWeight: fontWeights.normal as TextStyle['fontWeight'],
      },
      semibold: {
        fontSize: fontSizes.base,
        lineHeight: fontSizes.base * 1.5,
        fontWeight: fontWeights.semibold as TextStyle['fontWeight'],
        color: colors.foreground,
        fontFamily: fonts.primary,
      },
      title: {
        fontSize: 32,
        fontWeight: fontWeights.bold as TextStyle['fontWeight'],
        lineHeight: 32,
        color: colors.foreground,
        fontFamily: fonts.heading,
      },
      subtitle: {
        fontSize: 20,
        fontWeight: fontWeights.bold as TextStyle['fontWeight'],
        color: colors.foreground,
        fontFamily: fonts.heading,
      },
      link: {
        lineHeight: 30,
        fontSize: fontSizes.base,
        color: colors.primary,
        fontFamily: fonts.primary,
        fontWeight: fontWeights.medium as TextStyle['fontWeight'],
      },
      label: {
        fontSize: fontSizes.base,
        fontWeight: fontWeights.medium as TextStyle['fontWeight'],
        color: colors.foreground,
        fontFamily: fonts.primary,
      },
      small: {
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.normal as TextStyle['fontWeight'],
        color: colors.mutedForeground,
        fontFamily: fonts.primary,
        lineHeight: fontSizes.sm * 1.5,
      },
    };

    return variants[variant] || variants.default;
  }, [
    theme.fontSizes,
    theme.fontWeights,
    theme.colors,
    theme.fonts,
    variant,
  ]);

  return (
    <Text
      style={[variantStyle, style]}
      {...rest}
    />
  );
}