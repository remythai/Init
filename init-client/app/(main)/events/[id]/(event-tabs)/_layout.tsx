import { MaterialIcons } from '@expo/vector-icons';
import { Tabs, useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function EventTabsLayout() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const pathname = usePathname();

  // ✅ Détection conversation dans un event
  const isInEventConversation = pathname.match(/\/events\/[^/]+\/\(event-tabs\)\/messagery\/[^/]+$/) !== null;

  return (
    <View style={styles.container}>
      {/* En-tête visible uniquement hors conversation */}
      {!isInEventConversation && (
        <View style={styles.header}>
          <Pressable onPress={() => router.push(`/events/${id}`)}>
            <MaterialIcons name="arrow-back" size={24} color="#303030" />
          </Pressable>
          <Text style={styles.eventName}>Nom de l'événement</Text>
          <View style={{ width: 24 }} /> 
        </View>
      )}

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: "#303030",
          tabBarInactiveTintColor: "rgba(48,48,48,0.6)",
          tabBarStyle: isInEventConversation
            ? { display: "none" }
            : {
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
            href: {
              pathname: "/events/[id]/(event-tabs)/profile",
              params: { id },
            },
          }}
        />
        <Tabs.Screen
          name="swiper"
          options={{
            title: "Swiper",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="swipe" size={24} color={color} />
            ),
            href: {
              pathname: "/events/[id]/(event-tabs)/swiper",
              params: { id },
            },
          }}
        />
        <Tabs.Screen
          name="messagery"
          options={{
            title: "Messages",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="message" size={24} color={color} />
            ),
            href: {
              pathname: "/events/[id]/(event-tabs)/messagery",
              params: { id },
            },
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
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  eventName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#303030",
  },
});
