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
          <div className="w-12 h-12 border-[3px] border-[#1271FF]/20 border-t-[#1271FF] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted">Chargement des messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left Panel - Conversations List (Desktop) */}
      <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col bg-card md:rounded-t-2xl md:mt-4 md:mr-4 md:shadow-sm overflow-hidden ${selectedMatchId ? "hidden md:flex" : "flex"}`}>
        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {error ? (
            <div className="p-6 text-center">
              <p className="text-red-500 mb-3 text-sm">{error}</p>
              <button
                onClick={loadConversations}
                className="text-[#1271FF] hover:underline text-sm font-medium"
              >
                Réessayer
              </button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 bg-badge rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-muted" />
              </div>
              <h3 className="text-primary font-semibold mb-1">Pas encore de matchs</h3>
              <p className="text-muted text-sm">
                Commencez à swiper pour matcher avec d'autres participants !
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
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
                  className={`w-full px-5 py-7 flex items-center gap-3 hover:bg-hover transition-colors text-left ${
                    selectedMatchId === conv.match_id ? "bg-[#1271FF]/5 border-l-2 border-[#1271FF] !border-b-0" : ""
                  } ${conv.is_blocked || conv.is_other_user_blocked ? "opacity-50" : ""}`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={getProfileImage(conv.user.photos, conv.user.firstname, conv.user.lastname)}
                      alt={conv.user.firstname}
                      className="w-15 h-15 rounded-full object-cover"
                    />
                    {conv.unread_count > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#1271FF] rounded-full border-2 border-card flex items-center justify-center text-[10px] text-white font-bold">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-semibold text-primary text-md ${conv.unread_count > 0 ? "text-primary" : ""}`}>
                        {conv.user.firstname} {conv.user.lastname?.charAt(0)}.
                      </h3>
                      {conv.last_message && (
                        <span className="text-xs text-muted">
                          {formatTime(conv.last_message.sent_at)}
                        </span>
                      )}
                    </div>
                    <p className={`text-md truncate mt-0.5 ${conv.unread_count > 0 ? "text-primary font-medium" : "text-muted"}`}>
                      {conv.last_message
                        ? conv.last_message.is_mine
                          ? `Vous: ${conv.last_message.content}`
                          : conv.last_message.content
                        : "Nouveau match ! Dites bonjour"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Conversation */}
      <div className={`flex-1 flex flex-col bg-card md:rounded-t-2xl md:mt-4 md:shadow-sm overflow-hidden ${!selectedMatchId ? "hidden md:flex" : "flex"}`}>
        {selectedMatchId && conversationData ? (
          <div className="h-full flex flex-col">
            {/* Conversation Header */}
            <div className="flex-shrink-0 bg-card border-b border-border px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedMatchId(null);
                    router.replace(`/events/${eventId}/environment/messages`, { scroll: false });
                  }}
                  className="md:hidden text-muted hover:text-primary p-1 -ml-1"
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
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div className="text-left">
                    <h2 className="font-semibold text-primary text-md">
                      {conversationData.match.user.firstname} {conversationData.match.user.lastname?.charAt(0)}.
                    </h2>
                    <p className="text-sm text-muted">
                      {conversationData.match.event_name}
                    </p>
                  </div>
                </button>
              </div>
              <button
                onClick={openReportModal}
                className="p-2 text-muted hover:text-secondary rounded-lg hover:bg-hover transition-colors"
                title="Signaler"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-page">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-[3px] border-[#1271FF]/20 border-t-[#1271FF] rounded-full animate-spin"></div>
                </div>
              ) : conversationData.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-14 h-14 bg-card rounded-full shadow-sm flex items-center justify-center mb-3">
                    <MessageCircle className="w-7 h-7 text-muted" />
                  </div>
                  <p className="text-primary font-medium">
                    Commencez la conversation !
                  </p>
                  <p className="text-muted text-sm mt-1">
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
                            <span className="px-3 py-1 bg-card rounded-full text-xs text-muted shadow-sm">
                              {formatDate(message.sent_at)}
                            </span>
                          </div>
                        )}
                        <div
                          className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                              isMine
                                ? "bg-[#1271FF] text-white rounded-br-md"
                                : "bg-received-msg text-primary shadow-sm rounded-bl-md"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words hyphens-auto text-md">{message.content}</p>
                            <p
                              className={`text-[15px] mt-1 ${
                                isMine ? "text-white/60" : "text-muted"
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
              <div className="px-4 py-2 bg-page">
                <div className="inline-flex items-center gap-1.5 bg-received-msg rounded-2xl px-4 py-3 shadow-sm">
                  <span className="typing-dot w-2 h-2 bg-muted rounded-full"></span>
                  <span className="typing-dot w-2 h-2 bg-muted rounded-full"></span>
                  <span className="typing-dot w-2 h-2 bg-muted rounded-full"></span>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="flex-shrink-0 bg-card border-t border-border p-4">
              {isArchived ? (
                <div className="bg-red-50 rounded-xl px-4 py-3 text-center">
                  <p className="text-red-500 text-sm">
                    Vous avez été retiré de cet événement par l'organisateur
                  </p>
                </div>
              ) : isOtherUserBlocked ? (
                <div className="bg-badge rounded-xl px-4 py-3 text-center">
                  <p className="text-muted text-sm">
                    Cet utilisateur a été retiré de l'événement
                  </p>
                </div>
              ) : isEventExpired ? (
                <div className="bg-orange-50 rounded-xl px-4 py-3 text-center">
                  <p className="text-orange-500 text-sm">
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
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    onKeyDown={(e) => {
                      const isMobile = window.matchMedia('(pointer: coarse)').matches;
                      if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    onBlur={() => sendTyping(false)}
                    placeholder="Ecrivez un message..."
                    maxLength={500}
                    rows={1}
                    className="flex-1 px-4 py-3 bg-page rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1271FF] text-primary placeholder-muted resize-none overflow-hidden text-md"
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="w-11 h-11 bg-[#303030] rounded-full flex items-center justify-center text-white hover:bg-[#404040] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <Send className="w-4.5 h-4.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty state (Desktop) */
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-badge rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-10 h-10 text-muted" />
              </div>
              <h2 className="text-primary font-medium mb-1">Sélectionnez une conversation</h2>
              <p className="text-muted text-sm">
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
            className="absolute inset-0 bg-black/40"
            onClick={() => !submittingReport && setShowReportModal(false)}
          />
          <div className="relative bg-modal rounded-2xl p-6 max-w-md mx-4 w-full">
            <h3 className="font-poppins font-semibold text-xl text-primary mb-2">
              Signaler {conversationData?.match.user.firstname}
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
                  onClick={() => setReportType('message')}
                  className="w-full p-4 text-left rounded-xl bg-badge hover:bg-hover transition-colors"
                >
                  <div className="font-medium text-primary">Message offensant</div>
                  <div className="text-sm text-muted">Contenu des messages problematique</div>
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
                  className="w-full px-4 py-3 rounded-xl bg-badge border border-border text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#1271FF] resize-none h-32"
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

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowProfileModal(false)}
          />
          <div className="relative bg-modal rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {loadingProfile ? (
              <div className="h-96 flex items-center justify-center">
                <div className="w-10 h-10 border-[3px] border-[#1271FF]/20 border-t-[#1271FF] rounded-full animate-spin"></div>
              </div>
            ) : profileData ? (
              <div className="flex flex-col">
                {/* Photo carousel */}
                <div className="relative aspect-[3/4] max-h-[50vh] bg-page">
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
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                            >
                              <ChevronLeft className="w-6 h-6" />
                            </button>
                          )}
                          {profilePhotoIndex < profileData.photos.length - 1 && (
                            <button
                              onClick={() => setProfilePhotoIndex(prev => prev + 1)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors"
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
                            <div key={key} className="bg-badge p-3 rounded-xl border border-border">
                              <p className="text-sm font-semibold text-primary mb-2">{formatLabel(key)}</p>
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
                          <div key={key} className="bg-badge p-3 rounded-xl overflow-hidden">
                            <p className="text-sm font-semibold text-primary mb-1">{formatLabel(key)}</p>
                            <p className="text-secondary whitespace-pre-wrap break-words hyphens-auto">{String(value)}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted text-center py-4">
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
