// components/ui/collapsible.tsx
import { PropsWithChildren, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      marginVertical: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    title: {
      flex: 1,
    },
    icon: {
      marginLeft: theme.spacing.md,
    },
    content: {
      marginTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
  });

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.header}
        onPress={() => setIsOpen(!isOpen)}>
        <ThemedText variant="label" style={styles.title}>
          {title}
        </ThemedText>
        <IconSymbol
          size={18}
          name={isOpen ? 'chevron.up' : 'chevron.down'}
          color={theme.colors.primary}
          style={styles.icon}
        />
      </Pressable>
      {isOpen && <View style={styles.content}>{children}</View>}
    </View>
  );
}