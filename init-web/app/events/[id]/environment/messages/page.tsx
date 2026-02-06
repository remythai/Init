"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { MessageCircle, Send, ArrowLeft, MoreVertical, X, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { authService } from "../../../../services/auth.service";
import { matchService, Conversation, Message, Photo, MatchUserProfile } from "../../../../services/match.service";
import { reportService, ReportType, ReportReason } from "../../../../services/report.service";

import { useRealTimeMessages } from "../../../../hooks/useRealTimeMessages";
import { SocketConversationUpdate } from "../../../../services/socket.service";
import { useUnreadMessagesContext } from "../../../../contexts/UnreadMessagesContext";

interface ConversationData {
  match: {
    id: number;
    event_id: number;
    event_name: string;
    user: {
      id: number;
      firstname: string;
      lastname: string;
      photos?: Photo[];
    };
  };
  messages: Message[];
}

export default function MessagesPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.id as string;
  const initialMatchId = searchParams.get("match");
  const { markConversationAsRead, setActiveConversation } = useUnreadMessagesContext();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(
    initialMatchId ? parseInt(initialMatchId) : null
  );
  const [conversationData, setConversationData] = useState<ConversationData | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [isEventExpired, setIsEventExpired] = useState(false);
  const [isOtherUserBlocked, setIsOtherUserBlocked] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState<MatchUserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profilePhotoIndex, setProfilePhotoIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = useRef<number | null>(null);

  // Handler for new real-time messages
  const handleNewMessage = useCallback((message: Message) => {
    setConversationData((prev) => {
      if (!prev) return prev;
      // Check if message already exists to avoid duplicates
      const exists = prev.messages.some((m) => m.id === message.id);
      if (exists) return prev;
      return {
        ...prev,
        messages: [...prev.messages, message],
      };
    });

    // Mark messages as read in the database (since we're viewing this conversation)
    if (selectedMatchId) {
      matchService.markConversationMessagesAsRead(selectedMatchId).catch(console.error);
    }
  }, [selectedMatchId]);

  // Handler for conversation updates (new messages in other conversations)
  const handleConversationUpdate = useCallback((data: SocketConversationUpdate) => {
    // If this is the currently selected conversation, mark as read in context
    if (selectedMatchId === data.match_id) {
      markConversationAsRead(data.match_id);
    }

    setConversations((prev) => {
      // Find and update the conversation
      const updatedConversations = prev.map((conv) => {
        if (conv.match_id === data.match_id) {
          return {
            ...conv,
            last_message: data.last_message,
            unread_count: selectedMatchId === data.match_id ? conv.unread_count : conv.unread_count + 1,
          };
        }
        return conv;
      });

      // Move the updated conversation to the top
      const targetIndex = updatedConversations.findIndex((c) => c.match_id === data.match_id);
      if (targetIndex > 0) {
        const [conversation] = updatedConversations.splice(targetIndex, 1);
        updatedConversations.unshift(conversation);
      }

      return updatedConversations;
    });
  }, [selectedMatchId, markConversationAsRead]);

  // Use real-time messages hook
  const { typingUsers, sendTyping } = useRealTimeMessages({
    matchId: selectedMatchId,
    onNewMessage: handleNewMessage,
    onConversationUpdate: handleConversationUpdate,
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

      // Get current user ID
      const profile = await authService.getCurrentProfile();
      if (profile && 'id' in profile) {
        currentUserId.current = profile.id as number;
      }

      loadConversations();
    };

    initPage();
  }, [eventId]);

  useEffect(() => {
    // Set active conversation in context (to prevent marking new messages as unread)
    setActiveConversation(selectedMatchId);

    if (selectedMatchId) {
      loadMessages(selectedMatchId);

      // Mark as read in context (for navigation badge)
      markConversationAsRead(selectedMatchId);

      // Reset unread count for the selected conversation
      setConversations((prev) =>
        prev.map((conv) =>
          conv.match_id === selectedMatchId
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    }

    // Cleanup: clear active conversation when unmounting or changing
    return () => {
      if (selectedMatchId) {
        setActiveConversation(null);
      }
    };
  }, [selectedMatchId, markConversationAsRead, setActiveConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [conversationData?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await matchService.getEventConversations(eventId);
      setConversations(data.conversations || []);

      // If we have an initial match ID, select it
      if (initialMatchId && !selectedMatchId) {
        const matchIdNum = parseInt(initialMatchId);
        setSelectedMatchId(matchIdNum);
        const selectedConv = (data.conversations || []).find((c: Conversation) => c.match_id === matchIdNum);
        setIsArchived(selectedConv?.is_blocked || false);
        setIsEventExpired(selectedConv?.is_event_expired || false);
        setIsOtherUserBlocked(selectedConv?.is_other_user_blocked || false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors du chargement";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (matchId: number) => {
    try {
      setLoadingMessages(true);
      const data = await matchService.getMessages(matchId);
      setConversationData(data);
    } catch (err: unknown) {
      console.error("Error loading messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedMatchId || sending || isArchived || isEventExpired || isOtherUserBlocked) return;

    setSending(true);
    try {
      const message = await matchService.sendMessage(selectedMatchId, newMessage.trim());

      // Add message to local state
      if (conversationData) {
        setConversationData({
          ...conversationData,
          messages: [...conversationData.messages, message],
        });
      }

      // Update conversation list: update last_message and move to top
      setConversations((prev) => {
        const updatedConversations = prev.map((conv) => {
          if (conv.match_id === selectedMatchId) {
            return {
              ...conv,
              last_message: {
                content: message.content,
                sent_at: message.sent_at,
                is_mine: true,
              },
            };
          }
          return conv;
        });

        // Move to top
        const targetIndex = updatedConversations.findIndex((c) => c.match_id === selectedMatchId);
        if (targetIndex > 0) {
          const [conversation] = updatedConversations.splice(targetIndex, 1);
          updatedConversations.unshift(conversation);
        }

        return updatedConversations;
      });

      setNewMessage("");
    } catch (err: unknown) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  const openReportModal = () => {
    setReportType(null);
    setReportDescription("");
    setShowReportModal(true);
  };

  const handleReportSubmit = async () => {
    if (!reportType || !conversationData) return;

    setSubmittingReport(true);
    try {
      await reportService.createReport(eventId, {
        reportedUserId: conversationData.match.user.id,
        matchId: reportType === 'message' ? conversationData.match.id : undefined,
        reportType,
        reason: reportType === 'message' ? 'harassment' : 'inappropriate',
        description: reportDescription || undefined,
      });
      setShowReportModal(false);
      alert("Signalement envoye. L'organisateur va l'examiner.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors du signalement";
      alert(message);
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleOpenProfile = async () => {
    if (!selectedMatchId || isArchived || isOtherUserBlocked) return;

    setLoadingProfile(true);
    setShowProfileModal(true);
    setProfilePhotoIndex(0);

    try {
      const profile = await matchService.getMatchProfile(selectedMatchId);
      setProfileData(profile);

      // Preload all profile photos
      if (profile.photos && profile.photos.length > 0) {
        profile.photos.forEach((photo) => {
          if (photo.file_path) {
            const img = new window.Image();
            img.src = photo.file_path;
          }
        });
      }
    } catch (err: unknown) {
      console.error("Error loading profile:", err);
      setShowProfileModal(false);
    } finally {
      setLoadingProfile(false);
    }
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

  const getProfileImage = (photos?: Photo[], firstname?: string, lastname?: string): string => {
    if (photos && photos.length > 0 && photos[0].file_path) {
      return photos[0].file_path;
    }
    return `https://ui-avatars.com/api/?name=${firstname || "U"}+${lastname || ""}&size=200&background=1271FF&color=fff`;
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Hier";
    }
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const isMyMessage = (message: Message): boolean => {
    return message.sender_id === currentUserId.current;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1271FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Chargement des messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Left Panel - Conversations List (Desktop) */}
      <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col border-r border-white/10 ${selectedMatchId ? "hidden md:flex" : "flex"}`}>
        {/* Title */}
        <div className="flex-shrink-0 p-4">
          <h1 className="font-poppins text-2xl font-bold text-white">Messages</h1>
          <p className="text-white/60 text-sm mt-1">Vos conversations avec vos matchs</p>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {error ? (
            <div className="p-4 text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={loadConversations}
                className="text-[#1271FF] hover:underline"
              >
                Réessayer
              </button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-10 h-10 text-white/50" />
              </div>
              <h2 className="text-white font-semibold mb-2">Pas encore de matchs</h2>
              <p className="text-white/60 text-sm">
                Commencez à swiper pour matcher avec d'autres participants !
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {conversations.map((conv) => (
                <button
                  key={conv.match_id}
                  onClick={() => {
                    setSelectedMatchId(conv.match_id);
                    setIsArchived(conv.is_blocked || false);
                    setIsEventExpired(conv.is_event_expired || false);
                    setIsOtherUserBlocked(conv.is_other_user_blocked || false);
                    // Update URL to reflect selected conversation (for layout to hide nav on mobile)
                    router.replace(`/events/${eventId}/environment/messages?match=${conv.match_id}`, { scroll: false });
                  }}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left ${
                    selectedMatchId === conv.match_id ? "bg-white/10" : ""
                  } ${conv.is_blocked || conv.is_other_user_blocked ? "opacity-60" : ""}`}
                >
                  <div className="relative">
                    <img
                      src={getProfileImage(conv.user.photos, conv.user.firstname, conv.user.lastname)}
                      alt={conv.user.firstname}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                    {conv.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#1271FF] rounded-full border-2 border-[#303030] flex items-center justify-center text-xs text-white font-medium">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">
                        {conv.user.firstname} {conv.user.lastname?.charAt(0)}.
                      </h3>
                      {conv.last_message && (
                        <span className="text-xs text-white/50">
                          {formatTime(conv.last_message.sent_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/60 truncate">
                      {conv.last_message
                        ? conv.last_message.is_mine
                          ? `Vous: ${conv.last_message.content}`
                          : conv.last_message.content
                        : "Nouveau match ! Dites bonjour 👋"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Conversation */}
      <div className={`flex-1 flex flex-col ${!selectedMatchId ? "hidden md:flex" : "flex"}`}>
        {selectedMatchId && conversationData ? (
          <div className="h-full flex flex-col bg-[#3a3a3a]">
            {/* Conversation Header */}
            <div className="flex-shrink-0 bg-[#252525] border-b border-white/10 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedMatchId(null);
                    // Clear URL param when going back to list
                    router.replace(`/events/${eventId}/environment/messages`, { scroll: false });
                  }}
                  className="md:hidden text-white/60 hover:text-white p-1"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleOpenProfile}
                  disabled={isArchived || isOtherUserBlocked}
                  className={`flex items-center gap-3 ${!isArchived && !isOtherUserBlocked ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'} transition-opacity`}
                >
                  <img
                    src={getProfileImage(
                      conversationData.match.user.photos,
                      conversationData.match.user.firstname,
                      conversationData.match.user.lastname
                    )}
                    alt={conversationData.match.user.firstname}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="text-left">
                    <h2 className="font-semibold text-white">
                      {conversationData.match.user.firstname} {conversationData.match.user.lastname?.charAt(0)}.
                    </h2>
                    <p className="text-xs text-white/50">
                      {conversationData.match.event_name}
                    </p>
                  </div>
                </button>
              </div>
              <button
                onClick={openReportModal}
                className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/10"
                title="Signaler"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-3 border-[#1271FF] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : conversationData.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-white/40" />
                  </div>
                  <p className="text-white">
                    Commencez la conversation !
                  </p>
                  <p className="text-white/50 text-sm mt-1">
                    Envoyez un premier message à {conversationData.match.user.firstname}
                  </p>
                </div>
              ) : (
                <>
                  {conversationData.messages.map((message, index) => {
                    const isMine = isMyMessage(message);
                    const showDate =
                      index === 0 ||
                      formatDate(message.sent_at) !==
                        formatDate(conversationData.messages[index - 1].sent_at);

                    return (
                      <div key={message.id}>
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/60">
                              {formatDate(message.sent_at)}
                            </span>
                          </div>
                        )}
                        <div
                          className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                              isMine
                                ? "bg-[#1271FF] text-white rounded-br-md"
                                : "bg-[#252525] text-white rounded-bl-md"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words hyphens-auto">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                isMine ? "text-white/70" : "text-white/40"
                              }`}
                            >
                              {formatTime(message.sent_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="px-4 py-2">
                <div className="inline-flex items-center gap-1.5 bg-[#252525] rounded-2xl px-4 py-3">
                  <span className="typing-dot w-2 h-2 bg-white/50 rounded-full"></span>
                  <span className="typing-dot w-2 h-2 bg-white/50 rounded-full"></span>
                  <span className="typing-dot w-2 h-2 bg-white/50 rounded-full"></span>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="flex-shrink-0 bg-[#252525] border-t border-white/10 p-4">
              {isArchived ? (
                <div className="bg-red-500/20 rounded-xl px-4 py-3 text-center">
                  <p className="text-red-400 text-sm">
                    Vous avez été retiré de cet événement par l'organisateur
                  </p>
                </div>
              ) : isOtherUserBlocked ? (
                <div className="bg-white/10 rounded-xl px-4 py-3 text-center">
                  <p className="text-white/60 text-sm">
                    Cet utilisateur a été retiré de l'événement
                  </p>
                </div>
              ) : isEventExpired ? (
                <div className="bg-orange-500/20 rounded-xl px-4 py-3 text-center">
                  <p className="text-orange-400 text-sm">
                    La période de disponibilité de cet événement est terminée
                  </p>
                </div>
              ) : (
                <div className="flex gap-3 items-end">
                  <textarea
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      sendTyping(e.target.value.length > 0);
                      // Auto-resize
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    onKeyDown={(e) => {
                      // On desktop (non-touch), Enter sends and Shift+Enter creates new line
                      const isMobile = window.matchMedia('(pointer: coarse)').matches;
                      if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    onBlur={() => sendTyping(false)}
                    placeholder="Écrivez un message..."
                    maxLength={500}
                    rows={1}
                    className="flex-1 px-4 py-3 bg-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1271FF] text-white placeholder-white/40 resize-none overflow-hidden"
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="w-12 h-12 bg-[#1271FF] rounded-full flex items-center justify-center text-white hover:bg-[#0d5dd8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Empty state (Desktop)
          <div className="h-full flex items-center justify-center bg-[#252525]">
            <div className="text-center">
              <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-12 h-12 text-white/30" />
              </div>
              <h2 className="text-white/60 font-medium mb-1">Sélectionnez une conversation</h2>
              <p className="text-white/40 text-sm">
                Choisissez un match pour commencer à discuter
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !submittingReport && setShowReportModal(false)}
          />
          <div className="relative bg-[#303030] rounded-2xl p-6 max-w-md mx-4 w-full">
            <h3 className="font-poppins font-semibold text-xl text-white mb-2">
              Signaler {conversationData?.match.user.firstname}
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
                  onClick={() => setReportType('message')}
                  className="w-full p-4 text-left rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <div className="font-medium text-white">Message offensant</div>
                  <div className="text-sm text-white/60">Contenu des messages problematique</div>
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

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowProfileModal(false)}
          />
          <div className="relative bg-[#303030] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {loadingProfile ? (
              <div className="h-96 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#1271FF] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : profileData ? (
              <div className="flex flex-col">
                {/* Photo carousel */}
                <div className="relative aspect-[3/4] max-h-[50vh] bg-[#252525]">
                  {profileData.photos && profileData.photos.length > 0 ? (
                    <>
                      <img
                        src={getProfileImage([profileData.photos[profilePhotoIndex]], profileData.firstname, profileData.lastname)}
                        alt={profileData.firstname}
                        className="w-full h-full object-cover"
                      />
                      {/* Photo indicators */}
                      {profileData.photos.length > 1 && (
                        <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 px-4">
                          {profileData.photos.map((_, idx) => (
                            <div
                              key={idx}
                              className={`h-1 flex-1 rounded-full ${idx === profilePhotoIndex ? 'bg-white' : 'bg-white/40'}`}
                            />
                          ))}
                        </div>
                      )}
                      {/* Navigation buttons */}
                      {profileData.photos.length > 1 && (
                        <>
                          {profilePhotoIndex > 0 && (
                            <button
                              onClick={() => setProfilePhotoIndex(prev => prev - 1)}
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                            >
                              <ChevronLeft className="w-6 h-6" />
                            </button>
                          )}
                          {profilePhotoIndex < profileData.photos.length - 1 && (
                            <button
                              onClick={() => setProfilePhotoIndex(prev => prev + 1)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                            >
                              <ChevronRight className="w-6 h-6" />
                            </button>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={getProfileImage(undefined, profileData.firstname, profileData.lastname)}
                        alt={profileData.firstname}
                        className="w-32 h-32 rounded-full"
                      />
                    </div>
                  )}
                  {/* Name overlay at bottom of photo */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <h2 className="text-white text-2xl font-bold">
                      {profileData.firstname} {profileData.lastname?.charAt(0)}.
                      {calculateAge(profileData.birthday) && (
                        <span className="font-normal">, {calculateAge(profileData.birthday)}</span>
                      )}
                    </h2>
                  </div>
                </div>

                {/* Profile info */}
                <div className="p-4">
                  {profileData.profil_info && Object.keys(profileData.profil_info).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(profileData.profil_info).map(([key, value]) => {
                        // Skip if value is empty, null, or an empty array
                        if (!value || (Array.isArray(value) && value.length === 0)) return null;

                        // Format field label (convert snake_case to readable)
                        const formatLabel = (fieldId: string): string => {
                          return fieldId
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (c) => c.toUpperCase());
                        };

                        // Handle arrays (like interests)
                        if (Array.isArray(value)) {
                          return (
                            <div key={key} className="bg-white/10 p-3 rounded-xl border border-white/10">
                              <p className="text-sm font-semibold text-white mb-2">{formatLabel(key)}</p>
                              <div className="flex flex-wrap gap-2">
                                {value.map((item, idx) => (
                                  <span
                                    key={idx}
                                    className="px-3 py-1.5 bg-[#1271FF]/20 text-[#1271FF] rounded-full text-sm font-medium"
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
                          <div key={key} className="bg-white/10 p-3 rounded-xl border border-white/10 overflow-hidden">
                            <p className="text-sm font-semibold text-white mb-1">{formatLabel(key)}</p>
                            <p className="text-white/70 whitespace-pre-wrap break-words hyphens-auto">{String(value)}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-white/50 text-center py-4">
                      Aucune information de profil disponible
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
