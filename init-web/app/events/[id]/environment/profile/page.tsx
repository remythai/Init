"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Camera, Edit2, Check, X } from "lucide-react";
import { authService, User } from "../../../../services/auth.service";
import { matchService } from "../../../../services/match.service";
import { eventService, CustomField } from "../../../../services/event.service";

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [profile, setProfile] = useState<{
    firstname: string;
    lastname: string;
    age: number;
    image: string;
  } | null>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [profilInfo, setProfilInfo] = useState<Record<string, unknown>>({});
  const [editedProfilInfo, setEditedProfilInfo] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const initPage = async () => {
      const validatedType = await authService.validateAndGetUserType();

      if (!validatedType) {
        router.push("/auth");
        return;
      }

      // Only users can access event environment
      if (validatedType !== "user") {
        router.push("/events");
        return;
      }

      loadProfile();
      loadMatchStats();
      loadEventProfile();
    };

    initPage();
  }, [eventId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const userData = await authService.getCurrentProfile() as User;
      if (userData) {
        // Calculate age from birthday
        let age = 25; // Default
        if (userData.birthday) {
          const birth = new Date(userData.birthday);
          const today = new Date();
          age = today.getFullYear() - birth.getFullYear();
          const monthDiff = today.getMonth() - birth.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
          }
        }

        // Generate avatar URL based on name
        const avatarUrl = `https://ui-avatars.com/api/?name=${userData.firstname || "U"}+${userData.lastname || ""}&size=400&background=1271FF&color=fff`;

        setProfile({
          firstname: userData.firstname || "Utilisateur",
          lastname: userData.lastname || "",
          age,
          image: avatarUrl,
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      // Use fallback data if API fails
      setProfile({
        firstname: "Utilisateur",
        lastname: "",
        age: 25,
        image: "https://ui-avatars.com/api/?name=U&size=400&background=1271FF&color=fff",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEventProfile = async () => {
    try {
      const data = await eventService.getMyEventProfile(eventId);
      setCustomFields(data.custom_fields || []);
      setProfilInfo(data.profil_info || {});
      setEditedProfilInfo(data.profil_info || {});
    } catch (error) {
      console.error("Error loading event profile:", error);
    }
  };

  const loadMatchStats = async () => {
    try {
      const data = await matchService.getAllMatches();
      setMatchCount(data.total || 0);
    } catch (error) {
      console.error("Error loading match stats:", error);
      setMatchCount(0);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    try {
      await eventService.updateMyEventProfile(eventId, editedProfilInfo);
      setProfilInfo(editedProfilInfo);
      setEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProfilInfo(profilInfo);
    setEditing(false);
  };

  const getFieldValue = (fieldId: string): string => {
    const value = profilInfo[fieldId];
    if (value === undefined || value === null) return "";
    if (Array.isArray(value)) return value.join(", ");
    return String(value);
  };

  const getFieldLabel = (field: CustomField, value: unknown): string => {
    if (field.type === "select" || field.type === "radio") {
      const option = field.options?.find(o => o.value === value);
      return option?.label || String(value || "");
    }
    if (field.type === "multiselect" && Array.isArray(value)) {
      return value.map(v => {
        const option = field.options?.find(o => o.value === v);
        return option?.label || v;
      }).join(", ");
    }
    if (field.type === "checkbox") {
      return value ? "Oui" : "Non";
    }
    return String(value || "");
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1271FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-white/60">Erreur lors du chargement du profil</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-lg mx-auto p-4">
        {/* Profile Header */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            <img
              src={profile.image}
              alt={profile.firstname}
              className="w-32 h-32 rounded-full object-cover border-4 border-white/20"
            />
            <button className="absolute bottom-0 right-0 w-10 h-10 bg-[#1271FF] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#0d5dd8] transition-colors">
              <Camera className="w-5 h-5" />
            </button>
          </div>
          <h1 className="font-poppins text-2xl font-bold text-white mt-4">
            {profile.firstname} {profile.lastname}, {profile.age}
          </h1>
        </div>

        {/* Profile Info Card */}
        {customFields.length > 0 && (
          <div className="bg-white/10 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-white">Mon profil evenement</h2>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="text-[#1271FF] hover:text-[#0d5dd8] transition-colors"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="text-green-400 hover:text-green-300 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <div className="space-y-4">
                {customFields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm text-white/70 mb-2">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    {(field.type === "text" || field.type === "email" || field.type === "phone" || field.type === "number") && (
                      <input
                        type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "number" ? "number" : "text"}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#1271FF]"
                        placeholder={field.placeholder}
                        value={editedProfilInfo[field.id] !== undefined ? String(editedProfilInfo[field.id]) : ""}
                        onChange={(e) =>
                          setEditedProfilInfo((prev) => ({
                            ...prev,
                            [field.id]: field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value,
                          }))
                        }
                      />
                    )}
                    {field.type === "textarea" && (
                      <textarea
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#1271FF] resize-none min-h-[100px]"
                        placeholder={field.placeholder}
                        value={(editedProfilInfo[field.id] as string) || ""}
                        onChange={(e) =>
                          setEditedProfilInfo((prev) => ({
                            ...prev,
                            [field.id]: e.target.value,
                          }))
                        }
                      />
                    )}
                    {field.type === "date" && (
                      <input
                        type="date"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#1271FF]"
                        value={(editedProfilInfo[field.id] as string) || ""}
                        onChange={(e) =>
                          setEditedProfilInfo((prev) => ({
                            ...prev,
                            [field.id]: e.target.value,
                          }))
                        }
                      />
                    )}
                    {field.type === "checkbox" && (
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                            editedProfilInfo[field.id] ? "bg-[#1271FF] border-[#1271FF]" : "border-white/40"
                          }`}
                          onClick={() =>
                            setEditedProfilInfo((prev) => ({
                              ...prev,
                              [field.id]: !prev[field.id],
                            }))
                          }
                        >
                          {Boolean(editedProfilInfo[field.id]) && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </label>
                    )}
                    {(field.type === "radio" || field.type === "select") && (
                      <div className="space-y-2">
                        {field.options?.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={`w-full px-4 py-3 border rounded-xl text-left transition-colors ${
                              editedProfilInfo[field.id] === option.value
                                ? "bg-[#1271FF] text-white border-[#1271FF]"
                                : "border-white/20 text-white/80 hover:border-white/40"
                            }`}
                            onClick={() =>
                              setEditedProfilInfo((prev) => ({
                                ...prev,
                                [field.id]: option.value,
                              }))
                            }
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {field.type === "multiselect" && (
                      <div className="space-y-2">
                        {field.options?.map((option) => {
                          const selectedValues = (editedProfilInfo[field.id] as string[]) || [];
                          const isSelected = selectedValues.includes(option.value);
                          return (
                            <button
                              key={option.value}
                              type="button"
                              className={`w-full px-4 py-3 border rounded-xl text-left transition-colors flex items-center gap-3 ${
                                isSelected
                                  ? "bg-[#1271FF] text-white border-[#1271FF]"
                                  : "border-white/20 text-white/80 hover:border-white/40"
                              }`}
                              onClick={() => {
                                setEditedProfilInfo((prev) => {
                                  const current = (prev[field.id] as string[]) || [];
                                  const newValues = isSelected
                                    ? current.filter((v) => v !== option.value)
                                    : [...current, option.value];
                                  return {
                                    ...prev,
                                    [field.id]: newValues,
                                  };
                                });
                              }}
                            >
                              <div
                                className={`w-5 h-5 rounded border flex items-center justify-center ${
                                  isSelected ? "bg-white border-white" : "border-white/40"
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-[#1271FF]" />}
                              </div>
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {customFields.map((field) => {
                  const value = profilInfo[field.id];
                  if (value === undefined || value === null || value === "") return null;
                  return (
                    <div key={field.id}>
                      <p className="text-white/60 text-sm">{field.label}</p>
                      <p className="text-white">{getFieldLabel(field, value)}</p>
                    </div>
                  );
                })}
                {customFields.every(f => !profilInfo[f.id]) && (
                  <p className="text-white/60 italic">Aucune information renseignee</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex justify-center mb-6">
          <div className="bg-white/10 rounded-2xl p-4 text-center min-w-[140px]">
            <p className="text-3xl font-bold text-white">{matchCount}</p>
            <p className="text-white/60 text-sm">Matchs</p>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-[#1271FF]/20 rounded-2xl p-5">
          <h3 className="font-semibold text-white mb-2">💡 Conseils</h3>
          <ul className="text-white/70 text-sm space-y-2">
            <li>• Ajoutez une photo de profil claire et souriante</li>
            <li>• Décrivez vos centres d'intérêt dans votre bio</li>
            <li>• Soyez authentique et ouvert aux nouvelles rencontres</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
