// app/(main)/events/[id]/_layout.tsx
import { authService } from '@/services/auth.service';
import { eventService } from '@/services/event.service';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, usePathname, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

export default function EventLayout() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const segments = useSegments();
  const pathname = usePathname();

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
            <MaterialIcons name="arrow-back" size={24} color="#303030" />
          </Pressable>

          {userType === 'organizer' ? (
            /* Orga: show management action buttons */
            <View style={styles.headerRight}>
              <Pressable
                onPress={() => router.push(`/(main)/events/${id}/edit`)}
                style={styles.headerButton}
              >
                <MaterialIcons name="edit" size={22} color="#1271FF" />
              </Pressable>
              <Pressable
                onPress={() => router.push(`/(main)/events/${id}/statistics`)}
                style={styles.headerButton}
              >
                <MaterialIcons name="bar-chart" size={22} color="#303030" />
              </Pressable>
              <Pressable
                onPress={() => router.push(`/(main)/events/${id}/participants`)}
                style={styles.headerButton}
              >
                <MaterialIcons name="people" size={22} color="#303030" />
              </Pressable>
              <Pressable
                onPress={() => router.push(`/(main)/events/${id}/reports`)}
                style={styles.headerButton}
              >
                <View>
                  <MaterialIcons name="flag" size={22} color={pendingReports > 0 ? '#dc2626' : '#303030'} />
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
                <MaterialIcons name="settings" size={22} color="#303030" />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={handleReportEvent} style={styles.headerButton}>
              <MaterialIcons name="flag" size={24} color="#303030" />
            </Pressable>
          )}
        </View>
      )}

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="edit/index" />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="statistics/index" />
        <Stack.Screen name="participants/index" />
        <Stack.Screen name="whitelist/index" />
        <Stack.Screen name="reports/index" />
        <Stack.Screen name="(event-tabs)" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  headerButton: { padding: 8, borderRadius: 8 },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#dc2626', borderRadius: 8,
    minWidth: 16, height: 16,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
});