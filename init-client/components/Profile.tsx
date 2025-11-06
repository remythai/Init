import { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  StyleSheet 
} from "react-native";
import { Edit2, Save, X, Camera } from "lucide-react-native";

export interface UserProfile {
  firstName: string;
  age: number;
  bio: string;
  interests: string[];
  personalityQuestions: {
    question: string;
    answer: string;
  }[];
}

interface ProfileProps {
  user: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  isOwnProfile?: boolean;
}

export function Profile({ user, onUpdateProfile, isOwnProfile = true }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(user);

  const handleSave = () => {
    onUpdateProfile(editedProfile);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedProfile(user);
    setIsEditing(false);
  };

  const availableInterests = [
    "Musique",
    "Sport",
    "Lecture",
    "Voyage",
    "Cuisine",
    "Art",
    "Cinéma",
    "Technologie",
    "Mode",
    "Nature",
  ];

  const toggleInterest = (interest: string) => {
    if (editedProfile.interests.includes(interest)) {
      setEditedProfile({
        ...editedProfile,
        interests: editedProfile.interests.filter((i) => i !== interest),
      });
    } else {
      setEditedProfile({
        ...editedProfile,
        interests: [...editedProfile.interests, interest],
      });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>
              {isOwnProfile ? "Mon Profil" : `Profil de ${user.firstName}`}
            </Text>
            {isOwnProfile && !isEditing ? (
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                style={styles.editButton}
              >
                <Edit2 color="#FFFFFF" size={16} />
                <Text style={styles.editButtonText}>Modifier</Text>
              </TouchableOpacity>
            ) : isOwnProfile && isEditing ? (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={handleCancel}
                  style={styles.cancelButton}
                >
                  <X color="#FFFFFF" size={16} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  style={styles.saveButton}
                >
                  <Save color="#303030" size={16} />
                  <Text style={styles.saveButtonText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.firstName.charAt(0)}
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
                    value={editedProfile.firstName}
                    onChangeText={(text) =>
                      setEditedProfile({ ...editedProfile, firstName: text })
                    }
                    style={styles.input}
                  />
                ) : (
                  <Text style={styles.value}>{user.firstName}</Text>
                )}
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Âge</Text>
                {isEditing ? (
                  <TextInput
                    value={editedProfile.age.toString()}
                    onChangeText={(text) =>
                      setEditedProfile({ ...editedProfile, age: parseInt(text) || 0 })
                    }
                    keyboardType="numeric"
                    style={styles.input}
                  />
                ) : (
                  <Text style={styles.value}>{user.age} ans</Text>
                )}
              </View>
            </View>

            <View style={styles.bioSection}>
              <Text style={styles.label}>Biographie</Text>
              {isEditing ? (
                <TextInput
                  value={editedProfile.bio}
                  onChangeText={(text) =>
                    setEditedProfile({ ...editedProfile, bio: text })
                  }
                  style={[styles.input, styles.bioInput]}
                  multiline
                  numberOfLines={4}
                  placeholder="Parlez-nous de vous..."
                />
              ) : (
                <Text style={styles.bioText}>{user.bio}</Text>
              )}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Centres d'intérêt</Text>
            <View style={styles.badgeContainer}>
              {isEditing ? (
                availableInterests.map((interest) => (
                  <TouchableOpacity
                    key={interest}
                    onPress={() => toggleInterest(interest)}
                    style={[
                      styles.badge,
                      editedProfile.interests.includes(interest)
                        ? styles.badgeSelected
                        : styles.badgeUnselected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        editedProfile.interests.includes(interest)
                          ? styles.badgeTextSelected
                          : styles.badgeTextUnselected,
                      ]}
                    >
                      {interest}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                user.interests.map((interest) => (
                  <View key={interest} style={styles.badgeDisplay}>
                    <Text style={styles.badgeDisplayText}>{interest}</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Questions de personnalité</Text>
            <View style={styles.questionsContainer}>
              {(isEditing ? editedProfile : user).personalityQuestions.map((qa, index) => (
                <View key={index} style={styles.questionItem}>
                  <Text style={styles.questionText}>{qa.question}</Text>
                  {isEditing ? (
                    <TextInput
                      value={qa.answer}
                      onChangeText={(text) => {
                        const newQuestions = [...editedProfile.personalityQuestions];
                        newQuestions[index].answer = text;
                        setEditedProfile({ 
                          ...editedProfile, 
                          personalityQuestions: newQuestions 
                        });
                      }}
                      style={styles.input}
                      placeholder="Votre réponse..."
                    />
                  ) : (
                    <Text style={styles.answerText}>{qa.answer}</Text>
                  )}
                </View>
              ))}
            </View>
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
  },
  bioSection: {
    marginTop: 8,
  },
  bioInput: {
    height: 100,
    textAlignVertical: "top",
  },
  bioText: {
    color: "#374151",
    lineHeight: 20,
  },
  cardTitle: {
    fontWeight: "600",
    fontSize: 18,
    color: "#303030",
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeSelected: {
    backgroundColor: "#303030",
  },
  badgeUnselected: {
    backgroundColor: "#F5F5F5",
  },
  badgeText: {
    fontSize: 14,
  },
  badgeTextSelected: {
    color: "#FFFFFF",
  },
  badgeTextUnselected: {
    color: "#303030",
  },
  badgeDisplay: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeDisplayText: {
    color: "#303030",
    fontSize: 14,
  },
  questionsContainer: {
    gap: 16,
  },
  questionItem: {
    borderLeftWidth: 4,
    borderLeftColor: "#303030",
    paddingLeft: 16,
  },
  questionText: {
    fontWeight: "500",
    fontSize: 16,
    color: "#303030",
    marginBottom: 8,
  },
  answerText: {
    color: "#374151",
    lineHeight: 20,
  },
});