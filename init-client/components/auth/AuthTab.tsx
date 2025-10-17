// components/auth/AuthTabs.tsx
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/context/ThemeContext';
import { Pressable, StyleSheet, View } from 'react-native';

interface AuthTabsProps {
  activeTab: 'login' | 'register';
  onTabChange: (tab: 'login' | 'register') => void;
}

export function AuthTabs({ activeTab, onTabChange }: AuthTabsProps) {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.card,
      overflow: 'hidden',
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabLogin: {
      backgroundColor: activeTab === 'login' ? theme.colors.background : theme.colors.card,
      borderTopLeftRadius: activeTab === 'login' ? theme.borderRadius.lg : 0,
      borderBottomRightRadius: activeTab === 'login' ? theme.borderRadius.lg : 0,
    },
    tabRegister: {
      backgroundColor: activeTab === 'register' ? theme.colors.background : theme.colors.card,
      borderTopRightRadius: activeTab === 'register' ? theme.borderRadius.lg : 0,
      borderBottomLeftRadius: activeTab === 'register' ? theme.borderRadius.lg : 0,
    },
    tabText: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.mutedForeground,
    },
    activeTabText: {
      color: theme.colors.card,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.tabsContainer}>
      <Pressable
        style={[styles.tab, styles.tabLogin]}
        onPress={() => onTabChange('login')}
      >
        <ThemedText style={[styles.tabText, activeTab === 'login' && styles.activeTabText]}>
          Connexion
        </ThemedText>
      </Pressable>
      <Pressable
        style={[styles.tab, styles.tabRegister]}
        onPress={() => onTabChange('register')}
      >
        <ThemedText style={[styles.tabText, activeTab === 'register' && styles.activeTabText]}>
          Inscription
        </ThemedText>
      </Pressable>
    </View>
  );
}