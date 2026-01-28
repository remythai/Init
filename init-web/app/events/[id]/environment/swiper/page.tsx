"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { X, Heart, Sparkles, ChevronLeft, ChevronRight, Info, UserPlus } from "lucide-react";
import { authService } from "../../../../services/auth.service";
import { matchService, Profile, Match } from "../../../../services/match.service";
import { useMatchNotifications } from "../../../../hooks/useMatchNotifications";
import { SocketUserJoined } from "../../../../services/socket.service";

export default function SwiperPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedUser, setMatchedUser] = useState<Profile | null>(null);
  const [matchId, setMatchId] = useState<number | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const [newUserNotification, setNewUserNotification] = useState<SocketUserJoined | null>(null);

  // Handler for when a new user joins the event
  const handleUserJoined = useCallback((data: SocketUserJoined) => {
    // Show notification
    setNewUserNotification(data);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setNewUserNotification(null);
    }, 5000);
  }, []);

  // Use match notifications hook
  useMatchNotifications({
    eventId,
    onUserJoined: handleUserJoined,
  });

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

      loadProfiles();
    };

    initPage();
  }, [eventId]);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await matchService.getProfilesToSwipe(eventId, 20);
      setProfiles(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors du chargement";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const currentProfile = profiles[currentIndex];

  // Get the age from profile (either pre-calculated or from birthday)
  const getAge = (profile: Profile): number | null => {
    if (profile.age) return profile.age;
    if (profile.birthday) return calculateAge(profile.birthday);
    return null;
  };

  const handleSwipe = async (direction: "left" | "right") => {
    if (!currentProfile || swiping) return;

    setSwiping(true);
    setSwipeDirection(direction);

    // Use user_id (API returns user_id for profiles)
    const targetUserId = currentProfile.user_id;

    try {
      if (direction === "right") {
        // Like
        const result = await matchService.likeProfile(eventId, targetUserId);

        if (result.matched && result.match) {
          setMatchedUser(currentProfile);
          setMatchId(result.match.id);
          // Delay showing match modal until animation completes
          setTimeout(() => {
            setShowMatch(true);
          }, 300);
        }
      } else {
        // Pass
        await matchService.passProfile(eventId, targetUserId);
      }
    } catch (err: unknown) {
      console.error("Swipe error:", err);
      // Continue anyway to not block the UX
    }

    // Animation timing
    setTimeout(() => {
      setSwipeDirection(null);
      setCurrentIndex(currentIndex + 1);
      setCurrentImageIndex(0);
      setSwiping(false);
    }, 300);
  };

  const nextImage = () => {
    if (currentProfile && currentProfile.photos && currentImageIndex < currentProfile.photos.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const closeMatch = () => {
    setShowMatch(false);
    setMatchedUser(null);
    setMatchId(null);
  };

  const getProfileImage = (profile: Profile, index: number = 0): string => {
    if (profile.photos && profile.photos.length > index && profile.photos[index].file_path) {
      return profile.photos[index].file_path;
    }
    // Default placeholder
    return `https://ui-avatars.com/api/?name=${profile.firstname}+${profile.lastname}&size=400&background=1271FF&color=fff`;
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1271FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Chargement des profils...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadProfiles}
            className="bg-white text-[#303030] px-6 py-3 rounded-full font-medium hover:bg-gray-100 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const isFinished = currentIndex >= profiles.length;

  return (
    <div className="h-full flex flex-col p-4">
      {/* New User Notification */}
      {newUserNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-[#1271FF] text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium">{newUserNotification.user.firstname} a rejoint l'événement !</p>
              <p className="text-sm text-white/80">Nouveau profil disponible</p>
            </div>
            <button
              onClick={() => setNewUserNotification(null)}
              className="ml-2 text-white/60 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-0">
        {/* Swiper Card */}
        {!isFinished && currentProfile ? (
          <div className="flex-1 relative min-h-0">
            {/* Card Stack (show next card behind) */}
            {currentIndex + 1 < profiles.length && (
              <div className="absolute inset-0 scale-95 opacity-50">
                <div className="w-full h-full bg-white rounded-3xl shadow-lg overflow-hidden">
                  <img
                    src={getProfileImage(profiles[currentIndex + 1])}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Current Card */}
            <div
              className={`absolute inset-0 transition-all duration-300 ${
                swipeDirection === "left"
                  ? "-translate-x-full -rotate-12 opacity-0"
                  : swipeDirection === "right"
                  ? "translate-x-full rotate-12 opacity-0"
                  : ""
              }`}
            >
              <div className="w-full h-full bg-white rounded-3xl shadow-xl overflow-hidden relative">
                {/* Image with navigation */}
                <div className="absolute inset-0">
                  <img
                    src={getProfileImage(currentProfile, currentImageIndex)}
                    alt={currentProfile.firstname}
                    className="w-full h-full object-cover"
                  />

                  {/* Image navigation zones */}
                  {currentProfile.photos && currentProfile.photos.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
                        aria-label="Image précédente"
                      />
                      <button
                        onClick={nextImage}
                        className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
                        aria-label="Image suivante"
                      />
                    </>
                  )}

                  {/* Image indicators */}
                  {currentProfile.photos && currentProfile.photos.length > 1 && (
                    <div className="absolute top-4 left-4 right-4 flex gap-1 z-20">
                      {currentProfile.photos.map((_, idx) => (
                        <div
                          key={idx}
                          className={`flex-1 h-1 rounded-full transition-colors ${
                            idx === currentImageIndex ? "bg-white" : "bg-white/40"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Swipe Indicators */}
                <div
                  className={`absolute top-8 left-8 px-4 py-2 border-4 border-green-500 rounded-lg transform -rotate-12 transition-opacity ${
                    swipeDirection === "right" ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <span className="text-green-500 font-bold text-2xl">LIKE</span>
                </div>
                <div
                  className={`absolute top-8 right-8 px-4 py-2 border-4 border-red-500 rounded-lg transform rotate-12 transition-opacity ${
                    swipeDirection === "left" ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <span className="text-red-500 font-bold text-2xl">NOPE</span>
                </div>

                {/* Info Button */}
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="absolute top-4 right-4 w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors z-20"
                >
                  <Info className="w-5 h-5" />
                </button>

                {/* User Info */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h2 className="font-poppins text-3xl font-bold">
                    {currentProfile.firstname} {currentProfile.lastname?.charAt(0)}.
                    {getAge(currentProfile) && (
                      <span className="font-normal">, {getAge(currentProfile)}</span>
                    )}
                  </h2>
                  {(currentProfile.bio || currentProfile.profil_info?.bio) && (
                    <p className="text-white/80 mt-2 text-sm leading-relaxed line-clamp-2">
                      {currentProfile.bio || currentProfile.profil_info?.bio}
                    </p>
                  )}
                  {(currentProfile.interests || currentProfile.profil_info?.interests) &&
                   (currentProfile.interests || currentProfile.profil_info?.interests)!.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {(currentProfile.interests || currentProfile.profil_info?.interests)!.slice(0, 3).map((interest, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-6">
              <Sparkles className="w-12 h-12 text-white/50" />
            </div>
            <h2 className="font-poppins text-xl font-semibold text-white mb-2">
              C'est tout pour le moment !
            </h2>
            <p className="text-white/60 mb-6">
              {profiles.length === 0
                ? "Aucun profil disponible pour cet événement."
                : "Vous avez vu tous les participants de cet événement."}
            </p>
            <Link
              href={`/events/${eventId}`}
              className="inline-block bg-white text-[#303030] px-6 py-3 rounded-full font-medium hover:bg-gray-100 transition-colors"
            >
              Retour à l'événement
            </Link>
          </div>
        )}

        {/* Action Buttons */}
        {!isFinished && currentProfile && (
          <div className="flex-shrink-0 flex items-center justify-center gap-6 py-4">
            {/* Pass Button */}
            <button
              onClick={() => handleSwipe("left")}
              disabled={swiping}
              className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-red-500 hover:scale-110 transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              <X className="w-8 h-8" />
            </button>

            {/* Like Button */}
            <button
              onClick={() => handleSwipe("right")}
              disabled={swiping}
              className="w-16 h-16 bg-gradient-to-br from-pink-500 to-red-500 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              <Heart className="w-8 h-8" />
            </button>
          </div>
        )}
      </div>

      {/* Match Modal */}
      {showMatch && matchedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-pink-500 to-purple-600">
          <div className="text-center text-white p-8">
            <div className="mb-8">
              <Sparkles className="w-16 h-16 mx-auto mb-4" />
              <h2 className="font-poppins text-4xl font-bold mb-2">It's a Match !</h2>
              <p className="text-white/80">
                Vous et {matchedUser.firstname} vous êtes likés mutuellement
              </p>
            </div>

            <div className="flex justify-center gap-4 mb-8">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white">
                <img
                  src={getProfileImage(matchedUser)}
                  alt={matchedUser.firstname}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href={`/events/${eventId}/environment/messages?match=${matchId}`}
                className="block w-full bg-white text-purple-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors"
              >
                Envoyer un message
              </Link>
              <button
                onClick={closeMatch}
                className="block w-full text-white/80 hover:text-white transition-colors"
              >
                Continuer à swiper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && currentProfile && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowProfileModal(false)}
          />
          <div className="relative bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-3xl max-h-[85vh] overflow-hidden">
            {/* Header Image */}
            <div className="relative h-64">
              <img
                src={getProfileImage(currentProfile, currentImageIndex)}
                alt={currentProfile.firstname}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-4 text-white">
                <h2 className="font-poppins text-2xl font-bold">
                  {currentProfile.firstname} {currentProfile.lastname?.charAt(0)}.
                  {getAge(currentProfile) && <span className="font-normal">, {getAge(currentProfile)}</span>}
                </h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {(currentProfile.bio || currentProfile.profil_info?.bio) && (
                <div className="mb-6">
                  <h3 className="font-semibold text-[#303030] mb-2">À propos</h3>
                  <p className="text-gray-600">{currentProfile.bio || currentProfile.profil_info?.bio}</p>
                </div>
              )}

              {((currentProfile.interests && currentProfile.interests.length > 0) ||
                (currentProfile.profil_info?.interests && currentProfile.profil_info.interests.length > 0)) && (
                <div className="mb-6">
                  <h3 className="font-semibold text-[#303030] mb-2">Centres d'intérêt</h3>
                  <div className="flex flex-wrap gap-2">
                    {(currentProfile.interests || currentProfile.profil_info?.interests || []).map((interest, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-[#F5F5F5] text-[#303030] rounded-full text-sm"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {((currentProfile.custom_fields && Object.keys(currentProfile.custom_fields).length > 0) ||
                (currentProfile.profil_info?.custom_fields && Object.keys(currentProfile.profil_info.custom_fields).length > 0)) && (
                <div>
                  <h3 className="font-semibold text-[#303030] mb-2">Informations</h3>
                  <div className="space-y-2">
                    {Object.entries(currentProfile.custom_fields || currentProfile.profil_info?.custom_fields || {}).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">{key}</span>
                        <span className="text-[#303030] font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
