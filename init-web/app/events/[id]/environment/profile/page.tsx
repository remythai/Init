"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Camera, Edit2, Check, X } from "lucide-react";
import { authService, User } from "../../../../services/auth.service";
import { matchService } from "../../../../services/match.service";

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
    bio: string;
    image: string;
  } | null>(null);
  const [editedBio, setEditedBio] = useState("");

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
          bio: "Passionné(e) par les nouvelles rencontres et les événements networking.",
          image: avatarUrl,
        });
        setEditedBio("Passionné(e) par les nouvelles rencontres et les événements networking.");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      // Use fallback data if API fails
      setProfile({
        firstname: "Utilisateur",
        lastname: "",
        age: 25,
        bio: "Passionné(e) par les nouvelles rencontres et les événements networking.",
        image: "https://ui-avatars.com/api/?name=U&size=400&background=1271FF&color=fff",
      });
      setEditedBio("Passionné(e) par les nouvelles rencontres et les événements networking.");
    } finally {
      setLoading(false);
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

    // Simulate saving
    setTimeout(() => {
      setProfile({ ...profile, bio: editedBio });
      setEditing(false);
      setSaving(false);
    }, 500);
  };

  const handleCancel = () => {
    if (profile) {
      setEditedBio(profile.bio);
    }
    setEditing(false);
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
        <div className="bg-white/10 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white">À propos</h2>
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
            <textarea
              value={editedBio}
              onChange={(e) => setEditedBio(e.target.value)}
              placeholder="Décrivez-vous en quelques mots..."
              rows={4}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#1271FF] resize-none"
            />
          ) : (
            <p className="text-white/80 leading-relaxed">{profile.bio}</p>
          )}
        </div>

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
