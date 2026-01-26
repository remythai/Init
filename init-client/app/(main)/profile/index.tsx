import { View, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { Profile, UserProfile, OrgaProfile } from "@/components/Profile";
import { useState, useEffect } from "react";
import { authService } from "@/services/auth.service";
import { useRouter } from "expo-router";

export default function MyProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | OrgaProfile | null>(null);
  const [profileType, setProfileType] = useState<'user' | 'orga' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      console.log('Chargement du profil...');
      
      const userType = await authService.getUserType();
      console.log('Type d\'utilisateur:', userType);
      
      if (!userType) {
        console.log('Aucun type d\'utilisateur trouvé, redirection vers login');
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

      setProfileType(userType);

      const profileData = await authService.getCurrentProfile();
      console.log('Profil récupéré:', profileData);
      
      if (!profileData) {
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

      setProfile(profileData);
    } catch (error: any) {
      console.error('Erreur lors du chargement du profil:', error);
      Alert.alert(
        'Erreur', 
        'Impossible de charger le profil',
        [
          {
            text: 'Réessayer',
            onPress: () => loadProfile()
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

  const handleUpdateProfile = async (updates: Partial<UserProfile | OrgaProfile>) => {
    try {
      console.log('Mise à jour du profil avec:', updates);
      
      const updatedProfile = await authService.updateCurrentProfile(updates);
      
      if (updatedProfile) {
        console.log('Profil mis à jour:', updatedProfile);
        setProfile(updatedProfile);
      } else {
        throw new Error('La mise à jour n\'a pas retourné de données');
      }
    } catch (error: any) {
      console.error('Erreur mise à jour profil:', error);
      throw new Error(error.message || 'Erreur lors de la mise à jour');
    }
  };

  if (loading || !profile || !profileType) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#303030" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Profile 
        profile={profile}
        profileType={profileType}
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