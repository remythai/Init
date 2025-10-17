import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Tabs, useRouter, useLocalSearchParams, usePathname } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function EventTabsLayout() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const pathname = usePathname();

  const isInEventConversation = pathname.match(/\/messagery\/[^/]+$/) !== null;

  return (
    <View style={styles.container}>
      {!isInEventConversation && (
        <View style={styles.header}>
          <Pressable onPress={() => router.push(`/events/${id}`)}>
            <MaterialIcons name="arrow-back" size={24} color="#000" />
          </Pressable>
          <Text style={styles.eventName}>Nom de l'événement</Text>
          <View style={{ width: 24 }} />
        </View>
      )}

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#007AFF',
          tabBarStyle: isInEventConversation ? { display: 'none' } : undefined,
        }}
      >
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profil',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="person" size={24} color={color} />
            ),
            href: {
              pathname: '/events/[id]/(event-tabs)/profile',
              params: { id },
            },
          }}
        />
        <Tabs.Screen
          name="swiper"
          options={{
            title: 'Swiper',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="swipe" size={24} color={color} />
            ),
            href: {
              pathname: '/events/[id]/(event-tabs)/swiper',
              params: { id },
            },
          }}
        />
        <Tabs.Screen
          name="messagery"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="message" size={24} color={color} />
            ),
            href: {
              pathname: '/events/[id]/(event-tabs)/messagery',
              params: { id },
            },
          }}
        />
      </Tabs>
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
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});