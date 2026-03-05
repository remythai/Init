import { useTheme } from '@/context/ThemeContext';
import { type Theme } from '@/constants/theme';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StatItem {
  label: string;
  value: string | number;
  color: string;
}

interface StatsBannerProps {
  stats: StatItem[];
  backgroundColor?: string;
}

export function StatsBanner({ stats, backgroundColor }: StatsBannerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const bg = backgroundColor ?? theme.colors.foreground;

  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      {stats.map((s, i) => (
        <View key={i} style={styles.item}>
          <Text style={[styles.value, { color: s.color }]}>{s.value}</Text>
          <Text style={styles.label}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    banner: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 8 },
    item: { flex: 1, alignItems: 'center' },
    value: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 18 },
    label: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  });
