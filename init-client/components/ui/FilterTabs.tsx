import { useTheme } from '@/context/ThemeContext';
import { type Theme } from '@/constants/theme';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface Tab {
  key: string;
  label: string;
}

interface FilterTabsProps {
  tabs: Tab[];
  selected: string;
  onSelect: (key: string) => void;
  scrollable?: boolean;
}

export function FilterTabs({ tabs, selected, onSelect, scrollable }: FilterTabsProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const content = tabs.map(tab => (
    <Pressable
      key={tab.key}
      style={[styles.tab, selected === tab.key && styles.tabActive]}
      onPress={() => onSelect(tab.key)}
    >
      <Text style={[styles.tabText, selected === tab.key && styles.tabTextActive]}>
        {tab.label}
      </Text>
    </Pressable>
  ));

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        {content}
      </ScrollView>
    );
  }

  return <View style={styles.rowContainer}>{content}</View>;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollContainer: {
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.secondary,
      maxHeight: 52,
    },
    scrollContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
    rowContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.card,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 6,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.secondary,
    },
    tab: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tabActive: { backgroundColor: theme.colors.accentSolid },
    tabText: { fontSize: 12, fontWeight: '600', color: theme.colors.mutedForeground },
    tabTextActive: { color: theme.colors.accentSolidText },
  });
