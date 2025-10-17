import { View, Text, Image, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function MyProfileScreen() {
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
        <Text style={styles.bio}>Passionné de musique et de sorties</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mes événements</Text>
        <Text style={styles.stat}>12 événements rejoints</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations</Text>
        <Text style={styles.info}>📧 john.doe@example.com</Text>
        <Text style={styles.info}>📍 Paris, France</Text>
      </View>

      <Pressable
        style={styles.editButton}
        onPress={() => router.push('/settings')}
      >
        <Text style={styles.editButtonText}>Modifier mon profil</Text>
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
  stat: {
    fontSize: 16,
    color: '#666',
  },
  info: {
    fontSize: 16,
    marginBottom: 8,
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