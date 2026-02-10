// app/(auth)/index.tsx
import { AuthPage } from "@/components/AuthPage";
import { authService } from "@/services/auth.service";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";

export default function Auth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAuth = async (
    isLogin: boolean,
    userType: "user" | "organizer",
    data: any
  ) => {
    setLoading(true);
    
    try {
      if (isLogin) {
        const credentials = userType === "user" 
          ? { phone: data.phone, password: data.password }
          : { email: data.organizerEmail, password: data.password };

        console.log('Tentative de connexion:', {
          type: userType,
          credentials: { ...credentials, password: '***' }
        });

        await authService.login(credentials, userType === "organizer");
        
        console.log('Connexion réussie, redirection...');
        router.replace('/(main)/events');
      } else {
        const registerData = userType === "user"
          ? {
              firstname: data.firstName,
              lastname: data.lastName,
              phone: data.phone,
              birthday: data.birthDate,
              email: data.userEmail || undefined,
              password: data.password
            }
          : {
              name: data.organizationName,
              email: data.organizerEmail,
              phone: data.organizerPhone || undefined,
              description: data.description || undefined,
              password: data.password
            };

        console.log('Données d\'inscription:', {
          type: userType,
          data: { ...registerData, password: '***' }
        });

        await authService.register(registerData, userType === "organizer");
        
        console.log('Inscription réussie, redirection...');
        router.replace('/(main)/events');
      }
    } catch (err: any) {
      console.error(isLogin ? 'Erreur de connexion:' : 'Erreur d\'inscription:', err);
      console.error('Message:', err.message);
      
      let errorMessage = err.message || (isLogin ? 'Erreur de connexion' : 'Erreur d\'inscription');
      
      // Gestion des erreurs plus précise
      if (errorMessage.includes('Identifiants incorrects') || errorMessage.includes('Invalid credentials')) {
        errorMessage = userType === "organizer"
          ? 'Email ou mot de passe incorrect'
          : 'Numéro de téléphone ou mot de passe incorrect';
      } else if (errorMessage.includes('existe déjà') || errorMessage.includes('already exists')) {
        errorMessage = userType === "organizer"
          ? 'Cet email est déjà utilisé'
          : 'Ce numéro de téléphone est déjà utilisé';
      } else if (errorMessage.includes('validation') || errorMessage.includes('required')) {
        errorMessage = 'Données invalides. Vérifiez vos informations.';
      } else if (errorMessage.includes('Network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Erreur réseau. Vérifiez votre connexion et l\'URL de l\'API.';
      } else if (errorMessage.includes('token')) {
        errorMessage = 'Erreur d\'authentification. Veuillez réessayer.';
      }
      
      Alert.alert(
        isLogin ? 'Erreur de connexion' : 'Erreur d\'inscription',
        errorMessage
      );
      
      // Pas besoin de throw ici, on a déjà géré l'erreur
    } finally {
      setLoading(false);
    }
  };

  return <AuthPage onAuth={handleAuth} loading={loading} />;
}