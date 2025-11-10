// components/AuthPage.tsx
import { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { AuthInput, AuthButton, AuthError } from "@/components/auth";

interface AuthPageProps {
  onAuth: (
    isLogin: boolean,
    userType: "user" | "organizer",
    data: any
  ) => Promise<void>;
  loading: boolean;
}

type UserType = "user" | "organizer";

export function AuthPage({ onAuth, loading }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState<UserType>("user");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [organizationName, setOrganizationName] = useState("");
  const [organizerEmail, setOrganizerEmail] = useState("");
  const [organizerPhone, setOrganizerPhone] = useState("");
  const [description, setDescription] = useState("");

  const [error, setError] = useState("");

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

  const handleSubmit = async () => {
    setError("");

    if (isLogin) {
      if (userType === "user") {
        if (!phone) {
          setError("Le numéro de téléphone est requis");
          return;
        }
        const phoneRegex = /^[0-9+\s()-]{10,20}$/;
        if (!phoneRegex.test(phone)) {
          setError("Format de téléphone invalide (10-20 caractères)");
          return;
        }
      } else {
        if (!organizerEmail) {
          setError("L'email est requis");
          return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(organizerEmail)) {
          setError("Format d'email invalide");
          return;
        }
      }
      
      if (!password) {
        setError("Le mot de passe est requis");
        return;
      }
    }
    else {
      if (userType === "user") {
        if (!firstName || firstName.length < 2) {
          setError("Le prénom doit contenir au moins 2 caractères");
          return;
        }
        if (!lastName || lastName.length < 2) {
          setError("Le nom doit contenir au moins 2 caractères");
          return;
        }
        if (!phone) {
          setError("Le numéro de téléphone est requis");
          return;
        }
        const phoneRegex = /^[0-9+\s()-]{10,20}$/;
        if (!phoneRegex.test(phone)) {
          setError("Format de téléphone invalide (10-20 caractères)");
          return;
        }
        if (!birthDate) {
          setError("La date de naissance est requise");
          return;
        }
        if (!validateAge(birthDate)) {
          setError("Vous devez avoir au moins 18 ans");
          return;
        }
        if (userEmail) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(userEmail)) {
            setError("Format d'email invalide");
            return;
          }
        }
      } else {
        if (!organizationName || organizationName.length < 2) {
          setError("Le nom de l'organisation doit contenir au moins 2 caractères");
          return;
        }
        if (!organizerEmail) {
          setError("L'email est requis");
          return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(organizerEmail)) {
          setError("Format d'email invalide");
          return;
        }
        if (organizerPhone) {
          const phoneRegex = /^[0-9+\s()-]{10,20}$/;
          if (!phoneRegex.test(organizerPhone)) {
            setError("Format de téléphone invalide (10-20 caractères)");
            return;
          }
        }
      }
      
      if (!password || password.length < 8) {
        setError("Le mot de passe doit contenir au moins 8 caractères");
        return;
      }
      if (password !== confirmPassword) {
        setError("Les mots de passe ne correspondent pas");
        return;
      }
    }

    try {
      const data = {
        phone,
        firstName,
        lastName,
        birthDate,
        userEmail,
        organizationName,
        organizerEmail,
        organizerPhone,
        description,
        password,
      };

      await onAuth(isLogin, userType, data);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#303030",
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    header: {
      alignItems: "center",
      paddingTop: 48,
      paddingBottom: 32,
    },
    logoContainer: {
      marginBottom: 16,
      alignItems: "center",
    },
    logo: {
      width: 64,
      height: 64,
      resizeMode: "contain",
    },
    tagline: {
      color: "rgba(255, 255, 255, 0.7)",
      fontSize: 14,
    },
    card: {
      backgroundColor: "#F5F5F5",
      borderRadius: 16,
      padding: 24,
      marginBottom: 32,
    },
    toggleContainer: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 16,
      backgroundColor: "white",
      padding: 4,
      borderRadius: 8,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 6,
      alignItems: "center",
    },
    toggleButtonActive: {
      backgroundColor: "#303030",
    },
    toggleButtonInactive: {
      backgroundColor: "transparent",
    },
    toggleText: {
      fontSize: 14,
      fontWeight: "500",
    },
    toggleTextActive: {
      color: "white",
    },
    toggleTextInactive: {
      color: "#303030",
    },
    userTypeSection: {
      marginBottom: 24,
    },
    userTypeLabel: {
      marginBottom: 12,
      fontSize: 14,
      fontWeight: "500",
      color: "#303030",
    },
    radioContainer: {
      flexDirection: "row",
      gap: 16,
    },
    radioOption: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "white",
      padding: 12,
      borderRadius: 8,
      borderWidth: 2,
      gap: 8,
    },
    radioCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: "#303030",
      alignItems: "center",
      justifyContent: "center",
    },
    radioCircleSelected: {
      borderColor: "#1271FF",
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: "#1271FF",
    },
    radioLabel: {
      fontSize: 14,
      color: "#303030",
    },
    formContent: {
      gap: 16,
    },
    forgotPassword: {
      alignItems: "center",
      marginTop: 16,
    },
    forgotPasswordText: {
      color: "#303030",
      fontSize: 14,
    },
    hint: {
      fontSize: 12,
      color: "#666",
      marginTop: 4,
      marginLeft: 4,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require("@/assets/images/initLogoGray.png")}
              style={styles.logo}
            />
          </View>
          <ThemedText style={styles.tagline}>Là où tout commence</ThemedText>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Login/Register Toggle */}
          <View style={styles.toggleContainer}>
            <Pressable
              onPress={() => setIsLogin(true)}
              style={[
                styles.toggleButton,
                isLogin
                  ? styles.toggleButtonActive
                  : styles.toggleButtonInactive,
              ]}
              disabled={loading}
            >
              <ThemedText
                style={[
                  styles.toggleText,
                  isLogin
                    ? styles.toggleTextActive
                    : styles.toggleTextInactive,
                ]}
              >
                Connexion
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setIsLogin(false)}
              style={[
                styles.toggleButton,
                !isLogin
                  ? styles.toggleButtonActive
                  : styles.toggleButtonInactive,
              ]}
              disabled={loading}
            >
              <ThemedText
                style={[
                  styles.toggleText,
                  !isLogin
                    ? styles.toggleTextActive
                    : styles.toggleTextInactive,
                ]}
              >
                Inscription
              </ThemedText>
            </Pressable>
          </View>

          {/* User Type Selection */}
          <View style={styles.userTypeSection}>
            <ThemedText style={styles.userTypeLabel}>Je suis :</ThemedText>
            <View style={styles.radioContainer}>
              <Pressable
                style={[
                  styles.radioOption,
                  {
                    borderColor:
                      userType === "user" ? "#1271FF" : "transparent",
                  },
                ]}
                onPress={() => setUserType("user")}
                disabled={loading}
              >
                <View
                  style={[
                    styles.radioCircle,
                    userType === "user" && styles.radioCircleSelected,
                  ]}
                >
                  {userType === "user" && <View style={styles.radioInner} />}
                </View>
                <ThemedText style={styles.radioLabel}>Utilisateur</ThemedText>
              </Pressable>

              <Pressable
                style={[
                  styles.radioOption,
                  {
                    borderColor:
                      userType === "organizer" ? "#1271FF" : "transparent",
                  },
                ]}
                onPress={() => setUserType("organizer")}
                disabled={loading}
              >
                <View
                  style={[
                    styles.radioCircle,
                    userType === "organizer" && styles.radioCircleSelected,
                  ]}
                >
                  {userType === "organizer" && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <ThemedText style={styles.radioLabel}>Organisateur</ThemedText>
              </Pressable>
            </View>
          </View>

          {/* Form Content */}
          <View style={styles.formContent}>
            <AuthError message={error} />

            {/* CONNEXION - UTILISATEUR */}
            {isLogin && userType === "user" && (
              <>
                <View>
                  <AuthInput
                    label="Numéro de téléphone *"
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
                <AuthInput
                  label="Mot de passe *"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </>
            )}

            {/* CONNEXION - ORGANISATEUR */}
            {isLogin && userType === "organizer" && (
              <>
                <View>
                  <AuthInput
                    label="Email *"
                    placeholder="organisation@email.com"
                    value={organizerEmail}
                    onChangeText={setOrganizerEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <ThemedText style={styles.hint}>
                    Format: exemple@email.com
                  </ThemedText>
                </View>
                <AuthInput
                  label="Mot de passe *"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </>
            )}

            {/* INSCRIPTION - UTILISATEUR */}
            {!isLogin && userType === "user" && (
              <>
                <AuthInput
                  label="Prénom *"
                  placeholder="Jean"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  editable={!loading}
                />
                <AuthInput
                  label="Nom *"
                  placeholder="Dupont"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  editable={!loading}
                />
                <View>
                  <AuthInput
                    label="Téléphone *"
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
                <View>
                  <AuthInput
                    label="Date de naissance * (18 ans minimum)"
                    placeholder="AAAA-MM-JJ (ex: 2000-01-15)"
                    value={birthDate}
                    onChangeText={setBirthDate}
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
                <AuthInput
                  label="Mot de passe * (min. 8 caractères)"
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
              </>
            )}

            {/* INSCRIPTION - ORGANISATEUR */}
            {!isLogin && userType === "organizer" && (
              <>
                <AuthInput
                  label="Nom de l'organisation *"
                  placeholder="Mon Organisation"
                  value={organizationName}
                  onChangeText={setOrganizationName}
                  autoCapitalize="words"
                  editable={!loading}
                />
                <AuthInput
                  label="Email *"
                  placeholder="organisation@email.com"
                  value={organizerEmail}
                  onChangeText={setOrganizerEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
                <AuthInput
                  label="Téléphone (optionnel)"
                  placeholder="0612345678"
                  value={organizerPhone}
                  onChangeText={setOrganizerPhone}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
                <AuthInput
                  label="Description (optionnel)"
                  placeholder="Description de votre organisation..."
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  editable={!loading}
                />
                <AuthInput
                  label="Mot de passe * (min. 8 caractères)"
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
              </>
            )}

            <AuthButton
              label={isLogin ? "Se connecter" : "S'inscrire"}
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
            />

            {isLogin && (
              <Pressable style={styles.forgotPassword} disabled={loading}>
                <ThemedText style={styles.forgotPasswordText}>
                  Mot de passe oublié ?
                </ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}