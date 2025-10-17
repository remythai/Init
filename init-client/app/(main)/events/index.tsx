import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';

export default function EventsScreen() {
  const router = useRouter();
  const [showAll, setShowAll] = useState(true);

  const events = [
    { id: '1', title: 'Soirée Paris', date: '2024-12-20' },
    { id: '2', title: 'Concert Rock', date: '2024-12-25' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.ctaContainer}>
        <Pressable
          style={[styles.ctaButton, showAll && styles.ctaButtonActive]}
          onPress={() => setShowAll(true)}
        >
          <Text style={styles.ctaText}>Tous les événements</Text>
        </Pressable>
        <Pressable
          style={[styles.ctaButton, !showAll && styles.ctaButtonActive]}
          onPress={() => setShowAll(false)}
        >
          <Text style={styles.ctaText}>Mes événements</Text>
        </Pressable>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.eventCard}
            onPress={() => router.push(`/events/${item.id}`)}
          >
            <Text style={styles.eventTitle}>{item.title}</Text>
            <Text style={styles.eventDate}>{item.date}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  ctaContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  ctaButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
  },
  ctaButtonActive: {
    backgroundColor: '#007AFF',
  },
  ctaText: {
    fontWeight: '600',
  },
  eventCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 8,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  eventDate: {
    color: '#666',
    marginTop: 4,
  },
});
