import { useTheme } from '@/context/ThemeContext';
import { type Theme } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder = 'Rechercher...' }: SearchBarProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.searchRow}>
      <MaterialIcons name="search" size={20} color={theme.colors.placeholder} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.placeholder}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')}>
          <MaterialIcons name="close" size={18} color={theme.colors.placeholder} />
        </Pressable>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.card,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.secondary,
    },
    searchInput: { flex: 1, fontSize: 15, color: theme.colors.foreground },
  });
