"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Edit2, Check, X, AlertTriangle, Building2 } from "lucide-react";
import { authService, User, Orga } from "../../../../services/auth.service";
import { eventService } from "../../../../services/event.service";
import { Photo, photoService } from "../../../../services/photo.service";
import PhotoManager from "../../../../components/PhotoManager";
import ImageUploader from "../../../../components/ImageUploader";

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [profileType, setProfileType] = useState<'user' | 'orga' | null>(null);

  // User state
  const [userData, setUserData] = useState<User | null>(null);
  const [editedUser, setEditedUser] = useState<{
    firstname: string;
    lastname: string;
    tel: string;
    mail: string;
    birthday: string;
  }>({ firstname: "", lastname: "", tel: "", mail: "", birthday: "" });
  const [primaryPhoto, setPrimaryPhoto] = useState<Photo | null>(null);

  // Orga state
  const [orgaData, setOrgaData] = useState<Orga | null>(null);
  const [editedOrga, setEditedOrga] = useState<{
    nom: string;
    mail: string;
    tel: string;
    description: string;
  }>({ nom: "", mail: "", tel: "", description: "" });

  const getAge = (birthday?: string): number => {
    if (!birthday) return 0;
    const birth = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    const initPage = async () => {
      const validatedType = await authService.validateAndGetUserType();

      if (!validatedType) {
        router.push("/auth");
        return;
      }

      setProfileType(validatedType);

      if (validatedType === 'user') {
        loadUserProfile();
        loadEventPhotos();
        checkBlockedStatus();
      } else {
        loadOrgaProfile();
      }
    };

    initPage();
  }, [eventId]);

  // ── User profile loading ──
  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const data = await authService.getCurrentProfile() as User;
      if (data) {
        setUserData(data);
        setEditedUser({
          firstname: data.firstname || "",
          lastname: data.lastname || "",
          tel: data.tel || "",
          mail: data.mail || "",
          birthday: data.birthday || "",
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  // ── Orga profile loading ──
  const loadOrgaProfile = async () => {
    setLoading(true);
    try {
      const data = await authService.getCurrentProfile() as Orga;
      if (data) {
        setOrgaData(data);
        setEditedOrga({
          nom: data.nom || "",
          mail: data.mail || "",
          tel: data.tel || "",
          description: data.description || "",
        });
      }
    } catch (error) {
      console.error("Error loading orga profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadEventPhotos = async () => {
    try {
      const photos = await photoService.getPhotos(eventId);
      const primary = photoService.getPrimaryPhoto(photos);
      setPrimaryPhoto(primary);
    } catch (error) {
      console.error("Error loading event photos:", error);
    }
  };

  const handlePhotosChange = (photos: Photo[]) => {
    const primary = photoService.getPrimaryPhoto(photos);
    setPrimaryPhoto(primary);
  };

  const checkBlockedStatus = async () => {
    try {
      const eventData = await eventService.getEventById(eventId);
      setIsBlocked(eventData?.is_blocked || false);
    } catch (error) {
      console.error("Error checking blocked status:", error);
    }
  };

  // ── Save handlers ──
  const handleSaveUser = async () => {
    if (!userData) return;
    setSaving(true);
    try {
      await authService.updateCurrentUser({
        firstname: editedUser.firstname,
        lastname: editedUser.lastname,
        tel: editedUser.tel,
        mail: editedUser.mail,
        birthday: editedUser.birthday,
      });
      await loadUserProfile();
      setEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOrga = async () => {
    if (!orgaData) return;
    setSaving(true);
    try {
      await authService.updateCurrentOrga({
        nom: editedOrga.nom,
        mail: editedOrga.mail,
        tel: editedOrga.tel,
        description: editedOrga.description,
      });
      await loadOrgaProfile();
      setEditing(false);
    } catch (error) {
      console.error("Error saving orga profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (profileType === 'user') handleSaveUser();
    else handleSaveOrga();
  };

  const handleCancel = () => {
    if (profileType === 'user' && userData) {
      setEditedUser({
        firstname: userData.firstname || "",
        lastname: userData.lastname || "",
        tel: userData.tel || "",
        mail: userData.mail || "",
        birthday: userData.birthday || "",
      });
    } else if (profileType === 'orga' && orgaData) {
      setEditedOrga({
        nom: orgaData.nom || "",
        mail: orgaData.mail || "",
        tel: orgaData.tel || "",
        description: orgaData.description || "",
      });
    }
    setEditing(false);
  };

  // ── Loading / Error states ──
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-[3px] border-[#1271FF]/20 border-t-[#1271FF] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (profileType === 'user' && !userData) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted">Erreur lors du chargement du profil</p>
      </div>
    );
  }

  if (profileType === 'orga' && !orgaData) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted">Erreur lors du chargement du profil</p>
      </div>
    );
  }

  // ── User view ──
  if (profileType === 'user' && userData) {
    const avatarUrl = `https://ui-avatars.com/api/?name=${userData.firstname || "U"}+${userData.lastname || ""}&size=400&background=1271FF&color=fff`;
    const age = getAge(userData.birthday);

    const profileHeader = (
      <div className="flex items-center gap-4 lg:gap-5 mb-8 lg:mb-10">
        <div className="shrink-0">
          {primaryPhoto ? (
            <img
              src={photoService.getPhotoUrl(primaryPhoto.file_path)}
              alt={userData.firstname}
              className="w-20 h-20 lg:w-[130px] lg:h-[130px] rounded-full object-cover"
            />
          ) : (
            <img
              src={avatarUrl}
              alt={userData.firstname}
              className="w-20 h-20 lg:w-[130px] lg:h-[130px] rounded-full object-cover"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-poppins text-2xl lg:text-[42px] font-semibold text-primary leading-tight">
            {userData.firstname}
          </h1>
          <p className="text-primary/70 text-lg lg:text-[26px]">{age > 0 ? `${age} ans` : ""}</p>
        </div>
        {!editing && !isBlocked && (
          <button
            onClick={() => setEditing(true)}
            className="w-12 h-12 lg:w-[60px] lg:h-[60px] rounded-full bg-[#808080]/40 hover:bg-[#808080]/60 flex items-center justify-center transition-colors shrink-0"
          >
            <Edit2 className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
          </button>
        )}
      </div>
    );

    const photosSection = (
      <div>
        {isBlocked ? (
          <p className="text-muted italic text-sm">Modification des photos desactivee</p>
        ) : (
          <PhotoManager
            eventId={eventId}
            showCopyFromGeneral={true}
            onPhotosChange={handlePhotosChange}
            darkMode={true}
            aspectRatio="9 / 16"
          />
        )}
      </div>
    );

    const profileFields = (
      <div>
        {editing ? (
          <div className="space-y-5">
            <input
              type="date"
              className="w-full px-5 py-4 bg-[#808080]/20 border-none rounded-[19px] text-primary text-base focus:outline-none focus:ring-2 focus:ring-[#1271FF] transition-all"
              value={editedUser.birthday}
              onChange={(e) => setEditedUser((prev) => ({ ...prev, birthday: e.target.value }))}
            />
            <input
              type="tel"
              className="w-full px-5 py-4 bg-[#808080]/20 border-none rounded-[19px] text-primary text-base placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] transition-all"
              placeholder="Votre numero"
              value={editedUser.tel}
              onChange={(e) => setEditedUser((prev) => ({ ...prev, tel: e.target.value }))}
            />
            <input
              type="email"
              className="w-full px-5 py-4 bg-[#808080]/20 border-none rounded-[19px] text-primary text-base placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] transition-all"
              placeholder="Votre email"
              value={editedUser.mail}
              onChange={(e) => setEditedUser((prev) => ({ ...prev, mail: e.target.value }))}
            />

            <div className="flex gap-4 pt-3">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-2 text-red-500 text-base font-medium hover:bg-red-500/10 px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 text-green-600 text-base font-medium hover:bg-green-500/10 px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                <Check className="w-5 h-5" />
                {saving ? "..." : "Sauvegarder"}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#808080]/30 rounded-[19px] px-6 lg:px-8 py-5 lg:py-6 space-y-5">
            <div>
              <p className="text-muted text-sm lg:text-base">Age</p>
              <p className="text-primary text-base lg:text-xl">{age > 0 ? `${age} ans` : ""}</p>
            </div>
            <div>
              <p className="text-muted text-sm lg:text-base">Telephone</p>
              <p className="text-primary text-base lg:text-xl">{userData.tel}</p>
            </div>
            <div>
              <p className="text-muted text-sm lg:text-base">Email</p>
              <p className="text-primary text-base lg:text-xl">{userData.mail}</p>
            </div>
          </div>
        )}
      </div>
    );

    const descriptionSection = (
      <div className="bg-[#808080]/30 rounded-[19px] px-6 lg:px-8 py-5 lg:py-6 min-h-[120px] lg:min-h-[150px]">
        <p className="text-muted text-sm lg:text-base mb-1">Description</p>
        <p className="text-muted/50 italic text-base">Cette fonctionnalite sera bientot disponible</p>
      </div>
    );

    return (
      <div className="h-full overflow-y-auto min-[1250px]:overflow-hidden">
        <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-8 lg:py-12">
          {isBlocked && (
            <div className="bg-red-50 dark:bg-red-500/20 border border-red-500/30 rounded-2xl p-4 mb-8 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-red-500 font-semibold text-sm">Profil bloque</p>
                <p className="text-red-500/80 text-xs">
                  Vous avez ete retire de cet evenement. Vous ne pouvez plus modifier votre profil ni vos photos.
                </p>
              </div>
            </div>
          )}

          <div className="min-[1250px]:hidden space-y-8">
            {profileHeader}
            {photosSection}
            {profileFields}
            {descriptionSection}
          </div>

          <div className="hidden min-[1250px]:flex flex-row gap-20 justify-center h-[calc(100vh-120px)]">
            <div className="flex-1 min-w-[500px] max-w-[700px] space-y-8 overflow-hidden">
              {profileHeader}
              {profileFields}
              {descriptionSection}
            </div>
            <div className="flex-1 min-w-[600px] max-w-[900px] overflow-y-auto pr-2">
              {photosSection}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Orga view ──
  if (profileType === 'orga' && orgaData) {
    const logoInitial = orgaData.nom?.charAt(0).toUpperCase() || "O";

    const orgaHeader = (
      <div className="flex items-center gap-4 lg:gap-5 mb-8 lg:mb-10">
        <div className="shrink-0">
          {orgaData.logo_path ? (
            <img
              src={`${API_URL}${orgaData.logo_path}`}
              alt={orgaData.nom}
              className="w-20 h-20 lg:w-[130px] lg:h-[130px] rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 lg:w-[130px] lg:h-[130px] rounded-full bg-[#1271FF] flex items-center justify-center">
              <span className="text-white text-3xl lg:text-5xl font-bold">{logoInitial}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-poppins text-2xl lg:text-[42px] font-semibold text-primary leading-tight">
            {orgaData.nom}
          </h1>
          <p className="text-primary/70 text-sm lg:text-lg flex items-center gap-1.5 mt-1">
            <Building2 className="w-4 h-4" />
            Organisateur
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="w-12 h-12 lg:w-[60px] lg:h-[60px] rounded-full bg-[#808080]/40 hover:bg-[#808080]/60 flex items-center justify-center transition-colors shrink-0"
          >
            <Edit2 className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
          </button>
        )}
      </div>
    );

    const orgaFields = (
      <div>
        {editing ? (
          <div className="space-y-5">
            <div>
              <label className="block text-muted text-sm mb-1.5 ml-1">Nom de l&apos;organisation</label>
              <input
                type="text"
                className="w-full px-5 py-4 bg-[#808080]/20 border-none rounded-[19px] text-primary text-base placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] transition-all"
                placeholder="Nom de l'organisation"
                value={editedOrga.nom}
                onChange={(e) => setEditedOrga((prev) => ({ ...prev, nom: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-muted text-sm mb-1.5 ml-1">Email</label>
              <input
                type="email"
                className="w-full px-5 py-4 bg-[#808080]/20 border-none rounded-[19px] text-primary text-base placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] transition-all"
                placeholder="Email de contact"
                value={editedOrga.mail}
                onChange={(e) => setEditedOrga((prev) => ({ ...prev, mail: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-muted text-sm mb-1.5 ml-1">Telephone</label>
              <input
                type="tel"
                className="w-full px-5 py-4 bg-[#808080]/20 border-none rounded-[19px] text-primary text-base placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] transition-all"
                placeholder="Telephone"
                value={editedOrga.tel}
                onChange={(e) => setEditedOrga((prev) => ({ ...prev, tel: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-muted text-sm mb-1.5 ml-1">Description</label>
              <textarea
                className="w-full px-5 py-4 bg-[#808080]/20 border-none rounded-[19px] text-primary text-base placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] transition-all resize-none"
                placeholder="Description de l'organisation..."
                rows={4}
                value={editedOrga.description}
                onChange={(e) => setEditedOrga((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="flex gap-4 pt-3">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-2 text-red-500 text-base font-medium hover:bg-red-500/10 px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 text-green-600 text-base font-medium hover:bg-green-500/10 px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                <Check className="w-5 h-5" />
                {saving ? "..." : "Sauvegarder"}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#808080]/30 rounded-[19px] px-6 lg:px-8 py-5 lg:py-6 space-y-5">
            <div>
              <p className="text-muted text-sm lg:text-base">Organisation</p>
              <p className="text-primary text-base lg:text-xl">{orgaData.nom}</p>
            </div>
            <div>
              <p className="text-muted text-sm lg:text-base">Email</p>
              <p className="text-primary text-base lg:text-xl">{orgaData.mail}</p>
            </div>
            <div>
              <p className="text-muted text-sm lg:text-base">Telephone</p>
              <p className="text-primary text-base lg:text-xl">{orgaData.tel || "Non renseigne"}</p>
            </div>
          </div>
        )}
      </div>
    );

    const orgaDescription = (
      <div className="bg-[#808080]/30 rounded-[19px] px-6 lg:px-8 py-5 lg:py-6 min-h-[120px] lg:min-h-[150px]">
        <p className="text-muted text-sm lg:text-base mb-1">Description</p>
        <p className="text-primary text-base" style={{ wordBreak: 'break-word' }}>
          {orgaData.description || <span className="text-muted/50 italic">Aucune description</span>}
        </p>
      </div>
    );

    const logoSection = (
      <div>
        <h3 className="font-poppins font-semibold text-primary text-lg mb-4">Logo de l&apos;organisation</h3>
        <ImageUploader
          currentImage={orgaData.logo_path ? `${API_URL}${orgaData.logo_path}` : undefined}
          onUpload={async (file) => {
            const logoPath = await authService.uploadOrgaLogo(file);
            setOrgaData({ ...orgaData, logo_path: logoPath });
          }}
          onDelete={async () => {
            await authService.deleteOrgaLogo();
            setOrgaData({ ...orgaData, logo_path: undefined });
          }}
          aspectRatio="square"
          label="Logo"
        />
        <p className="text-xs text-muted mt-2">
          Ce logo sera affiche sur votre profil et sur les evenements que vous creez.
        </p>
      </div>
    );

    return (
      <div className="h-full overflow-y-auto min-[1250px]:overflow-hidden">
        <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-8 lg:py-12">
          {/* Mobile/Tablet layout */}
          <div className="min-[1250px]:hidden space-y-8">
            {orgaHeader}
            {logoSection}
            {orgaFields}
            {orgaDescription}
          </div>

          {/* Desktop layout */}
          <div className="hidden min-[1250px]:flex flex-row gap-20 justify-center h-[calc(100vh-120px)]">
            <div className="flex-1 min-w-[500px] max-w-[700px] space-y-8 overflow-hidden">
              {orgaHeader}
              {orgaFields}
              {orgaDescription}
            </div>
            <div className="flex-1 min-w-[600px] max-w-[900px] overflow-y-auto pr-2">
              {logoSection}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
