// app/(main)/events/[id]/participants/index.tsx
import { eventService } from '@/services/event.service';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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

function Avatar({ firstname, lastname, size = 44 }: { firstname: string; lastname: string; size?: number }) {
  const initials = `${firstname?.[0] ?? ''}${lastname?.[0] ?? ''}`.toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

export default function ParticipantsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
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
      setParticipants(data.data?.participants || []);
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
      <MaterialIcons name="chevron-right" size={20} color="#9ca3af" />
    </Pressable>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1271FF" /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <MaterialIcons name="arrow-back" size={24} color="#303030" />
        </Pressable>
        <Text style={styles.headerTitle}>Participants ({participants.length})</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <MaterialIcons name="search" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un participant..."
          placeholderTextColor="#9ca3af"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={18} color="#9ca3af" />
          </Pressable>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.user_id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1271FF" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {search ? 'Aucun résultat' : 'Aucun participant'}
          </Text>
        }
      />

      {/* Participant detail modal */}
      <Modal visible={!!selectedUser} animationType="slide" transparent onRequestClose={() => setSelectedUser(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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
                    <MaterialIcons name="close" size={22} color="#303030" />
                  </Pressable>
                </View>

                <Text style={styles.modalSub}>
                  Inscrit le {new Date(selectedUser.registered_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>

                {/* Profil info */}
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
                    <MaterialIcons name="person-remove" size={18} color="#f97316" />
                    <Text style={styles.removeButtonText}>Retirer</Text>
                  </Pressable>
                  <Pressable
                    style={styles.blockButton}
                    onPress={() => handleRemove('block')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <MaterialIcons name="block" size={18} color="#fff" />
                        <Text style={styles.blockButtonText}>Bloquer</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Block reason modal */}
      <Modal visible={showBlockReason} animationType="slide" transparent onRequestClose={() => setShowBlockReason(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalName}>Raison du blocage</Text>
            <Text style={styles.modalSub}>Optionnel — cette raison sera enregistrée</Text>
            <TextInput
              style={[styles.searchInput, { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginTop: 12, minHeight: 80, textAlignVertical: 'top' }]}
              value={blockReason}
              onChangeText={setBlockReason}
              placeholder="Ex: Comportement inapproprié..."
              placeholderTextColor="#9ca3af"
              multiline
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.removeButton} onPress={() => setShowBlockReason(false)}>
                <Text style={[styles.removeButtonText, { color: '#6b7280' }]}>Annuler</Text>
              </Pressable>
              <Pressable
                style={styles.blockButton}
                onPress={() => executeRemove('block', blockReason || undefined)}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.blockButtonText}>Confirmer le blocage</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#303030' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 14 },
  avatar: { backgroundColor: '#303030', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  participantRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
  },
  participantInfo: { flex: 1 },
  participantName: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 15, color: '#303030' },
  participantMail: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  participantDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  modalName: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 17, color: '#303030' },
  modalMail: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  modalSub: { fontSize: 12, color: '#9ca3af', marginBottom: 12 },
  profilInfoBox: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 12, marginBottom: 16 },
  profilInfoTitle: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 13, color: '#303030', marginBottom: 8 },
  profilInfoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  profilInfoKey: { fontSize: 13, color: '#6b7280', flex: 1 },
  profilInfoValue: { fontSize: 13, color: '#303030', flex: 1, textAlign: 'right' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  removeButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#f97316',
  },
  removeButtonText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 14, color: '#f97316' },
  blockButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: '#dc2626',
  },
  blockButtonText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 14, color: '#fff' },
});