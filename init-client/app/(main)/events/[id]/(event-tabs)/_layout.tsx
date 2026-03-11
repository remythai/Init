// app/(main)/events/[id]/(event-tabs)/_layout.tsx
import { useTheme } from '@/context/ThemeContext';
import { type Theme } from '@/constants/theme';
import { useSocket } from '@/context/SocketContext';
import { matchService } from '@/services/match.service';
import { socketService, type SocketConversationUpdate, type SocketMessage } from '@/services/socket.service';
import { MaterialIcons } from '@expo/vector-icons';
import { User, Users, MessageCircle, ArrowLeft } from 'lucide-react-native';
import { Tabs, useGlobalSearchParams, useRouter, useSegments } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EventTabsLayout() {
  const router = useRouter();
  const { id } = useGlobalSearchParams();
  const segments = useSegments();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, insets.top), [theme, insets.top]);

  const isInConversation = segments[segments.length - 2] === 'messagery' &&
    segments[segments.length - 1] !== 'index';

  const eventId = id ? String(id) : '';
  const { isConnected, currentUserId } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnread = useCallback(async () => {
    if (!eventId) return;
    try {
      const data = await matchService.getEventConversations(eventId);
      const count = (data?.conversations || []).reduce((s: number, c: any) => s + (c.unread_count || 0), 0);
      setUnreadCount(count);
    } catch {
      // silent
    }
  }, [eventId]);

  useEffect(() => { loadUnread(); }, [loadUnread]);

  useEffect(() => {
    if (!isConnected) return;

    const unsubConv = socketService.onConversationUpdate((data: SocketConversationUpdate) => {
      if (!data.last_message.is_mine) {
        setUnreadCount(prev => prev + 1);
      }
    });

    const unsubMsg = socketService.onNewMessage((data: SocketMessage) => {
      if (data.senderId !== currentUserId) {
        setUnreadCount(prev => prev + 1);
      }
    });

    return () => { unsubConv(); unsubMsg(); };
  }, [isConnected, currentUserId]);

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
        sceneContainerStyle={{ backgroundColor: theme.colors.background }}
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none", backgroundColor: theme.colors.background },
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
          <ArrowLeft size={22} color={theme.colors.foreground} />
        </Pressable>
        <Text style={styles.eventName}>Décoeurtique moi</Text>
        <View style={{ width: 24 }} />
      </View>

      <Tabs
        sceneContainerStyle={{ backgroundColor: theme.colors.background }}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: theme.colors.tabActive,
          tabBarInactiveTintColor: theme.colors.tabInactive,
          tabBarStyle: {
            backgroundColor: theme.colors.nav,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            paddingTop: 6,
            paddingBottom: Math.max(insets.bottom, 10),
            height: 54 + Math.max(insets.bottom, 10),
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
              <User size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="swiper"
          options={{
            title: "Découvrir",
            tabBarIcon: ({ color }) => (
              <Users size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="messagery"
          options={{
            title: "Messages",
            tabBarIcon: ({ color }) => (
              <MessageCircle size={22} color={color} />
            ),
            tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
            tabBarBadgeStyle: { backgroundColor: theme.colors.primary, fontSize: 10, fontWeight: '700' },
          }}
          listeners={{
            focus: () => loadUnread(),
          }}
        />
      </Tabs>
    </View>
  );
}

const createStyles = (theme: Theme, topInset: number) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: topInset + 8,
    paddingBottom: 10,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  eventName: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.foreground,
  },
});
