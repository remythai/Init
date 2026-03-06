import { useTheme } from '@/context/ThemeContext';
import { type Theme } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface EmptyStateProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <MaterialIcons name={icon} size={44} color={theme.colors.placeholder} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {action}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 8 },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    title: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 16, color: theme.colors.foreground },
    subtitle: { fontSize: 14, color: theme.colors.placeholder, textAlign: 'center', lineHeight: 20 },
  });
