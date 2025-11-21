// components/CreateEventDialog.tsx
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import { eventService } from "@/services/event.service";

interface CreateEventDialogProps {
  onEventCreated: () => void;
}

export function CreateEventDialog({ onEventCreated }: CreateEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
    custom_fields: "",
    theme: "Professionnel",
  });

  const [error, setError] = useState("");

  // Fonction pour convertir la date du format français vers ISO
  const parseDateTime = (dateStr: string): string | null => {
    try {
      // Format attendu: JJ/MM/AAAA HH:MM
      const regex = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/;
      const match = dateStr.trim().match(regex);
      
      if (!match) {
        return null;
      }

      const [, day, month, year, hour, minute] = match;
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );

      if (isNaN(date.getTime())) {
        return null;
      }

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

    if (formData.custom_fields.trim()) {
      try {
        JSON.parse(formData.custom_fields);
      } catch (err) {
        return "Les champs personnalisés doivent être au format JSON valide";
      }
    }

    return null;
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
      };

      if (formData.has_password_access && formData.access_password) {
        eventData.access_password = formData.access_password;
      }

      if (formData.cooldown) {
        eventData.cooldown = `${formData.cooldown} hours`;
      }

      if (formData.custom_fields.trim()) {
        try {
          const customFieldsJSON = JSON.parse(formData.custom_fields);
          
          if (Array.isArray(customFieldsJSON)) {
            eventData.custom_fields = [
              {
                id: "theme",
                type: "text",
                label: "Thème",
                required: false,
              },
              ...customFieldsJSON
            ];
          } else {
            const fieldsArray = Object.entries(customFieldsJSON).map(([key, value]) => ({
              id: key,
              type: "text",
              label: key,
              required: false,
            }));
            
            eventData.custom_fields = [
              {
                id: "theme",
                type: "text",
                label: "Thème",
                required: false,
              },
              ...fieldsArray
            ];
          }
        } catch (err) {
          eventData.custom_fields = [
            {
              id: "theme",
              type: "text",
              label: "Thème",
              required: false,
            },
          ];
        }
      } else {
        eventData.custom_fields = [
          {
            id: "theme",
            type: "text",
            label: "Thème",
            required: false,
          },
        ];
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
        custom_fields: "",
        theme: "Professionnel",
      });

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

  return (
    <>
      {/* Floating Action Button */}
      <Pressable style={styles.fab} onPress={() => setOpen(true)}>
        <MaterialIcons name="add" size={24} color="#fff" />
      </Pressable>

      {/* Modal */}
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
                <MaterialIcons name="close" size={24} color="#303030" />
              </Pressable>
            </View>

            {/* Form */}
            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Name */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nom de l'événement *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="Ex: Soirée Networking"
                  placeholderTextColor="#9ca3af"
                  editable={!loading}
                />
              </View>

              {/* Theme */}
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
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  editable={!loading}
                />
              </View>

              {/* Start Date */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Date et heure de début *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.start_at}
                  onChangeText={(text) =>
                    setFormData({ ...formData, start_at: text })
                  }
                  placeholder="JJ/MM/AAAA HH:MM"
                  placeholderTextColor="#9ca3af"
                  editable={!loading}
                />
                <Text style={styles.helperText}>Format: JJ/MM/AAAA HH:MM</Text>
              </View>

              {/* End Date */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Date et heure de fin *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.end_at}
                  onChangeText={(text) =>
                    setFormData({ ...formData, end_at: text })
                  }
                  placeholder="JJ/MM/AAAA HH:MM"
                  placeholderTextColor="#9ca3af"
                  editable={!loading}
                />
                <Text style={styles.helperText}>Format: JJ/MM/AAAA HH:MM</Text>
              </View>

              {/* Location */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Lieu *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.location}
                  onChangeText={(text) =>
                    setFormData({ ...formData, location: text })
                  }
                  placeholder="Ex: Station F, Paris 13e"
                  placeholderTextColor="#9ca3af"
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
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  editable={!loading}
                />
              </View>

              {/* Access Settings */}
              <View style={styles.sectionDivider}>
                <Text style={styles.sectionTitle}>Paramètres d'accès</Text>

                {/* Is Public */}
                <Pressable
                  style={styles.switchContainer}
                  onPress={() =>
                    setFormData({ ...formData, is_public: !formData.is_public })
                  }
                  disabled={loading}
                >
                  <View style={styles.switchLabel}>
                    <Text style={styles.label}>Événement public</Text>
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

                {/* Has Whitelist */}
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
                    <Text style={styles.label}>Liste blanche</Text>
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

                {/* Has Link Access */}
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
                    <Text style={styles.label}>Accès par lien</Text>
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

                {/* Has Password Access */}
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
                    <Text style={styles.label}>Accès par mot de passe</Text>
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

                {/* Password Field */}
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
                      placeholderTextColor="#9ca3af"
                      secureTextEntry
                      editable={!loading}
                    />
                  </View>
                )}
              </View>

              {/* Advanced Settings */}
              <View style={styles.sectionDivider}>
                <Text style={styles.sectionTitle}>Paramètres avancés</Text>

                {/* Cooldown */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Cooldown (en heures)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.cooldown}
                    onChangeText={(text) =>
                      setFormData({ ...formData, cooldown: text })
                    }
                    placeholder="Ex: 24"
                    placeholderTextColor="#9ca3af"
                    keyboardType="number-pad"
                    editable={!loading}
                  />
                  <Text style={styles.helperText}>
                    Délai avant de pouvoir s'inscrire à nouveau
                  </Text>
                </View>

                {/* Custom Fields */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Champs personnalisés (JSON)</Text>
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    value={formData.custom_fields}
                    onChangeText={(text) =>
                      setFormData({ ...formData, custom_fields: text })
                    }
                    placeholder='[{"id": "linkedin", "type": "text", "label": "LinkedIn", "required": false}]'
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                    editable={!loading}
                  />
                  <Text style={styles.helperText}>
                    Format: tableau d'objets avec id, type, label et required (optionnel)
                  </Text>
                </View>
              </View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
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
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1271FF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalTitle: {
    fontFamily: "Poppins",
    fontSize: 20,
    fontWeight: "600",
    color: "#303030",
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#303030",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#303030",
    backgroundColor: "#fff",
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  themeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  themeButtonActive: {
    backgroundColor: "#303030",
    borderColor: "#303030",
  },
  themeButtonText: {
    fontSize: 14,
    color: "#303030",
  },
  themeButtonTextActive: {
    color: "#fff",
  },
  sectionDivider: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontFamily: "Poppins",
    fontSize: 18,
    fontWeight: "600",
    color: "#303030",
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    marginBottom: 12,
  },
  switchLabel: {
    flex: 1,
  },
  switch: {
    width: 51,
    height: 31,
    borderRadius: 16,
    backgroundColor: "#e5e7eb",
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
    backgroundColor: "#fff",
  },
  switchThumbActive: {
    alignSelf: "flex-end",
  },
  errorContainer: {
    backgroundColor: "#fee2e2",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#303030",
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#303030",
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});