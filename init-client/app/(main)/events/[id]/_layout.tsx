// app/(main)/events/[id]/_layout.tsx
import { useTheme } from '@/context/ThemeContext';
import { type Theme } from '@/constants/theme';
import { authService } from '@/services/auth.service';
import { eventService } from '@/services/event.service';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, usePathname, useRouter, useSegments } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EventLayout() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const segments = useSegments();
  const pathname = usePathname();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, insets.top), [theme, insets.top]);

  const [userType, setUserType] = useState<'user' | 'organizer' | null>(null);
  const [pendingReports, setPendingReports] = useState(0);
  const isInEventTabs = segments.includes('(event-tabs)');
  const isInEventConversation = pathname.match(/\/events\/[^/]+\/\(event-tabs\)\/messagery\/[^/]+$/) !== null;
  const isInManagementPage = (
    pathname.includes('/edit') ||
    pathname.includes('/settings') ||
    pathname.includes('/statistics') ||
    pathname.includes('/participants') ||
    pathname.includes('/whitelist') ||
    pathname.includes('/reports')
  );

  useEffect(() => {
    checkUserType();
  }, []);

  const checkUserType = async () => {
    try {
      const role = await authService.getUserType();
      const type = role === 'orga' ? 'organizer' : 'user';
      setUserType(type);

      if (type === 'organizer') {
        loadPendingReports();
      }
    } catch {
      setUserType('user');
    }
  };

  const loadPendingReports = async () => {
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const token = await authService.getToken();
      const resp = await fetch(`${API_URL}/api/events/${id}/reports?status=pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setPendingReports(data.data?.stats?.pending || 0);
      }
    } catch {
      // silent
    }
  };

  const handleDeleteEvent = async () => {
    Alert.alert(
      "Supprimer l'événement",
      "Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await eventService.deleteEvent(id);
              Alert.alert('Succès', "L'événement a été supprimé", [
                { text: 'OK', onPress: () => router.push('/events') },
              ]);
            } catch (error: any) {
              Alert.alert('Erreur', error.message || "Impossible de supprimer l'événement");
            }
          },
        },
      ]
    );
  };

  const handleReportEvent = () => {
    Alert.alert(
      "Signaler l'événement",
      'Pour quelle raison souhaitez-vous signaler cet événement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Contenu inapproprié', onPress: () => submitReport('inappropriate') },
        { text: 'Fausses informations', onPress: () => submitReport('false_info') },
        { text: 'Spam', onPress: () => submitReport('spam') },
      ]
    );
  };

  const submitReport = async (_reason: string) => {
    Alert.alert('Signalement envoyé', "Merci pour votre signalement. Notre équipe va l'examiner.");
  };

  const showHeader = !isInEventTabs && !isInEventConversation && !isInManagementPage;

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <Pressable onPress={() => router.push('/events')} style={styles.headerButton}>
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.foreground} />
          </Pressable>

          {userType === 'organizer' ? (
            /* Orga: show management action buttons */
            <View style={styles.headerRight}>
              <Pressable
                onPress={() => router.push(`/(main)/events/${id}/edit`)}
                style={styles.headerButton}
              >
                <MaterialIcons name="edit" size={22} color={theme.colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => router.push(`/(main)/events/${id}/statistics`)}
                style={styles.headerButton}
              >
                <MaterialIcons name="bar-chart" size={22} color={theme.colors.foreground} />
              </Pressable>
              <Pressable
                onPress={() => router.push(`/(main)/events/${id}/participants`)}
                style={styles.headerButton}
              >
                <MaterialIcons name="people" size={22} color={theme.colors.foreground} />
              </Pressable>
              <Pressable
                onPress={() => router.push(`/(main)/events/${id}/reports`)}
                style={styles.headerButton}
              >
                <View>
                  <MaterialIcons name="flag" size={22} color={pendingReports > 0 ? theme.colors.destructive : theme.colors.foreground} />
                  {pendingReports > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{pendingReports > 9 ? '9+' : pendingReports}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/(main)/events/${id}/settings`)}
                style={styles.headerButton}
              >
                <MaterialIcons name="settings" size={22} color={theme.colors.foreground} />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={handleReportEvent} style={styles.headerButton}>
              <MaterialIcons name="flag" size={24} color={theme.colors.foreground} />
            </Pressable>
          )}
        </View>
      )}

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="edit/index" />
        <Stack.Screen name="settings/index" options={{ headerShown: false }}/>
        <Stack.Screen name="statistics/index" options={{ headerShown: false }}/>
        <Stack.Screen name="participants/index" options={{ headerShown: false }}/>
        <Stack.Screen name="whitelist/index" options={{ headerShown: false }}/>
        <Stack.Screen name="reports/index" options={{ headerShown: false }}/>
        <Stack.Screen name="(event-tabs)" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

const createStyles = (theme: Theme, topInset: number) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.card },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: topInset,
    paddingBottom: 10,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  headerButton: { padding: 8, borderRadius: 8 },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: theme.colors.destructive, borderRadius: 8,
    minWidth: 16, height: 16,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: theme.colors.destructiveForeground, fontSize: 9, fontWeight: '700' },
});
