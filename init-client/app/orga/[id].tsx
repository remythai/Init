import { type Theme } from '@/constants/theme';
import { shared, useTheme } from '@/context/ThemeContext';
import { eventService } from '@/services/event.service';
import { transformEventResponse } from '@/utils/event.utils';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface OrgaData {
  id: number;
  name: string;
  description?: string;
  logo?: string;
  banner?: string;
  event_count?: number;
  member_count?: number;
}

export default function OrgaProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

  const [orga, setOrga] = useState<OrgaData | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const loadOrga = async () => {
    try {
      setLoading(true);
      setError(false);
      const data = await eventService.getOrgaProfile(Number(id));
      setOrga(data.orga);
      const transformed = (data.events || []).map(transformEventResponse);
      setEvents(transformed);
    } catch (e) {
      console.error('Error loading orga:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadOrga();
  }, [id]);

  const now = new Date();
  const upcomingEvents = events.filter(e => !e.startAt || new Date(e.startAt) >= now);
  const pastEvents = events.filter(e => e.startAt && new Date(e.startAt) < now);
  const displayedEvents = activeTab === 'upcoming' ? upcomingEvents : pastEvents;

  const getThemeColor = (eventTheme: string) =>
    shared.eventTheme[eventTheme.toLowerCase()] || shared.eventTheme['général'];

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !orga) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="error-outline" size={48} color={theme.colors.mutedForeground} />
        <Text style={styles.errorText}>Impossible de charger l'organisation.</Text>
        <Pressable style={styles.retryButton} onPress={loadOrga}>
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  const logoUri = orga.logo ? `${API_URL}${orga.logo}` : undefined;
  const bannerUri = orga.banner ? `${API_URL}${orga.banner}` : undefined;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          {bannerUri ? (
            <Image source={{ uri: bannerUri }} style={styles.banner} />
          ) : (
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.accentSolid]}
              style={styles.banner}
            />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.bannerOverlay}
          />

          {/* Back button */}
          <Pressable style={[styles.backButton, { top: insets.top + 8 }]} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Pressable>

          {/* Orga info overlay */}
          <View style={styles.heroContent}>
            {logoUri && (
              <Image source={{ uri: logoUri }} style={styles.heroLogo} />
            )}
            <Text style={styles.heroName}>{orga.name}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{orga.event_count || events.length}</Text>
            <Text style={styles.statLabel}>événements</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{orga.member_count || 0}</Text>
            <Text style={styles.statLabel}>membres</Text>
          </View>
        </View>

        {/* Description */}
        {orga.description && (
          <View style={styles.section}>
            <Text style={styles.description}>{orga.description}</Text>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
              À venir ({upcomingEvents.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'past' && styles.tabActive]}
            onPress={() => setActiveTab('past')}
          >
            <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
              Passés ({pastEvents.length})
            </Text>
          </Pressable>
        </View>

        {/* Events list */}
        {displayedEvents.length === 0 ? (
          <View style={styles.emptyEvents}>
            <MaterialIcons name="event-busy" size={40} color={theme.colors.mutedForeground} />
            <Text style={styles.emptyText}>
              {activeTab === 'upcoming'
                ? "Aucun événement à venir pour cette organisation."
                : "Aucun événement passé pour cette organisation."}
            </Text>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {displayedEvents.map((event) => (
              <Pressable
                key={event.id}
                style={styles.eventCard}
                onPress={() => router.push(`/(main)/events/${event.id}` as any)}
              >
                <Image source={{ uri: event.image }} style={styles.eventImage} />
                <View style={styles.eventInfo}>
                  <View style={[styles.themeDot, { backgroundColor: getThemeColor(event.theme) }]} />
                  <View style={styles.eventTexts}>
                    <Text style={styles.eventName} numberOfLines={1}>{event.name}</Text>
                    <Text style={styles.eventDate} numberOfLines={1}>{event.physicalDate}</Text>
                    {event.location && (
                      <Text style={styles.eventLocation} numberOfLines={1}>{event.location}</Text>
                    )}
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={theme.colors.mutedForeground} />
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: theme.colors.background },
    errorText: { fontSize: 15, color: theme.colors.mutedForeground, textAlign: 'center' },
    retryButton: {
      paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8,
      backgroundColor: theme.colors.primary,
    },
    retryText: { color: '#fff', fontWeight: '600' },

    hero: { height: 220, position: 'relative' },
    banner: { width: '100%', height: '100%' },
    bannerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 },
    backButton: {
      position: 'absolute', left: 16, width: 40, height: 40,
      borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center', alignItems: 'center',
    },
    heroContent: {
      position: 'absolute', bottom: 16, left: 16, right: 16,
      flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    heroLogo: {
      width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#fff',
    },
    heroName: {
      fontFamily: 'Poppins-Bold', fontSize: 22, color: '#fff', flex: 1,
      textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },

    statsRow: {
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
      paddingVertical: 20, gap: 32,
    },
    stat: { alignItems: 'center' },
    statNumber: { fontFamily: 'Poppins-Bold', fontSize: 20, color: theme.colors.foreground },
    statLabel: { fontSize: 13, color: theme.colors.mutedForeground },
    statDivider: { width: 1, height: 30, backgroundColor: theme.colors.border },

    section: { paddingHorizontal: 16, marginBottom: 16 },
    description: { fontSize: 14, lineHeight: 22, color: theme.colors.textSecondary },

    tabs: {
      flexDirection: 'row', marginHorizontal: 16, marginBottom: 16,
      borderRadius: 10, backgroundColor: theme.colors.card, overflow: 'hidden',
    },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    tabActive: { backgroundColor: theme.colors.primary },
    tabText: { fontSize: 14, fontWeight: '600', color: theme.colors.mutedForeground },
    tabTextActive: { color: '#fff' },

    emptyEvents: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyText: { fontSize: 14, color: theme.colors.mutedForeground, textAlign: 'center', paddingHorizontal: 32 },

    eventsList: { paddingHorizontal: 16, gap: 10 },
    eventCard: {
      backgroundColor: theme.colors.card, borderRadius: 12, overflow: 'hidden',
      shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    eventImage: { width: '100%', height: 120 },
    eventInfo: {
      flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10,
    },
    themeDot: { width: 8, height: 8, borderRadius: 4 },
    eventTexts: { flex: 1 },
    eventName: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 14, color: theme.colors.foreground },
    eventDate: { fontSize: 12, color: theme.colors.mutedForeground, marginTop: 2 },
    eventLocation: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  });
