import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

export default function EventLayout() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const segments = useSegments();

  const isInEventTabs = segments.includes('(event-tabs)');

  return (
    <View style={styles.container}>
      {!isInEventTabs && (
        <View style={styles.header}>
          <Pressable onPress={() => router.push('/events')}>
            <MaterialIcons name="arrow-back" size={24} color="#000" />
          </Pressable>
          <Pressable onPress={() => alert('Signaler événement')}>
            <MaterialIcons name="flag" size={24} color="#000" />
          </Pressable>
        </View>
      )}

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(event-tabs)" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
