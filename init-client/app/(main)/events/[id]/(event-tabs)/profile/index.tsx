import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function EventMyProfileScreen() {
  const { id: eventId } = useLocalSearchParams();
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>JD</Text>
          </View>
        </View>
        
        <Text style={styles.name}>John Doe</Text>
        <Text style={styles.bio}>Mon profil pour cet événement</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statut dans l'événement</Text>
        <Text style={styles.info}>✅ Inscrit</Text>
        <Text style={styles.info}>🎯 Intéressé par: Musique, Networking</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ma présentation pour cet événement</Text>
        <Text style={styles.description}>
          Hâte de découvrir de nouvelles personnes et de passer une excellente soirée !
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistiques</Text>
        <Text style={styles.stat}>5 matchs dans cet événement</Text>
        <Text style={styles.stat}>12 conversations</Text>
      </View>

      <Pressable
        style={styles.editButton}
        onPress={() => alert('Modifier mon profil pour cet événement')}
      >
        <Text style={styles.editButtonText}>Personnaliser mon profil événement</Text>
      </Pressable>
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
    backgroundColor: '#007AFF',
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
  info: {
    fontSize: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  stat: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  editButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
