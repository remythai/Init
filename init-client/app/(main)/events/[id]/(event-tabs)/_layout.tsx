// app/(main)/events/[id]/(event-tabs)/_layout.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { Tabs, useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export default function EventTabsLayout() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const segments = useSegments();

  const isInConversation = segments[segments.length - 2] === 'messagery' &&
    segments[segments.length - 1] !== 'index';

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // ✅ Si on est dans une conversation, laisser [id].tsx gérer
      if (isInConversation) {
        return false; // Laisse le BackHandler de la conversation prendre le relais
      }

      const currentTab = segments[eventTabsIndex + 1];

      // ✅ Navigation selon le tab actuel
      if (currentTab === 'swiper') {
        router.replace('/(main)/events');
        return true;
      }

      if (currentTab === 'messagery') {
        router.replace(`/(main)/events/${id}/(event-tabs)/swiper`);
        return true;
      }

      if (currentTab === 'profile') {
        router.replace(`/(main)/events/${id}/(event-tabs)/swiper`);
        return true;
      }

      return false;
    });

    return () => backHandler.remove();
  }, [segments, id, router, isInConversation]);

  if (isInConversation) {
    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
        }}
      >
        <Tabs.Screen name="profile" />
        <Tabs.Screen name="swiper" />
        <Tabs.Screen name="messagery" />
      </Tabs>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.push(`/events/${id}`)}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.eventName}>Décoeurtique moi</Text>
        <View style={{ width: 24 }} />
      </View>

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: "#303030",
          tabBarInactiveTintColor: "rgba(48,48,48,0.6)",
          tabBarStyle: {
            backgroundColor: "#F5F5F5",
            borderTopWidth: 1,
            borderTopColor: "#E5E5E5",
            paddingVertical: 6,
            height: 70,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontFamily: "Poppins-Regular",
          },
          tabBarIconStyle: {
            marginBottom: -4,
          },
        }}
      >
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profil",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="person" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="swiper"
          options={{
            title: "Swiper",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="swipe" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="messagery"
          options={{
            title: "Messages",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="message" size={24} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: "#303030",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  eventName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
});
