// components/Profile.tsx
import PhotoManager from "@/components/PhotoManager";
import { authService } from "@/services/auth.service";
import * as ImagePicker from "expo-image-picker";
import { Edit2, Save, X } from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export interface UserProfile {
  id?: number;
  firstname: string;
  lastname: string;
  tel: string;
  mail?: string;
  birthday?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrgaProfile {
  id?: number;
  nom: string;
  mail: string;
  description?: string;
  tel?: string;
  logo_path?: string;
  created_at?: string;
  updated_at?: string;
}

interface ProfileProps {
  profile: UserProfile | OrgaProfile;
  profileType: "user" | "orga";
  onUpdateProfile: (profile: Partial<UserProfile | OrgaProfile>) => Promise<void>;
  isOwnProfile?: boolean;
  loading?: boolean;
}

function isUserProfile(profile: any): profile is UserProfile {
  return "firstname" in profile && "lastname" in profile;
}

function isOrgaProfile(profile: any): profile is OrgaProfile {
  return "nom" in profile;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export function Profile({
  profile,
  profileType,
  onUpdateProfile,
  isOwnProfile = true,
  loading = false,
}: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const updates: Partial<UserProfile | OrgaProfile> = {};

      if (profileType === "user" && isUserProfile(profile) && isUserProfile(editedProfile)) {
        if (editedProfile.firstname !== profile.firstname) updates.firstname = editedProfile.firstname;
        if (editedProfile.lastname !== profile.lastname) updates.lastname = editedProfile.lastname;
        if (editedProfile.tel !== profile.tel) updates.tel = editedProfile.tel;
        if (editedProfile.mail !== profile.mail) updates.mail = editedProfile.mail;
      } else if (profileType === "orga" && isOrgaProfile(profile) && isOrgaProfile(editedProfile)) {
        if (editedProfile.nom !== profile.nom) updates.nom = editedProfile.nom;
        if (editedProfile.mail !== profile.mail) updates.mail = editedProfile.mail;
        if (editedProfile.tel !== profile.tel) updates.tel = editedProfile.tel;
        if (editedProfile.description !== profile.description) updates.description = editedProfile.description;
      }

      if (Object.keys(updates).length === 0) {
        Alert.alert("Information", "Aucune modification détectée");
        setIsEditing(false);
        setSaving(false);
        return;
      }

      await onUpdateProfile(updates);
      setIsEditing(false);
      Alert.alert("Succès", "Profil mis à jour avec succès");
    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const handlePickLogo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission refusée", "Autorisez l'accès à la galerie pour changer le logo.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const fileName = asset.uri.split("/").pop() || "logo.jpg";
      const fileType = asset.mimeType || "image/jpeg";

      setUploadingLogo(true);
      const logoPath = await authService.uploadOrgaLogo(asset.uri, fileName, fileType);

      setEditedProfile((prev) => ({ ...prev, logo_path: logoPath }));
      Alert.alert("Succès", "Logo mis à jour !");
    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Impossible de mettre à jour le logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogo = async () => {
    Alert.alert("Supprimer le logo", "Êtes-vous sûr de vouloir supprimer le logo ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            setUploadingLogo(true);
            await authService.deleteOrgaLogo();
            setEditedProfile((prev) => ({ ...prev, logo_path: undefined }));
            Alert.alert("Succès", "Logo supprimé");
          } catch (error: any) {
            Alert.alert("Erreur", error.message || "Impossible de supprimer le logo");
          } finally {
            setUploadingLogo(false);
          }
        },
      },
    ]);
  };

  const calculateAge = (birthday?: string): number | null => {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const getDisplayName = () => {
    if (isUserProfile(profile)) return `${profile.firstname} ${profile.lastname}`;
    return profile.nom;
  };

  const getAvatarInitial = () => {
    if (isUserProfile(profile)) return profile.firstname.charAt(0).toUpperCase();
    return profile.nom.charAt(0).toUpperCase();
  };

  const age = isUserProfile(profile) ? calculateAge(profile.birthday) : null;

  // Logo orga courant (priorité à editedProfile pour refléter l'upload immédiat)
  const currentLogoPath = isOrgaProfile(editedProfile) ? editedProfile.logo_path : undefined;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>
              {profileType === "user" ? "Mon Profil" : "Profil de l'Organisation"}
            </Text>

            {isOwnProfile && !isEditing ? (
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                style={styles.editButton}
                disabled={loading}
              >
                <Edit2 color="#FFFFFF" size={16} />
                <Text style={styles.editButtonText}>Modifier</Text>
              </TouchableOpacity>
            ) : isOwnProfile && isEditing ? (
              <View style={styles.actionButtons}>
                <TouchableOpacity onPress={handleCancel} style={styles.cancelButton} disabled={saving}>
                  <X color="#FFFFFF" size={16} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={saving}>
                  <Save color="#303030" size={16} />
                  <Text style={styles.saveButtonText}>{saving ? "..." : "Enregistrer"}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* Avatar / Logo */}
          <View style={styles.avatarContainer}>
            {profileType === "orga" && currentLogoPath ? (
              <Image
                source={{ uri: `${API_URL}${currentLogoPath}` }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getAvatarInitial()}</Text>
              </View>
            )}

            {/* Bouton changement logo pour orga */}
            {isOwnProfile && profileType === "orga" && (
              <View style={styles.logoActions}>
                <TouchableOpacity
                  onPress={handlePickLogo}
                  style={styles.logoButton}
                  disabled={uploadingLogo}
                >
                  <Text style={styles.logoButtonText}>
                    {uploadingLogo ? "..." : currentLogoPath ? "Changer" : "Ajouter un logo"}
                  </Text>
                </TouchableOpacity>
                {currentLogoPath && !uploadingLogo && (
                  <TouchableOpacity onPress={handleDeleteLogo} style={styles.logoDeleteButton}>
                    <Text style={styles.logoDeleteText}>Supprimer</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={styles.content}>
          {/* Profil Utilisateur */}
          {profileType === "user" && isUserProfile(profile) && isUserProfile(editedProfile) && (
            <>
              <View style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.label}>Prénom</Text>
                    {isEditing ? (
                      <TextInput
                        value={editedProfile.firstname}
                        onChangeText={(text) => setEditedProfile({ ...editedProfile, firstname: text })}
                        style={styles.input}
                        editable={!saving}
                        placeholder="Prénom"
                      />
                    ) : (
                      <Text style={styles.value}>{profile.firstname}</Text>
                    )}
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.label}>Nom</Text>
                    {isEditing ? (
                      <TextInput
                        value={editedProfile.lastname}
                        onChangeText={(text) => setEditedProfile({ ...editedProfile, lastname: text })}
                        style={styles.input}
                        editable={!saving}
                        placeholder="Nom"
                      />
                    ) : (
                      <Text style={styles.value}>{profile.lastname}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.fullWidthField}>
                  <Text style={styles.label}>Téléphone</Text>
                  {isEditing ? (
                    <TextInput
                      value={editedProfile.tel}
                      onChangeText={(text) => setEditedProfile({ ...editedProfile, tel: text })}
                      style={styles.input}
                      keyboardType="phone-pad"
                      editable={!saving}
                    />
                  ) : (
                    <Text style={styles.value}>{profile.tel}</Text>
                  )}
                </View>

                <View style={styles.fullWidthField}>
                  <Text style={styles.label}>Email</Text>
                  {isEditing ? (
                    <TextInput
                      value={editedProfile.mail || ""}
                      onChangeText={(text) => setEditedProfile({ ...editedProfile, mail: text })}
                      style={styles.input}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!saving}
                      placeholder="email@exemple.com"
                    />
                  ) : (
                    <Text style={styles.value}>{profile.mail || "Non renseigné"}</Text>
                  )}
                </View>

                {age !== null && (
                  <View style={styles.fullWidthField}>
                    <Text style={styles.label}>Âge</Text>
                    <Text style={styles.value}>{age} ans</Text>
                  </View>
                )}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Mes photos</Text>
                <PhotoManager onPhotosChange={() => {}} />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Centres d'intérêt</Text>
                <Text style={styles.placeholderText}>Cette fonctionnalité sera bientôt disponible</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Questions de personnalité</Text>
                <Text style={styles.placeholderText}>Cette fonctionnalité sera bientôt disponible</Text>
              </View>
            </>
          )}

          {/* Profil Organisation */}
          {profileType === "orga" && isOrgaProfile(profile) && isOrgaProfile(editedProfile) && (
            <>
              <View style={styles.card}>
                <View style={styles.fullWidthField}>
                  <Text style={styles.label}>Nom de l'organisation</Text>
                  {isEditing ? (
                    <TextInput
                      value={editedProfile.nom}
                      onChangeText={(text) => setEditedProfile({ ...editedProfile, nom: text })}
                      style={styles.input}
                      editable={!saving}
                    />
                  ) : (
                    <Text style={styles.value}>{profile.nom}</Text>
                  )}
                </View>

                <View style={styles.fullWidthField}>
                  <Text style={styles.label}>Email</Text>
                  {isEditing ? (
                    <TextInput
                      value={editedProfile.mail}
                      onChangeText={(text) => setEditedProfile({ ...editedProfile, mail: text })}
                      style={styles.input}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!saving}
                    />
                  ) : (
                    <Text style={styles.value}>{profile.mail}</Text>
                  )}
                </View>

                <View style={styles.fullWidthField}>
                  <Text style={styles.label}>Téléphone</Text>
                  {isEditing ? (
                    <TextInput
                      value={editedProfile.tel || ""}
                      onChangeText={(text) => setEditedProfile({ ...editedProfile, tel: text })}
                      style={styles.input}
                      keyboardType="phone-pad"
                      editable={!saving}
                      placeholder="Téléphone"
                    />
                  ) : (
                    <Text style={styles.value}>{profile.tel || "Non renseigné"}</Text>
                  )}
                </View>

                <View style={styles.fullWidthField}>
                  <Text style={styles.label}>Description</Text>
                  {isEditing ? (
                    <TextInput
                      value={editedProfile.description || ""}
                      onChangeText={(text) => setEditedProfile({ ...editedProfile, description: text })}
                      style={[styles.input, styles.textArea]}
                      multiline
                      numberOfLines={4}
                      editable={!saving}
                      placeholder="Description de l'organisation..."
                    />
                  ) : (
                    <Text style={styles.value}>{profile.description || "Aucune description"}</Text>
                  )}
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Événements créés</Text>
                <Text style={styles.placeholderText}>Cette fonctionnalité sera bientôt disponible</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Statistiques</Text>
                <Text style={styles.placeholderText}>Cette fonctionnalité sera bientôt disponible</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 80 },
  header: {
    backgroundColor: "#303030",
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 80,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: { fontWeight: "600", fontSize: 20, color: "#FFFFFF" },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: { color: "#FFFFFF" },
  actionButtons: { flexDirection: "row", gap: 8 },
  cancelButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: { color: "#303030" },
  avatarContainer: { alignItems: "center", gap: 12 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarText: { fontWeight: "700", fontSize: 36, color: "#303030" },
  logoActions: { flexDirection: "row", gap: 8 },
  logoButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  logoButtonText: { color: "#FFFFFF", fontSize: 13 },
  logoDeleteButton: {
    backgroundColor: "rgba(220,38,38,0.3)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  logoDeleteText: { color: "#FFFFFF", fontSize: 13 },
  content: { paddingHorizontal: 24, marginTop: -48 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  row: { flexDirection: "row", gap: 16, marginBottom: 16 },
  halfWidth: { flex: 1 },
  fullWidthField: { marginBottom: 16 },
  label: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  value: { fontWeight: "600", fontSize: 16, color: "#303030" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: "#303030",
    backgroundColor: "#FFFFFF",
  },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  cardTitle: { fontWeight: "600", fontSize: 18, color: "#303030", marginBottom: 12 },
  placeholderText: { color: "#9CA3AF", fontSize: 14, fontStyle: "italic" },
});