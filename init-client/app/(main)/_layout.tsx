import { useTheme } from '@/context/ThemeContext';
import { type Theme } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { Tabs, usePathname, useRouter, useSegments } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { BackHandler, Image, Platform, Pressable, StyleSheet, View } from 'react-native';

export default function MainLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isInEventTabs = segments.includes('(event-tabs)');
  const isInEventDetail = pathname.match(/\/events\/[^/]+/) !== null;
  const isInConversation = pathname.match(/\/messagery\/[^/]+$/) !== null;
  const isInGlobalMessagery = pathname.startsWith('/messagery');
  const isInEvents = pathname === '/events';

  const shouldHideNavigation = isInEventTabs || isInEventDetail || isInConversation;
  const shouldHideHeader = shouldHideNavigation || isInGlobalMessagery || isInEvents;

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
      {!shouldHideHeader && (
        <View style={styles.header}>
          <Image style={styles.logo} source={require('../../assets/images/initLogoGray.png')} />
          <Pressable onPress={() => router.push('/settings')}>
            <MaterialIcons name="settings" size={24} color={theme.colors.accentSolidText} />
          </Pressable>
        </View>
      )}

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.5)',
          tabBarStyle: shouldHideNavigation
            ? { display: "none" }
            : {
                backgroundColor: theme.colors.accentSolid,
                borderTopWidth: 0,
                paddingTop: 6,
                paddingBottom: Platform.OS === 'ios' ? 24 : 10,
                height: Platform.OS === 'ios' ? 80 : 64,
              },
          tabBarLabelStyle: {
            fontSize: 11,
            fontFamily: "Poppins-Regular",
            color: '#ffffff',
            marginTop: 2,
          },
          tabBarIconStyle: {
            marginBottom: -2,
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

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: theme.colors.accentSolid,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  logo: { width: 53, height: 53, resizeMode: 'contain' },
});