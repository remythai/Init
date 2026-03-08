// app/(main)/profile/[id].tsx
import { Profile, UserProfile } from "@/components/Profile";
import { type Theme } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { ProfileSkeleton } from "@/components/ui/Skeleton";
import { authService } from "@/services/auth.service";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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

  if (loading) return <ProfileSkeleton />;

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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      padding: 24,
    },
    errorText: {
      fontSize: 16,
      color: theme.colors.mutedForeground,
      textAlign: "center",
      marginBottom: 16,
    },
    backButton: {
      backgroundColor: theme.colors.accentSolid,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    backButtonText: {
      color: theme.colors.accentSolidText,
      fontSize: 16,
      fontWeight: "600",
    },
  });