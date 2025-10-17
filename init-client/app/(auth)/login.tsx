
// app/(auth)/login.tsx
import { useState } from 'react';
import { ScrollView, View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { AuthCard, AuthHeader, AuthTabs, AuthInput, AuthError, AuthButton } from '@/components/auth';

export default function Login() {
  const router = useRouter();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.replace('/(main)/events');
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollContent: { padding: theme.spacing.lg },
    formContent: { padding: theme.spacing.lg, gap: theme.spacing.md },
    link: { alignItems: 'center', marginTop: theme.spacing.lg },
    linkText: { color: theme.colors.primaryForeground, fontSize: theme.fontSizes.sm },
  });

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AuthHeader />
        <AuthCard>
          <AuthTabs activeTab="login" onTabChange={(tab) => router.push(`/(auth)/${tab}`)} />
          <View style={styles.formContent}>
            <AuthError message={error} />
            <AuthInput
              label="Email"
              placeholder="votre@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
            <AuthInput
              label="Mot de passe"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
            <AuthButton label="Se connecter" onPress={handleLogin} loading={loading} disabled={loading} />
            <Pressable style={styles.link}>
              <ThemedText style={styles.linkText}>Mot de passe oublié ?</ThemedText>
            </Pressable>
          </View>
        </AuthCard>
      </ScrollView>
    </ThemedView>
  );
}