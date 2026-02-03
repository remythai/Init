import { MaterialIcons } from '@expo/vector-icons';
import { Tabs, usePathname, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, Image, Platform, Pressable, StyleSheet, View } from 'react-native';

export default function MainLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();

  const isInEventTabs = segments.includes('(event-tabs)');
  const isInEventDetail = pathname.match(/\/events\/[^/]+$/) !== null;
  const isInConversation = pathname.match(/\/messagery\/[^/]+$/) !== null;

  const shouldHideNavigation = isInEventTabs || isInEventDetail || isInConversation;

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      const isOnEventsTab = segments[1] === 'events' && segments.length === 2;
      
      if (isOnEventsTab) {
        BackHandler.exitApp();
        return true;
      }
      
      router.push('/(main)/events');
      return true; 
    });

    return () => backHandler.remove();
  }, [segments, router]);

  return (
    <View style={styles.container}>
      {!shouldHideNavigation && (
        <View style={styles.header}>
          <Image style={styles.logo} source={require('../../assets/images/initLogoGray.png')} />
          <Pressable onPress={() => router.push('/settings')}>
            <MaterialIcons name="settings" size={24} color="#F5F5F5" />
          </Pressable>
        </View>
      )}

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: "#303030",
          tabBarInactiveTintColor: "rgba(48,48,48,0.6)",
          tabBarStyle: shouldHideNavigation
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
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: "Événements",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="event" size={24} color={color} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#303030',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logo: { width: 53, height: 53, resizeMode: 'contain' },
});
