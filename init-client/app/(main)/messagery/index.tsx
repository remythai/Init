import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function MessageryScreen() {
  const router = useRouter();

  const conversations = [
    { id: '1', name: 'Marie Dupont', lastMessage: 'Salut !', event: 'Soirée Paris' },
    { id: '2', name: 'Paul Martin', lastMessage: 'À ce soir', event: 'Concert Rock' },
    { id: '3', name: 'Sophie Bernard', lastMessage: 'Merci !', event: 'Soirée Paris' },
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.conversationCard}
            onPress={() => router.push(`/messagery/${item.id}`)}
          >
            <View style={styles.conversationContent}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.event}>{item.event}</Text>
            </View>
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
  conversationContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  event: {
    fontSize: 12,
    color: '#007AFF',
  },
  lastMessage: {
    color: '#666',
    marginTop: 4,
  },
});