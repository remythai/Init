"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Edit2, Save, X, Camera, ArrowLeft, Upload, Loader2 } from "lucide-react";
import { authService, User, Orga } from "../services/auth.service";
import { Photo, photoService } from "../services/photo.service";
import BottomNavigation from "../components/BottomNavigation";
import DesktopNav from "../components/DesktopNav";
import PhotoManager from "../components/PhotoManager";
import ImageUploader from "../components/ImageUploader";

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

type UserProfile = User;
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

      // Only load photos for users (not orgas)
      if ((validatedType || "user") === 'user') {
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
        if (editedProfile.firstname !== profile.firstname) {
          (updates as Partial<UserProfile>).firstname = editedProfile.firstname;
        }
        if (editedProfile.lastname !== profile.lastname) {
          (updates as Partial<UserProfile>).lastname = editedProfile.lastname;
        }
        if (editedProfile.tel !== profile.tel) {
          (updates as Partial<UserProfile>).tel = editedProfile.tel;
        }
        if (editedProfile.mail !== profile.mail) {
          (updates as Partial<UserProfile>).mail = editedProfile.mail;
        }
      } else if (profileType === 'orga' && isOrgaProfile(profile) && isOrgaProfile(editedProfile)) {
        if (editedProfile.nom !== profile.nom) {
          (updates as Partial<OrgaProfile>).nom = editedProfile.nom;
        }
        if (editedProfile.mail !== profile.mail) {
          (updates as Partial<OrgaProfile>).mail = editedProfile.mail;
        }
        if (editedProfile.tel !== profile.tel) {
          (updates as Partial<OrgaProfile>).tel = editedProfile.tel;
        }
        if (editedProfile.description !== profile.description) {
          (updates as Partial<OrgaProfile>).description = editedProfile.description;
        }
      }

      if (Object.keys(updates).length === 0) {
        setIsEditing(false);
        return;
      }

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

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
    setError("");
  };

  const calculateAge = (birthday?: string): number | null => {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getDisplayName = () => {
    if (!profile) return "";
    if (isUserProfile(profile)) {
      return profile.firstname;
    }
    return profile.nom;
  };

  const getAvatarInitial = () => {
    if (!profile) return "";
    if (isUserProfile(profile)) {
      return profile.firstname.charAt(0).toUpperCase();
    }
    return profile.nom.charAt(0).toUpperCase();
  };

  const handleLogout = async () => {
    await authService.logout();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (!profile || !editedProfile || !profileType) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-center">
          <p className="text-secondary mb-4">Impossible de charger le profil</p>
          <button
            onClick={() => router.push("/auth")}
            className="bg-accent-solid text-accent-solid-text px-6 py-3 rounded-lg"
          >
            Se reconnecter
          </button>
        </div>
      </div>
    );
  }

  const age = isUserProfile(profile) ? calculateAge(profile.birthday) : null;

  return (
    <div className="min-h-screen bg-page">
      {/* Header */}
      <header className="bg-accent-solid text-accent-solid-text">
        <div className="max-w-4xl mx-auto px-3 md:px-8 py-3 md:py-4">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <Link href="/events" className="flex items-center gap-1 md:gap-2 text-accent-solid-text/70 hover:text-accent-solid-text transition-colors">
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-sm md:text-base">Retour</span>
            </Link>
            <DesktopNav />
            <button
              onClick={handleLogout}
              className="text-accent-solid-text/70 hover:text-accent-solid-text text-xs md:text-sm transition-colors"
            >
              Deconnexion
            </button>
          </div>

          <div className="flex items-center justify-between">
            <h1 className="font-poppins text-lg md:text-xl font-semibold">
              {profileType === 'user' ? "Mon Profil" : "Profil de l'Organisation"}
            </h1>

            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 md:gap-2 bg-card/20 hover:bg-card/30 px-3 md:px-4 py-1.5 md:py-2 rounded-lg transition-colors text-sm md:text-base"
              >
                <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                <span>Modifier</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="p-1.5 md:p-2 bg-card/20 hover:bg-card/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1 md:gap-2 bg-card text-primary px-3 md:px-4 py-1.5 md:py-2 rounded-lg hover:bg-hover transition-colors disabled:opacity-50 text-sm md:text-base"
                >
                  <Save className="w-3 h-3 md:w-4 md:h-4" />
                  <span>{saving ? "..." : "Enregistrer"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Avatar */}
          <div className="flex justify-center py-6 md:py-8">
            <div className="relative">
              {profileType === 'orga' && isOrgaProfile(profile) && profile.logo_path ? (
                <img
                  src={`${API_URL}${profile.logo_path}`}
                  alt={getDisplayName()}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-4 border-white/20"
                />
              ) : primaryPhoto ? (
                <img
                  src={photoService.getPhotoUrl(primaryPhoto.file_path)}
                  alt={getDisplayName()}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-4 border-white/20"
                />
              ) : (
                <div className="w-20 h-20 md:w-24 md:h-24 bg-card rounded-full flex items-center justify-center">
                  <span className="text-3xl md:text-4xl font-bold text-primary">
                    {getAvatarInitial()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-3 md:px-8 -mt-8 pb-24">
        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* User Profile */}
        {profileType === 'user' && isUserProfile(profile) && isUserProfile(editedProfile) && (
          <>
            <div className="bg-card rounded-xl shadow-sm p-6 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs text-secondary mb-1">Prenom</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile.firstname}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, firstname: e.target.value })
                      }
                      disabled={saving}
                      className="w-full px-3 py-2 border border-border rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-badge"
                    />
                  ) : (
                    <p className="font-semibold text-primary">{profile.firstname}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-secondary mb-1">Nom</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile.lastname}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, lastname: e.target.value })
                      }
                      disabled={saving}
                      className="w-full px-3 py-2 border border-border rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-badge"
                    />
                  ) : (
                    <p className="font-semibold text-primary">{profile.lastname}</p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-xs text-secondary mb-1">Telephone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editedProfile.tel}
                    onChange={(e) =>
                      setEditedProfile({ ...editedProfile, tel: e.target.value })
                    }
                    disabled={saving}
                    className="w-full px-3 py-2 border border-border rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-badge"
                  />
                ) : (
                  <p className="font-semibold text-primary">{profile.tel}</p>
                )}
              </div>

              <div className="mt-6">
                <label className="block text-xs text-secondary mb-1">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editedProfile.mail || ""}
                    onChange={(e) =>
                      setEditedProfile({ ...editedProfile, mail: e.target.value })
                    }
                    disabled={saving}
                    placeholder="email@exemple.com"
                    className="w-full px-3 py-2 border border-border rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-badge"
                  />
                ) : (
                  <p className="font-semibold text-primary">{profile.mail || "Non renseigne"}</p>
                )}
              </div>

              {age !== null && (
                <div className="mt-6">
                  <label className="block text-xs text-secondary mb-1">Age</label>
                  <p className="font-semibold text-primary">{age} ans</p>
                </div>
              )}
            </div>

            <div className="bg-card rounded-xl shadow-sm p-6 mb-4">
              <h3 className="font-semibold text-lg text-primary mb-4">Mes photos</h3>
              <PhotoManager onPhotosChange={handlePhotosChange} />
            </div>

            <div className="bg-card rounded-xl shadow-sm p-6 mb-4">
              <h3 className="font-semibold text-lg text-primary mb-3">Centres d'interet</h3>
              <p className="text-muted italic">Cette fonctionnalite sera bientot disponible</p>
            </div>

            <div className="bg-card rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-lg text-primary mb-3">Questions de personnalite</h3>
              <p className="text-muted italic">Cette fonctionnalite sera bientot disponible</p>
            </div>
          </>
        )}

        {/* Orga Profile */}
        {profileType === 'orga' && isOrgaProfile(profile) && isOrgaProfile(editedProfile) && (
          <>
            {/* Logo Upload Section */}
            <div className="bg-card rounded-xl shadow-sm p-6 mb-4">
              <h3 className="font-semibold text-lg text-primary mb-4">Logo de l'organisation</h3>
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
                Ce logo sera affiche sur votre profil et sur les evenements que vous creez.
              </p>
            </div>

            <div className="bg-card rounded-xl shadow-sm p-6 mb-4">
              <div className="mb-6">
                <label className="block text-xs text-secondary mb-1">Nom de l'organisation</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedProfile.nom}
                    onChange={(e) =>
                      setEditedProfile({ ...editedProfile, nom: e.target.value })
                    }
                    disabled={saving}
                    className="w-full px-3 py-2 border border-border rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-badge"
                  />
                ) : (
                  <p className="font-semibold text-primary">{profile.nom}</p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-xs text-secondary mb-1">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editedProfile.mail}
                    onChange={(e) =>
                      setEditedProfile({ ...editedProfile, mail: e.target.value })
                    }
                    disabled={saving}
                    className="w-full px-3 py-2 border border-border rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-badge"
                  />
                ) : (
                  <p className="font-semibold text-primary">{profile.mail}</p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-xs text-secondary mb-1">Telephone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editedProfile.tel || ""}
                    onChange={(e) =>
                      setEditedProfile({ ...editedProfile, tel: e.target.value })
                    }
                    disabled={saving}
                    placeholder="Telephone"
                    className="w-full px-3 py-2 border border-border rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-badge"
                  />
                ) : (
                  <p className="font-semibold text-primary">{profile.tel || "Non renseigne"}</p>
                )}
              </div>

              <div>
                <label className="block text-xs text-secondary mb-1">Description</label>
                {isEditing ? (
                  <textarea
                    value={editedProfile.description || ""}
                    onChange={(e) =>
                      setEditedProfile({ ...editedProfile, description: e.target.value })
                    }
                    disabled={saving}
                    rows={4}
                    placeholder="Description de l'organisation..."
                    className="w-full px-3 py-2 border border-border rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-badge resize-none break-words hyphens-auto"
                    style={{ wordBreak: 'break-word' }}
                  />
                ) : (
                  <p className="font-semibold text-primary">{profile.description || "Aucune description"}</p>
                )}
              </div>
            </div>

            <div className="bg-card rounded-xl shadow-sm p-6 mb-4">
              <h3 className="font-semibold text-lg text-primary mb-3">Evenements crees</h3>
              <p className="text-muted italic">Cette fonctionnalite sera bientot disponible</p>
            </div>

            <div className="bg-card rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-lg text-primary mb-3">Statistiques</h3>
              <p className="text-muted italic">Cette fonctionnalite sera bientot disponible</p>
            </div>
          </>
        )}
      </main>

      {/* Bottom Navigation for users */}
      <BottomNavigation userType={profileType} />
    </div>
  );
}
