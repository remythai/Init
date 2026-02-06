"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Edit2, Save, X, Camera, ArrowLeft, Upload, Loader2 } from "lucide-react";
import { authService, User, Orga } from "../services/auth.service";
import { Photo, photoService } from "../services/photo.service";
import BottomNavigation from "../components/BottomNavigation";
import PhotoManager from "../components/PhotoManager";
import ImageUploader from "../components/ImageUploader";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
      if (validatedType === 'user') {
        loadPrimaryPhoto();
      }

      const profileData = await authService.getCurrentProfile();
      if (!profileData) {
        authService.clearAuth();
        router.push("/auth");
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
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#303030] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (!profile || !editedProfile || !profileType) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Impossible de charger le profil</p>
          <button
            onClick={() => router.push("/auth")}
            className="bg-[#303030] text-white px-6 py-3 rounded-lg"
          >
            Se reconnecter
          </button>
        </div>
      </div>
    );
  }

  const age = isUserProfile(profile) ? calculateAge(profile.birthday) : null;

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="bg-[#303030] text-white">
        <div className="max-w-4xl mx-auto px-3 md:px-8 py-3 md:py-4">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <Link href="/events" className="flex items-center gap-1 md:gap-2 text-white/70 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-sm md:text-base">Retour</span>
            </Link>
            <button
              onClick={handleLogout}
              className="text-white/70 hover:text-white text-xs md:text-sm transition-colors"
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
                className="flex items-center gap-1 md:gap-2 bg-white/20 hover:bg-white/30 px-3 md:px-4 py-1.5 md:py-2 rounded-lg transition-colors text-sm md:text-base"
              >
                <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                <span>Modifier</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="p-1.5 md:p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1 md:gap-2 bg-white text-[#303030] px-3 md:px-4 py-1.5 md:py-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 text-sm md:text-base"
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
                <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center">
                  <span className="text-3xl md:text-4xl font-bold text-[#303030]">
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
            <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Prenom</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile.firstname}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, firstname: e.target.value })
                      }
                      disabled={saving}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
                    />
                  ) : (
                    <p className="font-semibold text-[#303030]">{profile.firstname}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Nom</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile.lastname}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, lastname: e.target.value })
                      }
                      disabled={saving}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
                    />
                  ) : (
                    <p className="font-semibold text-[#303030]">{profile.lastname}</p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-xs text-gray-600 mb-1">Telephone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editedProfile.tel}
                    onChange={(e) =>
                      setEditedProfile({ ...editedProfile, tel: e.target.value })
                    }
                    disabled={saving}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
                  />
                ) : (
                  <p className="font-semibold text-[#303030]">{profile.tel}</p>
                )}
              </div>

              <div className="mt-6">
                <label className="block text-xs text-gray-600 mb-1">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editedProfile.mail || ""}
                    onChange={(e) =>
                      setEditedProfile({ ...editedProfile, mail: e.target.value })
                    }
                    disabled={saving}
                    placeholder="email@exemple.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
                  />
                ) : (
                  <p className="font-semibold text-[#303030]">{profile.mail || "Non renseigne"}</p>
                )}
              </div>

              {age !== null && (
                <div className="mt-6">
                  <label className="block text-xs text-gray-600 mb-1">Age</label>
                  <p className="font-semibold text-[#303030]">{age} ans</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
              <h3 className="font-semibold text-lg text-[#303030] mb-4">Mes photos</h3>
              <PhotoManager onPhotosChange={handlePhotosChange} />
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
              <h3 className="font-semibold text-lg text-[#303030] mb-3">Centres d'interet</h3>
              <p className="text-gray-400 italic">Cette fonctionnalite sera bientot disponible</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-lg text-[#303030] mb-3">Questions de personnalite</h3>
              <p className="text-gray-400 italic">Cette fonctionnalite sera bientot disponible</p>
            </div>
          </>
        )}

        {/* Orga Profile */}
        {profileType === 'orga' && isOrgaProfile(profile) && isOrgaProfile(editedProfile) && (
          <>
            {/* Logo Upload Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
              <h3 className="font-semibold text-lg text-[#303030] mb-4">Logo de l'organisation</h3>
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
              <p className="text-xs text-gray-500 mt-2">
                Ce logo sera affiche sur votre profil et sur les evenements que vous creez.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
              <div className="mb-6">
                <label className="block text-xs text-gray-600 mb-1">Nom de l'organisation</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedProfile.nom}
                    onChange={(e) =>
                      setEditedProfile({ ...editedProfile, nom: e.target.value })
                    }
                    disabled={saving}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
                  />
                ) : (
                  <p className="font-semibold text-[#303030]">{profile.nom}</p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-xs text-gray-600 mb-1">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editedProfile.mail}
                    onChange={(e) =>
                      setEditedProfile({ ...editedProfile, mail: e.target.value })
                    }
                    disabled={saving}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
                  />
                ) : (
                  <p className="font-semibold text-[#303030]">{profile.mail}</p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-xs text-gray-600 mb-1">Telephone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editedProfile.tel || ""}
                    onChange={(e) =>
                      setEditedProfile({ ...editedProfile, tel: e.target.value })
                    }
                    disabled={saving}
                    placeholder="Telephone"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
                  />
                ) : (
                  <p className="font-semibold text-[#303030]">{profile.tel || "Non renseigne"}</p>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Description</label>
                {isEditing ? (
                  <textarea
                    value={editedProfile.description || ""}
                    onChange={(e) =>
                      setEditedProfile({ ...editedProfile, description: e.target.value })
                    }
                    disabled={saving}
                    rows={4}
                    placeholder="Description de l'organisation..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100 resize-none break-words hyphens-auto"
                    style={{ wordBreak: 'break-word' }}
                  />
                ) : (
                  <p className="font-semibold text-[#303030]">{profile.description || "Aucune description"}</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
              <h3 className="font-semibold text-lg text-[#303030] mb-3">Evenements crees</h3>
              <p className="text-gray-400 italic">Cette fonctionnalite sera bientot disponible</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-lg text-[#303030] mb-3">Statistiques</h3>
              <p className="text-gray-400 italic">Cette fonctionnalite sera bientot disponible</p>
            </div>
          </>
        )}
      </main>

      {/* Bottom Navigation for users */}
      <BottomNavigation userType={profileType} />
    </div>
  );
}
