// app/(main)/events/[id]/whitelist/index.tsx
import { authService } from '@/services/auth.service';
import { useTheme, shared } from '@/context/ThemeContext';
import { type Theme } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenLoader } from '@/components/ui/ScreenLoader';
import { SearchBar } from '@/components/ui/SearchBar';
import { FilterTabs } from '@/components/ui/FilterTabs';
import { StatsBanner } from '@/components/ui/StatsBanner';
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

type WhitelistStatus = 'pending' | 'registered' | 'removed';

interface WhitelistEntry {
  id: number;
  phone_number: string;
  status: WhitelistStatus;
  created_at: string;
  firstname?: string;
  lastname?: string;
}

const STATUS_CONFIG: Record<WhitelistStatus, { label: string; color: string; bg: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  pending:    { label: 'En attente', color: '#f97316', bg: '#fff7ed', icon: 'schedule' },
  registered: { label: 'Inscrit',    color: '#22c55e', bg: '#f0fdf4', icon: 'check-circle' },
  removed:    { label: 'Retiré',     color: '#6b7280', bg: '#f3f4f6', icon: 'remove-circle' },
};

const FILTER_TABS: Array<{ key: string; label: string }> = [
  { key: 'all',        label: 'Tous' },
  { key: 'pending',    label: 'En attente' },
  { key: 'registered', label: 'Inscrits' },
  { key: 'removed',    label: 'Retirés' },
];

