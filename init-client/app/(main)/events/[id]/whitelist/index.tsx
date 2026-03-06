// app/(main)/events/[id]/whitelist/index.tsx
import { whitelistService, type WhitelistEntry, type ImportStats, type CSVPreview } from '@/services/whitelist.service';
import { useTheme, shared } from '@/context/ThemeContext';
import { type Theme } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenLoader } from '@/components/ui/ScreenLoader';
import { SearchBar } from '@/components/ui/SearchBar';
import { StatsBanner } from '@/components/ui/StatsBanner';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SlideUpModal } from '@/components/ui/SlideUpModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

type DisplayStatus = 'registered' | 'pending' | 'removed';

function getDisplayStatus(entry: WhitelistEntry): DisplayStatus {
  if (entry.status === 'removed') return 'removed';
  return entry.user_id ? 'registered' : 'pending';
}

const STATUS_CONFIG: Record<DisplayStatus, { label: string; color: string; bg: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  registered: { label: 'Inscrit',    color: '#22c55e', bg: '#f0fdf4', icon: 'check-circle' },
  pending:    { label: 'En attente', color: '#f97316', bg: '#fff7ed', icon: 'schedule' },
  removed:    { label: 'Retiré',     color: '#6b7280', bg: '#f3f4f6', icon: 'remove-circle' },
};

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  manual: { label: 'Manuel', color: '#6366f1' },
  csv:    { label: 'CSV',    color: '#0891b2' },
  xml:    { label: 'XML',    color: '#d97706' },
};

type ImportStep = 'pick' | 'columns' | 'results';

