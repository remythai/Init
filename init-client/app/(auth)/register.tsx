// app/(auth)/register.tsx
import { AuthButton, AuthCard, AuthError, AuthHeader, AuthInput, AuthTabs } from '@/components/auth';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/context/ThemeContext';
import { authService } from '@/services/auth.service';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable, Alert } from 'react-native';

export default function Register() {
  const router = useRouter();
  const { theme } = useTheme();
  const [isOrganizer, setIsOrganizer] = useState(false);
  
  // Champs pour utilisateur
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [userEmail, setUserEmail] = useState('');
  
  // Champs pour organisateur
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [orgaPhone, setOrgaPhone] = useState('');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateAge = (dateStr: string): boolean => {
    const birthDate = new Date(dateStr);
    if (isNaN(birthDate.getTime())) return false;
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age >= 18;
  };

  const validateUserFields = () => {
    // Champs requis
    if (!firstname || firstname.length < 2) {
      setError('Le prénom doit contenir au moins 2 caractères');
      return false;
    }
    if (!lastname || lastname.length < 2) {
      setError('Le nom doit contenir au moins 2 caractères');
      return false;
    }
    
    // Validation du téléphone (requis)
    if (!phone) {
      setError('Le numéro de téléphone est requis');
      return false;
    }
    const phoneRegex = /^[0-9+\s()-]{10,20}$/;
    if (!phoneRegex.test(phone)) {
      setError('Format de téléphone invalide (10-20 caractères, chiffres et +()-espaces)');
      return false;
    }
    
    // Validation de la date de naissance (requise + 18 ans minimum)
    if (!birthday) {
      setError('La date de naissance est requise');
      return false;
    }
    if (!validateAge(birthday)) {
      setError('Vous devez avoir au moins 18 ans');
      return false;
    }
    
    // Email optionnel mais si fourni doit être valide
    if (userEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userEmail)) {
        setError('Format d\'email invalide');
        return false;
      }
    }
    
    // Validation du mot de passe
    if (!password || password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }
    
    return true;
  };

  const validateOrgaFields = () => {
    // Nom requis
    if (!name || name.length < 2) {
      setError('Le nom de l\'organisation doit contenir au moins 2 caractères');
      return false;
    }
    
    // Email requis
    if (!email) {
      setError('L\'email est requis');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Format d\'email invalide');
      return false;
    }
    
    // Téléphone optionnel mais si fourni doit être valide
    if (orgaPhone) {
      const phoneRegex = /^[0-9+\s()-]{10,20}$/;
      if (!phoneRegex.test(orgaPhone)) {
        setError('Format de téléphone invalide (10-20 caractères)');
        return false;
      }
    }
    
    // Validation du mot de passe
    if (!password || password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }
    
    return true;
  };

  const handleRegister = async () => {
    setError('');

    // Validation selon le type
    if (isOrganizer) {
      if (!validateOrgaFields()) return;
    } else {
      if (!validateUserFields()) return;
    }

    setLoading(true);
    try {
      const registerData = isOrganizer 
        ? {
            name,
            email,
            description: description || undefined,
            phone: orgaPhone || undefined,
            password
          }
        : {
            firstname,
            lastname,
            phone,
            birthday,
            email: userEmail || undefined,
            password
          };

      console.log('📝 Données d\'inscription:', {
        type: isOrganizer ? 'orga' : 'user',
        data: { ...registerData, password: '***' }
      });

      await authService.register(registerData, isOrganizer);
      
      console.log('✅ Inscription réussie, redirection...');
      // Inscription réussie, redirection
      router.replace('/(main)/events');
    } catch (err: any) {
      console.error('❌ Erreur d\'inscription:', err);
      console.error('❌ Message:', err.message);
      
      let errorMessage = err.message || "Erreur lors de l'inscription";
      
      // Messages d'erreur plus clairs
      if (errorMessage.includes('validation')) {
        errorMessage = 'Données invalides. Vérifiez vos informations.';
      } else if (errorMessage.includes('existe déjà') || errorMessage.includes('already exists')) {
        errorMessage = isOrganizer 
          ? 'Cet email est déjà utilisé' 
          : 'Ce numéro de téléphone est déjà utilisé';
      } else if (errorMessage.includes('Network')) {
        errorMessage = 'Erreur réseau. Vérifiez votre connexion.';
      }
      
      setError(errorMessage);
      Alert.alert('Erreur d\'inscription', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollContent: { padding: theme.spacing.lg, paddingBottom: 40 },
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
          <AuthTabs activeTab="register" onTabChange={(tab) => router.push(`/(auth)/${tab}`)} />
          
          <View style={styles.formContent}>
            {/* Switch User/Organizer */}
            <View style={styles.switchContainer}>
              <Pressable 
                style={[styles.switchButton, !isOrganizer && styles.switchButtonActive]}
                onPress={() => setIsOrganizer(false)}
              >
                <ThemedText style={[styles.switchText, !isOrganizer && styles.switchTextActive]}>
                  Utilisateur
                </ThemedText>
              </Pressable>
              <Pressable 
                style={[styles.switchButton, isOrganizer && styles.switchButtonActive]}
                onPress={() => setIsOrganizer(true)}
              >
                <ThemedText style={[styles.switchText, isOrganizer && styles.switchTextActive]}>
                  Organisateur
                </ThemedText>
              </Pressable>
            </View>

            <AuthError message={error} />
            
            {isOrganizer ? (
              // Formulaire Organisateur
              <>
                <AuthInput 
                  label="Nom de l'organisation *" 
                  placeholder="Mon Organisation" 
                  value={name} 
                  onChangeText={setName} 
                  autoCapitalize="words" 
                  editable={!loading} 
                />
                <AuthInput 
                  label="Email *" 
                  placeholder="organisation@email.com" 
                  value={email} 
                  onChangeText={setEmail} 
                  keyboardType="email-address" 
                  autoCapitalize="none" 
                  editable={!loading} 
                />
                <AuthInput 
                  label="Téléphone (optionnel)" 
                  placeholder="0612345678" 
                  value={orgaPhone} 
                  onChangeText={setOrgaPhone} 
                  keyboardType="phone-pad" 
                  editable={!loading} 
                />
                <AuthInput 
                  label="Description (optionnel)" 
                  placeholder="Description de votre organisation" 
                  value={description} 
                  onChangeText={setDescription} 
                  multiline
                  numberOfLines={3}
                  editable={!loading} 
                />
              </>
            ) : (
              // Formulaire Utilisateur
              <>
                <AuthInput 
                  label="Prénom *" 
                  placeholder="Jean" 
                  value={firstname} 
                  onChangeText={setFirstname} 
                  autoCapitalize="words" 
                  editable={!loading} 
                />
                <AuthInput 
                  label="Nom *" 
                  placeholder="Dupont" 
                  value={lastname} 
                  onChangeText={setLastname} 
                  autoCapitalize="words" 
                  editable={!loading} 
                />
                <AuthInput 
                  label="Téléphone *" 
                  placeholder="0612345678" 
                  value={phone} 
                  onChangeText={setPhone} 
                  keyboardType="phone-pad" 
                  editable={!loading} 
                />
                <View>
                  <AuthInput 
                    label="Date de naissance * (18 ans minimum)" 
                    placeholder="AAAA-MM-JJ (ex: 2000-01-15)" 
                    value={birthday} 
                    onChangeText={setBirthday} 
                    editable={!loading} 
                  />
                  <ThemedText style={styles.hint}>
                    Format: AAAA-MM-JJ (exemple: 2000-01-15)
                  </ThemedText>
                </View>
                <AuthInput 
                  label="Email (optionnel)" 
                  placeholder="votre@email.com" 
                  value={userEmail} 
                  onChangeText={setUserEmail} 
                  keyboardType="email-address" 
                  autoCapitalize="none" 
                  editable={!loading} 
                />
              </>
            )}
            
            <AuthInput 
              label="Mot de passe * (min 8 caractères)" 
              placeholder="••••••••" 
              value={password} 
              onChangeText={setPassword} 
              secureTextEntry 
              editable={!loading} 
            />
            <AuthInput 
              label="Confirmer le mot de passe *" 
              placeholder="••••••••" 
              value={confirmPassword} 
              onChangeText={setConfirmPassword} 
              secureTextEntry 
              editable={!loading} 
            />
            
            <AuthButton 
              label="S'inscrire" 
              onPress={handleRegister} 
              loading={loading} 
              disabled={loading} 
            />
          </View>
        </AuthCard>
      </ScrollView>
    </ThemedView>
  );
}