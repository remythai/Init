import { MaterialIcons } from '@expo/vector-icons';
import { Tabs, usePathname, useRouter, useSegments } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';

export default function MainLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();

  const isInEvent = pathname.includes('/events/') && segments.includes('[id]');
  
  const isInConversation = pathname.match(/\/messagery\/[^/]+$/) !== null;

  const shouldHideNavigation = isInEvent || isInConversation;

  return (
    <View style={styles.container}>
      {!shouldHideNavigation && (
        <View style={styles.header}>
          <Image style={styles.logo} source={require('../../assets/images/initLogoGray.png')}/>
          <Pressable onPress={() => router.push('/settings')}>
            <MaterialIcons name="settings" size={24} color="#F5F5F5" />
          </Pressable>
        </View>
      )}

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#007AFF',
          tabBarStyle: shouldHideNavigation ? { display: 'none' } : undefined,
        }}
      >
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profil',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="person" size={24} color={color} />
            ),
            href: '/profile',
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: 'Events',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="event" size={24} color={color} />
            ),
            href: '/events',
          }}
        />
        <Tabs.Screen
          name="messagery"
          options={{
            title: 'Messagerie',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="message" size={24} color={color} />
            ),
            href: '/messagery',
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
    backgroundColor: '#303030',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logo: {
    width: 53,
    height: 53,
    resizeMode: 'contain',
  },
});