import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/context/ThemeContext';
import { authService } from '@/services/auth.service';

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, isDark, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.replace('/(auth)');
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <ThemedText style={styles.sectionTitle} variant="small">Compte</ThemedText>
          
          <Pressable style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="person" size={24} color={theme.colors.primary} />
              <ThemedText style={styles.settingText}>Modifier le profil</ThemedText>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.mutedForeground} />
          </Pressable>
          
          <Pressable style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="lock" size={24} color={theme.colors.primary} />
              <ThemedText style={styles.settingText}>Confidentialité</ThemedText>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.mutedForeground} />
          </Pressable>
          
          <Pressable style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="notifications" size={24} color={theme.colors.primary} />
              <ThemedText style={styles.settingText}>Notifications</ThemedText>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.mutedForeground} />
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <ThemedText style={styles.sectionTitle} variant="small">Préférences</ThemedText>
          
          <Pressable style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="language" size={24} color={theme.colors.primary} />
              <ThemedText style={styles.settingText}>Langue</ThemedText>
            </View>
            <View style={styles.settingRight}>
              <ThemedText style={styles.settingValue} variant="small">Français</ThemedText>
              <MaterialIcons name="chevron-right" size={24} color={theme.colors.mutedForeground} />
            </View>
          </Pressable>
          
          <Pressable 
            style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}
            onPress={toggleTheme}
          >
            <View style={styles.settingLeft}>
              <MaterialIcons name="dark-mode" size={24} color={theme.colors.primary} />
              <ThemedText style={styles.settingText}>Thème sombre</ThemedText>
            </View>
            <MaterialIcons 
              name={isDark ? "toggle-on" : "toggle-off"} 
              size={32} 
              color={isDark ? theme.colors.primary : theme.colors.mutedForeground} 
            />
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <ThemedText style={styles.sectionTitle} variant="small">Support</ThemedText>
          
          <Pressable style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="help" size={24} color={theme.colors.primary} />
              <ThemedText style={styles.settingText}>Aide</ThemedText>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.mutedForeground} />
          </Pressable>
          
          <Pressable style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="feedback" size={24} color={theme.colors.primary} />
              <ThemedText style={styles.settingText}>Envoyer un feedback</ThemedText>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.mutedForeground} />
          </Pressable>
          
          <Pressable style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="info" size={24} color={theme.colors.primary} />
              <ThemedText style={styles.settingText}>À propos</ThemedText>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.mutedForeground} />
          </Pressable>
        </View>

        <Pressable
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={24} color="#fff" />
          <ThemedText style={styles.logoutText}>Se déconnecter</ThemedText>
        </Pressable>

        <ThemedText style={styles.version} variant="small">Version 1.0.0</ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    opacity: 0.6,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingText: {
    fontSize: 16,
  },
  settingValue: {
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ff3b30',
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  version: {
    textAlign: 'center',
    marginBottom: 32,
  },
});