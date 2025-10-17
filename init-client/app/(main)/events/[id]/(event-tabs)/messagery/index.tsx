import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function EventMessageryScreen() {
  const router = useRouter();
  const { id: eventId } = useLocalSearchParams();

  const conversations = [
    { id: '1', name: 'Marie Dupont', lastMessage: 'Salut !' },
    { id: '2', name: 'Paul Martin', lastMessage: 'À ce soir' },
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.conversationCard}
            onPress={() => router.push(`/events/${eventId}/messagery/${item.id}`)}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.lastMessage}>{item.lastMessage}</Text>
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
  conversationCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  lastMessage: {
    color: '#666',
    marginTop: 4,
  },
});