// app/(main)/events/[id]/settings/index.tsx
import { eventService, EventResponse } from '@/services/event.service';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://init-app.fr';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const eventUrl = `${WEB_BASE_URL}/events/${id}`;

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await eventService.getEventById(id);
      setEvent(data);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de charger l\'événement', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Découvrez cet événement : ${event?.name}\n${eventUrl}`,
        url: eventUrl,
        title: event?.name || 'Événement Init',
      });
    } catch {}
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer l\'événement',
      'Cette action est irréversible. Tous les participants seront désincrits.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await eventService.deleteEvent(id);
              Alert.alert('Succès', 'Événement supprimé', [
                { text: 'OK', onPress: () => router.push('/events') },
              ]);
            } catch (err: any) {
              Alert.alert('Erreur', err.message || 'Impossible de supprimer');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1271FF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <MaterialIcons name="arrow-back" size={24} color="#303030" />
        </Pressable>
        <Text style={styles.headerTitle}>Paramètres</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {event?.name && (
          <Text style={styles.eventName}>{event.name}</Text>
        )}

        {/* Share section */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="share" size={20} color="#1271FF" />
            <Text style={styles.cardTitle}>Partager l'événement</Text>
          </View>

          {/* Link */}
          <View style={styles.linkRow}>
            <MaterialIcons name="link" size={16} color="#9ca3af" />
            <Text style={styles.linkText} numberOfLines={1}>{eventUrl}</Text>
          </View>

          <View style={styles.shareButtons}>
            <Pressable
              style={[styles.shareButton, copied && styles.shareButtonSuccess]}
              onPress={handleCopy}
            >
              <MaterialIcons name={copied ? 'check' : 'content-copy'} size={18} color={copied ? '#fff' : '#303030'} />
              <Text style={[styles.shareButtonText, copied && { color: '#fff' }]}>
                {copied ? 'Copié !' : 'Copier'}
              </Text>
            </Pressable>
            <Pressable style={[styles.shareButton, styles.shareButtonPrimary]} onPress={handleShare}>
              <MaterialIcons name="ios-share" size={18} color="#fff" />
              <Text style={[styles.shareButtonText, { color: '#fff' }]}>Partager</Text>
            </Pressable>
          </View>
        </View>

        {/* Info section */}
        {event && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informations</Text>
            <InfoRow label="Événement public" value={event.is_public ? 'Oui' : 'Non'} />
            <InfoRow label="Liste blanche" value={event.has_whitelist ? 'Activée' : 'Désactivée'} />
            <InfoRow label="Accès par lien" value={event.has_link_access ? 'Activé' : 'Désactivé'} />
            <InfoRow label="Accès par mot de passe" value={event.has_password_access ? 'Activé' : 'Désactivé'} />
            <InfoRow label="Participants max" value={event.max_participants ? String(event.max_participants) : '—'} />

            <Pressable
              style={styles.editButton}
              onPress={() => router.push(`/(main)/events/${id}/edit`)}
            >
              <MaterialIcons name="edit" size={18} color="#fff" />
              <Text style={styles.editButtonText}>Modifier les paramètres</Text>
            </Pressable>
          </View>
        )}

        {/* Danger zone */}
        <View style={[styles.card, styles.dangerCard]}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="delete" size={20} color="#dc2626" />
            <Text style={[styles.cardTitle, { color: '#dc2626' }]}>Zone de danger</Text>
          </View>
          <Text style={styles.dangerText}>
            La suppression de l'événement est irréversible. Tous les participants seront désincrits et toutes les données supprimées.
          </Text>
          <Pressable
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#dc2626" size="small" />
            ) : (
              <>
                <MaterialIcons name="delete-forever" size={18} color="#dc2626" />
                <Text style={styles.deleteButtonText}>Supprimer l'événement</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  headerButton: { padding: 8, borderRadius: 8 },
  headerTitle: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 17, color: '#303030' },
  eventName: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  dangerCard: { borderWidth: 2, borderColor: '#fee2e2' },
  cardTitle: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 15, color: '#303030', marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F5F5F5', borderRadius: 10, padding: 12, marginBottom: 12,
  },
  linkText: { flex: 1, fontSize: 13, color: '#303030' },
  shareButtons: { flexDirection: 'row', gap: 10 },
  shareButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F5F5F5',
  },
  shareButtonPrimary: { backgroundColor: '#303030' },
  shareButtonSuccess: { backgroundColor: '#22c55e' },
  shareButtonText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 14, color: '#303030' },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  infoLabel: { fontSize: 14, color: '#6b7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#303030' },
  editButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#1271FF', borderRadius: 12, paddingVertical: 14, marginTop: 16,
  },
  editButtonText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 14, color: '#fff' },
  dangerText: { fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 20 },
  deleteButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 2, borderColor: '#dc2626', borderRadius: 12, paddingVertical: 14,
  },
  deleteButtonText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 14, color: '#dc2626' },
});