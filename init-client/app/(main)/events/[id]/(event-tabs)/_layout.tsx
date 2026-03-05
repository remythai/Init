// app/(main)/events/[id]/(event-tabs)/_layout.tsx
import { useTheme } from '@/context/ThemeContext';
import { type Theme } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { Tabs, useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export default function EventTabsLayout() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const segments = useSegments();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isInConversation = segments[segments.length - 2] === 'messagery' &&
    segments[segments.length - 1] !== 'index';

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Si on est dans une conversation, laisser [id].tsx gerer
      if (isInConversation) {
        return false;
      }

      const eventTabsIndex = segments.indexOf('(event-tabs)');
      const currentTab = segments[eventTabsIndex + 1];

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
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.accentSolidText} />
        </Pressable>
        <Text style={styles.eventName}>Décoeurtique moi</Text>
        <View style={{ width: 24 }} />
      </View>

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: theme.colors.tabActive,
          tabBarInactiveTintColor: theme.colors.tabInactive,
          tabBarStyle: {
            backgroundColor: theme.colors.nav,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
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

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: theme.colors.accentSolid,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  eventName: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.accentSolidText,
  },
});
