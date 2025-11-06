import { View } from "react-native";
import { Profile, UserProfile } from "@/components/Profile";
import { useState } from "react";

export default function MyProfileScreen() {
  const [userProfile, setUserProfile] = useState<UserProfile>({
    firstName: "Marie",
    age: 25,
    bio: "Passionnée par la vie et les nouvelles expériences.",
    interests: ["Musique", "Voyage", "Cuisine", "Nature"],
    personalityQuestions: [
      {
        question: "Qu'est-ce qui vous rend unique ?",
        answer: "Ma curiosité sans limites.",
      },
      {
        question: "Votre plus grand rêve ?",
        answer: "Faire le tour du monde.",
      },
      {
        question: "Comment passez-vous votre temps libre ?",
        answer: "J'explore de nouveaux restaurants.",
      },
    ],
  });

  const handleUpdateProfile = (profile: UserProfile) => {
    setUserProfile(profile);
  };

  return (
    <View style={{ flex: 1 }}>
      <Profile user={userProfile} onUpdateProfile={handleUpdateProfile} isOwnProfile={true} />
    </View>
  );
}