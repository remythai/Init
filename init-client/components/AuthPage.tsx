// components/AuthPage.tsx
import { DatePicker } from "@/components/DatePicker";
import { AuthButton, AuthError, AuthInput } from "@/components/auth";
import { type Theme } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function PasswordInput({ label, value, onChangeText, show, onToggle, editable, styles, mutedColor }: {
  label: string; value: string; onChangeText: (t: string) => void; show: boolean; onToggle: () => void;
  editable: boolean; styles: any; mutedColor: string;
}) {
  return (
    <View>
      <AuthInput
        label={label}
        placeholder="••••••••"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!show}
        editable={editable}
      />
      <Pressable onPress={onToggle} style={styles.eyeButton}>
        <MaterialIcons name={show ? "visibility-off" : "visibility"} size={20} color={mutedColor} />
      </Pressable>
    </View>
  );
}

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
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, insets.top, insets.bottom), [theme, insets.top, insets.bottom]);

  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState<UserType>("user");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [organizationName, setOrganizationName] = useState("");
  const [organizerEmail, setOrganizerEmail] = useState("");
  const [organizerPhone, setOrganizerPhone] = useState("");
  const [description, setDescription] = useState("");

  const [acceptedCGU, setAcceptedCGU] = useState(false);
  const [error, setError] = useState("");

  const validateAge = (dateStr: string): boolean => {
    const birth = new Date(dateStr);
    if (isNaN(birth.getTime())) return false;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 18;
  };

  const handleSubmit = async () => {
    setError("");

    if (isLogin) {
      if (userType === "user") {
        if (!phone) { setError("Le numéro de téléphone est requis"); return; }
        if (!/^[0-9+\s()-]{10,20}$/.test(phone)) { setError("Format de téléphone invalide (10-20 caractères)"); return; }
      } else {
        if (!organizerEmail) { setError("L'email est requis"); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(organizerEmail)) { setError("Format d'email invalide"); return; }
      }
      if (!password) { setError("Le mot de passe est requis"); return; }
    } else {
      if (userType === "user") {
        if (!firstName || firstName.length < 2) { setError("Le prénom doit contenir au moins 2 caractères"); return; }
        if (!lastName || lastName.length < 2) { setError("Le nom doit contenir au moins 2 caractères"); return; }
        if (!phone) { setError("Le numéro de téléphone est requis"); return; }
        if (!/^[0-9+\s()-]{10,20}$/.test(phone)) { setError("Format de téléphone invalide (10-20 caractères)"); return; }
        if (!birthDate) { setError("La date de naissance est requise"); return; }
        if (!validateAge(birthDate)) { setError("Vous devez avoir au moins 18 ans"); return; }
        if (userEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) { setError("Format d'email invalide"); return; }
      } else {
        if (!organizationName || organizationName.length < 2) { setError("Le nom de l'organisation doit contenir au moins 2 caractères"); return; }
        if (!organizerEmail) { setError("L'email est requis"); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(organizerEmail)) { setError("Format d'email invalide"); return; }
        if (organizerPhone && !/^[0-9+\s()-]{10,20}$/.test(organizerPhone)) { setError("Format de téléphone invalide (10-20 caractères)"); return; }
      }
      if (!password || password.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères"); return; }
      if (password !== confirmPassword) { setError("Les mots de passe ne correspondent pas"); return; }
      if (!acceptedCGU) { setError("Vous devez accepter les CGU et la politique de confidentialité"); return; }
    }

    try {
      await onAuth(isLogin, userType, {
        phone, firstName, lastName, birthDate, userEmail,
        organizationName, organizerEmail, organizerPhone, description, password,
      });
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require("@/assets/images/logoLight.svg")}
            style={styles.logo}
          />
          <Text style={styles.tagline}>Là où tout commence</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Login/Register Toggle */}
          <View style={styles.toggleContainer}>
            <Pressable
              onPress={() => setIsLogin(true)}
              style={[styles.toggleButton, isLogin ? styles.toggleActive : styles.toggleInactive]}
              disabled={loading}
            >
              <Text style={[styles.toggleText, isLogin ? styles.toggleTextActive : styles.toggleTextInactive]}>
                Connexion
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setIsLogin(false)}
              style={[styles.toggleButton, !isLogin ? styles.toggleActive : styles.toggleInactive]}
              disabled={loading}
            >
              <Text style={[styles.toggleText, !isLogin ? styles.toggleTextActive : styles.toggleTextInactive]}>
                Inscription
              </Text>
            </Pressable>
          </View>

          {/* User Type Selection */}
          <View style={styles.userTypeSection}>
            <Text style={styles.userTypeLabel}>Je suis :</Text>
            <View style={styles.radioContainer}>
              <Pressable
                style={[styles.radioOption, { borderColor: userType === "user" ? theme.colors.primary : theme.colors.border }]}
                onPress={() => setUserType("user")}
                disabled={loading}
              >
                <View style={[styles.radioCircle, userType === "user" && styles.radioCircleSelected]}>
                  {userType === "user" && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioLabel}>Utilisateur</Text>
              </Pressable>
              <Pressable
                style={[styles.radioOption, { borderColor: userType === "organizer" ? theme.colors.primary : theme.colors.border }]}
                onPress={() => setUserType("organizer")}
                disabled={loading}
              >
                <View style={[styles.radioCircle, userType === "organizer" && styles.radioCircleSelected]}>
                  {userType === "organizer" && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioLabel}>Organisateur</Text>
              </Pressable>
            </View>
          </View>

          {/* Form Content */}
          <View style={styles.formContent}>
            <AuthError message={error} />

            {/* LOGIN - USER */}
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
                  <Text style={styles.hint}>Format: 10-20 caractères (chiffres, +, -, (), espaces)</Text>
                </View>
                <PasswordInput label="Mot de passe *" value={password} onChangeText={setPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} editable={!loading} styles={styles} mutedColor={theme.colors.mutedForeground} />
              </>
            )}

            {/* LOGIN - ORGANIZER */}
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
                  <Text style={styles.hint}>Format: exemple@email.com</Text>
                </View>
                <PasswordInput label="Mot de passe *" value={password} onChangeText={setPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} editable={!loading} styles={styles} mutedColor={theme.colors.mutedForeground} />
              </>
            )}

            {/* REGISTER - USER */}
            {!isLogin && userType === "user" && (
              <>
                <View style={styles.nameRow}>
                  <View style={styles.nameField}>
                    <AuthInput label="Prénom *" placeholder="Jean" value={firstName} onChangeText={setFirstName} autoCapitalize="words" editable={!loading} />
                  </View>
                  <View style={styles.nameField}>
                    <AuthInput label="Nom *" placeholder="Dupont" value={lastName} onChangeText={setLastName} autoCapitalize="words" editable={!loading} />
                  </View>
                </View>
                <View>
                  <AuthInput label="Téléphone *" placeholder="0612345678" value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!loading} />
                  <Text style={styles.hint}>Format: 10-20 caractères (chiffres, +, -, (), espaces)</Text>
                </View>
                <DatePicker value={birthDate} onChange={setBirthDate} editable={!loading} />
                <AuthInput label="Email (optionnel)" placeholder="votre@email.com" value={userEmail} onChangeText={setUserEmail} keyboardType="email-address" autoCapitalize="none" editable={!loading} />
                <PasswordInput label="Mot de passe * (min. 8 caractères)" value={password} onChangeText={setPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} editable={!loading} styles={styles} mutedColor={theme.colors.mutedForeground} />
                <PasswordInput label="Confirmer le mot de passe *" value={confirmPassword} onChangeText={setConfirmPassword} show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} editable={!loading} styles={styles} mutedColor={theme.colors.mutedForeground} />
              </>
            )}

            {/* REGISTER - ORGANIZER */}
            {!isLogin && userType === "organizer" && (
              <>
                <AuthInput label="Nom de l'organisation *" placeholder="Mon Organisation" value={organizationName} onChangeText={setOrganizationName} autoCapitalize="words" editable={!loading} />
                <AuthInput label="Email *" placeholder="organisation@email.com" value={organizerEmail} onChangeText={setOrganizerEmail} keyboardType="email-address" autoCapitalize="none" editable={!loading} />
                <AuthInput label="Téléphone (optionnel)" placeholder="0612345678" value={organizerPhone} onChangeText={setOrganizerPhone} keyboardType="phone-pad" editable={!loading} />
                <AuthInput label="Description (optionnel)" placeholder="Description de votre organisation..." value={description} onChangeText={setDescription} multiline numberOfLines={3} editable={!loading} />
                <PasswordInput label="Mot de passe * (min. 8 caractères)" value={password} onChangeText={setPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} editable={!loading} styles={styles} mutedColor={theme.colors.mutedForeground} />
                <PasswordInput label="Confirmer le mot de passe *" value={confirmPassword} onChangeText={setConfirmPassword} show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} editable={!loading} styles={styles} mutedColor={theme.colors.mutedForeground} />
              </>
            )}

            {/* CGU Checkbox - Registration only */}
            {!isLogin && (
              <Pressable style={styles.cguRow} onPress={() => setAcceptedCGU(!acceptedCGU)} disabled={loading}>
                <MaterialIcons
                  name={acceptedCGU ? "check-box" : "check-box-outline-blank"}
                  size={22}
                  color={acceptedCGU ? theme.colors.primary : theme.colors.mutedForeground}
                />
                <Text style={styles.cguText}>
                  <Text style={{ color: theme.colors.destructive }}>* </Text>
                  J'accepte les Conditions Générales d'Utilisation et la Politique de confidentialité
                </Text>
              </Pressable>
            )}

            <AuthButton
              label={isLogin ? "Se connecter" : "S'inscrire"}
              onPress={handleSubmit}
              loading={loading}
              disabled={loading || (!isLogin && !acceptedCGU)}
            />

            {isLogin && (
              <Pressable style={styles.forgotPassword} disabled={loading}>
                <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme, topInset: number, bottomInset: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: Math.max(bottomInset, 40),
    },
    header: {
      alignItems: "center",
      paddingTop: topInset + 32,
      paddingBottom: 24,
    },
    logo: {
      width: 80,
      height: 80,
      resizeMode: "contain",
      marginBottom: 12,
    },
    tagline: {
      color: theme.colors.mutedForeground,
      fontSize: 14,
      fontFamily: "Roboto",
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 24,
      marginBottom: 24,
    },
    // Toggle
    toggleContainer: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 20,
      backgroundColor: theme.colors.secondary,
      padding: 4,
      borderRadius: 8,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 6,
      alignItems: "center",
    },
    toggleActive: {
      backgroundColor: theme.colors.accentSolid,
    },
    toggleInactive: {
      backgroundColor: "transparent",
    },
    toggleText: {
      fontSize: 14,
      fontWeight: "500",
      fontFamily: "Poppins",
    },
    toggleTextActive: {
      color: theme.colors.accentSolidText,
    },
    toggleTextInactive: {
      color: theme.colors.foreground,
    },
    // User type
    userTypeSection: {
      marginBottom: 20,
    },
    userTypeLabel: {
      marginBottom: 12,
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.foreground,
      fontFamily: "Poppins",
    },
    radioContainer: {
      flexDirection: "row",
      gap: 12,
    },
    radioOption: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.secondary,
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
      borderColor: theme.colors.foreground,
      alignItems: "center",
      justifyContent: "center",
    },
    radioCircleSelected: {
      borderColor: theme.colors.primary,
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.primary,
    },
    radioLabel: {
      fontSize: 14,
      color: theme.colors.foreground,
      fontFamily: "Roboto",
    },
    // Form
    formContent: {
      gap: 14,
    },
    label: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.foreground,
      marginBottom: 6,
      fontFamily: "Poppins",
    },
    hint: {
      fontSize: 12,
      color: theme.colors.mutedForeground,
      marginTop: 4,
      marginLeft: 4,
    },
    nameRow: {
      flexDirection: "row",
      gap: 12,
    },
    nameField: {
      flex: 1,
    },
    passwordContainer: {
      position: "relative",
    },
    eyeButton: {
      position: "absolute",
      right: 12,
      bottom: 0,
      height: 42,
      justifyContent: "center" as const,
      paddingHorizontal: 4,
    },
    // CGU
    cguRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      marginTop: 4,
    },
    cguText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.foreground,
      lineHeight: 18,
      fontFamily: "Roboto",
    },
    // Footer
    forgotPassword: {
      alignItems: "center",
      marginTop: 8,
    },
    forgotPasswordText: {
      color: theme.colors.foreground,
      fontSize: 14,
      fontFamily: "Roboto",
    },
  });
