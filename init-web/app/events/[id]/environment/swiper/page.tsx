"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { X, Heart, User, UserPlus, Clock, Flag, AlertTriangle } from "lucide-react";
import { authService } from "../../../../services/auth.service";
import { matchService, Profile, ApiError } from "../../../../services/match.service";
import { reportService, ReportType, ReportReason } from "../../../../services/report.service";
import { useMatchNotifications } from "../../../../hooks/useMatchNotifications";
import { SocketUserJoined, SocketMatch } from "../../../../services/socket.service";
import PathDrawing from "@/app/components/PathDrawing";


const SWIPE_THRESHOLD = 100; // Minimum distance to trigger swipe
const PROFILES_TO_FETCH = 20; // Number of profiles to fetch at once
const RELOAD_THRESHOLD = 5; // Fetch more profiles when this many remain
const PRELOAD_AHEAD = 3; // Number of profiles to preload images for

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [isEventExpired, setIsEventExpired] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedUser, setMatchedUser] = useState<Profile | null>(null);
  const [matchId, setMatchId] = useState<number | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const [newUserNotification, setNewUserNotification] = useState<SocketUserJoined | null>(null);
  const [noMoreProfiles, setNoMoreProfiles] = useState(false); // True when API returns empty

  // Track seen user IDs to avoid duplicates when fetching more
  const seenUserIds = useRef<Set<number>>(new Set());
  // Track preloaded image URLs to avoid re-preloading
  const preloadedImages = useRef<Set<string>>(new Set());

  // Report state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const currentUserId = useRef<number | null>(null);

  // Animation state: track which card is exiting and in which direction
  const [exitingCard, setExitingCard] = useState<{ index: number; direction: "left" | "right" } | null>(null);
  // Feedback animation (heart/cross icon)
  const [actionFeedback, setActionFeedback] = useState<"like" | "pass" | null>(null);

  // Drag state - use refs for performance, state only for re-renders
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const dragRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextCardRef = useRef<HTMLDivElement>(null);

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

    // Add to seen set to avoid duplicates
    seenUserIds.current.add(data.user.id);

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
      setNoMoreProfiles(false);
      const data = await matchService.getProfilesToSwipe(eventId, PROFILES_TO_FETCH);

      // Track seen user IDs
      seenUserIds.current.clear();
      data.forEach(p => seenUserIds.current.add(p.user_id));

      setProfiles(data);
      if (data.length === 0) {
        setNoMoreProfiles(true);
      }
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

  // Load more profiles when approaching the end
  const loadMoreProfiles = useCallback(async () => {
    if (loadingMore || noMoreProfiles || isEventExpired || isBlocked) return;

    try {
      setLoadingMore(true);
      const data = await matchService.getProfilesToSwipe(eventId, PROFILES_TO_FETCH);

      // Filter out profiles we've already seen
      const newProfiles = data.filter(p => !seenUserIds.current.has(p.user_id));

      if (newProfiles.length === 0) {
        // API returned profiles but we've seen them all, or API is empty
        if (data.length === 0) {
          setNoMoreProfiles(true);
        }
        return;
      }

      // Add new user IDs to seen set
      newProfiles.forEach(p => seenUserIds.current.add(p.user_id));

      // Append new profiles
      setProfiles(prev => [...prev, ...newProfiles]);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'EVENT_EXPIRED') {
        setIsEventExpired(true);
      }
      // Silently fail for loading more - user can still swipe existing profiles
      console.error('Error loading more profiles:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [eventId, loadingMore, noMoreProfiles, isEventExpired, isBlocked]);

  // Auto-load more profiles when approaching the end
  useEffect(() => {
    const remainingProfiles = profiles.length - currentIndex;
    if (remainingProfiles <= RELOAD_THRESHOLD && remainingProfiles > 0) {
      loadMoreProfiles();
    }
  }, [currentIndex, profiles.length, loadMoreProfiles]);

  // Preload images for current and upcoming profiles
  useEffect(() => {
    const preloadImage = (url: string) => {
      if (preloadedImages.current.has(url)) return;
      preloadedImages.current.add(url);

      const img = new Image();
      img.src = url;
    };

    // Preload images for current profile + next PRELOAD_AHEAD profiles
    for (let i = 0; i <= PRELOAD_AHEAD; i++) {
      const profile = profiles[currentIndex + i];
      if (!profile) continue;

      // Preload all photos of this profile
      if (profile.photos && profile.photos.length > 0) {
        profile.photos.forEach(photo => {
          if (photo.file_path) {
            preloadImage(photo.file_path);
          }
        });
      }
    }
  }, [currentIndex, profiles]);

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

  const swipeFromDrag = useRef(false);

  const handleSwipe = async (direction: "left" | "right") => {
    if (!currentProfile || swiping) return;

    setSwiping(true);
    const cardIndex = currentIndex;
    const targetUserId = currentProfile.user_id;
    const isDragSwipe = swipeFromDrag.current;
    swipeFromDrag.current = false;

    // Show feedback icon
    setActionFeedback(direction === "right" ? "like" : "pass");

    // Only use React exiting card for button swipes (not drag)
    if (!isDragSwipe) {
      setExitingCard({ index: cardIndex, direction });
    }

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
      if (err instanceof ApiError && err.code === 'EVENT_EXPIRED') {
        setIsEventExpired(true);
        setSwiping(false);
        setExitingCard(null);
        return;
      }
    }

    // Wait for animation to complete
    setTimeout(() => {
      // Reset DOM styles from drag animation
      if (cardRef.current) {
        cardRef.current.style.transform = '';
        cardRef.current.style.transition = '';
      }
      if (nextCardRef.current) {
        nextCardRef.current.style.transform = '';
        nextCardRef.current.style.opacity = '';
        nextCardRef.current.style.transition = '';
      }

      setCurrentIndex((prev) => prev + 1);
      setCurrentImageIndex(0);
      setExitingCard(null);
      setActionFeedback(null);
      setSwiping(false);

      if (matchResult?.matched && matchResult.match) {
        setMatchedUser(currentProfile);
        setMatchId(matchResult.match.id);
        setShowMatch(true);
      }
    }, 400);
  };

  // Apply drag transform directly to DOM for smooth 60fps animation
  const applyDragTransform = useCallback(() => {
    const drag = dragRef.current;
    if (!drag?.isDragging) return;

    const deltaX = drag.currentX - drag.startX;
    const deltaY = (drag.currentY - drag.startY) * 0.3;
    const rotation = deltaX * ROTATION_FACTOR;
    const progress = Math.min(Math.abs(deltaX) / SWIPE_THRESHOLD, 1);
    const likeOpacity = deltaX > 0 ? progress : 0;
    const nopeOpacity = deltaX < 0 ? progress : 0;

    // Update card transform directly
    if (cardRef.current) {
      cardRef.current.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) rotate(${rotation}deg)`;
      cardRef.current.style.transition = 'none';

    }

    // Update next card scale
    if (nextCardRef.current) {
      const scale = 0.95 + (0.05 * progress);
      const opacity = 0.5 + (0.5 * progress);
      nextCardRef.current.style.transform = `scale(${scale})`;
      nextCardRef.current.style.opacity = String(opacity);
      nextCardRef.current.style.transition = 'none';
    }
  }, []);

  // Drag handlers
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    if (swiping || !currentProfile) return;
    const state = {
      isDragging: true,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
    };
    dragRef.current = state;
    setDragState(state);
  }, [swiping, currentProfile]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragRef.current?.isDragging) return;
    dragRef.current.currentX = clientX;
    dragRef.current.currentY = clientY;

    // Use rAF for smooth updates
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(applyDragTransform);
  }, [applyDragTransform]);

  const handleDragEnd = useCallback(() => {
    if (!dragRef.current?.isDragging) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const deltaX = dragRef.current.currentX - dragRef.current.startX;
    const absX = Math.abs(deltaX);

    const willSwipe = absX > SWIPE_THRESHOLD;

    if (!willSwipe) {
      // Snap back - reset DOM styles with smooth transition
      if (cardRef.current) {
        cardRef.current.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        cardRef.current.style.transform = '';
      }
      if (nextCardRef.current) {
        nextCardRef.current.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        nextCardRef.current.style.transform = 'scale(0.95)';
        nextCardRef.current.style.opacity = '0.5';
      }
    } else {
      // Swipe - animate card out from current position
      const direction = deltaX > 0 ? "right" : "left";
      if (cardRef.current) {
        const exitX = direction === "left" ? "-120%" : "120%";
        const exitRotation = direction === "left" ? "-20deg" : "20deg";
        cardRef.current.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        cardRef.current.style.transform = `translate3d(${exitX}, 0, 0) rotate(${exitRotation})`;
      }
      if (nextCardRef.current) {
        nextCardRef.current.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        nextCardRef.current.style.transform = 'scale(1)';
        nextCardRef.current.style.opacity = '1';
      }
    }

    dragRef.current = null;
    setDragState(null);

    if (willSwipe) {
      const direction = deltaX > 0 ? "right" : "left";
      swipeFromDrag.current = true;
      handleSwipe(direction);
    }
  }, [handleSwipe]);

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
    if (dragRef.current?.isDragging) {
      handleDragEnd();
    }
  }, [handleDragEnd]);

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

  // Calculate drag transform (fallback for initial render)
  const getDragTransform = () => {
    return {};
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
      return profile.photos[index].file_path;
    }
    return `https://ui-avatars.com/api/?name=${profile.firstname}+${profile.lastname}&size=400&background=1271FF&color=fff`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-page">
        <div className="text-center">
          <div className="w-12 h-12 border-[3px] border-[#1271FF]/20 border-t-[#1271FF] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-primary">Chargement des profils...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-page">
        <div className="text-center p-8">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={loadProfiles}
            className="bg-accent-solid text-accent-solid-text px-6 py-3 rounded-full font-medium hover:opacity-90 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="h-full flex items-center justify-center bg-page">
        <div className="text-center p-8 max-w-md">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-primary mb-3">
            Accès bloqué
          </h2>
          <p className="text-muted mb-6">
            Vous avez été retiré de cet événement par l'organisateur.
          </p>
          <Link
            href={`/events/${eventId}/environment/messages`}
            className="inline-block bg-accent-solid text-accent-solid-text px-6 py-3 rounded-full font-medium hover:opacity-90 transition-colors"
          >
            Voir mes conversations
          </Link>
        </div>
      </div>
    );
  }

  if (isEventExpired) {
    return (
      <div className="h-full flex items-center justify-center bg-page">
        <div className="text-center p-8 max-w-md">
          <div className="w-20 h-20 bg-orange-100 dark:bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-orange-500" />
          </div>
          <h2 className="text-xl font-semibold text-primary mb-3">
            Événement terminé
          </h2>
          <p className="text-muted mb-6">
            La période de disponibilité de cet événement est terminée. Vous ne pouvez plus découvrir de nouveaux profils.
          </p>
          <Link
            href={`/events/${eventId}/environment/messages`}
            className="inline-block bg-accent-solid text-accent-solid-text px-6 py-3 rounded-full font-medium hover:opacity-90 transition-colors"
          >
            Voir mes conversations
          </Link>
        </div>
      </div>
    );
  }

  const isFinished = currentIndex >= profiles.length;

  return (
    <div className="h-full flex flex-col bg-page pt-3">
      {/* New User Notification */}
      {newUserNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-[#1271FF] text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <div className="w-10 h-10 bg-hover rounded-full flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium">{newUserNotification.user.firstname} a rejoint !</p>
              <p className="text-sm text-secondary">Nouveau profil disponible</p>
            </div>
            <button onClick={() => setNewUserNotification(null)} className="ml-2 text-muted hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Card Container */}
      <div className="flex-1 px-6 pt-1 min-h-0 md:flex-none">
        <div className="h-[100%] max-w-lg md:max-w-5xl md:h-[75vh] mx-auto relative">
          {!isFinished && currentProfile ? (
            <>
              {/* Next Card (behind) */}
              {(() => {
                const nextIndex = currentIndex + 1;
                const nextProfile = profiles[nextIndex];
                if (!nextProfile) return null;

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
                    ref={nextCardRef}
                    className="absolute inset-0 rounded-2xl overflow-hidden md:flex md:gap-0 md:bg-card md:rounded-2xl md:shadow-xl"
                    style={{
                      transform: `scale(${scale})`,
                      opacity,
                      transition: dragRef.current?.isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {/* Photo side */}
                    <div className="w-full h-full md:flex-1 relative">
                      <div className="w-full h-full bg-card rounded-2xl md:rounded-none shadow-lg md:shadow-none overflow-hidden">
                        <div
                          className="w-full h-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${getProfileImage(nextProfile)})` }}
                        >
                          <div className="absolute inset-0 bg-black/10" />
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
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-5 py-5 pb-4 md:hidden">
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
                    {/* Description side (desktop) */}
                    <div className="hidden md:flex md:flex-1 flex-col h-full relative">
                      <div className="p-6 flex-1 overflow-y-auto select-none">
                        <h2 className="text-5xl font-bold text-primary mb-1">
                          {nextProfile.firstname}
                          {getAge(nextProfile) && (
                            <span className="font-normal text-muted">, {getAge(nextProfile)}</span>
                          )}
                        </h2>

                        {nextProfile.profil_info && Object.keys(nextProfile.profil_info).length > 0 ? (
                          <div className="mt-6 space-y-3">
                            {Object.entries(nextProfile.profil_info).map(([key, value]) => {
                              if (!value || (Array.isArray(value) && value.length === 0)) return null;

                              if (Array.isArray(value)) {
                                return (
                                  <div key={key} className="bg-badge p-3 rounded-xl">
                                    <p className="text-sm font-semibold text-primary mb-2">{formatFieldLabel(key)}</p>
                                    <div className="flex flex-wrap gap-2">
                                      {value.map((item, idx) => (
                                        <span
                                          key={idx}
                                          className="px-3 py-1.5 bg-card text-primary rounded-full text-sm border border-border"
                                        >
                                          {String(item)}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div key={key} className="bg-badge p-3 rounded-xl overflow-hidden">
                                  <p className="text-sm font-semibold text-primary mb-1">{formatFieldLabel(key)}</p>
                                  <p className="text-secondary whitespace-pre-wrap break-words hyphens-auto">{String(value)}</p>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="mt-6 text-center py-8">
                            <p className="text-muted">Aucune information de profil</p>
                          </div>
                        )}
                      </div>
                      {/* Report button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openReportModal();
                        }}
                        className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-badge flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors z-20"
                        title="Signaler"
                      >
                        <Flag className="w-5 h-5 text-muted hover:text-red-500 transition-colors" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Current Card */}
              {!exitingCard && (
                <div
                  ref={cardRef}
                  className="absolute inset-1 md:inset-0 cursor-grab active:cursor-grabbing rounded-2xl overflow-hidden md:flex md:gap-0 md:bg-card md:rounded-2xl md:shadow-xl"
                  style={{
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseLeave}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  {/* Photo side */}
                  <div className="w-full h-full md:flex-1 md:h-full relative">
                    <div className="w-full h-full bg-card rounded-2xl md:rounded-none shadow-xl md:shadow-none overflow-hidden">
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${getProfileImage(currentProfile, currentImageIndex)})` }}
                      >
                        <div className="absolute inset-0 bg-black/10" />

                        {actionFeedback && (
                          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                            <div className={`animate-feedback-pop ${actionFeedback === "like" ? "text-emerald-400" : "text-red-400"}`}>
                              {actionFeedback === "like" ? (
                                <Heart className="w-28 h-28 fill-current drop-shadow-lg" />
                              ) : (
                                <X className="w-28 h-28 drop-shadow-lg" strokeWidth={3} />
                              )}
                            </div>
                          </div>
                        )}


                        {currentProfile.photos && currentProfile.photos.length > 1 && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!dragState?.isDragging) handlePreviousImage();
                              }}
                              className="absolute left-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer pointer-events-auto"
                              aria-label="Image precedente"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!dragState?.isDragging) handleNextImage();
                              }}
                              className="absolute right-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer pointer-events-auto"
                              aria-label="Image suivante"
                            />
                          </>
                        )}

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

                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-5 py-5 pb-4 md:hidden">
                          <div className="flex items-center justify-between">

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

                  {/* Description side (desktop) */}
                  <div className="hidden md:flex md:flex-1 flex-col h-full relative">
                    <div className="p-6 flex-1 overflow-y-auto select-none">
                      <h2 className="text-5xl font-bold text-primary mb-1">
                        {currentProfile.firstname}
                        {getAge(currentProfile) && (
                          <span className="font-normal text-muted">, {getAge(currentProfile)}</span>
                        )}
                      </h2>

                      {currentProfile.profil_info && Object.keys(currentProfile.profil_info).length > 0 ? (
                        <div className="mt-6 space-y-3">
                          {Object.entries(currentProfile.profil_info).map(([key, value]) => {
                            if (!value || (Array.isArray(value) && value.length === 0)) return null;

                            if (Array.isArray(value)) {
                              return (
                                <div key={key} className="bg-badge p-3 rounded-xl">
                                  <p className="text-sm font-semibold text-primary mb-2">{formatFieldLabel(key)}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {value.map((item, idx) => (
                                      <span
                                        key={idx}
                                        className="px-3 py-1.5 bg-card text-primary rounded-full text-sm border border-border"
                                      >
                                        {String(item)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div key={key} className="bg-badge p-3 rounded-xl overflow-hidden">
                                <p className="text-sm font-semibold text-primary mb-1">{formatFieldLabel(key)}</p>
                                <p className="text-secondary whitespace-pre-wrap break-words hyphens-auto">{String(value)}</p>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-6 text-center py-8">
                          <p className="text-muted">Aucune information de profil</p>
                        </div>
                      )}
                    </div>
                    {/* Report button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openReportModal();
                      }}
                      className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-badge flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors z-20"
                      title="Signaler"
                    >
                      <Flag className="w-5 h-5 text-muted hover:text-red-500 transition-colors" />
                    </button>
                  </div>
                </div>
              )}

              {/* Exiting Card (animating out) */}
              {exitingCard && exitingCard.index < profiles.length && (
                <div
                  className="absolute inset-0 z-10 rounded-2xl overflow-hidden md:flex md:gap-0 md:bg-card md:rounded-2xl md:shadow-xl"
                  style={{
                    transform: exitingCard.direction === "left"
                      ? "translate3d(-120%, 0, 0) rotate(-20deg)"
                      : "translate3d(120%, 0, 0) rotate(20deg)",
                    transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  {/* Photo side */}
                  <div className="w-full h-full md:flex-1 md:h-full relative">
                    <div className="w-full h-full bg-card rounded-2xl md:rounded-none shadow-xl md:shadow-none overflow-hidden">
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${getProfileImage(profiles[exitingCard.index], currentImageIndex)})` }}
                      >
                        <div className="absolute inset-0 bg-black/10" />

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

                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-5 py-5 pb-4 md:hidden">
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
                  {/* Description side (desktop) */}
                  <div className="hidden md:flex md:flex-1 flex-col h-full">
                    <div className="p-6 flex-1 overflow-y-auto select-none">
                      <h2 className="text-5xl font-bold text-primary mb-1">
                        {profiles[exitingCard.index].firstname}
                        {getAge(profiles[exitingCard.index]) && (
                          <span className="font-normal text-muted">, {getAge(profiles[exitingCard.index])}</span>
                        )}
                      </h2>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              {loadingMore ? (
                <>
                  <div className="w-12 h-12 border-[3px] border-[#1271FF]/20 border-t-[#1271FF] rounded-full animate-spin mb-4"></div>
                  <p className="text-primary">Chargement de nouveaux profils...</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center mb-4 shadow-md">
                    <Heart className="w-10 h-10 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-primary mb-2">
                    Plus de profils disponibles
                  </h2>
                  <p className="text-muted mb-6">Revenez plus tard !</p>
                  <Link
                    href={`/events/${eventId}`}
                    className="bg-accent-solid text-accent-solid-text px-6 py-3 rounded-full font-medium hover:opacity-90 transition-colors"
                  >
                    Retour à l'événement
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {!isFinished && currentProfile && (
        <div className="flex-shrink-0 flex items-center justify-center gap-8 py-2 md:mt-10">
          <button
            onClick={() => handleSwipe("left")}
            disabled={swiping}
            className="w-[72px] h-[72px] md:w-[80px] md:h-[80px] inline-flex items-center justify-center rounded-full bg-gray-200 border border-transparent text-red-500 hover:bg-red-300 focus:outline-hidden focus:bg-red-300 disabled:opacity-50 disabled:pointer-events-none dark:text-red-500 dark:bg-red-800/30 dark:hover:bg-red-500/20 dark:focus:bg-red-500/20 cursor-pointer hover:scale-105 transition-transform duration-200"
          >
            <X className="w-8 h-8 md:w-9 md:h-9" />
          </button>

          <button
            onClick={() => handleSwipe("right")}
            disabled={swiping}
            className="w-[72px] h-[72px] md:w-[80px] md:h-[80px] inline-flex items-center justify-center rounded-full bg-gray-200 border border-transparent text-emerald-500 hover:bg-emerald-300 focus:outline-hidden focus:bg-emerald-300 disabled:opacity-50 disabled:pointer-events-none dark:text-emerald-500 dark:bg-emerald-800/30 dark:hover:bg-emerald-500/20 dark:focus:bg-emerald-500/20 cursor-pointer hover:scale-105 transition-transform duration-200"
          >
            <Heart className="w-8 h-8 md:w-9 md:h-9" fill="currentColor" />
          </button>
        </div>
      )}

      {/* Match Modal */}
      {showMatch && matchedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm overflow-hidden">
          {/* Blue thread animation - behind content */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginTop: "-20px" }}>
            <PathDrawing />
          </div>

          <div className="text-center px-6 max-w-sm w-full relative z-10">
            <div className="w-32 h-32 rounded-full overflow-hidden border-[3px] border-white mx-auto mb-6 shadow-2xl">
              <img
                src={getProfileImage(matchedUser)}
                alt={matchedUser.firstname}
                className="w-full h-full object-cover"
              />
            </div>

            <h2 className="text-white text-3xl font-bold mb-1">It's a Match !</h2>
            <p className="text-white/60 text-sm mb-8">
              Vous et {matchedUser.firstname} vous êtes likés mutuellement
            </p>

            <div className="space-y-3">
              <Link
                href={`/events/${eventId}/environment/messages?match=${matchId}`}
                className="block w-full bg-[#1271FF] text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-[#0d5dd8] transition-colors relative z-10"
              >
                Envoyer un message
              </Link>

              <button
                onClick={closeMatch}
                className="block w-full text-white/50 text-sm hover:text-white transition-colors py-2"
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
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowProfileModal(false)}
          />
          <div className="relative bg-card w-full max-w-lg rounded-t-2xl max-h-[80vh] overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-2xl font-bold text-primary">
                {currentProfile.firstname}
                {getAge(currentProfile) && (
                  <span className="font-normal">, {getAge(currentProfile)}</span>
                )}
              </h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="w-8 h-8 flex items-center justify-center text-primary hover:bg-hover rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(80vh-160px)] px-5 py-4">
              {/* Custom fields from profil_info (defined by organizer) */}
              {currentProfile.profil_info && Object.keys(currentProfile.profil_info).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-primary mb-3">Informations</h3>
                  <div className="space-y-2">
                    {Object.entries(currentProfile.profil_info).map(([key, value]) => {
                      // Skip if value is empty, null, or an empty array
                      if (!value || (Array.isArray(value) && value.length === 0)) return null;

                      // Handle arrays (like interests)
                      if (Array.isArray(value)) {
                        return (
                          <div key={key} className="bg-badge p-3 rounded-xl border border-border">
                            <p className="text-sm font-semibold text-primary mb-2">{formatFieldLabel(key)}</p>
                            <div className="flex flex-wrap gap-2">
                              {value.map((item, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1.5 bg-card text-primary rounded-full text-sm border border-border"
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
                        <div key={key} className="bg-badge p-3 rounded-xl border border-border overflow-hidden">
                          <p className="text-sm font-semibold text-primary mb-1">{formatFieldLabel(key)}</p>
                          <p className="text-secondary whitespace-pre-wrap break-words hyphens-auto">{String(value)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Show message if no profile info */}
              {(!currentProfile.profil_info || Object.keys(currentProfile.profil_info).length === 0) && (
                <div className="text-center py-8">
                  <p className="text-muted">Aucune information de profil</p>
                </div>
              )}

              <div className="h-16" />
            </div>

            {/* Footer with action buttons */}
            <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-border px-5 py-4">
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    setTimeout(() => handleSwipe("left"), 300);
                  }}
                  className="w-[70px] h-[70px] bg-card rounded-full shadow-lg flex items-center justify-center border-[2.5px] border-red-500 hover:scale-105 transition-transform"
                >
                  <X className="w-8 h-8 text-red-500" />
                </button>

                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    setTimeout(() => handleSwipe("right"), 300);
                  }}
                  className="w-[70px] h-[70px] bg-card rounded-full shadow-lg flex items-center justify-center border-[2.5px] border-emerald-500 hover:scale-105 transition-transform"
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
            className="absolute inset-0 bg-black/40"
            onClick={() => !submittingReport && setShowReportModal(false)}
          />
          <div className="relative bg-modal rounded-2xl p-6 max-w-md mx-4 w-full">
            <h3 className="font-poppins font-semibold text-xl text-primary mb-2">
              Signaler {currentProfile.firstname}
            </h3>
            <p className="text-muted text-sm mb-6">
              {!reportType ? "Que souhaitez-vous signaler ?" : "Ajoutez des details si necessaire"}
            </p>

            {/* Step 1: Type selection */}
            {!reportType ? (
              <div className="space-y-3">
                <button
                  onClick={() => setReportType('photo')}
                  className="w-full p-4 text-left rounded-xl bg-badge hover:bg-hover transition-colors"
                >
                  <div className="font-medium text-primary">Photo inappropriee</div>
                  <div className="text-sm text-muted">Image choquante ou offensante</div>
                </button>
                <button
                  onClick={() => setReportType('profile')}
                  className="w-full p-4 text-left rounded-xl bg-badge hover:bg-hover transition-colors"
                >
                  <div className="font-medium text-primary">Profil offensant</div>
                  <div className="text-sm text-muted">Informations inappropriees</div>
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="w-full py-3 text-muted hover:text-primary transition-colors mt-2"
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
                  className="w-full px-4 py-3 rounded-xl bg-badge border border-border text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] resize-none h-32 break-words hyphens-auto"
                  style={{ wordBreak: 'break-word' }}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setReportType(null)}
                    disabled={submittingReport}
                    className="flex-1 py-3 rounded-xl bg-badge text-primary font-medium hover:bg-hover transition-colors disabled:opacity-50"
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleReportSubmit}
                    disabled={submittingReport}
                    className="flex-1 py-3 rounded-xl bg-[#1271FF] text-white font-medium hover:bg-[#1271FF]/80 transition-colors disabled:opacity-50"
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
        @keyframes feedback-pop {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          40% {
            transform: scale(1.15);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
        .animate-feedback-pop {
          animation: feedback-pop 0.45s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
