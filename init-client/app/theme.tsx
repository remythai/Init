import { type Theme } from '@/constants/theme';
import { useTheme, type ThemeMode } from '@/context/ThemeContext';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { MaterialIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

const OPTIONS: { mode: ThemeMode; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { mode: 'light', label: 'Clair', icon: 'light-mode' },
  { mode: 'dark', label: 'Sombre', icon: 'dark-mode' },
  { mode: 'system', label: 'Système', icon: 'settings-brightness' },
];

export default function ThemeScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Thème" />

      <View style={styles.content}>
        <View style={styles.card}>
          {OPTIONS.map((opt, i) => {
            const selected = themeMode === opt.mode;
            return (
              <Pressable
                key={opt.mode}
                style={[
                  styles.option,
                  i < OPTIONS.length - 1 && styles.optionBorder,
                ]}
                onPress={() => setThemeMode(opt.mode)}
              >
                <View style={styles.optionLeft}>
                  <MaterialIcons
                    name={opt.icon}
                    size={22}
                    color={selected ? theme.colors.primary : theme.colors.mutedForeground}
                  />
                  <ThemedText style={[styles.optionText, selected && { color: theme.colors.primary, fontWeight: '600' }]}>
                    {opt.label}
                  </ThemedText>
                </View>
                {selected && (
                  <MaterialIcons name="check" size={22} color={theme.colors.primary} />
                )}
              </Pressable>
            );
          })}
        </View>

        <ThemedText style={styles.hint}>
          L'option « Système » suit automatiquement le thème de votre appareil.
        </ThemedText>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 16,
      gap: 12,
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
      overflow: 'hidden',
    },
    option: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
    },
    optionBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.secondary,
    },
    optionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    optionText: {
      fontSize: 16,
      color: theme.colors.foreground,
    },
    hint: {
      fontSize: 13,
      color: theme.colors.mutedForeground,
      paddingHorizontal: 4,
      lineHeight: 18,
    },
  });
