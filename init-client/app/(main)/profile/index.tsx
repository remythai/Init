import { View, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { Profile, UserProfile } from "@/components/Profile";
import { useState, useEffect } from "react";
import { authService } from "@/services/auth.service";
import { useRouter } from "expo-router";

export default function MyProfileScreen() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const debugAuth = async () => {
      console.log('=== AUTH DEBUG ===');
      console.log('Token:', await authService.getToken());
      console.log('RefreshToken:', await authService.getRefreshToken());
      console.log('UserType:', await authService.getUserType());
      console.log('Is Authenticated:', await authService.isAuthenticated());
      console.log('=================');
    };
    
    debugAuth();
    loadUserProfile();
  }, []);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const user = await authService.getCurrentUser();
      
      if (!user) {
        Alert.alert(
          'Session expirée',
          'Veuillez vous reconnecter',
          [
            {
              text: 'OK',
              onPress: () => {
                authService.clearAuth();
                router.replace('/(auth)/login');
              }
            }
          ]
        );
        return;
      }

      setUserProfile(user);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      Alert.alert('Erreur', 'Impossible de charger le profil');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const updatedUser = await authService.updateCurrentUser(updates);
      if (updatedUser) {
        setUserProfile(updatedUser);
      }
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la mise à jour');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#303030" />
      </View>
    );
  }

  if (!userProfile) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <Profile 
        user={userProfile} 
        onUpdateProfile={handleUpdateProfile} 
        isOwnProfile={true}
        loading={loading}
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