export default function WhitelistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Data
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [includeRemoved, setIncludeRemoved] = useState(false);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Add
  const [newPhone, setNewPhone] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Edit
  const [editEntry, setEditEntry] = useState<WhitelistEntry | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Import
  const [importStep, setImportStep] = useState<ImportStep>('pick');
  const [importLoading, setImportLoading] = useState(false);
  const [fileContent, setFileContent] = useState('');
  const [fileFormat, setFileFormat] = useState<'csv' | 'xml'>('csv');
  const [csvPreview, setCsvPreview] = useState<CSVPreview | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number | undefined>(undefined);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);

  // Per-item action loading
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Bulk
  const [bulkLoading, setBulkLoading] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const active = entries.filter(e => e.status === 'active');
    return {
      total: active.length,
      registered: active.filter(e => e.user_id).length,
      pending: active.filter(e => !e.user_id).length,
      removed: entries.filter(e => e.status === 'removed').length,
    };
  }, [entries]);

  const load = useCallback(async () => {
    try {
      const list = await whitelistService.getWhitelist(id, includeRemoved);
      setEntries(list);
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, includeRemoved]);

  useEffect(() => { load(); }, [load]);

  // Filtered list
  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (!includeRemoved && e.status === 'removed') return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const displayPhone = whitelistService.formatPhoneDisplay(e.phone);
      return (
        e.phone.includes(q) ||
        displayPhone.includes(q) ||
        `${e.firstname ?? ''} ${e.lastname ?? ''}`.toLowerCase().includes(q)
      );
    });
  }, [entries, search, includeRemoved]);

  // --- Handlers ---

  const handleAdd = async () => {
    if (!newPhone.trim()) {
      Alert.alert('Erreur', 'Entrez un numéro de téléphone');
      return;
    }
    setAddLoading(true);
    try {
      await whitelistService.addPhone(id, newPhone.trim());
      setNewPhone('');
      setShowAddModal(false);
      await load();
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editEntry || !editPhone.trim()) return;
    setEditLoading(true);
    try {
      await whitelistService.updatePhone(id, editEntry.phone, editPhone.trim());
      setShowEditModal(false);
      setEditEntry(null);
      await load();
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const openEdit = (entry: WhitelistEntry) => {
    setEditEntry(entry);
    setEditPhone(entry.phone);
    setShowEditModal(true);
  };

  const handleRemove = (entry: WhitelistEntry) => {
    const isPermanent = entry.status === 'removed';
    Alert.alert(
      isPermanent ? 'Supprimer définitivement' : 'Retirer de la whitelist',
      `${isPermanent ? 'Supprimer définitivement' : 'Retirer'} ${whitelistService.formatPhoneDisplay(entry.phone)} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: isPermanent ? 'Supprimer' : 'Retirer',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(entry.id);
            try {
              await whitelistService.removePhone(id, entry.phone, isPermanent);
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

  const handleReactivate = async (entry: WhitelistEntry) => {
    setActionLoading(entry.id);
    try {
      await whitelistService.reactivatePhone(id, entry.phone);
      await load();
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleSelect = (phone: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  };

  const handleBulkRemove = async (permanent: boolean) => {
    setBulkLoading(true);
    try {
      const phones = Array.from(selected);
      await whitelistService.bulkRemove(id, phones, permanent);
      setSelected(new Set());
      setShowBulkModal(false);
      await load();
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  // --- Import ---

  const openImport = () => {
    setImportStep('pick');
    setFileContent('');
    setCsvPreview(null);
    setSelectedColumn(undefined);
    setImportStats(null);
    setShowImportModal(true);
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'text/xml', 'application/xml', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const ext = asset.name.split('.').pop()?.toLowerCase();
      const format: 'csv' | 'xml' = ext === 'xml' ? 'xml' : 'csv';
      setFileFormat(format);

      // Read file content
      const resp = await fetch(asset.uri);
      const content = await resp.text();
      setFileContent(content);

      if (format === 'csv') {
        // Preview CSV to check if multi-column
        setImportLoading(true);
        try {
          const preview = await whitelistService.previewCSV(id, content);
          setCsvPreview(preview);
          if (preview.headers.length > 1) {
            setImportStep('columns');
          } else {
            // Single column, import directly
            await doImport(content, format, 0);
          }
        } catch (err: any) {
          Alert.alert('Erreur', err.message);
        } finally {
          setImportLoading(false);
        }
      } else {
        // XML: import directly
        await doImport(content, format);
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    }
  };

  const doImport = async (content: string, format: 'csv' | 'xml', colIndex?: number) => {
    setImportLoading(true);
    try {
      const stats = await whitelistService.importContent(id, content, format, colIndex);
      setImportStats(stats);
      setImportStep('results');
      await load();
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setImportLoading(false);
    }
  };

  const handleColumnSelect = async (colIndex: number) => {
    setSelectedColumn(colIndex);
    await doImport(fileContent, fileFormat, colIndex);
  };

  // --- Render ---

  const renderItem = ({ item }: { item: WhitelistEntry }) => {
    const displayStatus = getDisplayStatus(item);
    const cfg = STATUS_CONFIG[displayStatus];
    const sourceCfg = SOURCE_CONFIG[item.source];
    const isLoading = actionLoading === item.id;
    const isActive = item.status === 'active';
    const isSelected = selected.has(item.phone);

    return (
      <View style={styles.row}>
        {isActive && (
          <Pressable onPress={() => toggleSelect(item.phone)} style={styles.checkbox} hitSlop={8}>
            <MaterialIcons
              name={isSelected ? 'check-box' : 'check-box-outline-blank'}
              size={22}
              color={isSelected ? theme.colors.primary : theme.colors.mutedForeground}
            />
          </Pressable>
        )}
        <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
        <View style={styles.rowInfo}>
          <Text style={styles.rowPhone}>{whitelistService.formatPhoneDisplay(item.phone)}</Text>
          {(item.firstname || item.lastname) && (
            <Text style={styles.rowName}>{item.firstname} {item.lastname}</Text>
          )}
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
              <MaterialIcons name={cfg.icon} size={12} color={cfg.color} />
              <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            {sourceCfg && (
              <View style={[styles.sourceBadge, { borderColor: sourceCfg.color }]}>
                <Text style={[styles.badgeText, { color: sourceCfg.color }]}>{sourceCfg.label}</Text>
              </View>
            )}
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.mutedForeground} />
        ) : isActive ? (
          <View style={styles.rowActions}>
            <Pressable onPress={() => openEdit(item)} hitSlop={6}>
              <MaterialIcons name="edit" size={18} color={theme.colors.mutedForeground} />
            </Pressable>
            <Pressable onPress={() => handleRemove(item)} hitSlop={6}>
              <MaterialIcons name="remove-circle-outline" size={18} color={shared.error} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.rowActions}>
            <Pressable onPress={() => handleReactivate(item)} hitSlop={6}>
              <MaterialIcons name="undo" size={18} color={shared.success} />
            </Pressable>
            <Pressable onPress={() => handleRemove(item)} hitSlop={6}>
              <MaterialIcons name="delete-forever" size={18} color={shared.error} />
            </Pressable>
          </View>
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
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={styles.headerBtn} onPress={openImport}>
              <MaterialIcons name="file-upload" size={20} color={theme.colors.primaryForeground} />
            </Pressable>
            <Pressable style={styles.headerBtn} onPress={() => setShowAddModal(true)}>
              <MaterialIcons name="add" size={20} color={theme.colors.primaryForeground} />
            </Pressable>
          </View>
        }
      />

      <StatsBanner stats={[
        { label: 'Actifs', value: stats.total, color: theme.colors.primary },
        { label: 'Inscrits', value: stats.registered, color: '#22c55e' },
        { label: 'En attente', value: stats.pending, color: '#f97316' },
        { label: 'Retirés', value: stats.removed, color: '#9ca3af' },
      ]} />

      <SearchBar value={search} onChangeText={setSearch} placeholder="Téléphone ou nom..." />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Afficher les retirés</Text>
        <Switch
          value={includeRemoved}
          onValueChange={v => { setIncludeRemoved(v); setLoading(true); }}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor="#fff"
        />
      </View>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <View style={styles.bulkBar}>
          <Text style={styles.bulkText}>{selected.size} sélectionné(s)</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={styles.bulkClearBtn} onPress={() => setSelected(new Set())}>
              <Text style={styles.bulkClearText}>Annuler</Text>
            </Pressable>
            <Pressable style={styles.bulkDeleteBtn} onPress={() => setShowBulkModal(true)}>
              <MaterialIcons name="delete" size={16} color="#fff" />
              <Text style={styles.bulkDeleteText}>Supprimer ({selected.size})</Text>
            </Pressable>
          </View>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 8 }}
        ListEmptyComponent={
          <EmptyState
            icon="playlist-add"
            title={search ? 'Aucun résultat' : 'Whitelist vide'}
            subtitle={search ? 'Essayez un autre terme de recherche' : 'Ajoutez des numéros ou importez un fichier'}
          />
        }
      />

      {/* Add modal */}
      <BottomSheet visible={showAddModal} onClose={() => setShowAddModal(false)}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Ajouter un numéro</Text>
          <Pressable onPress={() => setShowAddModal(false)}>
            <MaterialIcons name="close" size={22} color={theme.colors.foreground} />
          </Pressable>
        </View>
        <Text style={styles.modalSub}>Format international (+33...) ou local (06...)</Text>
        <TextInput
          style={styles.phoneInput}
          value={newPhone}
          onChangeText={setNewPhone}
          placeholder="+33612345678"
          placeholderTextColor={theme.colors.placeholder}
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
        />
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

      {/* Edit modal */}
      <BottomSheet visible={showEditModal} onClose={() => setShowEditModal(false)}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Modifier le numéro</Text>
          <Pressable onPress={() => setShowEditModal(false)}>
            <MaterialIcons name="close" size={22} color={theme.colors.foreground} />
          </Pressable>
        </View>
        <Text style={styles.modalSub}>
          Ancien : {editEntry ? whitelistService.formatPhoneDisplay(editEntry.phone) : ''}
        </Text>
        <TextInput
          style={styles.phoneInput}
          value={editPhone}
          onChangeText={setEditPhone}
          placeholder="+33612345678"
          placeholderTextColor={theme.colors.placeholder}
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.modalActions}>
          <Pressable style={styles.cancelBtn} onPress={() => setShowEditModal(false)} disabled={editLoading}>
            <Text style={styles.cancelBtnText}>Annuler</Text>
          </Pressable>
          <Pressable style={styles.confirmBtn} onPress={handleEdit} disabled={editLoading}>
            {editLoading ? (
              <ActivityIndicator color={theme.colors.primaryForeground} size="small" />
            ) : (
              <Text style={styles.confirmBtnText}>Modifier</Text>
            )}
          </Pressable>
        </View>
      </BottomSheet>

      {/* Import modal */}
      <SlideUpModal visible={showImportModal} onRequestClose={() => setShowImportModal(false)}>
        <View style={styles.importContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Importer un fichier</Text>
            <Pressable onPress={() => setShowImportModal(false)}>
              <MaterialIcons name="close" size={22} color={theme.colors.foreground} />
            </Pressable>
          </View>

          {importStep === 'pick' && (
            <View style={styles.importContent}>
              <Text style={styles.modalSub}>
                Formats acceptés : CSV, TXT, XML{'\n'}
                Le fichier doit contenir des numéros de téléphone.
              </Text>
              <Pressable style={styles.pickFileBtn} onPress={pickFile} disabled={importLoading}>
                {importLoading ? (
                  <ActivityIndicator color={theme.colors.primaryForeground} size="small" />
                ) : (
                  <>
                    <MaterialIcons name="folder-open" size={22} color={theme.colors.primaryForeground} />
                    <Text style={styles.pickFileBtnText}>Choisir un fichier</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {importStep === 'columns' && csvPreview && (
            <View style={styles.importContent}>
              <Text style={styles.modalSub}>
                Le fichier contient {csvPreview.headers.length} colonnes.{'\n'}
                Sélectionnez la colonne contenant les numéros :
              </Text>
              <ScrollView style={styles.columnsScroll} contentContainerStyle={{ gap: 8 }}>
                {csvPreview.headers.map(h => (
                  <Pressable
                    key={h.index}
                    style={[styles.columnBtn, selectedColumn === h.index && styles.columnBtnActive]}
                    onPress={() => handleColumnSelect(h.index)}
                    disabled={importLoading}
                  >
                    <Text style={[styles.columnBtnText, selectedColumn === h.index && styles.columnBtnTextActive]}>
                      {h.name}
                    </Text>
                    {csvPreview.preview[0]?.[h.index] && (
                      <Text style={styles.columnPreview}>
                        ex: {csvPreview.preview[0][h.index]}
                      </Text>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
              {importLoading && (
                <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 16 }} />
              )}
            </View>
          )}

          {importStep === 'results' && importStats && (
            <View style={styles.importContent}>
              <View style={styles.importStatsGrid}>
                <ImportStatItem label="Total traités" value={importStats.total} color={theme.colors.foreground} theme={theme} />
                <ImportStatItem label="Ajoutés" value={importStats.added} color="#22c55e" theme={theme} />
                <ImportStatItem label="Doublons ignorés" value={importStats.skipped_duplicate} color="#f97316" theme={theme} />
                <ImportStatItem label="Retirés ignorés" value={importStats.skipped_removed} color="#6b7280" theme={theme} />
                <ImportStatItem label="Invalides" value={importStats.invalid} color={shared.error} theme={theme} />
              </View>
              {importStats.errors.length > 0 && (
                <View style={styles.errorsContainer}>
                  <Text style={styles.errorsTitle}>Erreurs :</Text>
                  {importStats.errors.slice(0, 10).map((e, i) => (
                    <Text key={i} style={styles.errorLine}>
                      {e.phone} — {e.reason}
                    </Text>
                  ))}
                  {importStats.errors.length > 10 && (
                    <Text style={styles.errorLine}>...et {importStats.errors.length - 10} autres</Text>
                  )}
                </View>
              )}
              <Pressable style={styles.confirmBtn} onPress={() => setShowImportModal(false)}>
                <Text style={styles.confirmBtnText}>Fermer</Text>
              </Pressable>
            </View>
          )}
        </View>
      </SlideUpModal>

      {/* Bulk delete modal */}
      <BottomSheet visible={showBulkModal} onClose={() => setShowBulkModal(false)}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Supprimer {selected.size} entrée(s)</Text>
          <Pressable onPress={() => setShowBulkModal(false)}>
            <MaterialIcons name="close" size={22} color={theme.colors.foreground} />
          </Pressable>
        </View>
        <Text style={styles.modalSub}>Choisissez le type de suppression :</Text>
        <View style={{ gap: 10, marginTop: 8 }}>
          <Pressable
            style={styles.bulkOptionBtn}
            onPress={() => handleBulkRemove(false)}
            disabled={bulkLoading}
          >
            {bulkLoading ? (
              <ActivityIndicator color={theme.colors.foreground} size="small" />
            ) : (
              <>
                <MaterialIcons name="remove-circle-outline" size={20} color={theme.colors.foreground} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bulkOptionTitle}>Retirer (soft)</Text>
                  <Text style={styles.bulkOptionSub}>Les entrées pourront être réactivées</Text>
                </View>
              </>
            )}
          </Pressable>
          <Pressable
            style={[styles.bulkOptionBtn, { borderColor: shared.error }]}
            onPress={() => handleBulkRemove(true)}
            disabled={bulkLoading}
          >
            {bulkLoading ? (
              <ActivityIndicator color={shared.error} size="small" />
            ) : (
              <>
                <MaterialIcons name="delete-forever" size={20} color={shared.error} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bulkOptionTitle, { color: shared.error }]}>Supprimer définitivement</Text>
                  <Text style={styles.bulkOptionSub}>Action irréversible</Text>
                </View>
              </>
            )}
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}

function ImportStatItem({ label, value, color, theme }: { label: string; value: number; color: string; theme: Theme }) {
  return (
    <View style={{ alignItems: 'center', minWidth: '40%', paddingVertical: 8 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color, fontFamily: 'Poppins' }}>{value}</Text>
      <Text style={{ fontSize: 12, color: theme.colors.mutedForeground }}>{label}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  headerBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    padding: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: theme.colors.foreground,
    fontFamily: 'Poppins',
  },
  // Bulk bar
  bulkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  bulkText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.foreground,
    fontFamily: 'Poppins',
  },
  bulkClearBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  bulkClearText: { fontSize: 13, color: theme.colors.mutedForeground },
  bulkDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: shared.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bulkDeleteText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 14,
  },
  checkbox: { padding: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  rowInfo: { flex: 1 },
  rowPhone: {
    fontFamily: 'Poppins',
    fontWeight: '600',
    fontSize: 15,
    color: theme.colors.foreground,
  },
  rowName: { fontSize: 13, color: theme.colors.mutedForeground, marginTop: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  rowActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  // Modals
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    fontFamily: 'Poppins',
    fontWeight: '700',
    fontSize: 17,
    color: theme.colors.foreground,
  },
  modalSub: {
    fontSize: 13,
    color: theme.colors.mutedForeground,
    marginBottom: 14,
    lineHeight: 18,
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: theme.colors.foreground,
    fontFamily: 'monospace',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Poppins',
    fontWeight: '600',
    fontSize: 14,
    color: theme.colors.foreground,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.accentSolid,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: 'Poppins',
    fontWeight: '600',
    fontSize: 14,
    color: theme.colors.accentSolidText,
  },
  // Import
  importContainer: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  importContent: { marginTop: 8 },
  pickFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  pickFileBtnText: {
    fontFamily: 'Poppins',
    fontWeight: '600',
    fontSize: 14,
    color: theme.colors.primaryForeground,
  },
  columnsScroll: { maxHeight: 300 },
  columnBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
  },
  columnBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  columnBtnText: {
    fontFamily: 'Poppins',
    fontWeight: '600',
    fontSize: 14,
    color: theme.colors.foreground,
  },
  columnBtnTextActive: { color: theme.colors.primary },
  columnPreview: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  importStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  errorsContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorsTitle: {
    fontFamily: 'Poppins',
    fontWeight: '600',
    fontSize: 13,
    color: shared.error,
    marginBottom: 6,
  },
  errorLine: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  // Bulk options
  bulkOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
  },
  bulkOptionTitle: {
    fontFamily: 'Poppins',
    fontWeight: '600',
    fontSize: 14,
    color: theme.colors.foreground,
  },
  bulkOptionSub: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
    marginTop: 2,
  },
});
