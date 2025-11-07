import { Camera, Edit2, Save, X } from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
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

interface ProfileProps {
  user: UserProfile;
  onUpdateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  isOwnProfile?: boolean;
  loading?: boolean;
}

export function Profile({ 
  user, 
  onUpdateProfile, 
  isOwnProfile = true,
  loading = false 
}: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(user);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const updates: Partial<UserProfile> = {};
      
      if (editedProfile.firstname !== user.firstname) {
        updates.firstname = editedProfile.firstname;
      }
      if (editedProfile.lastname !== user.lastname) {
        updates.lastname = editedProfile.lastname;
      }
      if (editedProfile.tel !== user.tel) {
        updates.tel = editedProfile.tel;
      }
      if (editedProfile.mail !== user.mail) {
        updates.mail = editedProfile.mail;
      }
      
      if (Object.keys(updates).length === 0) {
        Alert.alert('Information', 'Aucune modification détectée');
        setIsEditing(false);
        setSaving(false);
        return;
      }
      
      console.log('Envoi des mises à jour:', updates);
      
      await onUpdateProfile(updates);
      setIsEditing(false);
      Alert.alert('Succès', 'Profil mis à jour avec succès');
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', error.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(user);
    setIsEditing(false);
  };

  const calculateAge = (birthday?: string): number | null => {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(user.birthday);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>
              {isOwnProfile ? "Mon Profil" : `Profil de ${user.firstname}`}
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
                <TouchableOpacity
                  onPress={handleCancel}
                  style={styles.cancelButton}
                  disabled={saving}
                >
                  <X color="#FFFFFF" size={16} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  style={styles.saveButton}
                  disabled={saving}
                >
                  <Save color="#303030" size={16} />
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.firstname.charAt(0).toUpperCase()}
              </Text>
            </View>
            {isOwnProfile && isEditing && (
              <TouchableOpacity style={styles.cameraButton}>
                <Camera color="#303030" size={16} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Prénom</Text>
                {isEditing ? (
                  <TextInput
                    value={editedProfile.firstname}
                    onChangeText={(text) =>
                      setEditedProfile({ ...editedProfile, firstname: text })
                    }
                    style={styles.input}
                    editable={!saving}
                    placeholder="Prénom"
                  />
                ) : (
                  <Text style={styles.value}>{user.firstname}</Text>
                )}
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Nom</Text>
                {isEditing ? (
                  <TextInput
                    value={editedProfile.lastname}
                    onChangeText={(text) =>
                      setEditedProfile({ ...editedProfile, lastname: text })
                    }
                    style={styles.input}
                    editable={!saving}
                    placeholder="Nom"
                  />
                ) : (
                  <Text style={styles.value}>{user.lastname}</Text>
                )}
              </View>
            </View>

            <View style={styles.fullWidthField}>
              <Text style={styles.label}>Téléphone</Text>
              {isEditing ? (
                <TextInput
                  value={editedProfile.tel}
                  onChangeText={(text) =>
                    setEditedProfile({ ...editedProfile, tel: text })
                  }
                  style={styles.input}
                  keyboardType="phone-pad"
                  editable={!saving}
                  placeholder="Téléphone"
                />
              ) : (
                <Text style={styles.value}>{user.tel}</Text>
              )}
            </View>

            <View style={styles.fullWidthField}>
              <Text style={styles.label}>Email</Text>
              {isEditing ? (
                <TextInput
                  value={editedProfile.mail || ''}
                  onChangeText={(text) =>
                    setEditedProfile({ ...editedProfile, mail: text })
                  }
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!saving}
                  placeholder="email@exemple.com"
                />
              ) : (
                <Text style={styles.value}>{user.mail || 'Non renseigné'}</Text>
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
            <Text style={styles.cardTitle}>Centres d'intérêt</Text>
            <Text style={styles.placeholderText}>
              Cette fonctionnalité sera bientôt disponible
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Questions de personnalité</Text>
            <Text style={styles.placeholderText}>
              Cette fonctionnalité sera bientôt disponible
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
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
  headerTitle: {
    fontWeight: "600",
    fontSize: 20,
    color: "#FFFFFF",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: "#FFFFFF",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  cancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
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
  saveButtonText: {
    color: "#303030",
  },
  avatarContainer: {
    alignItems: "center",
    position: "relative",
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontWeight: "700",
    fontSize: 36,
    color: "#303030",
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: "35%",
    width: 32,
    height: 32,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    paddingHorizontal: 24,
    marginTop: -48,
  },
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
  row: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  halfWidth: {
    flex: 1,
  },
  fullWidthField: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  value: {
    fontWeight: "600",
    fontSize: 16,
    color: "#303030",
  },
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
  cardTitle: {
    fontWeight: "600",
    fontSize: 18,
    color: "#303030",
    marginBottom: 12,
  },
  placeholderText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontStyle: "italic",
  },
});