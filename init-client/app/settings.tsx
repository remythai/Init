import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/context/ThemeContext';
import { authService } from '@/services/auth.service';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Paramètres</ThemedText>
      </View>

      <ScrollView style={styles.scrollContent}>
        <View style={styles.content}>
          {/* Section Général */}
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Général</ThemedText>
            
            <View style={styles.cardContent}>
              <Pressable style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <MaterialIcons name="language" size={20} color="#303030" />
                  <ThemedText style={styles.settingText}>Langue</ThemedText>
                </View>
              </Pressable>

              <Pressable style={styles.settingItemButton}>
                <View style={styles.settingLeft}>
                  <MaterialIcons name="notifications" size={20} color="#303030" />
                  <ThemedText style={styles.settingText}>Notifications</ThemedText>
                </View>
              </Pressable>

              <Pressable 
                style={styles.settingItemButton}
                onPress={toggleTheme}
              >
                <View style={styles.settingLeft}>
                  <MaterialIcons name="dark-mode" size={20} color="#303030" />
                  <ThemedText style={styles.settingText}>Thème sombre</ThemedText>
                </View>
                <MaterialIcons 
                  name={isDark ? "toggle-on" : "toggle-off"} 
                  size={32} 
                  color={isDark ? "#303030" : "#999"} 
                />
              </Pressable>
            </View>
          </View>

          {/* Section Confidentialité et sécurité */}
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Confidentialité et sécurité</ThemedText>
            
            <View style={styles.cardContentDivided}>
              <Pressable style={styles.dividedItem}>
                <View style={styles.settingLeft}>
                  <MaterialIcons name="shield" size={20} color="#303030" />
                  <ThemedText style={styles.settingText}>Confidentialité</ThemedText>
                </View>
              </Pressable>

              <Pressable style={styles.dividedItem}>
                <View style={styles.settingLeft}>
                  <MaterialIcons name="description" size={20} color="#303030" />
                  <ThemedText style={styles.settingText}>Conditions d'utilisation</ThemedText>
                </View>
              </Pressable>

              <Pressable style={[styles.dividedItem, styles.lastItem]}>
                <View style={styles.settingLeft}>
                  <MaterialIcons name="description" size={20} color="#303030" />
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
                  <MaterialIcons name="help" size={20} color="#303030" />
                  <ThemedText style={styles.settingText}>Centre d'aide</ThemedText>
                </View>
              </Pressable>

              <Pressable style={[styles.dividedItem, styles.lastItem]}>
                <View style={styles.settingLeft}>
                  <MaterialIcons name="info" size={20} color="#303030" />
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
              <MaterialIcons name="logout" size={20} color="#dc2626" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#303030',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
    gap: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontFamily: 'Poppins',
    fontWeight: '600',
    fontSize: 18,
    color: '#fff',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
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
    color: '#303030',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
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
    borderBottomColor: '#f3f4f6',
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
    color: '#303030',
  },
  logoutCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
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
    color: '#dc2626',
    fontWeight: '600',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 4,
  },
  versionText: {
    fontSize: 14,
    color: '#6b7280',
  },
});