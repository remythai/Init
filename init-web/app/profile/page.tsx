"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Edit2, Save, X, ArrowLeft, User } from "lucide-react";
import { authService, User as UserType, Orga } from "../services/auth.service";
import { Photo, photoService } from "../services/photo.service";
import BottomNavigation from "../components/BottomNavigation";
import DesktopNav from "../components/DesktopNav";
import ThemeToggle from "../components/ThemeToggle";
import PhotoManager from "../components/PhotoManager";
import ImageUploader from "../components/ImageUploader";

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

type UserProfile = UserType;
type OrgaProfile = Orga;

function isUserProfile(profile: UserProfile | OrgaProfile): profile is UserProfile {
  return 'firstname' in profile && 'lastname' in profile;
}

function isOrgaProfile(profile: UserProfile | OrgaProfile): profile is OrgaProfile {
  return 'nom' in profile;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | OrgaProfile | null>(null);
  const [profileType, setProfileType] = useState<'user' | 'orga' | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile | OrgaProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [primaryPhoto, setPrimaryPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadPrimaryPhoto = async () => {
    try {
      const photos = await photoService.getPhotos();
      const primary = photoService.getPrimaryPhoto(photos);
      setPrimaryPhoto(primary);
    } catch (err) {
      console.error("Error loading primary photo:", err);
    }
  };

  const handlePhotosChange = (photos: Photo[]) => {
    const primary = photoService.getPrimaryPhoto(photos);
    setPrimaryPhoto(primary);
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const validatedType = await authService.validateAndGetUserType();
      if (!validatedType) {
        router.push("/auth");
        return;
      }
      setProfileType(validatedType);
      if (validatedType === 'user') {
        loadPrimaryPhoto();
      }
      const profileData = await authService.getCurrentProfile();
      if (!profileData) {
        setLoading(false);
        return;
      }
      setProfile(profileData);
      setEditedProfile(profileData);
    } catch (err) {
      console.error("Erreur lors du chargement du profil:", err);
      setError("Impossible de charger le profil");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile || !editedProfile || !profileType) return;
    try {
      setSaving(true);
      setError("");
      const updates: Partial<UserProfile | OrgaProfile> = {};
      if (profileType === 'user' && isUserProfile(profile) && isUserProfile(editedProfile)) {
        if (editedProfile.firstname !== profile.firstname) (updates as Partial<UserProfile>).firstname = editedProfile.firstname;
        if (editedProfile.lastname !== profile.lastname) (updates as Partial<UserProfile>).lastname = editedProfile.lastname;
        if (editedProfile.tel !== profile.tel) (updates as Partial<UserProfile>).tel = editedProfile.tel;
        if (editedProfile.mail !== profile.mail) (updates as Partial<UserProfile>).mail = editedProfile.mail;
      } else if (profileType === 'orga' && isOrgaProfile(profile) && isOrgaProfile(editedProfile)) {
        if (editedProfile.nom !== profile.nom) (updates as Partial<OrgaProfile>).nom = editedProfile.nom;
        if (editedProfile.mail !== profile.mail) (updates as Partial<OrgaProfile>).mail = editedProfile.mail;
        if (editedProfile.tel !== profile.tel) (updates as Partial<OrgaProfile>).tel = editedProfile.tel;
        if (editedProfile.description !== profile.description) (updates as Partial<OrgaProfile>).description = editedProfile.description;
      }
      if (Object.keys(updates).length === 0) { setIsEditing(false); return; }
      const updatedProfile = await authService.updateCurrentProfile(updates);
      if (updatedProfile) {
        setProfile(updatedProfile);
        setEditedProfile(updatedProfile);
        setIsEditing(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la mise à jour";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => { setEditedProfile(profile); setIsEditing(false); setError(""); };

  const calculateAge = (birthday?: string): number | null => {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const getDisplayName = () => {
    if (!profile) return "";
    return isUserProfile(profile) ? profile.firstname : profile.nom;
  };

  const getAvatarInitial = () => {
    if (!profile) return "";
    return isUserProfile(profile) ? profile.firstname.charAt(0).toUpperCase() : profile.nom.charAt(0).toUpperCase();
  };

  const handleLogout = async () => { await authService.logout(); router.push("/"); };

  // ─── Shared header (same as events/messages) ───
  const renderHeader = () => (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="absolute inset-0 bg-page pointer-events-none" />
      <div className="relative px-6 md:px-12 w-full py-4 md:py-6 flex items-center justify-between">
        <Link href="/">
          <Image src="/LogoPng.png" alt="Init Logo" width={200} height={80} className="h-7 md:h-9 w-auto dark:hidden" />
          <Image src="/logo.png" alt="Init Logo" width={200} height={80} className="h-7 md:h-9 w-auto hidden dark:block" />
        </Link>
        <DesktopNav />
        <div className="flex items-center gap-3 md:gap-4">
          <div className="md:hidden"><ThemeToggle /></div>
          <button
            onClick={handleLogout}
            className="font-poppins text-sm text-secondary hover:text-primary transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );

  // ─── Loading ───
  if (loading) {
    return (
      <div className="min-h-screen bg-page">
        {renderHeader()}
        <main className="pt-20 md:pt-24 flex items-center justify-center" style={{ minHeight: "calc(100vh - 80px)" }}>
          <div className="text-center">
            <div className="w-10 h-10 border-[3px] border-[#1271FF]/20 border-t-[#1271FF] rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-muted text-sm">Chargement du profil...</p>
          </div>
        </main>
        <BottomNavigation userType="user" />
      </div>
    );
  }

  if (!profile || !editedProfile || !profileType) {
    return (
      <div className="min-h-screen bg-page">
        {renderHeader()}
        <main className="pt-20 md:pt-24 flex items-center justify-center" style={{ minHeight: "calc(100vh - 80px)" }}>
          <div className="text-center">
            <p className="text-secondary mb-4">Impossible de charger le profil</p>
            <button onClick={() => router.push("/auth")} className="bg-accent-solid text-accent-solid-text px-6 py-3 rounded-full text-sm font-medium">
              Se reconnecter
            </button>
          </div>
        </main>
      </div>
    );
  }

  const age = isUserProfile(profile) ? calculateAge(profile.birthday) : null;

  const inputClass = "w-full px-4 py-3 bg-input border border-border rounded-xl text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:opacity-50 text-sm";

  return (
    <div className="min-h-screen bg-page">
      {renderHeader()}

      <main className="pt-20 md:pt-24 pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 md:px-6">

          {/* Avatar + Name card */}
          <div className="bg-card rounded-2xl shadow-sm p-6 md:p-8 mb-4">
            <div className="flex flex-col items-center">
              {/* Avatar */}
              <div className="relative mb-4">
                {profileType === 'orga' && isOrgaProfile(profile) && profile.logo_path ? (
                  <img src={`${API_URL}${profile.logo_path}`} alt={getDisplayName()} className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover border-4 border-border" />
                ) : primaryPhoto ? (
                  <img src={photoService.getPhotoUrl(primaryPhoto.file_path)} alt={getDisplayName()} className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover border-4 border-border" />
                ) : (
                  <div className="w-24 h-24 md:w-28 md:h-28 bg-badge rounded-full flex items-center justify-center border-4 border-border">
                    <span className="text-3xl md:text-4xl font-bold text-primary">{getAvatarInitial()}</span>
                  </div>
                )}
              </div>

              {/* Name + Age */}
              <h1 className="font-poppins text-xl md:text-2xl font-bold text-primary">
                {isUserProfile(profile) ? `${profile.firstname} ${profile.lastname}` : profile.nom}
              </h1>
              {age !== null && <p className="text-secondary text-sm mt-1">{age} ans</p>}
              <p className="text-muted text-xs mt-1">
                {profileType === 'user' ? "Utilisateur" : "Organisateur"}
              </p>

              {/* Edit / Save / Cancel */}
              <div className="mt-5">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 bg-accent-solid text-accent-solid-text hover:opacity-90 px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Modifier le profil
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="flex items-center gap-2 border border-border text-secondary hover:text-primary px-5 py-2.5 rounded-full text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Annuler
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 bg-[#1271FF] text-white hover:bg-[#1271FF]/90 px-5 py-2.5 rounded-full text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? "..." : "Enregistrer"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          {/* User Profile Fields */}
          {profileType === 'user' && isUserProfile(profile) && isUserProfile(editedProfile) && (
            <>
              <div className="bg-card rounded-2xl shadow-sm p-6 mb-4">
                <h3 className="font-poppins font-semibold text-primary mb-5">Informations personnelles</h3>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1.5">Prénom</label>
                      {isEditing ? (
                        <input type="text" value={editedProfile.firstname} onChange={(e) => setEditedProfile({ ...editedProfile, firstname: e.target.value })} disabled={saving} className={inputClass} />
                      ) : (
                        <p className="text-primary font-medium">{profile.firstname}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1.5">Nom</label>
                      {isEditing ? (
                        <input type="text" value={editedProfile.lastname} onChange={(e) => setEditedProfile({ ...editedProfile, lastname: e.target.value })} disabled={saving} className={inputClass} />
                      ) : (
                        <p className="text-primary font-medium">{profile.lastname}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1.5">Téléphone</label>
                    {isEditing ? (
                      <input type="tel" value={editedProfile.tel} onChange={(e) => setEditedProfile({ ...editedProfile, tel: e.target.value })} disabled={saving} className={inputClass} />
                    ) : (
                      <p className="text-primary font-medium">{profile.tel}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1.5">Email</label>
                    {isEditing ? (
                      <input type="email" value={editedProfile.mail || ""} onChange={(e) => setEditedProfile({ ...editedProfile, mail: e.target.value })} disabled={saving} placeholder="email@exemple.com" className={inputClass} />
                    ) : (
                      <p className="text-primary font-medium">{profile.mail || "Non renseigné"}</p>
                    )}
                  </div>
                  {age !== null && (
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1.5">Âge</label>
                      <p className="text-primary font-medium">{age} ans</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-card rounded-2xl shadow-sm p-6 mb-4">
                <h3 className="font-poppins font-semibold text-primary mb-4">Mes photos</h3>
                <PhotoManager onPhotosChange={handlePhotosChange} />
              </div>

              <div className="bg-card rounded-2xl shadow-sm p-6 mb-4">
                <h3 className="font-poppins font-semibold text-primary mb-3">Centres d'intérêt</h3>
                <p className="text-muted text-sm italic">Cette fonctionnalité sera bientôt disponible</p>
              </div>

              <div className="bg-card rounded-2xl shadow-sm p-6">
                <h3 className="font-poppins font-semibold text-primary mb-3">Questions de personnalité</h3>
                <p className="text-muted text-sm italic">Cette fonctionnalité sera bientôt disponible</p>
              </div>
            </>
          )}

          {/* Orga Profile Fields */}
          {profileType === 'orga' && isOrgaProfile(profile) && isOrgaProfile(editedProfile) && (
            <>
              <div className="bg-card rounded-2xl shadow-sm p-6 mb-4">
                <h3 className="font-poppins font-semibold text-primary mb-4">Logo de l'organisation</h3>
                <ImageUploader
                  currentImage={profile.logo_path ? `${API_URL}${profile.logo_path}` : undefined}
                  onUpload={async (file) => {
                    const logoPath = await authService.uploadOrgaLogo(file);
                    setProfile({ ...profile, logo_path: logoPath });
                    setEditedProfile({ ...editedProfile, logo_path: logoPath });
                  }}
                  onDelete={async () => {
                    await authService.deleteOrgaLogo();
                    setProfile({ ...profile, logo_path: undefined });
                    setEditedProfile({ ...editedProfile, logo_path: undefined });
                  }}
                  aspectRatio="square"
                  label="Logo"
                />
                <p className="text-xs text-secondary mt-2">
                  Ce logo sera affiché sur votre profil et sur les événements que vous créez.
                </p>
              </div>

              <div className="bg-card rounded-2xl shadow-sm p-6 mb-4">
                <h3 className="font-poppins font-semibold text-primary mb-5">Informations de l'organisation</h3>
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1.5">Nom de l'organisation</label>
                    {isEditing ? (
                      <input type="text" value={editedProfile.nom} onChange={(e) => setEditedProfile({ ...editedProfile, nom: e.target.value })} disabled={saving} className={inputClass} />
                    ) : (
                      <p className="text-primary font-medium">{profile.nom}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1.5">Email</label>
                    {isEditing ? (
                      <input type="email" value={editedProfile.mail} onChange={(e) => setEditedProfile({ ...editedProfile, mail: e.target.value })} disabled={saving} className={inputClass} />
                    ) : (
                      <p className="text-primary font-medium">{profile.mail}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1.5">Téléphone</label>
                    {isEditing ? (
                      <input type="tel" value={editedProfile.tel || ""} onChange={(e) => setEditedProfile({ ...editedProfile, tel: e.target.value })} disabled={saving} placeholder="Téléphone" className={inputClass} />
                    ) : (
                      <p className="text-primary font-medium">{profile.tel || "Non renseigné"}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1.5">Description</label>
                    {isEditing ? (
                      <textarea
                        value={editedProfile.description || ""}
                        onChange={(e) => setEditedProfile({ ...editedProfile, description: e.target.value })}
                        disabled={saving}
                        rows={4}
                        placeholder="Description de l'organisation..."
                        className={`${inputClass} resize-none break-words hyphens-auto`}
                        style={{ wordBreak: 'break-word' }}
                      />
                    ) : (
                      <p className="text-primary font-medium">{profile.description || "Aucune description"}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-2xl shadow-sm p-6 mb-4">
                <h3 className="font-poppins font-semibold text-primary mb-3">Événements créés</h3>
                <p className="text-muted text-sm italic">Cette fonctionnalité sera bientôt disponible</p>
              </div>

              <div className="bg-card rounded-2xl shadow-sm p-6">
                <h3 className="font-poppins font-semibold text-primary mb-3">Statistiques</h3>
                <p className="text-muted text-sm italic">Cette fonctionnalité sera bientôt disponible</p>
              </div>
            </>
          )}
        </div>
      </main>

      <BottomNavigation userType={profileType} />
    </div>
  );
}
