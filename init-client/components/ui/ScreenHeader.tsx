import { useTheme } from '@/context/ThemeContext';
import { type Theme } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  subtitleColor?: string;
  onBack?: () => void;
  rightAction?: ReactNode;
  variant?: 'card' | 'solid';
}

export function ScreenHeader({ title, subtitle, subtitleColor, onBack, rightAction, variant = 'card' }: ScreenHeaderProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, variant), [theme, variant]);

  const isSolid = variant === 'solid';
  const iconColor = isSolid ? theme.colors.accentSolidText : theme.colors.foreground;

  // If there's a subtitle, left-align the title block. Otherwise, center it.
  const hasSubtitle = !!subtitle;

  return (
    <View style={styles.header}>
      <Pressable onPress={onBack ?? (() => router.back())} style={styles.headerBtn}>
        <MaterialIcons name="arrow-back" size={24} color={iconColor} />
      </Pressable>
      {hasSubtitle ? (
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.headerTitle, { textAlign: 'left' }]}>{title}</Text>
          <Text style={[styles.headerSub, subtitleColor ? { color: subtitleColor, fontWeight: '600' } : undefined]}>{subtitle}</Text>
        </View>
      ) : (
        <Text style={styles.headerTitle}>{title}</Text>
      )}
      {rightAction ?? <View style={{ width: 40 }} />}
    </View>
  );
}

const createStyles = (theme: Theme, variant: 'card' | 'solid') => {
  const isSolid = variant === 'solid';
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 52,
      paddingBottom: 12,
      backgroundColor: isSolid ? theme.colors.accentSolid : theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: isSolid ? theme.colors.accentSolid : theme.colors.border,
    },
    headerBtn: { padding: 8, borderRadius: 8 },
    headerTitle: {
      fontFamily: 'Poppins',
      fontWeight: '700',
      fontSize: 17,
      color: isSolid ? theme.colors.accentSolidText : theme.colors.foreground,
    },
    headerSub: {
      fontSize: 12,
      color: isSolid ? 'rgba(255,255,255,0.7)' : theme.colors.mutedForeground,
      marginTop: 1,
    },
  });
};
