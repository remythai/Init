// app/(auth)/login.tsx
import { useState } from 'react';
import { ScrollView, View, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { AuthCard, AuthHeader, AuthTabs, AuthInput, AuthError, AuthButton } from '@/components/auth';
import { authService } from '@/services/auth.service';

export default function Login() {
  const router = useRouter();
  const { theme } = useTheme();
  const [isOrganizer, setIsOrganizer] = useState(false);
  
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    
    if (isOrganizer) {
      if (!email) {
        setError('L\'email est requis');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Format d\'email invalide');
        return;
      }
    } else {
      if (!phone) {
        setError('Le numéro de téléphone est requis');
        return;
      }
      const phoneRegex = /^[0-9+\s()-]{10,20}$/;
      if (!phoneRegex.test(phone)) {
        setError('Format de téléphone invalide (10-20 caractères, chiffres et +()-espaces)');
        return;
      }
    }
    
    if (!password) {
      setError('Le mot de passe est requis');
      return;
    }

    setLoading(true);
    try {
      const credentials = isOrganizer 
        ? { email, password }
        : { phone, password };

      console.log('Tentative de connexion:', {
        type: isOrganizer ? 'orga' : 'user',
        credentials: isOrganizer ? { email: email, password: '***' } : { phone: phone, password: '***' }
      });

      await authService.login(credentials, isOrganizer);
      
      console.log('Connexion réussie, redirection...');
      router.replace('/(main)/events');
    } catch (err: any) {
      console.error('Erreur de connexion:', err);
      console.error('Message:', err.message);
      
      let errorMessage = err.message || 'Erreur de connexion';
      
      if (errorMessage.includes('Identifiants incorrects')) {
        errorMessage = isOrganizer 
          ? 'Email ou mot de passe incorrect' 
          : 'Numéro de téléphone ou mot de passe incorrect';
      } else if (errorMessage.includes('validation')) {
        errorMessage = 'Données invalides. Vérifiez vos informations.';
      } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        errorMessage = 'Erreur réseau. Vérifiez votre connexion et l\'URL de l\'API.';
      }
      
      setError(errorMessage);
      Alert.alert('Erreur de connexion', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollContent: { padding: theme.spacing.lg },
    formContent: { padding: theme.spacing.lg, gap: theme.spacing.md },
    switchContainer: { 
      flexDirection: 'row', 
      justifyContent: 'center', 
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md 
    },
    switchButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.card,
    },
    switchButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    switchText: {
      fontSize: theme.fontSizes.sm,
      color: 'pink',
    },
    switchTextActive: {
      color: theme.colors.primaryForeground,
      fontWeight: '600',
    },
    link: { alignItems: 'center', marginTop: theme.spacing.lg },
    linkText: { color: theme.colors.primaryForeground, fontSize: theme.fontSizes.sm },
    hint: {
      fontSize: theme.fontSizes.xs,
      color: theme.colors.mutedForeground,
      marginTop: -theme.spacing.sm,
    },
  });

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AuthHeader />
        <AuthCard>
          <AuthTabs activeTab="login" onTabChange={(tab) => router.push(`/(auth)/${tab}`)} />
          
          <View style={styles.formContent}>
            {/* Switch User/Organizer */}
            <View style={styles.switchContainer}>
              <Pressable 
                style={[styles.switchButton, !isOrganizer && styles.switchButtonActive]}
                onPress={() => setIsOrganizer(false)}
                disabled={loading}
              >
                <ThemedText style={[styles.switchText, !isOrganizer && styles.switchTextActive]}>
                  Utilisateur
                </ThemedText>
              </Pressable>
              <Pressable 
                style={[styles.switchButton, isOrganizer && styles.switchButtonActive]}
                onPress={() => setIsOrganizer(true)}
                disabled={loading}
              >
                <ThemedText style={[styles.switchText, isOrganizer && styles.switchTextActive]}>
                  Organisateur
                </ThemedText>
              </Pressable>
            </View>

            <AuthError message={error} />
            
            {isOrganizer ? (
              <View>
                <AuthInput
                  label="Email"
                  placeholder="organisation@email.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
                <ThemedText style={styles.hint}>
                  Format: exemple@email.com
                </ThemedText>
              </View>
            ) : (
              <View>
                <AuthInput
                  label="Téléphone"
                  placeholder="0612345678"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
                <ThemedText style={styles.hint}>
                  Format: 10-20 caractères (chiffres, +, -, (), espaces)
                </ThemedText>
              </View>
            )}
            
            <AuthInput
              label="Mot de passe"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
            
            <AuthButton 
              label="Se connecter" 
              onPress={handleLogin} 
              loading={loading} 
              disabled={loading} 
            />
            
            <Pressable style={styles.link} disabled={loading}>
              <ThemedText style={styles.linkText}>Mot de passe oublié ?</ThemedText>
            </Pressable>
          </View>
        </AuthCard>
      </ScrollView>
    </ThemedView>
  );
}