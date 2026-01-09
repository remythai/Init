// components/EventDetails.tsx
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export interface CustomFieldOption {
  value: string;
  label: string;
}

export interface CustomField {
  id: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "email"
    | "phone"
    | "date"
    | "checkbox"
    | "radio"
    | "select"
    | "multiselect";
  label: string;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  pattern?: string;
  options?: CustomFieldOption[];
}

export interface Event {
  id: string;
  name: string;
  theme: string;
  date: string;
  location: string;
  participants: number;
  maxParticipants: number;
  image: string;
  description?: string;
  isRegistered?: boolean;
  customFields?: CustomField[];
}

interface EventDetailProps {
  event: Event;
  onBack: () => void;
  onRegister: (eventId: string, profileInfo: Record<string, any>) => Promise<void>;
  onUnregister?: (eventId: string) => void;
  onEnterEvent?: (event: Event) => void;
}

export function EventDetail({
  event,
  onBack,
  onRegister,
  onUnregister,
  onEnterEvent,
}: EventDetailProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profilInfo, setProfilInfo] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const getThemeColor = (theme: string) => {
    const colors: Record<string, string> = {
      musique: "#a855f7",
      professionnel: "#3b82f6",
      étudiant: "#22c55e",
      sport: "#f97316",
      café: "#f59e0b",
      fête: "#ec4899",
    };
    return colors[theme.toLowerCase()] || "#6b7280";
  };

  const hasRequiredFields =
    event.customFields?.some((field) => field.required) ?? false;

  const handleRegisterClick = () => {
    if (hasRequiredFields) {
      setShowProfileModal(true);
    } else {
      submitRegistration({});
    }
  };

  const validateProfilInfo = (): boolean => {
    if (!event.customFields || event.customFields.length === 0) return true;

    const errors: Record<string, string> = {};

    event.customFields.forEach((field) => {
      const value = profilInfo[field.id];

      if (field.required && (value === undefined || value === null || value === "")) {
        errors[field.id] = `Le champ "${field.label}" est requis`;
        return;
      }

      if (!field.required && (value === undefined || value === null || value === "")) {
        return;
      }

      if (field.type === "email" && typeof value === "string") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors[field.id] = "Email invalide";
        }
      }

      if (field.type === "phone" && typeof value === "string") {
        const phoneRegex = /^[0-9\s\-\+\(\)]+$/;
        if (!phoneRegex.test(value) || value.replace(/\D/g, "").length < 10) {
          errors[field.id] = "Numéro de téléphone invalide";
        }
      }

      if (field.type === "number") {
        const num = Number(value);
        if (Number.isNaN(num)) {
          errors[field.id] = "Doit être un nombre";
        } else {
          if (field.min !== undefined && num < field.min) {
            errors[field.id] = `Minimum ${field.min}`;
          }
          if (field.max !== undefined && num > field.max) {
            errors[field.id] = `Maximum ${field.max}`;
          }
        }
      }

      if (field.pattern && typeof value === "string") {
        const regex = new RegExp(field.pattern);
        if (!regex.test(value)) {
          errors[field.id] = `Format invalide`;
        }
      }

      if (field.type === "multiselect" && field.required) {
        if (!Array.isArray(value) || value.length === 0) {
          errors[field.id] = "Veuillez sélectionner au moins une option";
        }
      }
    });

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      Alert.alert(
        "Erreur de validation",
        Object.values(errors)
          .filter(Boolean)
          .join("\n")
      );
      return false;
    }
    return true;
  };

  const submitRegistration = async (profile: Record<string, any>) => {
    try {
      setIsLoading(true);
      await onRegister(event.id, profile);
      setShowProfileModal(false);
      setProfilInfo({});
      setFieldErrors({});
    } catch (err: any) {
      console.error("Erreur inscription:", err);
      Alert.alert(
        "Erreur",
        err?.message || "Impossible de s'inscrire à l'événement"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmProfile = () => {
    if (!validateProfilInfo()) return;
    submitRegistration(profilInfo);
  };

  const handleUnregister = () => {
    if (!onUnregister) return;

    Alert.alert(
      "Confirmer la désinscription",
      "Êtes-vous sûr de vouloir vous désinscrire de cet événement ?",
      [
        {
          text: "Annuler",
          style: "cancel",
        },
        {
          text: "Se désinscrire",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              await onUnregister(event.id);
            } catch (err: any) {
              console.error("Erreur désinscription:", err);
              Alert.alert(
                "Erreur",
                err?.message || "Impossible de se désinscrire de l'événement"
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderCustomField = (field: CustomField) => {
    const commonLabel = (
      <Text style={styles.fieldLabel}>
        {field.label}
        {field.required && <Text style={styles.requiredMark}> *</Text>}
      </Text>
    );

    const errorText = fieldErrors[field.id] ? (
      <Text style={styles.fieldError}>{fieldErrors[field.id]}</Text>
    ) : null;

    switch (field.type) {
      case "text":
      case "email":
      case "phone":
      case "number":
        return (
          <View key={field.id} style={styles.fieldContainer}>
            {commonLabel}
            <TextInput
              style={[
                styles.input,
                fieldErrors[field.id] && styles.inputError,
              ]}
              placeholder={field.placeholder}
              value={
                profilInfo[field.id] !== undefined
                  ? String(profilInfo[field.id])
                  : ""
              }
              onChangeText={(text) =>
                setProfilInfo((prev) => ({
                  ...prev,
                  [field.id]:
                    field.type === "number" ? (text === "" ? "" : Number(text)) : text,
                }))
              }
              keyboardType={
                field.type === "email"
                  ? "email-address"
                  : field.type === "phone"
                  ? "phone-pad"
                  : field.type === "number"
                  ? "numeric"
                  : "default"
              }
            />
            {errorText}
          </View>
        );

      case "textarea":
        return (
          <View key={field.id} style={styles.fieldContainer}>
            {commonLabel}
            <TextInput
              style={[
                styles.input,
                styles.textarea,
                fieldErrors[field.id] && styles.inputError,
              ]}
              placeholder={field.placeholder}
              value={(profilInfo[field.id] as string) || ""}
              onChangeText={(text) =>
                setProfilInfo((prev) => ({
                  ...prev,
                  [field.id]: text,
                }))
              }
              multiline
              numberOfLines={4}
            />
            {errorText}
          </View>
        );

      case "date":
        return (
          <View key={field.id} style={styles.fieldContainer}>
            {commonLabel}
            <TextInput
              style={[
                styles.input,
                fieldErrors[field.id] && styles.inputError,
              ]}
              placeholder={field.placeholder || "JJ/MM/AAAA"}
              value={(profilInfo[field.id] as string) || ""}
              onChangeText={(text) =>
                setProfilInfo((prev) => ({
                  ...prev,
                  [field.id]: text,
                }))
              }
              keyboardType="numeric"
            />
            {errorText}
          </View>
        );

      case "checkbox":
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Pressable
              style={styles.checkboxContainer}
              onPress={() =>
                setProfilInfo((prev) => ({
                  ...prev,
                  [field.id]: !prev[field.id],
                }))
              }
            >
              <View
                style={[
                  styles.checkbox,
                  profilInfo[field.id] && styles.checkboxChecked,
                ]}
              >
                {profilInfo[field.id] && (
                  <MaterialIcons name="check" size={16} color="#fff" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                {field.label}
                {field.required && <Text style={styles.requiredMark}> *</Text>}
              </Text>
            </Pressable>
            {errorText}
          </View>
        );

      case "radio":
      case "select":
        return (
          <View key={field.id} style={styles.fieldContainer}>
            {commonLabel}
            {field.placeholder && (
              <Text style={styles.fieldPlaceholder}>{field.placeholder}</Text>
            )}
            <View style={styles.selectContainer}>
              {field.options?.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.selectOption,
                    profilInfo[field.id] === option.value &&
                      styles.selectOptionActive,
                  ]}
                  onPress={() =>
                    setProfilInfo((prev) => ({
                      ...prev,
                      [field.id]: option.value,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.selectOptionText,
                      profilInfo[field.id] === option.value &&
                        styles.selectOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {errorText}
          </View>
        );

      case "multiselect":
        const selectedValues = (profilInfo[field.id] as string[]) || [];
        return (
          <View key={field.id} style={styles.fieldContainer}>
            {commonLabel}
            {field.placeholder && (
              <Text style={styles.fieldPlaceholder}>{field.placeholder}</Text>
            )}
            <View style={styles.selectContainer}>
              {field.options?.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.selectOption,
                      isSelected && styles.selectOptionActive,
                    ]}
                    onPress={() => {
                      setProfilInfo((prev) => {
                        const current = (prev[field.id] as string[]) || [];
                        const newValues = isSelected
                          ? current.filter((v) => v !== option.value)
                          : [...current, option.value];
                        return {
                          ...prev,
                          [field.id]: newValues,
                        };
                      });
                    }}
                  >
                    <View style={styles.multiselectOption}>
                      <View
                        style={[
                          styles.multiselectCheckbox,
                          isSelected && styles.multiselectCheckboxActive,
                        ]}
                      >
                        {isSelected && (
                          <MaterialIcons name="check" size={14} color="#fff" />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.selectOptionText,
                          isSelected && styles.selectOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {errorText}
          </View>
        );

      default:
        console.warn(`Type de champ non supporté: ${field.type}`);
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: event.image }} style={styles.eventImage} />

          <View style={styles.badgeContainer}>
            <View
              style={[
                styles.themeBadge,
                { backgroundColor: getThemeColor(event.theme) },
              ]}
            >
              <Text style={styles.badgeText}>{event.theme}</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.eventName}>{event.name}</Text>

          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <MaterialIcons name="event" size={20} color="#303030" />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardTitle}>Date</Text>
                <Text style={styles.infoCardText}>{event.date}</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <MaterialIcons name="access-time" size={20} color="#303030" />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardTitle}>Heure</Text>
                <Text style={styles.infoCardText}>18:00 - 22:00</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <MaterialIcons name="place" size={20} color="#303030" />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardTitle}>Lieu</Text>
                <Text style={styles.infoCardText}>{event.location}</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <MaterialIcons name="group" size={20} color="#303030" />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardTitle}>Participants</Text>
                <Text style={styles.infoCardText}>
                  {event.participants}/{event.maxParticipants} inscrits
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${
                          (event.participants / event.maxParticipants) * 100
                        }%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>À propos de l'événement</Text>
            <Text style={styles.description}>
              {event.description ||
                "Rejoignez-nous pour un moment unique de partage et de rencontre. Cet événement est l'occasion parfaite pour élargir votre réseau et faire de nouvelles connexions dans une ambiance conviviale et décontractée."}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Organisateur</Text>
            <View style={styles.organizerCard}>
              <View style={styles.organizerAvatar}>
                <Text style={styles.organizerAvatarText}>O</Text>
              </View>
              <View style={styles.organizerInfo}>
                <Text style={styles.organizerName}>Organisation Init</Text>
                <Text style={styles.organizerBadge}>Organisateur vérifié</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.actionContainer}>
        {event.isRegistered ? (
          <View style={styles.actionButtonsRow}>
            <Pressable
              style={[styles.actionButton, styles.unregisterButton]}
              onPress={handleUnregister}
              disabled={isLoading}
            >
              <MaterialIcons name="cancel" size={20} color="#dc2626" />
              <Text style={styles.unregisterButtonText}>
                {isLoading ? "Chargement..." : "Se désinscrire"}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.enterButton]}
              onPress={() => onEnterEvent?.(event)}
              disabled={isLoading}
            >
              <MaterialIcons name="login" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Entrer</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.actionButton, styles.registerButton]}
            onPress={handleRegisterClick}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>
              {isLoading ? "Inscription..." : "Participer à cet événement"}
            </Text>
          </Pressable>
        )}
      </View>

      <Modal
        visible={showProfileModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Informations requises pour l'inscription
            </Text>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {event.customFields?.map((field) => renderCustomField(field))}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.actionButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowProfileModal(false);
                  setFieldErrors({});
                }}
                disabled={isLoading}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </Pressable>

              <Pressable
                style={[styles.actionButton, styles.modalSubmitButton]}
                onPress={handleConfirmProfile}
                disabled={isLoading}
              >
                <Text style={styles.modalSubmitText}>
                  {isLoading ? "Validation..." : "Valider et s'inscrire"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    position: "relative",
    height: 256,
  },
  eventImage: {
    width: "100%",
    height: "100%",
  },
  badgeContainer: {
    position: "absolute",
    bottom: 16,
    left: 16,
  },
  themeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  eventName: {
    fontFamily: "Poppins",
    fontWeight: "700",
    fontSize: 24,
    color: "#303030",
    marginBottom: 16,
  },
  infoSection: {
    gap: 16,
    marginBottom: 24,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    fontFamily: "Poppins",
    fontWeight: "600",
    fontSize: 14,
    color: "#303030",
    marginBottom: 4,
  },
  infoCardText: {
    fontSize: 14,
    color: "#6b7280",
  },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "#E0E7FF",
    borderRadius: 4,
    marginTop: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#1271FF",
    borderRadius: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: "Poppins",
    fontWeight: "600",
    fontSize: 18,
    color: "#303030",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "#6b7280",
    lineHeight: 24,
  },
  organizerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
  },
  organizerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F5F5",
    borderWidth: 2,
    borderColor: "#303030",
    justifyContent: "center",
    alignItems: "center",
  },
  organizerAvatarText: {
    fontFamily: "Poppins",
    fontWeight: "600",
    fontSize: 20,
    color: "#303030",
  },
  organizerInfo: {
    flex: 1,
  },
  organizerName: {
    fontFamily: "Poppins",
    fontWeight: "600",
    fontSize: 16,
    color: "#303030",
    marginBottom: 2,
  },
  organizerBadge: {
    fontSize: 12,
    color: "#6b7280",
  },
  actionContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  registerButton: {
    flex: 1,
    backgroundColor: "#303030",
  },
  enterButton: {
    flex: 1,
    backgroundColor: "#303030",
  },
  unregisterButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#dc2626",
  },
  actionButtonText: {
    fontFamily: "Poppins",
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  unregisterButtonText: {
    fontFamily: "Poppins",
    color: "#dc2626",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    maxHeight: "80%",
  },
  modalTitle: {
    fontFamily: "Poppins",
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 20,
    color: "#111827",
  },
  modalScroll: {
    maxHeight: 400,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: "Poppins",
    fontWeight: "500",
    fontSize: 14,
    marginBottom: 8,
    color: "#111827",
  },
  fieldPlaceholder: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
    fontStyle: "italic",
  },
  requiredMark: {
    color: "#dc2626",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#fff",
  },
  inputError: {
    borderColor: "#dc2626",
    borderWidth: 1.5,
  },
  textarea: {
    height: 100,
    textAlignVertical: "top",
  },
  fieldError: {
    marginTop: 6,
    color: "#dc2626",
    fontSize: 12,
    fontFamily: "Poppins",
  },
  selectContainer: {
    gap: 8,
  },
  selectOption: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  selectOptionActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  selectOptionText: {
    fontSize: 14,
    color: "#111827",
    fontFamily: "Poppins",
  },
  selectOptionTextActive: {
    color: "#fff",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  checkboxChecked: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#111827",
    fontFamily: "Poppins",
    flex: 1,
  },
  multiselectOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  multiselectCheckbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 3,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  multiselectCheckboxActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  modalSubmitButton: {
    flex: 1,
    backgroundColor: "#111827",
  },
  modalCancelText: {
    fontFamily: "Poppins",
    fontWeight: "600",
    fontSize: 14,
    color: "#111827",
  },
  modalSubmitText: {
    fontFamily: "Poppins",
    fontWeight: "600",
    fontSize: 14,
    color: "#fff",
  },
});
