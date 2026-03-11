import { type Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useLang, type Lang } from '@/context/LangContext';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { MaterialIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';

const OPTIONS: { lang: Lang; label: string; flag: string }[] = [
  { lang: 'fr', label: 'Français', flag: '🇫🇷' },
  { lang: 'en', label: 'English', flag: '🇬🇧' },
  { lang: 'es', label: 'Español', flag: '🇪🇸' },
];

export default function LanguageScreen() {
  const { theme } = useTheme();
  const { lang, setLang, t } = useLang();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, insets.bottom), [theme, insets.bottom]);

  return (
    <View style={styles.container}>
      <ScreenHeader title={t.language.title} />

      <View style={styles.content}>
        <View style={styles.card}>
          {OPTIONS.map((opt, i) => {
            const selected = lang === opt.lang;
            return (
              <Pressable
                key={opt.lang}
                style={[styles.option, i < OPTIONS.length - 1 && styles.optionBorder]}
                onPress={() => setLang(opt.lang)}
              >
                <View style={styles.optionLeft}>
                  <ThemedText style={styles.flag}>{opt.flag}</ThemedText>
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

        <ThemedText style={styles.hint}>{t.language.hint}</ThemedText>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme, bottomInset: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 16, gap: 12, paddingBottom: Math.max(bottomInset, 16) + 16 },
    card: {
      backgroundColor: theme.colors.card, borderRadius: 12,
      shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1, shadowRadius: 8, elevation: 3, overflow: 'hidden',
    },
    option: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', padding: 16,
    },
    optionBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.secondary },
    optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    flag: { fontSize: 22 },
    optionText: { fontSize: 16, color: theme.colors.foreground },
    hint: { fontSize: 13, color: theme.colors.mutedForeground, paddingHorizontal: 4, lineHeight: 18 },
  });
