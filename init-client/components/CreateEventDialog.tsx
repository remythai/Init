// components/CreateEventDialog.tsx
import { eventService } from "@/services/event.service";
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CustomFieldsBuilder } from "./CustomEventBuilder";

interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'checkbox' | 'radio' | 'select' | 'multiselect';
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

interface CreateEventDialogProps {
  onEventCreated: () => void;
}

export function CreateEventDialog({ onEventCreated }: CreateEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showCustomFieldForm, setShowCustomFieldForm] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [currentField, setCurrentField] = useState<CustomField>({
    id: '',
    label: '',
    type: 'text',
    required: false,
    options: [],
  });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_at: "",
    end_at: "",
    location: "",
    max_participants: "",
    is_public: true,
    has_whitelist: false,
    has_link_access: true,
    has_password_access: false,
    access_password: "",
    cooldown: "",
    theme: "Professionnel",
  });

  const [error, setError] = useState("");

  const fieldTypes = [
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

  const [newOption, setNewOption] = useState({ value: '', label: '' });

  const parseDateTime = (dateStr: string): string | null => {
    try {
      const regex = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/;
      const match = dateStr.trim().match(regex);
      
      if (!match) return null;

      const [, day, month, year, hour, minute] = match;
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );

      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    } catch (err) {
      return null;
    }
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return "Le nom de l'événement est requis";
    }

    if (!formData.description.trim()) {
      return "La description est requise";
    }

    if (!formData.location.trim()) {
      return "Le lieu est requis";
    }

    const maxParticipants = parseInt(formData.max_participants);
    if (isNaN(maxParticipants) || maxParticipants < 1) {
      return "Le nombre de participants doit être supérieur à 0";
    }

    const startDate = parseDateTime(formData.start_at);
    if (!startDate) {
      return "Format de date de début invalide (attendu: JJ/MM/AAAA HH:MM)";
    }

    const endDate = parseDateTime(formData.end_at);
    if (!endDate) {
      return "Format de date de fin invalide (attendu: JJ/MM/AAAA HH:MM)";
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return "La date de fin doit être après la date de début";
    }

    if (new Date(startDate) < new Date()) {
      return "La date de début ne peut pas être dans le passé";
    }

    if (formData.has_password_access && !formData.access_password.trim()) {
      return "Un mot de passe est requis quand l'accès par mot de passe est activé";
    }

    if (formData.cooldown && isNaN(parseInt(formData.cooldown))) {
      return "Le cooldown doit être un nombre";
    }

    return null;
  };

  const handleAddOption = () => {
    if (!newOption.value.trim() || !newOption.label.trim()) {
      Alert.alert("Erreur", "La valeur et le label sont requis");
      return;
    }

    setCurrentField({
      ...currentField,
      options: [...(currentField.options || []), { ...newOption }],
    });
    setNewOption({ value: '', label: '' });
  };

  const handleRemoveOption = (index: number) => {
    const updatedOptions = currentField.options?.filter((_, i) => i !== index) || [];
    setCurrentField({ ...currentField, options: updatedOptions });
  };

  const handleSaveCustomField = () => {
    if (!currentField.id.trim()) {
      Alert.alert("Erreur", "L'ID du champ est requis");
      return;
    }

    if (!currentField.label.trim()) {
      Alert.alert("Erreur", "Le label du champ est requis");
      return;
    }

    if (['select', 'radio', 'multiselect'].includes(currentField.type)) {
      if (!currentField.options || currentField.options.length === 0) {
        Alert.alert("Erreur", "Ce type de champ nécessite au moins une option");
        return;
      }
    }

    if (editingFieldIndex !== null) {
      const updatedFields = [...customFields];
      updatedFields[editingFieldIndex] = currentField;
      setCustomFields(updatedFields);
    } else {
      if (customFields.some(f => f.id === currentField.id)) {
        Alert.alert("Erreur", "Un champ avec cet ID existe déjà");
        return;
      }
      setCustomFields([...customFields, currentField]);
    }

    setCurrentField({
      id: '',
      label: '',
      type: 'text',
      required: false,
      options: [],
    });
    setShowCustomFieldForm(false);
    setEditingFieldIndex(null);
  };

  const handleEditCustomField = (index: number) => {
    setCurrentField({ ...customFields[index] });
    setEditingFieldIndex(index);
    setShowCustomFieldForm(true);
  };

  const handleDeleteCustomField = (index: number) => {
    Alert.alert(
      "Confirmer la suppression",
      "Voulez-vous vraiment supprimer ce champ ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            setCustomFields(customFields.filter((_, i) => i !== index));
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const start_at = parseDateTime(formData.start_at)!;
      const end_at = parseDateTime(formData.end_at)!;

      const eventData: any = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        start_at,
        end_at,
        location: formData.location.trim(),
        max_participants: parseInt(formData.max_participants),
        is_public: formData.is_public,
        has_whitelist: formData.has_whitelist,
        has_link_access: formData.has_link_access,
        has_password_access: formData.has_password_access,
        custom_fields: customFields,
      };

      if (formData.has_password_access && formData.access_password) {
        eventData.access_password = formData.access_password;
      }

      if (formData.cooldown) {
        eventData.cooldown = `${formData.cooldown} hours`;
      }

      await eventService.createEvent(eventData);

      Alert.alert("Succès", "Événement créé avec succès!");

      setFormData({
        name: "",
        description: "",
        start_at: "",
        end_at: "",
        location: "",
        max_participants: "",
        is_public: true,
        has_whitelist: false,
        has_link_access: true,
        has_password_access: false,
        access_password: "",
        cooldown: "",
        theme: "Professionnel",
      });
      setCustomFields([]);

      setOpen(false);
      onEventCreated();
    } catch (err: any) {
      console.error("Erreur création événement:", err);
      Alert.alert(
        "Erreur",
        err.message || "Une erreur est survenue lors de la création de l'événement"
      );
    } finally {
      setLoading(false);
    }
  };

  const themes = [
    "Professionnel",
    "Musique",
    "Sport",
    "Café",
    "Étudiant",
    "Fête",
  ];

  const needsOptions = ['select', 'radio', 'multiselect'].includes(currentField.type);

  return (
    <>
      {/* Floating Action Button */}
      <Pressable style={styles.fab} onPress={() => setOpen(true)}>
        <MaterialIcons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      {/* Modal Principal */}
      <Modal
        visible={open}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Créer un nouvel événement</Text>
              <Pressable onPress={() => setOpen(false)} disabled={loading}>
                <MaterialIcons name="close" size={26} color="#303030" />
              </Pressable>
            </View>

            {/* Form */}
            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Nom */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nom de l'événement *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="Ex: Soirée Networking"
                  placeholderTextColor="#9CA3AF"
                  editable={!loading}
                />
              </View>

              {/* Thème */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Thème *</Text>
                <View style={styles.themeGrid}>
                  {themes.map((theme) => (
                    <Pressable
                      key={theme}
                      style={[
                        styles.themeButton,
                        formData.theme === theme && styles.themeButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, theme })}
                      disabled={loading}
                    >
                      <Text
                        style={[
                          styles.themeButtonText,
                          formData.theme === theme &&
                            styles.themeButtonTextActive,
                        ]}
                      >
                        {theme}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  placeholder="Décrivez votre événement..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  editable={!loading}
                />
              </View>

              {/* Dates */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Date et heure de début *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.start_at}
                  onChangeText={(text) =>
                    setFormData({ ...formData, start_at: text })
                  }
                  placeholder="JJ/MM/AAAA HH:MM"
                  placeholderTextColor="#9CA3AF"
                  editable={!loading}
                />
                <Text style={styles.helperText}>Format: JJ/MM/AAAA HH:MM</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Date et heure de fin *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.end_at}
                  onChangeText={(text) =>
                    setFormData({ ...formData, end_at: text })
                  }
                  placeholder="JJ/MM/AAAA HH:MM"
                  placeholderTextColor="#9CA3AF"
                  editable={!loading}
                />
                <Text style={styles.helperText}>Format: JJ/MM/AAAA HH:MM</Text>
              </View>

              {/* Lieu */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Lieu *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.location}
                  onChangeText={(text) =>
                    setFormData({ ...formData, location: text })
                  }
                  placeholder="Ex: Station F, Paris 13e"
                  placeholderTextColor="#9CA3AF"
                  editable={!loading}
                />
              </View>

              {/* Max Participants */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Nombre maximum de participants *
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.max_participants}
                  onChangeText={(text) =>
                    setFormData({ ...formData, max_participants: text })
                  }
                  placeholder="Ex: 50"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  editable={!loading}
                />
              </View>

              {/* Access Settings */}
              <View style={styles.sectionDivider}>
                <Text style={styles.sectionTitle}>Paramètres d'accès</Text>

                <Pressable
                  style={styles.switchContainer}
                  onPress={() =>
                    setFormData({ ...formData, is_public: !formData.is_public })
                  }
                  disabled={loading}
                >
                  <View style={styles.switchLabel}>
                    <Text style={styles.switchLabelText}>Événement public</Text>
                    <Text style={styles.helperText}>
                      Visible par tous les utilisateurs
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.switch,
                      formData.is_public && styles.switchActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        formData.is_public && styles.switchThumbActive,
                      ]}
                    />
                  </View>
                </Pressable>

                <Pressable
                  style={styles.switchContainer}
                  onPress={() =>
                    setFormData({
                      ...formData,
                      has_whitelist: !formData.has_whitelist,
                    })
                  }
                  disabled={loading}
                >
                  <View style={styles.switchLabel}>
                    <Text style={styles.switchLabelText}>Liste blanche</Text>
                    <Text style={styles.helperText}>
                      Restreindre l'accès à certaines personnes
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.switch,
                      formData.has_whitelist && styles.switchActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        formData.has_whitelist && styles.switchThumbActive,
                      ]}
                    />
                  </View>
                </Pressable>

                <Pressable
                  style={styles.switchContainer}
                  onPress={() =>
                    setFormData({
                      ...formData,
                      has_link_access: !formData.has_link_access,
                    })
                  }
                  disabled={loading}
                >
                  <View style={styles.switchLabel}>
                    <Text style={styles.switchLabelText}>Accès par lien</Text>
                    <Text style={styles.helperText}>
                      Autoriser l'inscription via un lien
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.switch,
                      formData.has_link_access && styles.switchActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        formData.has_link_access && styles.switchThumbActive,
                      ]}
                    />
                  </View>
                </Pressable>

                <Pressable
                  style={styles.switchContainer}
                  onPress={() =>
                    setFormData({
                      ...formData,
                      has_password_access: !formData.has_password_access,
                    })
                  }
                  disabled={loading}
                >
                  <View style={styles.switchLabel}>
                    <Text style={styles.switchLabelText}>Accès par mot de passe</Text>
                    <Text style={styles.helperText}>
                      Protéger l'événement par mot de passe
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.switch,
                      formData.has_password_access && styles.switchActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        formData.has_password_access &&
                          styles.switchThumbActive,
                      ]}
                    />
                  </View>
                </Pressable>

                {formData.has_password_access && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Mot de passe d'accès *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.access_password}
                      onChangeText={(text) =>
                        setFormData({
                          ...formData,
                          access_password: text,
                        })
                      }
                      placeholder="Entrez un mot de passe"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry
                      editable={!loading}
                    />
                  </View>
                )}
              </View>

              {/* Section Custom Fields */}
              <View style={styles.sectionDivider}>
                <CustomFieldsBuilder
                  fields={customFields}
                  onChange={setCustomFields}
                />
              </View>

              {/* Advanced Settings */}
              <View style={styles.sectionDivider}>
                <Text style={styles.sectionTitle}>Paramètres avancés</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Cooldown (en heures)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.cooldown}
                    onChangeText={(text) =>
                      setFormData({ ...formData, cooldown: text })
                    }
                    placeholder="Ex: 24"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    editable={!loading}
                  />
                  <Text style={styles.helperText}>
                    Délai avant de pouvoir s'inscrire à nouveau
                  </Text>
                </View>
              </View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <MaterialIcons name="error-outline" size={20} color="#DC2626" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.cancelButton, loading && styles.buttonDisabled]}
                onPress={() => setOpen(false)}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.submitButton, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    Créer l'événement
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal pour créer/éditer un custom field */}
      <Modal
        visible={showCustomFieldForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomFieldForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingFieldIndex !== null ? 'Modifier' : 'Ajouter'} un champ
              </Text>
              <Pressable onPress={() => {
                setShowCustomFieldForm(false);
                setEditingFieldIndex(null);
                setCurrentField({
                  id: '',
                  label: '',
                  type: 'text',
                  required: false,
                  options: [],
                });
              }}>
                <MaterialIcons name="close" size={26} color="#303030" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>ID du champ *</Text>
                <TextInput
                  style={styles.input}
                  value={currentField.id}
                  onChangeText={(text) =>
                    setCurrentField({ ...currentField, id: text })
                  }
                  placeholder="Ex: linkedin_url"
                  placeholderTextColor="#9CA3AF"
                  editable={editingFieldIndex === null}
                />
                <Text style={styles.helperText}>
                  Identifiant unique (sans espaces)
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Label *</Text>
                <TextInput
                  style={styles.input}
                  value={currentField.label}
                  onChangeText={(text) =>
                    setCurrentField({ ...currentField, label: text })
                  }
                  placeholder="Ex: Profil LinkedIn"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Type de champ *</Text>
                <View style={styles.typeGrid}>
                  {fieldTypes.map((type) => (
                    <Pressable
                      key={type.value}
                      style={[
                        styles.typeButton,
                        currentField.type === type.value && styles.typeButtonActive,
                      ]}
                      onPress={() =>
                        setCurrentField({ ...currentField, type: type.value as any })
                      }
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          currentField.type === type.value &&
                            styles.typeButtonTextActive,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Placeholder (optionnel)</Text>
                <TextInput
                  style={styles.input}
                  value={currentField.placeholder || ''}
                  onChangeText={(text) =>
                    setCurrentField({ ...currentField, placeholder: text })
                  }
                  placeholder="Ex: https://linkedin.com/in/..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <Pressable
                style={styles.switchContainer}
                onPress={() =>
                  setCurrentField({
                    ...currentField,
                    required: !currentField.required,
                  })
                }
              >
                <View style={styles.switchLabel}>
                  <Text style={styles.switchLabelText}>Champ requis</Text>
                  <Text style={styles.helperText}>
                    Obligatoire lors de l'inscription
                  </Text>
                </View>
                <View
                  style={[
                    styles.switch,
                    currentField.required && styles.switchActive,
                  ]}
                >
                  <View
                    style={[
                      styles.switchThumb,
                      currentField.required && styles.switchThumbActive,
                    ]}
                  />
                </View>
              </Pressable>

              {/* Options pour select/radio/multiselect */}
              {needsOptions && (
                <View style={styles.optionsSection}>
                  <Text style={styles.label}>Options *</Text>
                  
                  {currentField.options && currentField.options.length > 0 && (
                    <View style={styles.optionsList}>
                      {currentField.options.map((option, index) => (
                        <View key={index} style={styles.optionItem}>
                          <View style={styles.optionInfo}>
                            <Text style={styles.optionLabel}>{option.label}</Text>
                            <Text style={styles.optionValue}>{option.value}</Text>
                          </View>
                          <Pressable
                            onPress={() => handleRemoveOption(index)}
                            style={styles.iconButton}
                          >
                            <MaterialIcons name="close" size={18} color="#EF4444" />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.addOptionForm}>
                    <View style={styles.optionInputs}>
                      <TextInput
                        style={[styles.input, styles.optionInput]}
                        value={newOption.value}
                        onChangeText={(text) =>
                          setNewOption({ ...newOption, value: text })
                        }
                        placeholder="Valeur"
                        placeholderTextColor="#9CA3AF"
                      />
                      <TextInput
                        style={[styles.input, styles.optionInput]}
                        value={newOption.label}
                        onChangeText={(text) =>
                          setNewOption({ ...newOption, label: text })
                        }
                        placeholder="Label"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <Pressable
                      style={styles.addOptionIconButton}
                      onPress={handleAddOption}
                    >
                      <MaterialIcons name="add" size={24} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              )}

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setShowCustomFieldForm(false);
                  setEditingFieldIndex(null);
                  setCurrentField({
                    id: '',
                    label: '',
                    type: 'text',
                    required: false,
                    options: [],
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={styles.submitButton}
                onPress={handleSaveCustomField}
              >
                <Text style={styles.submitButtonText}>
                  {editingFieldIndex !== null ? 'Modifier' : 'Ajouter'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 80,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1271FF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#303030",
    flex: 1,
    letterSpacing: -0.5,
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#303030",
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#303030",
    backgroundColor: "#FFFFFF",
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  helperText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 6,
    lineHeight: 18,
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  themeButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  themeButtonActive: {
    backgroundColor: "#303030",
    borderColor: "#303030",
  },
  themeButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#303030",
  },
  themeButtonTextActive: {
    color: "#FFFFFF",
  },
  sectionDivider: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 24,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#303030",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 16,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  addFieldButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F7FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#1271FF",
  },
  customFieldCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#F9FAFB",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  customFieldContent: {
    flex: 1,
    marginRight: 12,
  },
  customFieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  customFieldLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#303030",
    marginLeft: 8,
    flex: 1,
  },
  customFieldMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 28,
    marginBottom: 2,
  },
  customFieldOptions: {
    fontSize: 12,
    color: "#1271FF",
    marginLeft: 28,
    fontWeight: "500",
  },
  customFieldActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    padding: 6,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  typeButtonActive: {
    backgroundColor: "#1271FF",
    borderColor: "#1271FF",
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#303030",
  },
  typeButtonTextActive: {
    color: "#FFFFFF",
  },
  optionsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  optionsList: {
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#303030",
    marginBottom: 2,
  },
  optionValue: {
    fontSize: 12,
    color: "#6B7280",
  },
  addOptionForm: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  optionInputs: {
    flex: 1,
    gap: 10,
  },
  optionInput: {
    marginBottom: 0,
  },
  addOptionIconButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#1271FF",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 0,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  switchLabel: {
    flex: 1,
    paddingRight: 16,
  },
  switchLabelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#303030",
    marginBottom: 4,
  },
  switch: {
    width: 51,
    height: 31,
    borderRadius: 16,
    backgroundColor: "#D1D5DB",
    padding: 2,
    justifyContent: "center",
  },
  switchActive: {
    backgroundColor: "#1271FF",
  },
  switchThumb: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    alignSelf: "flex-end",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorText: {
    flex: 1,
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#303030",
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#303030",
    alignItems: "center",
    shadowColor: "#303030",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});