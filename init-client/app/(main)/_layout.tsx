import { type Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useSocket } from '@/context/SocketContext';
import { authService } from '@/services/auth.service';
import { matchService } from '@/services/match.service';
import { socketService, type SocketConversationUpdate, type SocketMessage } from '@/services/socket.service';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { MaterialIcons } from '@expo/vector-icons';
import { User, Calendar, MessageCircle, Building2 } from 'lucide-react-native';
import { Tabs, usePathname, useRouter, useSegments } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MainLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, insets.top), [theme, insets.top]);
  const [isOrga, setIsOrga] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const { isConnected, currentUserId } = useSocket();

  useEffect(() => {
    authService.getUserType().then((type) => setIsOrga(type === 'orga'));
  }, []);

  // Fetch total unread count
  const loadUnread = useCallback(async () => {
    if (isOrga) return;
    try {
      const data = await matchService.getAllConversations();
      const count = (data || []).reduce((sum: number, g: any) =>
        sum + g.conversations.reduce((s: number, c: any) => s + (c.unread_count || 0), 0), 0);
      setTotalUnread(count);
    } catch {
      // silent
    }
  }, [isOrga]);

  useEffect(() => { loadUnread(); }, [loadUnread]);

  // Real-time: update unread badge on new messages
  useEffect(() => {
    if (!isConnected || isOrga) return;

    const unsubConv = socketService.onConversationUpdate((data: SocketConversationUpdate) => {
      if (!data.last_message.is_mine) {
        setTotalUnread(prev => prev + 1);
      }
    });

    const unsubMsg = socketService.onNewMessage((data: SocketMessage) => {
      if (data.senderId !== currentUserId) {
        setTotalUnread(prev => prev + 1);
      }
    });

    return () => { unsubConv(); unsubMsg(); };
  }, [isConnected, isOrga, currentUserId]);

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
      <OfflineBanner isConnected={isConnected} />
      {!shouldHideHeader && (
        <View style={styles.header}>
          <Image
            style={styles.logo}
            source={isDark
              ? require('../../assets/images/logoLight.svg')
              : require('../../assets/images/logoDark.svg')
            }
          />
          <Pressable onPress={() => router.push('/settings')}>
            <MaterialIcons name="settings" size={24} color={theme.colors.foreground} />
          </Pressable>
        </View>
      )}

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.mutedForeground,
          tabBarStyle: shouldHideNavigation
            ? { display: "none" }
            : {
                backgroundColor: theme.colors.background,
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
                paddingTop: 6,
                paddingBottom: Math.max(insets.bottom, 10),
                height: 54 + Math.max(insets.bottom, 10),
              },
          tabBarLabelStyle: {
            fontSize: 11,
            fontFamily: "Poppins-Regular",
            color: theme.colors.foreground,
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
              isOrga ? <Building2 size={22} color={color} /> : <User size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: isOrga ? "Mes événements" : "Événements",
            tabBarIcon: ({ color }) => (
              <Calendar size={22} color={color} />
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
            tabBarBadge: totalUnread > 0 ? (totalUnread > 99 ? '99+' : totalUnread) : undefined,
            tabBarBadgeStyle: { backgroundColor: theme.colors.primary, fontSize: 10, fontWeight: '700' },
            ...(isOrga ? { href: null } : {}),
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: topInset + 8,
    paddingBottom: 10,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 0,
    borderBottomColor: theme.colors.border,
  },
  logo: { width: 53, height: 53, resizeMode: 'contain' },
});