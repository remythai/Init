// components/EventDetails.tsx
import { CustomField } from "@/services/event.service";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

export interface Event {
  id: string;
  name: string;
  theme: string;
  physicalDate: string;
  startAt?: string;
  endAt?: string;
  location?: string;
  hasPhysicalEvent: boolean;
  appDate: string;
  appStartAt: string;
  appEndAt: string;
  participants: number;
  maxParticipants: number;
  image: string;
  description?: string;
  isRegistered?: boolean;
  isBlocked?: boolean;
  customFields?: CustomField[];
  orgaName?: string;
  orgaLogo?: string;
  hasWhitelist?: boolean;
  bannerPath?: string;
}

interface EventDetailProps {
  event: Event;
  userType?: "user" | "organizer" | null;
  onBack: () => void;
  onRegister: (eventId: string, profileInfo: Record<string, any>) => Promise<void>;
  onUnregister?: (eventId: string) => Promise<void>;
  onEnterEvent?: (event: Event) => void;
}

export function EventDetail({
  event,
  userType,
  onBack,
  onRegister,
  onUnregister,
  onEnterEvent,
}: EventDetailProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profilInfo, setProfilInfo] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isOrga = userType === "organizer";

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

  const getFieldKey = (field: CustomField): string => {
    return field.label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "_");
  };

  const handleRegisterClick = () => {
    if (event.customFields && event.customFields.length > 0) {
      setShowProfileModal(true);
    } else {
      submitRegistration({});
    }
  };

  const validateProfilInfo = (): boolean => {
    if (!event.customFields || event.customFields.length === 0) return true;
    const errors: Record<string, string> = {};
    event.customFields.forEach((field) => {
      const key = getFieldKey(field);
      const value = profilInfo[key];
      if (field.required && (value === undefined || value === null || value === "")) {
        errors[key] = `Le champ "${field.label}" est requis`;
        return;
      }
      if (!field.required && (value === undefined || value === null || value === "")) return;
      if (field.type === "email" && typeof value === "string") {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors[key] = "Email invalide";
      }
      if (field.type === "phone" && typeof value === "string") {
        if (!/^[0-9\s\-\+\(\)]+$/.test(value) || value.replace(/\D/g, "").length < 10)
          errors[key] = "Numéro de téléphone invalide";
      }
      if (field.type === "number") {
        const num = Number(value);
        if (Number.isNaN(num)) errors[key] = "Doit être un nombre";
        else {
          if (field.min !== undefined && num < field.min) errors[key] = `Minimum ${field.min}`;
          if (field.max !== undefined && num > field.max) errors[key] = `Maximum ${field.max}`;
        }
      }
      if (field.pattern && typeof value === "string") {
        if (!new RegExp(field.pattern).test(value)) errors[key] = "Format invalide";
      }
      if (field.type === "multiselect" && field.required) {
        if (!Array.isArray(value) || value.length === 0)
          errors[key] = "Veuillez sélectionner au moins une option";
      }
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      Alert.alert("Erreur de validation", Object.values(errors).filter(Boolean).join("\n"));
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
      Alert.alert("Erreur", err?.message || "Impossible de s'inscrire à l'événement");
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
        { text: "Annuler", style: "cancel" },
        {
          text: "Se désinscrire",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              await onUnregister(event.id);
            } catch (err: any) {
              Alert.alert("Erreur", err?.message || "Impossible de se désinscrire de l'événement");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderCustomField = (field: CustomField) => {
    const key = getFieldKey(field);
    const commonLabel = (
      <Text style={styles.fieldLabel}>
        {field.label}
        {field.required && <Text style={styles.requiredMark}> *</Text>}
      </Text>
    );
    const errorText = fieldErrors[key] ? (
      <Text style={styles.fieldError}>{fieldErrors[key]}</Text>
    ) : null;

    switch (field.type) {
      case "text":
      case "email":
      case "phone":
      case "number":
        return (
          <View key={key} style={styles.fieldContainer}>
            {commonLabel}
            <TextInput
              style={[styles.input, fieldErrors[key] && styles.inputError]}
              placeholder={
                field.type === "email"
                  ? "exemple@email.com"
                  : field.type === "phone"
                  ? "06 12 34 56 78"
                  : "Votre réponse"
              }
              value={profilInfo[key] !== undefined ? String(profilInfo[key]) : ""}
              onChangeText={(text) =>
                setProfilInfo((prev) => ({
                  ...prev,
                  [key]: field.type === "number" ? (text === "" ? "" : Number(text)) : text,
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
          <View key={key} style={styles.fieldContainer}>
            {commonLabel}
            <TextInput
              style={[styles.input, styles.textarea, fieldErrors[key] && styles.inputError]}
              placeholder="Votre réponse..."
              value={(profilInfo[key] as string) || ""}
              onChangeText={(text) => setProfilInfo((prev) => ({ ...prev, [key]: text }))}
              multiline
              numberOfLines={4}
            />
            {errorText}
          </View>
        );
      case "date":
        return (
          <View key={key} style={styles.fieldContainer}>
            {commonLabel}
            <TextInput
              style={[styles.input, fieldErrors[key] && styles.inputError]}
              placeholder="JJ/MM/AAAA"
              value={(profilInfo[key] as string) || ""}
              onChangeText={(text) => setProfilInfo((prev) => ({ ...prev, [key]: text }))}
              keyboardType="numeric"
            />
            {errorText}
          </View>
        );
      case "checkbox":
        return (
          <View key={key} style={styles.fieldContainer}>
            <Pressable
              style={styles.checkboxContainer}
              onPress={() => setProfilInfo((prev) => ({ ...prev, [key]: !prev[key] }))}
            >
              <View style={[styles.checkbox, profilInfo[key] && styles.checkboxChecked]}>
                {profilInfo[key] && <MaterialIcons name="check" size={16} color="#fff" />}
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
          <View key={key} style={styles.fieldContainer}>
            {commonLabel}
            <View style={styles.selectContainer}>
              {field.options?.map((option) => (
                <Pressable
                  key={option}
                  style={[styles.selectOption, profilInfo[key] === option && styles.selectOptionActive]}
                  onPress={() => setProfilInfo((prev) => ({ ...prev, [key]: option }))}
                >
                  <Text
                    style={[
                      styles.selectOptionText,
                      profilInfo[key] === option && styles.selectOptionTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
            {errorText}
          </View>
        );
      case "multiselect":
        const selectedValues = (profilInfo[key] as string[]) || [];
        return (
          <View key={key} style={styles.fieldContainer}>
            {commonLabel}
            <View style={styles.selectContainer}>
              {field.options?.map((option) => {
                const isSelected = selectedValues.includes(option);
                return (
                  <Pressable
                    key={option}
                    style={[styles.selectOption, isSelected && styles.selectOptionActive]}
                    onPress={() => {
                      setProfilInfo((prev) => {
                        const current = (prev[key] as string[]) || [];
                        return {
                          ...prev,
                          [key]: isSelected
                            ? current.filter((v) => v !== option)
                            : [...current, option],
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
                        {isSelected && <MaterialIcons name="check" size={14} color="#fff" />}
                      </View>
                      <Text
                        style={[
                          styles.selectOptionText,
                          isSelected && styles.selectOptionTextActive,
                        ]}
                      >
                        {option}
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
        return null;
    }
  };

  // ── Orga action buttons (mirrors web footer) ──────────────────────────────
  const renderOrgaActions = () => (
    <View style={styles.orgaActions}>
      <View style={styles.orgaRow}>
        <Pressable
          style={[styles.orgaButton, styles.orgaButtonPrimary]}
          onPress={() => router.push(`/(main)/events/${event.id}/edit`)}
        >
          <MaterialIcons name="edit" size={18} color="#fff" />
          <Text style={styles.orgaButtonPrimaryText}>Modifier</Text>
        </Pressable>
        <Pressable
          style={styles.orgaButtonIcon}
          onPress={() => router.push(`/(main)/events/${event.id}/statistics`)}
        >
          <MaterialIcons name="bar-chart" size={20} color="#1271FF" />
        </Pressable>
      </View>

      <View style={styles.orgaRow}>
        <Pressable
          style={[styles.orgaButtonSecondary, { flex: event.hasWhitelist ? 1 : undefined, width: event.hasWhitelist ? undefined : '100%' }]}
          onPress={() => router.push(`/(main)/events/${event.id}/participants`)}
        >
          <MaterialIcons name="people" size={18} color="#303030" />
          <Text style={styles.orgaButtonSecondaryText}>
            Participants ({event.participants})
          </Text>
        </Pressable>
        {event.hasWhitelist && (
          <Pressable
            style={[styles.orgaButtonSecondary, { flex: 1 }]}
            onPress={() => router.push(`/(main)/events/${event.id}/whitelist`)}
          >
            <MaterialIcons name="verified-user" size={18} color="#303030" />
            <Text style={styles.orgaButtonSecondaryText}>Whitelist</Text>
          </Pressable>
        )}
      </View>

      <Pressable
        style={styles.orgaButtonReports}
        onPress={() => router.push(`/(main)/events/${event.id}/reports`)}
      >
        <MaterialIcons name="flag" size={18} color="#dc2626" />
        <Text style={styles.orgaButtonReportsText}>Signalements</Text>
      </Pressable>
    </View>
  );

  // ── User action buttons ───────────────────────────────────────────────────
  const renderUserActions = () => {
    if (event.isBlocked) {
      return (
        <View style={styles.blockedContainer}>
          <MaterialIcons name="block" size={20} color="#dc2626" />
          <Text style={styles.blockedText}>
            Vous avez été retiré de cet événement par l'organisateur
          </Text>
        </View>
      );
    }

    if (event.isRegistered) {
      return (
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
      );
    }

    return (
      <Pressable
        style={[
          styles.actionButton,
          styles.registerButton,
          event.participants >= event.maxParticipants && styles.disabledButton,
        ]}
        onPress={handleRegisterClick}
        disabled={isLoading || event.participants >= event.maxParticipants}
      >
        <Text style={styles.actionButtonText}>
          {isLoading
            ? "Inscription..."
            : event.participants >= event.maxParticipants
            ? "Complet"
            : "Participer à cet événement"}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: event.image }} style={styles.eventImage} />
          <View style={styles.badgeContainer}>
            <View style={[styles.themeBadge, { backgroundColor: getThemeColor(event.theme) }]}>
              <Text style={styles.badgeText}>{event.theme}</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.eventName}>{event.name}</Text>

          <View style={styles.infoSection}>
            {event.hasPhysicalEvent && (
              <View style={styles.infoCard}>
                <MaterialIcons name="event" size={20} color="#303030" />
                <View style={styles.infoCardContent}>
                  <Text style={styles.infoCardTitle}>Date de l'événement</Text>
                  <Text style={styles.infoCardText}>{event.physicalDate}</Text>
                </View>
              </View>
            )}
            <View style={styles.infoCard}>
              <MaterialIcons name="phone-iphone" size={20} color="#303030" />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardTitle}>Disponibilité sur l'app</Text>
                <Text style={styles.infoCardText}>{event.appDate}</Text>
              </View>
            </View>
            {event.location && (
              <View style={styles.infoCard}>
                <MaterialIcons name="place" size={20} color="#303030" />
                <View style={styles.infoCardContent}>
                  <Text style={styles.infoCardTitle}>Lieu</Text>
                  <Text style={styles.infoCardText}>{event.location}</Text>
                </View>
              </View>
            )}
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
                        width: `${Math.min(
                          (event.participants / event.maxParticipants) * 100,
                          100
                        )}%` as any,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>

          {event.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>À propos de l'événement</Text>
              <Text style={styles.description}>{event.description}</Text>
            </View>
          )}

          {event.orgaName && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Organisateur</Text>
              <View style={styles.organizerCard}>
                {event.orgaLogo ? (
                  <Image
                    source={{ uri: event.orgaLogo }}
                    style={styles.organizerAvatarImage}
                  />
                ) : (
                  <View style={styles.organizerAvatar}>
                    <Text style={styles.organizerAvatarText}>
                      {event.orgaName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.organizerInfo}>
                  <Text style={styles.organizerName}>{event.orgaName}</Text>
                  <Text style={styles.organizerBadge}>Organisateur vérifié</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action area */}
      <View style={styles.actionContainer}>
        {isOrga ? renderOrgaActions() : renderUserActions()}
      </View>

      {/* Registration modal */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Informations requises pour l'inscription</Text>
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
  container: { flex: 1, backgroundColor: "#fff" },
  scrollView: { flex: 1 },
  imageContainer: { position: "relative", height: 256 },
  eventImage: { width: "100%", height: "100%" },
  badgeContainer: { position: "absolute", bottom: 16, left: 16 },
  themeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  content: { padding: 24, paddingBottom: 100 },
  eventName: {
    fontFamily: "Poppins",
    fontWeight: "700",
    fontSize: 24,
    color: "#303030",
    marginBottom: 16,
  },
  infoSection: { gap: 16, marginBottom: 24 },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
  },
  infoCardContent: { flex: 1 },
  infoCardTitle: {
    fontFamily: "Poppins",
    fontWeight: "600",
    fontSize: 14,
    color: "#303030",
    marginBottom: 4,
  },
  infoCardText: { fontSize: 14, color: "#6b7280" },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "#E0E7FF",
    borderRadius: 4,
    marginTop: 8,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#1271FF", borderRadius: 4 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: "Poppins",
    fontWeight: "600",
    fontSize: 18,
    color: "#303030",
    marginBottom: 12,
  },
  description: { fontSize: 16, color: "#6b7280", lineHeight: 24 },
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
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#303030",
    justifyContent: "center",
    alignItems: "center",
  },
  organizerAvatarImage: { width: 48, height: 48, borderRadius: 24 },
  organizerAvatarText: {
    fontFamily: "Poppins",
    fontWeight: "600",
    fontSize: 20,
    color: "#303030",
  },
  organizerInfo: { flex: 1 },
  organizerName: {
    fontFamily: "Poppins",
    fontWeight: "600",
    fontSize: 16,
    color: "#303030",
    marginBottom: 2,
  },
  organizerBadge: { fontSize: 12, color: "#6b7280" },

  // Action container
  actionContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },

  // Orga actions
  orgaActions: { gap: 10 },
  orgaRow: { flexDirection: "row", gap: 10 },
  orgaButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  orgaButtonPrimary: { backgroundColor: "#1271FF" },
  orgaButtonPrimaryText: { fontFamily: "Poppins", fontWeight: "600", fontSize: 14, color: "#fff" },
  orgaButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#1271FF",
    justifyContent: "center",
    alignItems: "center",
  },
  orgaButtonSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  orgaButtonSecondaryText: {
    fontFamily: "Poppins",
    fontWeight: "500",
    fontSize: 13,
    color: "#303030",
  },
  orgaButtonReports: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  orgaButtonReportsText: {
    fontFamily: "Poppins",
    fontWeight: "600",
    fontSize: 13,
    color: "#dc2626",
  },

  // User actions
  actionButtonsRow: { flexDirection: "row", gap: 12 },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  registerButton: { flex: 1, backgroundColor: "#303030" },
  disabledButton: { opacity: 0.5 },
  enterButton: { flex: 1, backgroundColor: "#303030" },
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
  blockedContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  blockedText: { flex: 1, fontSize: 13, color: "#dc2626", fontWeight: "500" },

  // Modal
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
  modalScroll: { maxHeight: 400 },
  fieldContainer: { marginBottom: 20 },
  fieldLabel: {
    fontFamily: "Poppins",
    fontWeight: "500",
    fontSize: 14,
    marginBottom: 8,
    color: "#111827",
  },
  requiredMark: { color: "#dc2626" },
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
  inputError: { borderColor: "#dc2626", borderWidth: 1.5 },
  textarea: { height: 100, textAlignVertical: "top" },
  fieldError: { marginTop: 6, color: "#dc2626", fontSize: 12 },
  selectContainer: { gap: 8 },
  selectOption: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  selectOptionActive: { backgroundColor: "#111827", borderColor: "#111827" },
  selectOptionText: { fontSize: 14, color: "#111827" },
  selectOptionTextActive: { color: "#fff" },
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
  checkboxChecked: { backgroundColor: "#111827", borderColor: "#111827" },
  checkboxLabel: { fontSize: 14, color: "#111827", flex: 1 },
  multiselectOption: { flexDirection: "row", alignItems: "center", gap: 10 },
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
  multiselectCheckboxActive: { backgroundColor: "#111827", borderColor: "#111827" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  modalCancelButton: { flex: 1, backgroundColor: "#f3f4f6" },
  modalSubmitButton: { flex: 1, backgroundColor: "#111827" },
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