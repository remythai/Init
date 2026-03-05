// app/(main)/events/[id]/participants/index.tsx
import { eventService } from '@/services/event.service';
import { useTheme, shared } from '@/context/ThemeContext';
import { type Theme } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenLoader } from '@/components/ui/ScreenLoader';
import { Avatar } from '@/components/ui/Avatar';
import { SearchBar } from '@/components/ui/SearchBar';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface Participant {
  user_id: number;
  firstname: string;
  lastname: string;
  mail: string;
  tel?: string;
  registered_at: string;
  profil_info?: Record<string, unknown>;
}

export default function ParticipantsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filtered, setFiltered] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<Participant | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showBlockReason, setShowBlockReason] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(participants);
    } else {
      const q = search.toLowerCase();
      setFiltered(participants.filter(p =>
        `${p.firstname} ${p.lastname}`.toLowerCase().includes(q) ||
        p.mail.toLowerCase().includes(q)
      ));
    }
  }, [search, participants]);

  const load = async () => {
    try {
      const resp = await fetch(`${API_URL}/api/events/${id}/participants`, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      if (!resp.ok) throw new Error('Erreur chargement');
      const data = await resp.json();
      setParticipants(data.data || []);
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getToken = async () => {
    const { authService } = await import('@/services/auth.service');
    return authService.getToken();
  };

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleRemove = (action: 'block' | 'delete') => {
    if (!selectedUser) return;
    if (action === 'block') {
      setShowBlockReason(true);
      return;
    }
    Alert.alert(
      'Retirer le participant',
      `Retirer ${selectedUser.firstname} ${selectedUser.lastname} de l'événement ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: () => executeRemove('delete'),
        },
      ]
    );
  };

  const executeRemove = async (action: 'block' | 'delete', reason?: string) => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      if (action === 'block') {
        await eventService.blockUser(id, selectedUser.user_id, reason);
      } else {
        await eventService.removeParticipant(id, selectedUser.user_id, action);
      }
      setSelectedUser(null);
      setShowBlockReason(false);
      setBlockReason('');
      await load();
      Alert.alert('Succès', action === 'block' ? 'Utilisateur bloqué' : 'Participant retiré');
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Participant }) => (
    <Pressable style={styles.participantRow} onPress={() => setSelectedUser(item)}>
      <Avatar firstname={item.firstname} lastname={item.lastname} />
      <View style={styles.participantInfo}>
        <Text style={styles.participantName}>{item.firstname} {item.lastname}</Text>
        <Text style={styles.participantMail}>{item.mail}</Text>
        <Text style={styles.participantDate}>
          Inscrit le {new Date(item.registered_at).toLocaleDateString('fr-FR')}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={theme.colors.placeholder} />
    </Pressable>
  );

  if (loading) return <ScreenLoader />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScreenHeader title={`Participants (${participants.length})`} />
      <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un participant..." />

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.user_id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {search ? 'Aucun résultat' : 'Aucun participant'}
          </Text>
        }
      />

      {/* Participant detail modal */}
      <BottomSheet visible={!!selectedUser} onClose={() => setSelectedUser(null)}>
        {selectedUser && (
          <>
            <View style={styles.modalHeader}>
              <Avatar firstname={selectedUser.firstname} lastname={selectedUser.lastname} size={56} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalName}>{selectedUser.firstname} {selectedUser.lastname}</Text>
                <Text style={styles.modalMail}>{selectedUser.mail}</Text>
                {selectedUser.tel && <Text style={styles.modalMail}>{selectedUser.tel}</Text>}
              </View>
              <Pressable onPress={() => setSelectedUser(null)}>
                <MaterialIcons name="close" size={22} color={theme.colors.foreground} />
              </Pressable>
            </View>

            <Text style={styles.modalSub}>
              Inscrit le {new Date(selectedUser.registered_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>

            {selectedUser.profil_info && Object.keys(selectedUser.profil_info).length > 0 && (
              <View style={styles.profilInfoBox}>
                <Text style={styles.profilInfoTitle}>Informations d'inscription</Text>
                {Object.entries(selectedUser.profil_info).map(([k, v]) => (
                  <View key={k} style={styles.profilInfoRow}>
                    <Text style={styles.profilInfoKey}>{k}</Text>
                    <Text style={styles.profilInfoValue}>{Array.isArray(v) ? v.join(', ') : String(v)}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.removeButton}
                onPress={() => handleRemove('delete')}
                disabled={actionLoading}
              >
                <MaterialIcons name="person-remove" size={18} color={shared.warning} />
                <Text style={styles.removeButtonText}>Retirer</Text>
              </Pressable>
              <Pressable
                style={styles.blockButton}
                onPress={() => handleRemove('block')}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color={theme.colors.primaryForeground} size="small" />
                ) : (
                  <>
                    <MaterialIcons name="block" size={18} color={theme.colors.primaryForeground} />
                    <Text style={styles.blockButtonText}>Bloquer</Text>
                  </>
                )}
              </Pressable>
            </View>
          </>
        )}
      </BottomSheet>

      {/* Block reason modal */}
      <BottomSheet visible={showBlockReason} onClose={() => setShowBlockReason(false)}>
        <Text style={styles.modalName}>Raison du blocage</Text>
        <Text style={styles.modalSub}>Optionnel — cette raison sera enregistrée</Text>
        <TextInput
          style={[styles.blockReasonInput]}
          value={blockReason}
          onChangeText={setBlockReason}
          placeholder="Ex: Comportement inapproprié..."
          placeholderTextColor={theme.colors.placeholder}
          multiline
        />
        <View style={styles.modalActions}>
          <Pressable style={styles.removeButton} onPress={() => setShowBlockReason(false)}>
            <Text style={[styles.removeButtonText, { color: theme.colors.mutedForeground }]}>Annuler</Text>
          </Pressable>
          <Pressable
            style={styles.blockButton}
            onPress={() => executeRemove('block', blockReason || undefined)}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color={theme.colors.primaryForeground} size="small" />
            ) : (
              <Text style={styles.blockButtonText}>Confirmer le blocage</Text>
            )}
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  empty: { textAlign: 'center', color: theme.colors.placeholder, marginTop: 40, fontSize: 14 },
  participantRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.card, borderRadius: 14, padding: 14,
  },
  participantInfo: { flex: 1 },
  participantName: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 15, color: theme.colors.foreground },
  participantMail: { fontSize: 13, color: theme.colors.mutedForeground, marginTop: 2 },
  participantDate: { fontSize: 11, color: theme.colors.placeholder, marginTop: 2 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  modalName: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 17, color: theme.colors.foreground },
  modalMail: { fontSize: 13, color: theme.colors.mutedForeground, marginTop: 2 },
  modalSub: { fontSize: 12, color: theme.colors.placeholder, marginBottom: 12 },
  profilInfoBox: { backgroundColor: theme.colors.background, borderRadius: 12, padding: 12, marginBottom: 16 },
  profilInfoTitle: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 13, color: theme.colors.foreground, marginBottom: 8 },
  profilInfoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  profilInfoKey: { fontSize: 13, color: theme.colors.mutedForeground, flex: 1 },
  profilInfoValue: { fontSize: 13, color: theme.colors.foreground, flex: 1, textAlign: 'right' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  removeButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: shared.warning,
  },
  removeButtonText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 14, color: shared.warning },
  blockButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: theme.colors.destructive,
  },
  blockButtonText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 14, color: theme.colors.primaryForeground },
  blockReasonInput: {
    flex: 1, fontSize: 15, color: theme.colors.foreground,
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10,
    padding: 12, marginTop: 12, minHeight: 80, textAlignVertical: 'top',
  },
});
