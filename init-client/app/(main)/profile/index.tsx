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
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      console.log('Chargement du profil utilisateur...');
      
      const user = await authService.getCurrentUser();
      console.log('Profil récupéré:', user);
      
      if (!user) {
        console.log('Aucun profil trouvé, redirection vers login');
        Alert.alert(
          'Session expirée',
          'Veuillez vous reconnecter',
          [
            {
              text: 'OK',
              onPress: () => {
                authService.clearAuth();
                router.replace('/(auth)');
              }
            }
          ]
        );
        return;
      }

      setUserProfile(user);
    } catch (error: any) {
      console.error('Erreur lors du chargement du profil:', error);
      Alert.alert(
        'Erreur', 
        'Impossible de charger le profil',
        [
          {
            text: 'Réessayer',
            onPress: () => loadUserProfile()
          },
          {
            text: 'Déconnexion',
            onPress: () => {
              authService.clearAuth();
              router.replace('/(auth)');
            },
            style: 'destructive'
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    try {
      console.log('Mise à jour du profil avec:', updates);
      
      const updatedUser = await authService.updateCurrentUser(updates);
      
      if (updatedUser) {
        console.log('Profil mis à jour:', updatedUser);
        setUserProfile(updatedUser);
      } else {
        throw new Error('La mise à jour n\'a pas retourné de données');
      }
    } catch (error: any) {
      console.error('Erreur mise à jour profil:', error);
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
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#303030" />
      </View>
    );
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