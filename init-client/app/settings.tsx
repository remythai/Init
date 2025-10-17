import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const router = useRouter();

  const handleLogout = () => {
    alert('Déconnexion...');
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Paramètres',
          presentation: 'modal',
          headerLeft: () => (
            <Pressable onPress={() => router.back()}>
              <MaterialIcons name="close" size={24} color="#000" />
            </Pressable>
          ),
        }}
      />
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compte</Text>
          
          <Pressable style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="person" size={24} color="#007AFF" />
              <Text style={styles.settingText}>Modifier le profil</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </Pressable>
          
          <Pressable style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="lock" size={24} color="#007AFF" />
              <Text style={styles.settingText}>Confidentialité</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </Pressable>
          
          <Pressable style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="notifications" size={24} color="#007AFF" />
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Préférences</Text>
          
          <Pressable style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="language" size={24} color="#007AFF" />
              <Text style={styles.settingText}>Langue</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>Français</Text>
              <MaterialIcons name="chevron-right" size={24} color="#ccc" />
            </View>
          </Pressable>
          
          <Pressable style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="dark-mode" size={24} color="#007AFF" />
              <Text style={styles.settingText}>Thème sombre</Text>
            </View>
            <MaterialIcons name="toggle-off" size={32} color="#ccc" />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <Pressable style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="help" size={24} color="#007AFF" />
              <Text style={styles.settingText}>Aide</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </Pressable>
          
          <Pressable style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="feedback" size={24} color="#007AFF" />
              <Text style={styles.settingText}>Envoyer un feedback</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </Pressable>
          
          <Pressable style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="info" size={24} color="#007AFF" />
              <Text style={styles.settingText}>À propos</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </Pressable>
        </View>

        <Pressable
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={24} color="#fff" />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    color: '#666',
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
    color: '#999',
    fontSize: 14,
    marginBottom: 32,
  },
});