import { View, Text, Pressable, StyleSheet, TextInput, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function ConversationPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const personName = `Personne ${id}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </Pressable>
        <Text style={styles.personName}>{personName}</Text>
        <Pressable onPress={() => alert('Signaler utilisateur')}>
          <MaterialIcons name="flag" size={24} color="#000" />
        </Pressable>
      </View>

      <ScrollView style={styles.messagesContainer}>
        <Text>Messages avec {personName}</Text>
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Écrire un message..."
        />
        <Pressable>
          <MaterialIcons name="send" size={24} color="#007AFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  personName: {
    fontSize: 18,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});