export default function WhitelistScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<WhitelistStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNumbers, setNewNumbers] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, registered: 0, removed: 0 });

  useEffect(() => { load(); }, [id]);

  const authedFetch = async (url: string, opts?: RequestInit) => {
    const token = await authService.getToken();
    return fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) } });
  };

  const load = async () => {
    try {
      const resp = await authedFetch(`${API_URL}/api/events/${id}/whitelist`);
      if (!resp.ok) throw new Error('Erreur chargement whitelist');
      const data = await resp.json();
      const list: WhitelistEntry[] = data.data?.whitelist || [];
      setEntries(list);
      setStats({
        total: list.length,
        pending: list.filter(e => e.status === 'pending').length,
        registered: list.filter(e => e.status === 'registered').length,
        removed: list.filter(e => e.status === 'removed').length,
      });
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAdd = async () => {
    const lines = newNumbers.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      Alert.alert('Erreur', 'Entrez au moins un numéro');
      return;
    }
    setAddLoading(true);
    try {
      const resp = await authedFetch(`${API_URL}/api/events/${id}/whitelist`, {
        method: 'POST',
        body: JSON.stringify({ phone_numbers: lines }),
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || 'Erreur lors de l\'ajout');
      }
      setNewNumbers('');
      setShowAddModal(false);
      await load();
      Alert.alert('Succès', `${lines.length} numéro(s) ajouté(s)`);
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemove = (entry: WhitelistEntry) => {
    Alert.alert(
      'Retirer de la whitelist',
      `Retirer ${entry.phone_number} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(entry.id);
            try {
              const resp = await authedFetch(`${API_URL}/api/events/${id}/whitelist/${entry.id}`, { method: 'DELETE' });
              if (!resp.ok) throw new Error('Erreur suppression');
              await load();
            } catch (err: any) {
              Alert.alert('Erreur', err.message);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const filtered = entries.filter(e => {
    const matchFilter = filter === 'all' || e.status === filter;
    const matchSearch = !search.trim() ||
      e.phone_number.includes(search) ||
      `${e.firstname ?? ''} ${e.lastname ?? ''}`.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const renderItem = ({ item }: { item: WhitelistEntry }) => {
    const cfg = STATUS_CONFIG[item.status];
    const isLoading = actionLoading === item.id;
    return (
      <View style={styles.row}>
        <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
        <View style={styles.rowInfo}>
          <Text style={styles.rowPhone}>{item.phone_number}</Text>
          {(item.firstname || item.lastname) && (
            <Text style={styles.rowName}>{item.firstname} {item.lastname}</Text>
          )}
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <MaterialIcons name={cfg.icon} size={12} color={cfg.color} />
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        {item.status !== 'removed' && (
          <Pressable
            style={styles.removeBtn}
            onPress={() => handleRemove(item)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.destructive} />
            ) : (
              <MaterialIcons name="close" size={18} color={theme.colors.destructive} />
            )}
          </Pressable>
        )}
      </View>
    );
  };

  if (loading) return <ScreenLoader />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScreenHeader
        title="Whitelist"
        rightAction={
          <Pressable style={styles.addBtn} onPress={() => setShowAddModal(true)}>
            <MaterialIcons name="add" size={22} color={theme.colors.primaryForeground} />
          </Pressable>
        }
      />

      <StatsBanner stats={[
        { label: 'Total', value: stats.total, color: theme.colors.primaryForeground },
        { label: 'En attente', value: stats.pending, color: '#f97316' },
        { label: 'Inscrits', value: stats.registered, color: '#22c55e' },
        { label: 'Retirés', value: stats.removed, color: '#9ca3af' },
      ]} />

      <SearchBar value={search} onChangeText={setSearch} placeholder="Numéro ou nom..." />
      <FilterTabs tabs={FILTER_TABS} selected={filter} onSelect={k => setFilter(k as WhitelistStatus | 'all')} />

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.primary} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 8 }}
        ListEmptyComponent={<Text style={styles.empty}>{search || filter !== 'all' ? 'Aucun résultat' : 'Whitelist vide'}</Text>}
      />

      {/* Add modal */}
      <BottomSheet visible={showAddModal} onClose={() => setShowAddModal(false)}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Ajouter des numéros</Text>
          <Pressable onPress={() => setShowAddModal(false)}>
            <MaterialIcons name="close" size={22} color={theme.colors.foreground} />
          </Pressable>
        </View>
        <Text style={styles.modalSub}>Un numéro par ligne, format international (+33...) ou local</Text>
        <TextInput
          style={styles.numbersInput}
          value={newNumbers}
          onChangeText={setNewNumbers}
          placeholder={'+33612345678\n+33698765432\n0612345678'}
          placeholderTextColor={theme.colors.placeholder}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.countHint}>
          {newNumbers.split('\n').filter(l => l.trim()).length} numéro(s)
        </Text>
        <View style={styles.modalActions}>
          <Pressable style={styles.cancelBtn} onPress={() => setShowAddModal(false)} disabled={addLoading}>
            <Text style={styles.cancelBtnText}>Annuler</Text>
          </Pressable>
          <Pressable style={styles.confirmBtn} onPress={handleAdd} disabled={addLoading}>
            {addLoading ? (
              <ActivityIndicator color={theme.colors.primaryForeground} size="small" />
            ) : (
              <Text style={styles.confirmBtnText}>Ajouter</Text>
            )}
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  addBtn: { backgroundColor: theme.colors.primary, borderRadius: 10, padding: 8 },
  empty: { textAlign: 'center', color: theme.colors.placeholder, marginTop: 40, fontSize: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.card, borderRadius: 14, padding: 14,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  rowInfo: { flex: 1 },
  rowPhone: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 15, color: theme.colors.foreground },
  rowName: { fontSize: 13, color: theme.colors.mutedForeground, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  removeBtn: { padding: 6 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  modalTitle: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 17, color: theme.colors.foreground },
  modalSub: { fontSize: 13, color: theme.colors.mutedForeground, marginBottom: 14 },
  numbersInput: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12,
    padding: 14, fontSize: 14, color: theme.colors.foreground, minHeight: 140,
    textAlignVertical: 'top', fontFamily: 'monospace',
  },
  countHint: { fontSize: 12, color: theme.colors.placeholder, marginTop: 6, textAlign: 'right' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: theme.colors.background, alignItems: 'center' },
  cancelBtnText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 14, color: theme.colors.foreground },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: theme.colors.accentSolid, alignItems: 'center' },
  confirmBtnText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 14, color: theme.colors.accentSolidText },
});
