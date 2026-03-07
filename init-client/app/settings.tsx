import { ThemedText } from '@/components/themed-text';
import { type Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { authService } from '@/services/auth.service';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, isDark, themeMode } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.replace('/(auth)');
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Paramètres" />

      <ScrollView style={styles.scrollContent}>
        <View style={styles.content}>
          {/* Section Général */}
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Général</ThemedText>
            
            <View style={styles.cardContentDivided}>
              <Pressable style={styles.dividedItem}>
                <View style={styles.settingLeft}>
                  <MaterialIcons name="language" size={20} color={theme.colors.foreground} />
                  <ThemedText style={styles.settingText}>Langue</ThemedText>
                </View>
              </Pressable>

              <Pressable style={styles.dividedItem}>
                <View style={styles.settingLeft}>
                  <MaterialIcons name="notifications" size={20} color={theme.colors.foreground} />
                  <ThemedText style={styles.settingText}>Notifications</ThemedText>
                </View>
              </Pressable>

              <Pressable
                style={[styles.dividedItem, styles.lastItem]}
                onPress={() => router.push('/theme')}
              >
                <View style={styles.settingLeft}>
                  <MaterialIcons name="palette" size={20} color={theme.colors.foreground} />
                  <ThemedText style={styles.settingText}>Thème</ThemedText>
                </View>
                <View style={styles.settingRight}>
                  <ThemedText style={styles.settingHint}>
                    {themeMode === 'system' ? 'Système' : themeMode === 'dark' ? 'Sombre' : 'Clair'}
                  </ThemedText>
                  <MaterialIcons name="chevron-right" size={22} color={theme.colors.mutedForeground} />
                </View>
              </Pressable>
            </View>
          </View>

          {/* Section Confidentialité et sécurité */}
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Confidentialité et sécurité</ThemedText>
            
            <View style={styles.cardContentDivided}>
              <Pressable style={styles.dividedItem}>
                <View style={styles.settingLeft}>
                  <MaterialIcons name="shield" size={20} color={theme.colors.foreground} />
                  <ThemedText style={styles.settingText}>Confidentialité</ThemedText>
                </View>
              </Pressable>

              <Pressable style={styles.dividedItem}>
                <View style={styles.settingLeft}>
                  <MaterialIcons name="description" size={20} color={theme.colors.foreground} />
                  <ThemedText style={styles.settingText}>Conditions d'utilisation</ThemedText>
                </View>
              </Pressable>

              <Pressable style={[styles.dividedItem, styles.lastItem]}>
                <View style={styles.settingLeft}>
                  <MaterialIcons name="description" size={20} color={theme.colors.foreground} />
                  <ThemedText style={styles.settingText}>Politique de confidentialité</ThemedText>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Section Aide */}
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Aide</ThemedText>
            
            <View style={styles.cardContentDivided}>
              <Pressable style={styles.dividedItem}>
                <View style={styles.settingLeft}>
                  <MaterialIcons name="help" size={20} color={theme.colors.foreground} />
                  <ThemedText style={styles.settingText}>Centre d'aide</ThemedText>
                </View>
              </Pressable>

              <Pressable style={[styles.dividedItem, styles.lastItem]}>
                <View style={styles.settingLeft}>
                  <MaterialIcons name="info" size={20} color={theme.colors.foreground} />
                  <ThemedText style={styles.settingText}>À propos</ThemedText>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Bouton de déconnexion */}
          <Pressable
            style={styles.logoutCard}
            onPress={handleLogout}
          >
            <View style={styles.settingLeft}>
              <MaterialIcons name="logout" size={20} color={theme.colors.destructive} />
              <ThemedText style={styles.logoutText}>Déconnexion</ThemedText>
            </View>
          </Pressable>

          {/* Version */}
          <View style={styles.versionContainer}>
            <ThemedText style={styles.versionText}>Version 1.0.0</ThemedText>
            <ThemedText style={styles.versionText}>© 2025 Init. Tous droits réservés.</ThemedText>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flex: 1,
    },
    content: {
      padding: 16,
      gap: 16,
      paddingBottom: 80,
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
    cardTitle: {
      fontFamily: 'Poppins',
      fontWeight: '600',
      fontSize: 16,
      color: theme.colors.foreground,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.secondary,
    },
    cardContent: {
      padding: 16,
      gap: 16,
    },
    cardContentDivided: {
      borderTopWidth: 0,
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
    },
    settingItemButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
    },
    dividedItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.secondary,
    },
    lastItem: {
      borderBottomWidth: 0,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    settingText: {
      fontSize: 16,
      color: theme.colors.foreground,
    },
    settingRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    settingHint: {
      fontSize: 14,
      color: theme.colors.mutedForeground,
    },
    logoutCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
      overflow: 'hidden',
      padding: 16,
    },
    logoutText: {
      fontSize: 16,
      fontFamily: 'Poppins',
      color: theme.colors.destructive,
      fontWeight: '600',
    },
    versionContainer: {
      alignItems: 'center',
      paddingVertical: 16,
      gap: 4,
    },
    versionText: {
      fontSize: 14,
      color: theme.colors.mutedForeground,
    },
  });