// app/(main)/profile/[id].tsx
import { Profile, UserProfile } from "@/components/Profile";
import { authService } from "@/services/auth.service";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, [id]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.authenticatedFetch(`/api/users/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Utilisateur introuvable");
      }

      setUserProfile(data.data || data);
    } catch (err: any) {
      console.error("Erreur chargement profil utilisateur:", err);
      setError(err.message || "Impossible de charger ce profil");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#303030" />
      </View>
    );
  }

  if (error || !userProfile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "Profil introuvable"}</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Profile
        profile={userProfile}
        profileType="user"
        onUpdateProfile={async () => {}}
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
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: "#303030",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});