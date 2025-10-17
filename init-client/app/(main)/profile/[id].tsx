import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>MD</Text>
          </View>
        </View>
        
        <Text style={styles.name}>Marie Dupont</Text>
        <Text style={styles.bio}>Amatrice de concerts et de festivals</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Événements en commun</Text>
        <Text style={styles.stat}>3 événements</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>À propos</Text>
        <Text style={styles.info}>📍 Lyon, France</Text>
        <Text style={styles.info}>🎵 Rock, Jazz, Électro</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.messageButton}
          onPress={() => router.push(`/messagery/${id}`)}
        >
          <MaterialIcons name="message" size={20} color="#fff" />
          <Text style={styles.buttonText}>Envoyer un message</Text>
        </Pressable>
        
        <Pressable
          style={styles.reportButton}
          onPress={() => alert('Signaler utilisateur')}
        >
          <MaterialIcons name="flag" size={20} color="#ff3b30" />
          <Text style={styles.reportButtonText}>Signaler</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  stat: {
    fontSize: 16,
    color: '#666',
  },
  info: {
    fontSize: 16,
    marginBottom: 8,
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  messageButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reportButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  reportButtonText: {
    color: '#ff3b30',
    fontSize: 16,
    fontWeight: 'bold',
  },
});