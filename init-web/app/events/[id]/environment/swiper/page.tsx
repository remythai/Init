"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { X, Heart, Sparkles, User, UserPlus, Clock, Flag, AlertTriangle } from "lucide-react";
import { authService } from "../../../../services/auth.service";
import { matchService, Profile, ApiError } from "../../../../services/match.service";
import { reportService, ReportType, ReportReason } from "../../../../services/report.service";
import { useMatchNotifications } from "../../../../hooks/useMatchNotifications";
import { SocketUserJoined, SocketMatch } from "../../../../services/socket.service";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const SWIPE_THRESHOLD = 100; // Minimum distance to trigger swipe

// Convert field ID (slug) to readable label
const formatFieldLabel = (fieldId: string): string => {
  return fieldId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};
const ROTATION_FACTOR = 0.15; // Rotation based on drag distance

export default function SwiperPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEventExpired, setIsEventExpired] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedUser, setMatchedUser] = useState<Profile | null>(null);
  const [matchId, setMatchId] = useState<number | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const [newUserNotification, setNewUserNotification] = useState<SocketUserJoined | null>(null);

  // Report state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const currentUserId = useRef<number | null>(null);

  // Animation state: track which card is exiting and in which direction
  const [exitingCard, setExitingCard] = useState<{ index: number; direction: "left" | "right" } | null>(null);

  // Drag state
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Handler for when a new user joins the event
  const handleUserJoined = useCallback((data: SocketUserJoined) => {
    console.log('Swiper: User joined event', data);
    setNewUserNotification(data);

    const newProfile: Profile = {
      user_id: data.user.id,
      firstname: data.user.firstname,
      lastname: data.user.lastname,
      photos: data.user.photos,
    };

    setProfiles((prev) => {
      if (prev.some((p) => p.user_id === data.user.id)) {
        return prev;
      }
      return [...prev, newProfile];
    });

    setTimeout(() => {
      setNewUserNotification(null);
    }, 5000);
  }, []);

  // Handler for when a match is received via WebSocket
  const handleNewMatch = useCallback((data: SocketMatch) => {
    if (showMatch) return;
    if (swiping) return;

    const otherUser = data.user1.id === currentUserId.current ? data.user2 : data.user1;
    const matchedProfile: Profile = {
      user_id: otherUser.id,
      firstname: otherUser.firstname,
      lastname: otherUser.lastname,
      photos: otherUser.photos,
    };

    setMatchedUser(matchedProfile);
    setMatchId(data.match_id);
    setShowMatch(true);
  }, [showMatch, swiping]);

  useMatchNotifications({
    eventId,
    onUserJoined: handleUserJoined,
    onNewMatch: handleNewMatch,
  });

  useEffect(() => {
    const initPage = async () => {
      const validatedType = await authService.validateAndGetUserType();
      if (!validatedType) {
        router.push("/auth");
        return;
      }
      if (validatedType !== "user") {
        router.push("/events");
        return;
      }

      const profile = await authService.getCurrentProfile();
      if (profile && 'id' in profile) {
        currentUserId.current = profile.id as number;
      }

      loadProfiles();
    };

    initPage();
  }, [eventId]);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      setError("");
      setIsEventExpired(false);
      setIsBlocked(false);
      const data = await matchService.getProfilesToSwipe(eventId, 20);
      setProfiles(data);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'EVENT_EXPIRED') {
        setIsEventExpired(true);
      } else if (err instanceof ApiError && err.code === 'USER_BLOCKED') {
        setIsBlocked(true);
      } else {
        const message = err instanceof Error ? err.message : "Erreur lors du chargement";
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const currentProfile = profiles[currentIndex];

  const getAge = (profile: Profile): number | null => {
    if (profile.age) return profile.age;
    if (profile.birthday) {
      const birthDate = new Date(profile.birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }
    return null;
  };

  const handleSwipe = async (direction: "left" | "right") => {
    if (!currentProfile || swiping) return;

    setSwiping(true);
    const cardIndex = currentIndex;
    const targetUserId = currentProfile.user_id;

    // Start exit animation for current card
    setExitingCard({ index: cardIndex, direction });

    // Make API call
    let matchResult: { matched: boolean; match?: { id: number } } | null = null;
    try {
      if (direction === "right") {
        matchResult = await matchService.likeProfile(eventId, targetUserId);
      } else {
        await matchService.passProfile(eventId, targetUserId);
      }
    } catch (err: unknown) {
      console.error("Swipe error:", err);
      // Handle event expiry during swipe
      if (err instanceof ApiError && err.code === 'EVENT_EXPIRED') {
        setIsEventExpired(true);
        setSwiping(false);
        setExitingCard(null);
        return;
      }
    }

    // Wait for animation to complete
    setTimeout(() => {
      // Move to next card
      setCurrentIndex((prev) => prev + 1);
      setCurrentImageIndex(0);
      setExitingCard(null);
      setSwiping(false);

      // Show match modal after card is gone
      if (matchResult?.matched && matchResult.match) {
        setMatchedUser(currentProfile);
        setMatchId(matchResult.match.id);
        setShowMatch(true);
      }
    }, 400);
  };

  // Drag handlers
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    if (swiping || !currentProfile) return;
    setDragState({
      isDragging: true,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
    });
  }, [swiping, currentProfile]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragState?.isDragging) return;
    setDragState((prev) => prev ? {
      ...prev,
      currentX: clientX,
      currentY: clientY,
    } : null);
  }, [dragState?.isDragging]);

  const handleDragEnd = useCallback(() => {
    if (!dragState?.isDragging) return;

    const deltaX = dragState.currentX - dragState.startX;
    const absX = Math.abs(deltaX);

    if (absX > SWIPE_THRESHOLD) {
      // Trigger swipe
      const direction = deltaX > 0 ? "right" : "left";
      setDragState(null);
      handleSwipe(direction);
    } else {
      // Snap back
      setDragState(null);
    }
  }, [dragState, handleSwipe]);

  // Mouse event handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  }, [handleDragStart]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  }, [handleDragMove]);

  const onMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  const onMouseLeave = useCallback(() => {
    if (dragState?.isDragging) {
      handleDragEnd();
    }
  }, [dragState?.isDragging, handleDragEnd]);

  // Touch event handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  }, [handleDragStart]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragMove(touch.clientX, touch.clientY);
  }, [handleDragMove]);

  const onTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Calculate drag transform
  const getDragTransform = () => {
    if (!dragState?.isDragging) return {};
    const deltaX = dragState.currentX - dragState.startX;
    const deltaY = (dragState.currentY - dragState.startY) * 0.3; // Reduce vertical movement
    const rotation = deltaX * ROTATION_FACTOR;
    return {
      transform: `translate3d(${deltaX}px, ${deltaY}px, 0) rotate(${rotation}deg)`,
      transition: 'none',
    };
  };

  const getDragOpacity = () => {
    if (!dragState?.isDragging) return { likeOpacity: 0, nopeOpacity: 0 };
    const deltaX = dragState.currentX - dragState.startX;
    const progress = Math.min(Math.abs(deltaX) / SWIPE_THRESHOLD, 1);
    return {
      likeOpacity: deltaX > 0 ? progress : 0,
      nopeOpacity: deltaX < 0 ? progress : 0,
    };
  };

  const handlePreviousImage = () => {
    if (currentProfile?.photos && currentProfile.photos.length > 1) {
      setCurrentImageIndex((prev) =>
        prev > 0 ? prev - 1 : currentProfile.photos!.length - 1
      );
    }
  };

  const handleNextImage = () => {
    if (currentProfile?.photos && currentProfile.photos.length > 1) {
      setCurrentImageIndex((prev) =>
        prev < currentProfile.photos!.length - 1 ? prev + 1 : 0
      );
    }
  };

  const closeMatch = () => {
    setShowMatch(false);
    setMatchedUser(null);
    setMatchId(null);
  };

  const openReportModal = () => {
    setReportType(null);
    setReportDescription("");
    setShowReportModal(true);
  };

  const handleReportSubmit = async () => {
    if (!reportType || !currentProfile) return;

    setSubmittingReport(true);
    try {
      await reportService.createReport(eventId, {
        reportedUserId: currentProfile.user_id,
        reportType,
        reason: 'inappropriate',
        description: reportDescription || undefined,
      });
      setShowReportModal(false);
      handleSwipe('left');
      alert("Signalement envoye. L'organisateur va l'examiner.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors du signalement";
      alert(message);
    } finally {
      setSubmittingReport(false);
    }
  };

  const getProfileImage = (profile: Profile, index: number = 0): string => {
    if (profile.photos && profile.photos.length > index && profile.photos[index].file_path) {
      const filePath = profile.photos[index].file_path;
      // If the file_path is a relative path, prepend API_URL
      if (filePath.startsWith('/')) {
        return `${API_URL}${filePath}`;
      }
      return filePath;
    }
    return `https://ui-avatars.com/api/?name=${profile.firstname}+${profile.lastname}&size=400&background=1271FF&color=fff`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F5F5F5]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1271FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#303030]">Chargement des profils...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F5F5F5]">
        <div className="text-center p-8">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={loadProfiles}
            className="bg-[#303030] text-white px-6 py-3 rounded-full font-medium hover:bg-[#404040] transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F5F5F5]">
        <div className="text-center p-8 max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-[#303030] mb-3">
            Accès bloqué
          </h2>
          <p className="text-[#6B7280] mb-6">
            Vous avez été retiré de cet événement par l'organisateur.
          </p>
          <Link
            href={`/events/${eventId}/environment/messages`}
            className="inline-block bg-[#303030] text-white px-6 py-3 rounded-full font-medium hover:bg-[#404040] transition-colors"
          >
            Voir mes conversations
          </Link>
        </div>
      </div>
    );
  }

  if (isEventExpired) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F5F5F5]">
        <div className="text-center p-8 max-w-md">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-orange-500" />
          </div>
          <h2 className="text-xl font-semibold text-[#303030] mb-3">
            Événement terminé
          </h2>
          <p className="text-[#6B7280] mb-6">
            La période de disponibilité de cet événement est terminée. Vous ne pouvez plus découvrir de nouveaux profils.
          </p>
          <Link
            href={`/events/${eventId}/environment/messages`}
            className="inline-block bg-[#303030] text-white px-6 py-3 rounded-full font-medium hover:bg-[#404040] transition-colors"
          >
            Voir mes conversations
          </Link>
        </div>
      </div>
    );
  }

  const isFinished = currentIndex >= profiles.length;

  return (
    <div className="h-full flex flex-col bg-[#F5F5F5] pt-3">
      {/* New User Notification */}
      {newUserNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-[#1271FF] text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium">{newUserNotification.user.firstname} a rejoint !</p>
              <p className="text-sm text-white/80">Nouveau profil disponible</p>
            </div>
            <button onClick={() => setNewUserNotification(null)} className="ml-2 text-white/60 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Card Container */}
      <div className="flex-1 px-4 pb-2 min-h-0">
        <div className="h-full max-w-lg mx-auto relative">
          {!isFinished && currentProfile ? (
            <>
              {/* Next Card (behind) - shown during animation or when there's a next profile */}
              {(() => {
                const nextIndex = currentIndex + 1;
                const nextProfile = profiles[nextIndex];
                if (!nextProfile) return null;

                // Calculate scale based on drag progress
                let scale = 0.95;
                let opacity = 0.5;
                if (exitingCard) {
                  scale = 1;
                  opacity = 1;
                } else if (dragState?.isDragging) {
                  const deltaX = Math.abs(dragState.currentX - dragState.startX);
                  const progress = Math.min(deltaX / SWIPE_THRESHOLD, 1);
                  scale = 0.95 + (0.05 * progress);
                  opacity = 0.5 + (0.5 * progress);
                }

                return (
                  <div
                    className="absolute inset-0"
                    style={{
                      transform: `scale(${scale})`,
                      opacity,
                      transition: dragState?.isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    <div className="w-full h-full bg-white rounded-[20px] shadow-lg overflow-hidden">
                      <div
                        className="w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${getProfileImage(nextProfile)})` }}
                      >
                        <div className="absolute inset-0 bg-black/10" />
                        {/* Pagination for next card */}
                        {nextProfile.photos && nextProfile.photos.length > 1 && (
                          <div className="absolute top-3 left-4 right-4 flex gap-1 z-20">
                            {nextProfile.photos.map((_, idx) => (
                              <div
                                key={idx}
                                className={`flex-1 h-[3px] rounded-full ${
                                  idx === 0 ? "bg-white" : "bg-white/50"
                                }`}
                              />
                            ))}
                          </div>
                        )}
                        {/* Name for next card */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-5 py-5 pb-4">
                          <div className="flex items-center justify-between">
                            <h2 className="text-white text-[28px] font-bold flex-1">
                              {nextProfile.firstname}
                              {getAge(nextProfile) && (
                                <span className="font-normal">, {getAge(nextProfile)}</span>
                              )}
                            </h2>
                            <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center ml-3">
                              <User className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Current/Exiting Card */}
              {!exitingCard && (
                <div
                  ref={cardRef}
                  className="absolute inset-0 cursor-grab active:cursor-grabbing"
                  style={{
                    ...getDragTransform(),
                    transition: dragState?.isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseLeave}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  <div className="w-full h-full bg-white rounded-[20px] shadow-xl overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${getProfileImage(currentProfile, currentImageIndex)})` }}
                    >
                      <div className="absolute inset-0 bg-black/10" />

                      {/* LIKE indicator during drag */}
                      <div
                        className="absolute top-1/2 left-8 -translate-y-1/2 px-6 py-3 border-4 border-green-500 rounded-xl transform -rotate-12 pointer-events-none z-30"
                        style={{ opacity: getDragOpacity().likeOpacity }}
                      >
                        <span className="font-bold text-3xl text-green-500">LIKE</span>
                      </div>

                      {/* NOPE indicator during drag */}
                      <div
                        className="absolute top-1/2 right-8 -translate-y-1/2 px-6 py-3 border-4 border-red-500 rounded-xl transform rotate-12 pointer-events-none z-30"
                        style={{ opacity: getDragOpacity().nopeOpacity }}
                      >
                        <span className="font-bold text-3xl text-red-500">NOPE</span>
                      </div>

                      {/* Touch zones for image navigation */}
                      {currentProfile.photos && currentProfile.photos.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!dragState?.isDragging) handlePreviousImage();
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            className="absolute left-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer"
                            aria-label="Image precedente"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!dragState?.isDragging) handleNextImage();
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            className="absolute right-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer"
                            aria-label="Image suivante"
                          />
                        </>
                      )}

                      {/* Pagination bars */}
                      {currentProfile.photos && currentProfile.photos.length > 1 && (
                        <div className="absolute top-3 left-4 right-4 flex gap-1 z-20">
                          {currentProfile.photos.map((_, idx) => (
                            <div
                              key={idx}
                              className={`flex-1 h-[3px] rounded-full transition-colors ${
                                idx === currentImageIndex ? "bg-white" : "bg-white/50"
                              }`}
                            />
                          ))}
                        </div>
                      )}

                      {/* Bottom gradient with name */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-5 py-5 pb-4">
                        <div className="flex items-center justify-between">
                          <h2 className="text-white text-[28px] font-bold flex-1">
                            {currentProfile.firstname}
                            {getAge(currentProfile) && (
                              <span className="font-normal">, {getAge(currentProfile)}</span>
                            )}
                          </h2>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!dragState?.isDragging) setShowProfileModal(true);
                              }}
                              className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center hover:bg-white/40 transition-colors z-20"
                            >
                              <User className="w-6 h-6 text-white" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!dragState?.isDragging) openReportModal();
                              }}
                              className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center hover:bg-red-500/50 transition-colors z-20"
                              title="Signaler"
                            >
                              <Flag className="w-5 h-5 text-white" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Exiting Card (animating out) */}
              {exitingCard && exitingCard.index < profiles.length && (
                <div
                  className="absolute inset-0 z-10"
                  style={{
                    transform: exitingCard.direction === "left"
                      ? "translate3d(-120%, 0, 0) rotate(-20deg)"
                      : "translate3d(120%, 0, 0) rotate(20deg)",
                    transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  <div className="w-full h-full bg-white rounded-[20px] shadow-xl overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${getProfileImage(profiles[exitingCard.index], currentImageIndex)})` }}
                    >
                      <div className="absolute inset-0 bg-black/10" />

                      {/* Pagination bars */}
                      {profiles[exitingCard.index].photos && profiles[exitingCard.index].photos!.length > 1 && (
                        <div className="absolute top-3 left-4 right-4 flex gap-1 z-20">
                          {profiles[exitingCard.index].photos!.map((_, idx) => (
                            <div
                              key={idx}
                              className={`flex-1 h-[3px] rounded-full ${
                                idx === currentImageIndex ? "bg-white" : "bg-white/50"
                              }`}
                            />
                          ))}
                        </div>
                      )}

                      {/* LIKE / NOPE indicators */}
                      <div
                        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-4 border-4 rounded-xl transform transition-opacity ${
                          exitingCard.direction === "right"
                            ? "border-green-500 -rotate-12"
                            : "border-red-500 rotate-12"
                        }`}
                      >
                        <span className={`font-bold text-4xl ${
                          exitingCard.direction === "right" ? "text-green-500" : "text-red-500"
                        }`}>
                          {exitingCard.direction === "right" ? "LIKE" : "NOPE"}
                        </span>
                      </div>

                      {/* Bottom gradient with name */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-5 py-5 pb-4">
                        <div className="flex items-center justify-between">
                          <h2 className="text-white text-[28px] font-bold flex-1">
                            {profiles[exitingCard.index].firstname}
                            {getAge(profiles[exitingCard.index]) && (
                              <span className="font-normal">, {getAge(profiles[exitingCard.index])}</span>
                            )}
                          </h2>
                          <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center ml-3">
                            <User className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-md">
                <Heart className="w-10 h-10 text-[#303030]" />
              </div>
              <h2 className="text-xl font-semibold text-[#303030] mb-2">
                Plus de profils disponibles
              </h2>
              <p className="text-[#6B7280] mb-6">Revenez plus tard !</p>
              <Link
                href={`/events/${eventId}`}
                className="bg-[#303030] text-white px-6 py-3 rounded-full font-medium hover:bg-[#404040] transition-colors"
              >
                Retour à l'événement
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {!isFinished && currentProfile && (
        <div className="flex-shrink-0 flex items-center justify-center gap-5 py-3 pb-6">
          <button
            onClick={() => handleSwipe("left")}
            disabled={swiping}
            className="w-[60px] h-[60px] bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-red-300 hover:scale-110 transition-transform disabled:opacity-50 disabled:hover:scale-100"
          >
            <X className="w-7 h-7 text-red-500" />
          </button>

          <button
            onClick={() => handleSwipe("right")}
            disabled={swiping}
            className="w-[60px] h-[60px] bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-emerald-300 hover:scale-110 transition-transform disabled:opacity-50 disabled:hover:scale-100"
          >
            <Heart className="w-7 h-7 text-emerald-500" />
          </button>
        </div>
      )}

      {/* Match Modal */}
      {showMatch && matchedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-pink-500 to-purple-600">
          <div className="text-center text-white p-8">
            <div className="mb-8">
              <Sparkles className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-4xl font-bold mb-2">It's a Match !</h2>
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

      {/* Profile Modal (Bottom Sheet) */}
      {showProfileModal && currentProfile && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowProfileModal(false)}
          />
          <div className="relative bg-white w-full max-w-lg rounded-t-3xl max-h-[80vh] overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-[#303030]">
                {currentProfile.firstname}
                {getAge(currentProfile) && (
                  <span className="font-normal">, {getAge(currentProfile)}</span>
                )}
              </h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="w-8 h-8 flex items-center justify-center text-[#303030] hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(80vh-160px)] px-5 py-4">
              {/* Custom fields from profil_info (defined by organizer) */}
              {currentProfile.profil_info && Object.keys(currentProfile.profil_info).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[#303030] mb-3">Informations</h3>
                  <div className="space-y-2">
                    {Object.entries(currentProfile.profil_info).map(([key, value]) => {
                      // Skip if value is empty, null, or an empty array
                      if (!value || (Array.isArray(value) && value.length === 0)) return null;

                      // Handle arrays (like interests)
                      if (Array.isArray(value)) {
                        return (
                          <div key={key} className="bg-[#F9FAFB] p-3 rounded-xl border border-gray-200">
                            <p className="text-sm font-semibold text-[#303030] mb-2">{formatFieldLabel(key)}</p>
                            <div className="flex flex-wrap gap-2">
                              {value.map((item, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1.5 bg-indigo-100 text-[#303030] rounded-full text-sm border border-indigo-200"
                                >
                                  {String(item)}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      // Handle regular values
                      return (
                        <div key={key} className="bg-[#F9FAFB] p-3 rounded-xl border border-gray-200">
                          <p className="text-sm font-semibold text-[#303030] mb-1">{formatFieldLabel(key)}</p>
                          <p className="text-[#4B5563]">{String(value)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Show message if no profile info */}
              {(!currentProfile.profil_info || Object.keys(currentProfile.profil_info).length === 0) && (
                <div className="text-center py-8">
                  <p className="text-[#6B7280]">Aucune information de profil</p>
                </div>
              )}

              <div className="h-16" />
            </div>

            {/* Footer with action buttons */}
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-5 py-4">
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    setTimeout(() => handleSwipe("left"), 300);
                  }}
                  className="w-[70px] h-[70px] bg-white rounded-full shadow-lg flex items-center justify-center border-[2.5px] border-red-500 hover:scale-105 transition-transform"
                >
                  <X className="w-8 h-8 text-red-500" />
                </button>

                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    setTimeout(() => handleSwipe("right"), 300);
                  }}
                  className="w-[70px] h-[70px] bg-white rounded-full shadow-lg flex items-center justify-center border-[2.5px] border-emerald-500 hover:scale-105 transition-transform"
                >
                  <Heart className="w-8 h-8 text-emerald-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && currentProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !submittingReport && setShowReportModal(false)}
          />
          <div className="relative bg-[#303030] rounded-2xl p-6 max-w-md mx-4 w-full">
            <h3 className="font-poppins font-semibold text-xl text-white mb-2">
              Signaler {currentProfile.firstname}
            </h3>
            <p className="text-white/60 text-sm mb-6">
              {!reportType ? "Que souhaitez-vous signaler ?" : "Ajoutez des details si necessaire"}
            </p>

            {/* Step 1: Type selection */}
            {!reportType ? (
              <div className="space-y-3">
                <button
                  onClick={() => setReportType('photo')}
                  className="w-full p-4 text-left rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <div className="font-medium text-white">Photo inappropriee</div>
                  <div className="text-sm text-white/60">Image choquante ou offensante</div>
                </button>
                <button
                  onClick={() => setReportType('profile')}
                  className="w-full p-4 text-left rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <div className="font-medium text-white">Profil offensant</div>
                  <div className="text-sm text-white/60">Informations inappropriees</div>
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="w-full py-3 text-white/60 hover:text-white transition-colors mt-2"
                >
                  Annuler
                </button>
              </div>
            ) : (
              /* Step 2: Description */
              <div className="space-y-4">
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Decrivez la situation pour aider l'organisateur..."
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#1271FF] resize-none h-32"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setReportType(null)}
                    disabled={submittingReport}
                    className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors disabled:opacity-50"
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleReportSubmit}
                    disabled={submittingReport}
                    className="flex-1 py-3 rounded-xl bg-[#1271FF] text-white font-medium hover:bg-[#0d5dd8] transition-colors disabled:opacity-50"
                  >
                    {submittingReport ? "Envoi..." : "Signaler"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
