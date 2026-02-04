"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { authService } from "../services/auth.service";

type UserType = "user" | "organizer";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState<UserType>("user");
  const [loading, setLoading] = useState(false);

  // Form fields
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
  const [error, setError] = useState("");
  const [acceptedCGU, setAcceptedCGU] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validation
      if (isLogin) {
        if (userType === "user") {
          if (!phone) {
            throw new Error("Le numéro de téléphone est requis");
          }
          const phoneRegex = /^[0-9+\s()-]{10,20}$/;
          if (!phoneRegex.test(phone)) {
            throw new Error("Format de téléphone invalide (10-20 caractères)");
          }
        } else {
          if (!organizerEmail) {
            throw new Error("L'email est requis");
          }
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(organizerEmail)) {
            throw new Error("Format d'email invalide");
          }
        }

        if (!password) {
          throw new Error("Le mot de passe est requis");
        }
      } else {
        // Registration validation
        if (userType === "user") {
          if (!firstName || firstName.length < 2) {
            throw new Error("Le prénom doit contenir au moins 2 caractères");
          }
          if (!lastName || lastName.length < 2) {
            throw new Error("Le nom doit contenir au moins 2 caractères");
          }
          if (!phone) {
            throw new Error("Le numéro de téléphone est requis");
          }
          const phoneRegex = /^[0-9+\s()-]{10,20}$/;
          if (!phoneRegex.test(phone)) {
            throw new Error("Format de téléphone invalide (10-20 caractères)");
          }
          if (!birthDate) {
            throw new Error("La date de naissance est requise");
          }
          if (!validateAge(birthDate)) {
            throw new Error("Vous devez avoir au moins 18 ans");
          }
          if (userEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(userEmail)) {
              throw new Error("Format d'email invalide");
            }
          }
        } else {
          if (!organizationName || organizationName.length < 2) {
            throw new Error("Le nom de l'organisation doit contenir au moins 2 caractères");
          }
          if (!organizerEmail) {
            throw new Error("L'email est requis");
          }
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(organizerEmail)) {
            throw new Error("Format d'email invalide");
          }
          if (organizerPhone) {
            const phoneRegex = /^[0-9+\s()-]{10,20}$/;
            if (!phoneRegex.test(organizerPhone)) {
              throw new Error("Format de téléphone invalide (10-20 caractères)");
            }
          }
        }

        if (!password || password.length < 8) {
          throw new Error("Le mot de passe doit contenir au moins 8 caractères");
        }
        if (password !== confirmPassword) {
          throw new Error("Les mots de passe ne correspondent pas");
        }
        if (!acceptedCGU) {
          throw new Error("Vous devez accepter les CGU et la politique de confidentialité");
        }
      }

      // Authentication
      if (isLogin) {
        const credentials =
          userType === "user"
            ? { phone, password }
            : { email: organizerEmail, password };

        await authService.login(credentials, userType === "organizer");
      } else {
        const registerData =
          userType === "user"
            ? {
                firstname: firstName,
                lastname: lastName,
                phone,
                birthday: birthDate,
                email: userEmail || undefined,
                password,
              }
            : {
                name: organizationName,
                email: organizerEmail,
                phone: organizerPhone || undefined,
                description: description || undefined,
                password,
              };

        await authService.register(registerData, userType === "organizer");
      }

      // Redirect on success
      router.push("/events");
    } catch (err: unknown) {
      let errorMessage = "Une erreur est survenue";
      if (err instanceof Error) {
        errorMessage = err.message;
      }

      if (errorMessage.includes("Identifiants incorrects")) {
        errorMessage =
          userType === "organizer"
            ? "Email ou mot de passe incorrect"
            : "Numéro de téléphone ou mot de passe incorrect";
      } else if (errorMessage.includes("existe déjà") || errorMessage.includes("already exists")) {
        errorMessage =
          userType === "organizer"
            ? "Cet email est déjà utilisé"
            : "Ce numéro de téléphone est déjà utilisé";
      } else if (errorMessage.includes("validation")) {
        errorMessage = "Données invalides. Vérifiez vos informations.";
      } else if (errorMessage.includes("Network") || errorMessage.includes("fetch")) {
        errorMessage = "Erreur réseau. Vérifiez votre connexion.";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#303030] flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-block mb-4">
          <Image
            src="/initLogoGray.png"
            alt="Init Logo"
            width={200}
            height={80}
            className="h-12 md:h-20 w-auto"
          />
        </Link>
        <p className="text-white/70 font-roboto text-xs md:text-sm">Là où tout commence</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-[#F5F5F5] rounded-2xl p-6 md:p-8">
        {/* Login/Register Toggle */}
        <div className="flex gap-2 mb-6 bg-white p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            disabled={loading}
            className={`flex-1 py-3 rounded-md text-sm font-medium transition-all ${
              isLogin
                ? "bg-[#303030] text-white"
                : "bg-transparent text-[#303030] hover:bg-gray-100"
            }`}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            disabled={loading}
            className={`flex-1 py-3 rounded-md text-sm font-medium transition-all ${
              !isLogin
                ? "bg-[#303030] text-white"
                : "bg-transparent text-[#303030] hover:bg-gray-100"
            }`}
          >
            Inscription
          </button>
        </div>

        {/* User Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#303030] mb-3">
            Je suis :
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setUserType("user")}
              disabled={loading}
              className={`flex-1 flex items-center gap-3 p-3 bg-white rounded-lg border-2 transition-all ${
                userType === "user"
                  ? "border-[#1271FF]"
                  : "border-transparent hover:border-gray-200"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  userType === "user" ? "border-[#1271FF]" : "border-[#303030]"
                }`}
              >
                {userType === "user" && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1271FF]" />
                )}
              </div>
              <span className="text-sm text-[#303030]">Utilisateur</span>
            </button>

            <button
              type="button"
              onClick={() => setUserType("organizer")}
              disabled={loading}
              className={`flex-1 flex items-center gap-3 p-3 bg-white rounded-lg border-2 transition-all ${
                userType === "organizer"
                  ? "border-[#1271FF]"
                  : "border-transparent hover:border-gray-200"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  userType === "organizer" ? "border-[#1271FF]" : "border-[#303030]"
                }`}
              >
                {userType === "organizer" && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1271FF]" />
                )}
              </div>
              <span className="text-sm text-[#303030]">Organisateur</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* LOGIN - USER */}
          {isLogin && userType === "user" && (
            <>
              <div>
                <label className="block text-sm font-medium text-[#303030] mb-2">
                  Numéro de téléphone *
                </label>
                <input
                  type="tel"
                  placeholder="0612345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:border-[#1271FF] focus:ring-1 focus:ring-[#1271FF] transition-all"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Format: 10-20 caractères (chiffres, +, -, (), espaces)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#303030] mb-2">
                  Mot de passe *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3 pr-12 bg-white border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:border-[#1271FF] focus:ring-1 focus:ring-[#1271FF] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* LOGIN - ORGANIZER */}
          {isLogin && userType === "organizer" && (
            <>
              <div>
                <label className="block text-sm font-medium text-[#303030] mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  placeholder="organisation@email.com"
                  value={organizerEmail}
                  onChange={(e) => setOrganizerEmail(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:border-[#1271FF] focus:ring-1 focus:ring-[#1271FF] transition-all"
                />
                <p className="text-xs text-gray-600 mt-1">Format: exemple@email.com</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#303030] mb-2">
                  Mot de passe *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3 pr-12 bg-white border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:border-[#1271FF] focus:ring-1 focus:ring-[#1271FF] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* REGISTER - USER */}
          {!isLogin && userType === "user" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#303030] mb-2">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    placeholder="Jean"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:border-[#1271FF] focus:ring-1 focus:ring-[#1271FF] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#303030] mb-2">
                    Nom *
                  </label>
                  <input
                    type="text"
                    placeholder="Dupont"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:border-[#1271FF] focus:ring-1 focus:ring-[#1271FF] transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#303030] mb-2">
                  Téléphone *
                </label>
                <input
                  type="tel"
                  placeholder="0612345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:border-[#1271FF] focus:ring-1 focus:ring-[#1271FF] transition-all"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Format: 10-20 caractères (chiffres, +, -, (), espaces)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#303030] mb-2">
                  Date de naissance * (18 ans minimum)
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:border-[#1271FF] focus:ring-1 focus:ring-[#1271FF] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#303030] mb-2">
                  Email (optionnel)
                </label>
                <input
                  type="email"
                  placeholder="votre@email.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:border-[#1271FF] focus:ring-1 focus:ring-[#1271FF] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#303030] mb-2">
                  Mot de passe * (min. 8 caractères)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3 pr-12 bg-white border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:border-[#1271FF] focus:ring-1 focus:ring-[#1271FF] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#303030] mb-2">
                  Confirmer le mot de passe *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3 pr-12 bg-white border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:border-[#1271FF] focus:ring-1 focus:ring-[#1271FF] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* REGISTER - ORGANIZER */}
          {!isLogin && userType === "organizer" && (
            <>
              <div>
                <label className="block text-sm font-medium text-[#303030] mb-2">
                  Nom de l'organisation *
                </label>
                <input
                  type="text"
                  placeholder="Mon Organisation"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:border-[#1271FF] focus:ring-1 focus:ring-[#1271FF] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#303030] mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  placeholder="organisation@email.com"
                  value={organizerEmail}
                  onChange={(e) => setOrganizerEmail(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:border-[#1271FF] focus:ring-1 focus:ring-[#1271FF] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#303030] mb-2">
                  Téléphone (optionnel)
                </label>
                <input
                  type="tel"
                  placeholder="0612345678"
                  value={organizerPhone}
                  onChange={(e) => setOrganizerPhone(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:border-[#1271FF] focus:ring-1 focus:ring-[#1271FF] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#303030] mb-2">
                  Description (optionnel)
                </label>
                <textarea
                  placeholder="Description de votre organisation..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:border-[#1271FF] focus:ring-1 focus:ring-[#1271FF] transition-all resize-none break-words"
                  style={{ wordBreak: 'break-word' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#303030] mb-2">
                  Mot de passe * (min. 8 caractères)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3 pr-12 bg-white border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:border-[#1271FF] focus:ring-1 focus:ring-[#1271FF] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#303030] mb-2">
                  Confirmer le mot de passe *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3 pr-12 bg-white border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:border-[#1271FF] focus:ring-1 focus:ring-[#1271FF] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* CGU Checkbox - Registration only */}
          {!isLogin && (
            <div className="flex items-start gap-3 mt-4">
              <input
                type="checkbox"
                id="acceptCGU"
                checked={acceptedCGU}
                onChange={(e) => setAcceptedCGU(e.target.checked)}
                disabled={loading}
                className="mt-1 w-4 h-4 text-[#1271FF] bg-white border-gray-300 rounded focus:ring-[#1271FF] focus:ring-2 cursor-pointer"
              />
              <label htmlFor="acceptCGU" className="text-sm text-[#303030] cursor-pointer">
                <span className="text-red-500">*</span>{" "}
                J'accepte les{" "}
                <Link href="/legal/cgu" className="text-[#1271FF] hover:underline" target="_blank">
                  Conditions Générales d'Utilisation
                </Link>{" "}
                et la{" "}
                <Link href="/legal/confidentialite" className="text-[#1271FF] hover:underline" target="_blank">
                  Politique de confidentialité
                </Link>
              </label>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || (!isLogin && !acceptedCGU)}
            className="w-full bg-[#303030] hover:bg-[#404040] text-white py-3 rounded-lg font-medium mt-6 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading
              ? isLogin
                ? "Connexion en cours..."
                : "Inscription en cours..."
              : isLogin
              ? "Se connecter"
              : "S'inscrire"}
          </button>

          {/* Forgot Password */}
          {isLogin && (
            <div className="text-center mt-4">
              <button
                type="button"
                className="text-sm text-[#303030] hover:text-[#1271FF] transition-colors"
              >
                Mot de passe oublié ?
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Back to home */}
      <Link
        href="/"
        className="mt-6 text-white/60 hover:text-white text-sm transition-colors"
      >
        Retour à l'accueil
      </Link>
    </div>
  );
}
