// app/(main)/events/[id]/edit/index.tsx
import { eventService, CustomField, getFieldId, EventResponse } from '@/services/event.service';
import { useTheme, shared } from '@/context/ThemeContext';
import { type Theme } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

const THEME_OPTIONS = ['Professionnel', 'Musique', 'Sport', 'Cafe', 'Etudiant', 'Fete', 'Général'];

const FIELD_TYPES: { value: CustomField['type']; label: string }[] = [
  { value: 'text', label: 'Texte court' },
  { value: 'textarea', label: 'Texte long' },
  { value: 'number', label: 'Nombre' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Téléphone' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Case à cocher' },
  { value: 'select', label: 'Menu déroulant' },
  { value: 'radio', label: 'Choix unique' },
  { value: 'multiselect', label: 'Choix multiples' },
];

function formatDateTimeLocal(isoStr: string): string {
  if (!isoStr) return '';
  // Returns YYYY-MM-DDTHH:MM for datetime input display
  const d = new Date(isoStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseDateTimeLocal(str: string): string {
  // Converts YYYY-MM-DDTHH:MM to ISO string
  if (!str) return '';
  return new Date(str).toISOString();
}

function SectionHeader({ title, styles }: { title: string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

function ToggleRow({
  label,
  subtitle,
  value,
  onValueChange,
  styles,
  theme,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}) {
  return (
    <Pressable style={styles.toggleRow} onPress={() => onValueChange(!value)}>
      <View style={styles.toggleTextContainer}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {subtitle && <Text style={styles.toggleSubtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={theme.colors.card}
      />
    </Pressable>
  );
}

function DateTimeInput({
  label,
  value,
  onChange,
  required,
  placeholder,
  styles,
  theme,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || 'YYYY-MM-DDTHH:MM'}
        placeholderTextColor={theme.colors.placeholder}
        autoCapitalize="none"
      />
      <Text style={styles.inputHint}>Format : 2026-06-15T19:00</Text>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// CustomField Editor Modal (inline)
// ──────────────────────────────────────────────────────────────────────────────
function CustomFieldEditor({
  field,
  onSave,
  onCancel,
  styles,
  theme,
}: {
  field: CustomField;
  onSave: (f: CustomField) => void;
  onCancel: () => void;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}) {
  const [current, setCurrent] = useState<CustomField>({ ...field });
  const [newOption, setNewOption] = useState('');

  const needsOptions = ['select', 'radio', 'multiselect'].includes(current.type);

  const addOption = () => {
    if (!newOption.trim()) return;
    setCurrent(prev => ({ ...prev, options: [...(prev.options || []), newOption.trim()] }));
    setNewOption('');
  };

  const removeOption = (idx: number) => {
    setCurrent(prev => ({ ...prev, options: prev.options?.filter((_, i) => i !== idx) }));
  };

  const handleSave = () => {
    if (!current.label.trim()) {
      Alert.alert('Erreur', 'Le label est requis');
      return;
    }
    if (needsOptions && (!current.options || current.options.length === 0)) {
      Alert.alert('Erreur', 'Ajoutez au moins une option');
      return;
    }
    onSave(current);
  };

  return (
    <View style={styles.fieldEditorContainer}>
      <View style={styles.fieldEditorHeader}>
        <Text style={styles.fieldEditorTitle}>
          {field.label ? 'Modifier le champ' : 'Nouveau champ'}
        </Text>
        <Pressable onPress={onCancel} style={styles.closeButton}>
          <MaterialIcons name="close" size={22} color={theme.colors.foreground} />
        </Pressable>
      </View>

      {/* Label */}
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Question <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={current.label}
          onChangeText={t => setCurrent(prev => ({ ...prev, label: t }))}
          placeholder="Ex: Quel est votre profil LinkedIn ?"
          placeholderTextColor={theme.colors.placeholder}
        />
      </View>

      {/* Type selector */}
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Type de champ</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {FIELD_TYPES.map(t => (
            <Pressable
              key={t.value}
              style={[styles.chip, current.type === t.value && styles.chipActive]}
              onPress={() => setCurrent(prev => ({ ...prev, type: t.value }))}
            >
              <Text style={[styles.chipText, current.type === t.value && styles.chipTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Required toggle */}
      <ToggleRow
        label="Champ requis"
        subtitle="Obligatoire lors de l'inscription"
        value={!!current.required}
        onValueChange={v => setCurrent(prev => ({ ...prev, required: v }))}
        styles={styles}
        theme={theme}
      />

      {/* Options (for select/radio/multiselect) */}
      {needsOptions && (
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Options <Text style={styles.required}>*</Text></Text>
          {(current.options || []).map((opt, idx) => (
            <View key={idx} style={styles.optionRow}>
              <Text style={styles.optionText}>{opt}</Text>
              <Pressable onPress={() => removeOption(idx)}>
                <MaterialIcons name="close" size={18} color={theme.colors.destructive} />
              </Pressable>
            </View>
          ))}
          <View style={styles.addOptionRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={newOption}
              onChangeText={setNewOption}
              placeholder="Ajouter une option..."
              placeholderTextColor={theme.colors.placeholder}
              onSubmitEditing={addOption}
              returnKeyType="done"
            />
            <Pressable style={styles.addOptionButton} onPress={addOption}>
              <MaterialIcons name="add" size={22} color={theme.colors.primaryForeground} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.fieldEditorActions}>
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </Pressable>
        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Enregistrer</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────────────────────────────────────────
export default function EditEventScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventTheme, setEventTheme] = useState('Professionnel');
  const [hasPhysicalEvent, setHasPhysicalEvent] = useState(false);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [location, setLocation] = useState('');
  const [appStartAt, setAppStartAt] = useState('');
  const [appEndAt, setAppEndAt] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [hasWhitelist, setHasWhitelist] = useState(false);
  const [hasLinkAccess, setHasLinkAccess] = useState(true);
  const [hasPasswordAccess, setHasPasswordAccess] = useState(false);
  const [accessPassword, setAccessPassword] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Custom field editor
  const [editingField, setEditingField] = useState<{ index: number | null; field: CustomField } | null>(null);

  useEffect(() => {
    loadEvent();
  }, [id]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const data = await eventService.getEventById(id);
      populateForm(data);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de charger l\'événement', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (data: EventResponse) => {
    setName(data.name || '');
    setDescription(data.description || '');
    setEventTheme(data.theme || 'Professionnel');
    setHasPhysicalEvent(!!(data.start_at || data.location));
    setStartAt(data.start_at ? formatDateTimeLocal(data.start_at) : '');
    setEndAt(data.end_at ? formatDateTimeLocal(data.end_at) : '');
    setLocation(data.location || '');
    setAppStartAt(data.app_start_at ? formatDateTimeLocal(data.app_start_at) : '');
    setAppEndAt(data.app_end_at ? formatDateTimeLocal(data.app_end_at) : '');
    setMaxParticipants(data.max_participants ? String(data.max_participants) : '');
    setIsPublic(data.is_public ?? true);
    setHasWhitelist(data.has_whitelist ?? false);
    setHasLinkAccess(data.has_link_access ?? true);
    setHasPasswordAccess(data.has_password_access ?? false);
    setCustomFields(data.custom_fields || []);
  };

  const validate = (): string | null => {
    if (!name.trim()) return 'Le nom est requis';
    if (!description.trim()) return 'La description est requise';
    if (!appStartAt) return 'La date de début de l\'app est requise';
    if (!appEndAt) return 'La date de fin de l\'app est requise';
    if (new Date(appEndAt) <= new Date(appStartAt)) return 'La date de fin app doit être après le début';
    if (hasPhysicalEvent) {
      if (!location.trim()) return 'Le lieu est requis pour un événement physique';
      if (!startAt) return 'La date de début de l\'événement physique est requise';
      if (!endAt) return 'La date de fin de l\'événement physique est requise';
      if (new Date(endAt) <= new Date(startAt)) return 'La date de fin doit être après le début';
    }
    const max = parseInt(maxParticipants);
    if (!maxParticipants || isNaN(max) || max < 1) return 'Le nombre de participants doit être > 0';
    if (hasPasswordAccess && !accessPassword.trim()) return 'Un mot de passe est requis';
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      Alert.alert('Erreur', error);
      return;
    }

    setSaving(true);
    try {
      const updates: Parameters<typeof eventService.updateEvent>[1] = {
        name: name.trim(),
        description: description.trim(),
        theme: eventTheme,
        app_start_at: parseDateTimeLocal(appStartAt),
        app_end_at: parseDateTimeLocal(appEndAt),
        max_participants: parseInt(maxParticipants),
        is_public: isPublic,
        has_whitelist: hasWhitelist,
        has_link_access: hasLinkAccess,
        has_password_access: hasPasswordAccess,
        custom_fields: customFields.length > 0 ? customFields : undefined,
      };

      if (hasPhysicalEvent) {
        updates.start_at = parseDateTimeLocal(startAt);
        updates.end_at = parseDateTimeLocal(endAt);
        updates.location = location.trim();
      } else {
        updates.start_at = '';
        updates.end_at = '';
        updates.location = '';
      }

      if (hasPasswordAccess && accessPassword) {
        updates.access_password = accessPassword;
      }

      await eventService.updateEvent(id, updates);
      Alert.alert('Succès', 'Événement mis à jour', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de mettre à jour l\'événement');
    } finally {
      setSaving(false);
    }
  };

  const openNewField = () => {
    setEditingField({
      index: null,
      field: { label: '', type: 'text', required: false, options: [] },
    });
  };

  const openEditField = (idx: number) => {
    setEditingField({ index: idx, field: { ...customFields[idx] } });
  };

  const saveField = (field: CustomField) => {
    if (editingField!.index === null) {
      // Check duplicate label
      const newId = getFieldId(field.label);
      if (customFields.some(f => getFieldId(f.label) === newId)) {
        Alert.alert('Erreur', 'Un champ avec ce label existe déjà');
        return;
      }
      setCustomFields(prev => [...prev, field]);
    } else {
      setCustomFields(prev => {
        const updated = [...prev];
        updated[editingField!.index!] = field;
        return updated;
      });
    }
    setEditingField(null);
  };

  const deleteField = (idx: number) => {
    Alert.alert('Supprimer le champ', 'Confirmer la suppression ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => setCustomFields(prev => prev.filter((_, i) => i !== idx)),
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Show field editor inline (full screen overlay feel)
  if (editingField) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: theme.colors.card }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.editorHeader}>
          <Pressable onPress={() => setEditingField(null)} style={styles.headerButton}>
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.foreground} />
          </Pressable>
          <Text style={styles.editorHeaderTitle}>Champ personnalisé</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <CustomFieldEditor
            field={editingField.field}
            onSave={saveField}
            onCancel={() => setEditingField(null)}
            styles={styles}
            theme={theme}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Modifier l'événement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* -- Informations generales -- */}
        <View style={styles.card}>
          <SectionHeader title="Informations générales" styles={styles} />

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Nom <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={t => setName(t.slice(0, 100))}
              placeholder="Ex: Soirée Networking"
              placeholderTextColor={theme.colors.placeholder}
            />
            <Text style={[styles.inputHint, name.length >= 90 && styles.inputHintWarn]}>
              {name.length}/100
            </Text>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Thème</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {THEME_OPTIONS.map(t => (
                <Pressable
                  key={t}
                  style={[styles.chip, eventTheme === t && styles.chipActive]}
                  onPress={() => setEventTheme(t)}
                >
                  <Text style={[styles.chipText, eventTheme === t && styles.chipTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Description <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={t => setDescription(t.slice(0, 1000))}
              placeholder="Décrivez votre événement..."
              placeholderTextColor={theme.colors.placeholder}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={[styles.inputHint, description.length >= 900 && styles.inputHintWarn]}>
              {description.length}/1000
            </Text>
          </View>
        </View>

        {/* -- Disponibilite app -- */}
        <View style={styles.card}>
          <SectionHeader title="Disponibilité de l'app *" styles={styles} />
          <Text style={styles.cardSubtitle}>
            Période pendant laquelle les utilisateurs peuvent swiper, matcher et discuter.
          </Text>

          <DateTimeInput
            label="Début"
            value={appStartAt}
            onChange={setAppStartAt}
            required
            placeholder="2026-06-15T19:00"
            styles={styles}
            theme={theme}
          />
          <DateTimeInput
            label="Fin"
            value={appEndAt}
            onChange={setAppEndAt}
            required
            placeholder="2026-06-16T02:00"
            styles={styles}
            theme={theme}
          />
        </View>

        {/* -- Evenement physique -- */}
        <View style={styles.card}>
          <SectionHeader title="Événement physique" styles={styles} />
          <ToggleRow
            label="Activer"
            subtitle={hasPhysicalEvent ? 'L\'événement a un lieu et une date' : 'Pas de lieu ni de date physique'}
            value={hasPhysicalEvent}
            onValueChange={setHasPhysicalEvent}
            styles={styles}
            theme={theme}
          />

          {hasPhysicalEvent && (
            <View style={{ marginTop: 12 }}>
              <DateTimeInput
                label="Début de l'événement"
                value={startAt}
                onChange={setStartAt}
                required
                styles={styles}
                theme={theme}
              />
              <DateTimeInput
                label="Fin de l'événement"
                value={endAt}
                onChange={setEndAt}
                required
                styles={styles}
                theme={theme}
              />
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Lieu <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Ex: 12 rue de la Paix, 75001 Paris"
                  placeholderTextColor={theme.colors.placeholder}
                />
              </View>
            </View>
          )}
        </View>

        {/* -- Participants -- */}
        <View style={styles.card}>
          <SectionHeader title="Participants" styles={styles} />
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Maximum <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={maxParticipants}
              onChangeText={setMaxParticipants}
              placeholder="Ex: 50"
              placeholderTextColor={theme.colors.placeholder}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* -- Parametres d'acces -- */}
        <View style={styles.card}>
          <SectionHeader title="Paramètres d'accès" styles={styles} />
          <ToggleRow
            label="Événement public"
            subtitle="Visible par tous les utilisateurs"
            value={isPublic}
            onValueChange={setIsPublic}
            styles={styles}
            theme={theme}
          />
          <ToggleRow
            label="Liste blanche"
            subtitle="Restreindre l'accès à certaines personnes"
            value={hasWhitelist}
            onValueChange={setHasWhitelist}
            styles={styles}
            theme={theme}
          />
          <ToggleRow
            label="Accès par lien"
            subtitle="Autoriser l'inscription via un lien"
            value={hasLinkAccess}
            onValueChange={setHasLinkAccess}
            styles={styles}
            theme={theme}
          />
          <ToggleRow
            label="Accès par mot de passe"
            subtitle="Protéger l'événement par mot de passe"
            value={hasPasswordAccess}
            onValueChange={setHasPasswordAccess}
            styles={styles}
            theme={theme}
          />
          {hasPasswordAccess && (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Nouveau mot de passe</Text>
              <TextInput
                style={styles.input}
                value={accessPassword}
                onChangeText={setAccessPassword}
                placeholder="Laisser vide pour conserver l'ancien"
                placeholderTextColor={theme.colors.placeholder}
                secureTextEntry
              />
            </View>
          )}
        </View>

        {/* -- Champs personnalises -- */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderText}>Champs personnalisés</Text>
            <Pressable style={styles.addFieldButton} onPress={openNewField}>
              <MaterialIcons name="add" size={20} color={theme.colors.primary} />
              <Text style={styles.addFieldButtonText}>Ajouter</Text>
            </Pressable>
          </View>

          {customFields.length === 0 ? (
            <Text style={styles.emptyText}>Aucun champ personnalisé</Text>
          ) : (
            customFields.map((field, idx) => (
              <View key={idx} style={styles.customFieldRow}>
                <View style={styles.customFieldInfo}>
                  <Text style={styles.customFieldLabel}>{field.label}</Text>
                  <Text style={styles.customFieldMeta}>
                    {FIELD_TYPES.find(t => t.value === field.type)?.label}
                    {field.required ? ' · Requis' : ''}
                  </Text>
                </View>
                <View style={styles.customFieldActions}>
                  <Pressable onPress={() => openEditField(idx)} style={styles.iconButton}>
                    <MaterialIcons name="edit" size={18} color={theme.colors.primary} />
                  </Pressable>
                  <Pressable onPress={() => deleteField(idx)} style={styles.iconButton}>
                    <MaterialIcons name="delete" size={18} color={theme.colors.destructive} />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Bottom save button */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.saveEventButton, saving && styles.saveEventButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.primaryForeground} size="small" />
          ) : (
            <>
              <MaterialIcons name="check" size={20} color={theme.colors.primaryForeground} />
              <Text style={styles.saveEventButtonText}>Enregistrer les modifications</Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerButton: { padding: 8, borderRadius: 8 },
  headerTitle: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 17, color: theme.colors.foreground },

  // Editor header (custom field editor)
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  editorHeaderTitle: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 16, color: theme.colors.foreground },

  // Card
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
  },

  // Section header
  sectionHeader: { marginBottom: 12 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderText: {
    fontFamily: 'Poppins',
    fontWeight: '600',
    fontSize: 15,
    color: theme.colors.foreground,
  },
  cardSubtitle: { fontSize: 13, color: theme.colors.mutedForeground, marginBottom: 12, marginTop: -8 },

  // Field
  fieldBlock: { marginBottom: 16 },
  fieldLabel: { fontFamily: 'Poppins', fontWeight: '500', fontSize: 13, color: theme.colors.foreground, marginBottom: 6 },
  required: { color: theme.colors.destructive },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.foreground,
    backgroundColor: theme.colors.card,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  inputHint: { fontSize: 11, color: theme.colors.placeholder, marginTop: 4, textAlign: 'right' },
  inputHintWarn: { color: shared.warning },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary,
  },
  toggleTextContainer: { flex: 1, paddingRight: 12 },
  toggleLabel: { fontFamily: 'Poppins', fontWeight: '500', fontSize: 14, color: theme.colors.foreground },
  toggleSubtitle: { fontSize: 12, color: theme.colors.mutedForeground, marginTop: 2 },

  // Chips (theme / field type)
  chipScroll: { flexDirection: 'row' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    marginRight: 8,
  },
  chipActive: { backgroundColor: theme.colors.accentSolid },
  chipText: { fontSize: 13, color: theme.colors.foreground, fontWeight: '500' },
  chipTextActive: { color: theme.colors.accentSolidText },

  // Custom fields list
  addFieldButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addFieldButtonText: { fontSize: 14, color: theme.colors.primary, fontWeight: '600' },
  emptyText: { fontSize: 13, color: theme.colors.placeholder, textAlign: 'center', paddingVertical: 12 },
  customFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary,
  },
  customFieldInfo: { flex: 1 },
  customFieldLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.foreground },
  customFieldMeta: { fontSize: 12, color: theme.colors.mutedForeground, marginTop: 2 },
  customFieldActions: { flexDirection: 'row', gap: 4 },
  iconButton: { padding: 6, borderRadius: 6 },

  // Custom field editor (modal-like view)
  fieldEditorContainer: { backgroundColor: theme.colors.card, borderRadius: 16 },
  fieldEditorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  fieldEditorTitle: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 16, color: theme.colors.foreground },
  closeButton: { padding: 4 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    marginBottom: 6,
  },
  optionText: { fontSize: 14, color: theme.colors.foreground, flex: 1 },
  addOptionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  addOptionButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldEditorActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
  },
  cancelButtonText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 14, color: theme.colors.foreground },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.accentSolid,
    alignItems: 'center',
  },
  saveButtonText: { fontFamily: 'Poppins', fontWeight: '600', fontSize: 14, color: theme.colors.accentSolidText },

  // Footer save
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  saveEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.accentSolid,
    borderRadius: 14,
    paddingVertical: 16,
  },
  saveEventButtonDisabled: { opacity: 0.6 },
  saveEventButtonText: { fontFamily: 'Poppins', fontWeight: '700', fontSize: 16, color: theme.colors.accentSolidText },
});
