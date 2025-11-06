import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Profile, UserProfile } from "@/components/Profile";
import { useState, useEffect } from "react";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Charger le profil depuis votre API
    setTimeout(() => {
      setUserProfile({
        firstName: "Alex",
        age: 28,
        bio: "Amateur de tech et de sport.",
        interests: ["Sport", "Technologie", "Cinéma"],
        personalityQuestions: [
          {
            question: "Qu'est-ce qui vous rend unique ?",
            answer: "Mon optimisme.",
          },
          {
            question: "Votre plus grand rêve ?",
            answer: "Créer une startup.",
          },
          {
            question: "Comment passez-vous votre temps libre ?",
            answer: "Je code et je fais du sport.",
          },
        ],
      });
      setLoading(false);
    }, 500);
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#303030" />
      </View>
    );
  }

  if (!userProfile) return null;

  return (
    <View style={{ flex: 1 }}>
      <Profile 
        user={userProfile} 
        onUpdateProfile={() => {}} 
        isOwnProfile={false} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
});