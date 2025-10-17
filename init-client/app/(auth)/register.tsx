import { AuthButton, AuthCard, AuthError, AuthHeader, AuthInput, AuthTabs } from '@/components/auth';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

export default function Register() {
  const router = useRouter();
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError('');
    if (!name || !email || !password || !confirmPassword) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.replace('/(main)/events');
    } catch (err) {
      setError("Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollContent: { padding: theme.spacing.lg },
    formContent: { padding: theme.spacing.lg, gap: theme.spacing.md },
  });

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AuthHeader />
        <AuthCard>
          <AuthTabs activeTab="register" onTabChange={(tab) => router.push(`/(auth)/${tab}`)} />
          <View style={styles.formContent}>
            <AuthError message={error} />
            <AuthInput label="Nom complet" placeholder="Jean Dupont" value={name} onChangeText={setName} autoCapitalize="words" editable={!loading} />
            <AuthInput label="Email" placeholder="votre@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!loading} />
            <AuthInput label="Mot de passe" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry editable={!loading} />
            <AuthInput label="Confirmer le mot de passe" placeholder="••••••••" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry editable={!loading} />
            <AuthButton label="S'inscrire" onPress={handleRegister} loading={loading} disabled={loading} />
          </View>
        </AuthCard>
      </ScrollView>
    </ThemedView>
  );
}