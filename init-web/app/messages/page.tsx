"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle, Send, ArrowLeft, MoreVertical, ChevronDown, ChevronUp, User, ChevronLeft, ChevronRight, X } from "lucide-react";
import { authService } from "../services/auth.service";
import { matchService, Conversation, Message, Photo, MatchUserProfile } from "../services/match.service";
import BottomNavigation from "../components/BottomNavigation";
import DesktopNav from "../components/DesktopNav";
import ThemeToggle from "../components/ThemeToggle";

import { useRealTimeMessages } from "../hooks/useRealTimeMessages";
import { SocketConversationUpdate } from "../services/socket.service";
import { useUnreadMessagesContext } from "../contexts/UnreadMessagesContext";

interface EventConversations {
  event: {
    id: number;
    name: string;
  };
  conversations: Conversation[];
}

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

function GeneralMessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMatchId = searchParams.get("match");
  const { markConversationAsRead, setActiveConversation } = useUnreadMessagesContext();

  const [eventConversations, setEventConversations] = useState<EventConversations[]>([]);
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
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());
  const [isArchived, setIsArchived] = useState(false);
  const [isEventExpired, setIsEventExpired] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState<MatchUserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profilePhotoIndex, setProfilePhotoIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentUserId = useRef<number | null>(null);

  const handleNewMessage = useCallback((message: Message) => {
    setConversationData((prev) => {
      if (!prev) return prev;
      const exists = prev.messages.some((m) => m.id === message.id);
      if (exists) return prev;
      return { ...prev, messages: [...prev.messages, message] };
    });
    if (selectedMatchId) {
      matchService.markConversationMessagesAsRead(selectedMatchId).catch(console.error);
    }
  }, [selectedMatchId]);

  const handleConversationUpdate = useCallback((data: SocketConversationUpdate) => {
    if (selectedMatchId === data.match_id) {
      markConversationAsRead(data.match_id);
    }
    setEventConversations((prev) => {
      let eventIndexWithUpdate = -1;
      const updated = prev.map((eventGroup, eventIndex) => {
        const updatedConversations = eventGroup.conversations.map((conv) => {
          if (conv.match_id === data.match_id) {
            eventIndexWithUpdate = eventIndex;
            return {
              ...conv,
              last_message: data.last_message,
              unread_count: selectedMatchId === data.match_id ? conv.unread_count : conv.unread_count + 1,
            };
          }
          return conv;
        });
        const targetIndex = updatedConversations.findIndex((c) => c.match_id === data.match_id);
        if (targetIndex > 0) {
          const [conversation] = updatedConversations.splice(targetIndex, 1);
          updatedConversations.unshift(conversation);
        }
        return { ...eventGroup, conversations: updatedConversations };
      });
      if (eventIndexWithUpdate > 0) {
        const [eventGroup] = updated.splice(eventIndexWithUpdate, 1);
        updated.unshift(eventGroup);
      }
      return updated;
    });
  }, [selectedMatchId, markConversationAsRead]);

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
      if (validatedType !== "user") {
        router.push("/events");
        return;
      }
      const profile = await authService.getCurrentProfile();
      if (profile && 'id' in profile) {
        currentUserId.current = profile.id as number;
      }
      loadConversations();
    };
    initPage();
  }, []);

  useEffect(() => {
    setActiveConversation(selectedMatchId);
    if (selectedMatchId) {
      loadMessages(selectedMatchId);
      markConversationAsRead(selectedMatchId);
      setEventConversations((prev) =>
        prev.map((eventGroup) => ({
          ...eventGroup,
          conversations: eventGroup.conversations.map((conv) =>
            conv.match_id === selectedMatchId ? { ...conv, unread_count: 0 } : conv
          ),
        }))
      );
    }
    return () => { if (selectedMatchId) setActiveConversation(null); };
  }, [selectedMatchId, markConversationAsRead, setActiveConversation]);

  useEffect(() => { scrollToBottom(); }, [conversationData?.messages]);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await matchService.getAllConversations();
      setEventConversations(data || []);
      const allEventIds = new Set(data.map((e: EventConversations) => e.event.id));
      setExpandedEvents(allEventIds);
      if (initialMatchId && !selectedMatchId) {
        const matchIdNum = parseInt(initialMatchId);
        setSelectedMatchId(matchIdNum);
        const allConvs = data.flatMap((e: EventConversations) => e.conversations);
        const selectedConv = allConvs.find((c: Conversation) => c.match_id === matchIdNum);
        setIsArchived(selectedConv?.is_archived || false);
        setIsEventExpired(selectedConv?.is_event_expired || false);
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
    if (!newMessage.trim() || !selectedMatchId || sending || isArchived || isEventExpired) return;
    setSending(true);
    try {
      const message = await matchService.sendMessage(selectedMatchId, newMessage.trim());
      if (conversationData) {
        setConversationData({ ...conversationData, messages: [...conversationData.messages, message] });
      }
      setEventConversations((prev) => {
        let eventIndexWithUpdate = -1;
        const updated = prev.map((eventGroup, eventIndex) => {
          const updatedConversations = eventGroup.conversations.map((conv) => {
            if (conv.match_id === selectedMatchId) {
              eventIndexWithUpdate = eventIndex;
              return { ...conv, last_message: { content: message.content, sent_at: message.sent_at, is_mine: true } };
            }
            return conv;
          });
          const targetIndex = updatedConversations.findIndex((c) => c.match_id === selectedMatchId);
          if (targetIndex > 0) {
            const [conversation] = updatedConversations.splice(targetIndex, 1);
            updatedConversations.unshift(conversation);
          }
          return { ...eventGroup, conversations: updatedConversations };
        });
        if (eventIndexWithUpdate > 0) {
          const [eventGroup] = updated.splice(eventIndexWithUpdate, 1);
          updated.unshift(eventGroup);
        }
        return updated;
      });
      setNewMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (err: unknown) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleReport = (reason: string) => {
    setShowReportModal(false);
    alert("Signalement envoye. Notre equipe va l'examiner.");
  };

  const handleOpenProfile = async () => {
    if (!selectedMatchId || isArchived) return;
    setLoadingProfile(true);
    setShowProfileModal(true);
    setProfilePhotoIndex(0);
    try {
      const profile = await matchService.getMatchProfile(selectedMatchId);
      setProfileData(profile);
      if (profile.photos && profile.photos.length > 0) {
        profile.photos.forEach((photo) => {
          if (photo.file_path) { const img = new window.Image(); img.src = photo.file_path; }
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
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const toggleEventExpanded = (eventId: number) => {
    setExpandedEvents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) newSet.delete(eventId); else newSet.add(eventId);
      return newSet;
    });
  };

  const getProfileImage = (photos?: Photo[], firstname?: string, lastname?: string): string => {
    if (photos && photos.length > 0 && photos[0].file_path) return photos[0].file_path;
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
    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (date.toDateString() === yesterday.toDateString()) return "Hier";
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const isMyMessage = (message: Message): boolean => message.sender_id === currentUserId.current;

  const getTotalConversationsCount = (): number => {
    return eventConversations.reduce((total, eventGroup) => total + eventGroup.conversations.length, 0);
  };

  // ─── Header (shared across loading + main) ───
  const renderHeader = (hideOnMobile = false) => (
    <header className={`fixed top-0 left-0 right-0 z-50 ${hideOnMobile && selectedMatchId ? "hidden md:block" : ""}`}>
      <div className="absolute inset-0 bg-page pointer-events-none" />
      <div className="relative px-6 md:px-12 w-full py-4 md:py-6 flex items-center justify-between">
        <Link href="/">
          <Image src="/LogoPng.png" alt="Init Logo" width={200} height={80} className="h-7 md:h-9 w-auto dark:hidden" />
          <Image src="/logo.png" alt="Init Logo" width={200} height={80} className="h-7 md:h-9 w-auto hidden dark:block" />
        </Link>
        <DesktopNav />
        <div className="flex items-center gap-3 md:gap-4">
          <div className="md:hidden"><ThemeToggle /></div>
          <button
            onClick={async () => { await authService.logout(); router.push("/"); }}
            className="font-poppins text-sm text-secondary hover:text-primary transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );

  // ─── Loading state ───
  if (loading) {
    return (
      <div className="min-h-screen bg-page">
        {renderHeader()}
        <main className="pt-20 md:pt-24 flex items-center justify-center" style={{ minHeight: "calc(100vh - 80px)" }}>
          <div className="text-center">
            <div className="w-10 h-10 border-[3px] border-[#1271FF]/20 border-t-[#1271FF] rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-muted text-sm">Chargement des messages...</p>
          </div>
        </main>
        <BottomNavigation userType="user" />
      </div>
    );
  }

  // ─── Main content ───
  return (
    <div className="min-h-screen bg-page">
      {renderHeader(true)}

      <main className="md:pt-20 md:pb-0" style={{ height: "100vh" }}>
        <div className="h-full flex mx-auto px-0 md:px-6 lg:px-10">

          {/* ── Left Panel: Conversations List ── */}
          <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col bg-card md:rounded-t-2xl md:mt-4 md:mr-4 md:shadow-sm overflow-hidden ${selectedMatchId ? "hidden md:flex" : "flex"}`}>
            {/* Conversations list */}
            <div className="flex-1 overflow-y-auto py-17 md:py-0">
              {error ? (
                <div className="p-6 text-center">
                  <p className="text-red-500 mb-3 text-sm">{error}</p>
                  <button onClick={loadConversations} className="text-[#1271FF] hover:underline text-sm font-medium">
                    Reessayer
                  </button>
                </div>
              ) : getTotalConversationsCount() === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="w-16 h-16 bg-badge rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-muted" />
                  </div>
                  <h3 className="text-primary font-semibold mb-1">Pas encore de matchs</h3>
                  <p className="text-muted text-sm mb-4">
                    Inscrivez-vous a des evenements et commencez a swiper !
                  </p>
                  <Link
                    href="/events"
                    className="bg-accent-solid hover:bg-accent-solid/80 text-white px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
                  >
                    Voir les evenements
                  </Link>
                </div>
              ) : (
                <div>
                  {eventConversations.map((eventGroup) => (
                    <div key={eventGroup.event.id}>
                      {/* Event section header */}
                      <button
                        onClick={() => toggleEventExpanded(eventGroup.event.id)}
                        className="w-full px-5 py-3 flex items-center justify-between bg-badge hover:bg-hover transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary text-sm">{eventGroup.event.name}</span>
                          <span className="text-xs text-secondary bg-border px-2 py-0.5 rounded-full">
                            {eventGroup.conversations.length}
                          </span>
                        </div>
                        {expandedEvents.has(eventGroup.event.id) ? (
                          <ChevronUp className="w-4 h-4 text-muted" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted" />
                        )}
                      </button>

                      {/* Conversations */}
                      {expandedEvents.has(eventGroup.event.id) && (
                        <div className="divide-y divide-border">
                          {eventGroup.conversations.map((conv) => (
                            <button
                              key={conv.match_id}
                              onClick={() => {
                                setSelectedMatchId(conv.match_id);
                                setIsArchived(conv.is_archived || false);
                                setIsEventExpired(conv.is_event_expired || false);
                              }}
                              className={`w-full px-5 py-7 flex items-center gap-3 hover:bg-hover transition-colors text-left ${
                                selectedMatchId === conv.match_id ? "bg-[#1271FF]/5 border-l-2 border-[#1271FF]" : ""
                              } ${conv.is_archived ? "opacity-50" : ""}`}
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
                                    <span className="text-xs text-muted">{formatTime(conv.last_message.sent_at)}</span>
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
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right Panel: Chat ── */}
          <div className={`flex-1 flex flex-col bg-card md:rounded-t-2xl md:mt-4 md:shadow-sm overflow-hidden ${!selectedMatchId ? "hidden md:flex" : "flex"}`}>
            {selectedMatchId && conversationData ? (
              <div className="h-full flex flex-col">
                {/* Conversation header */}
                <div className="flex-shrink-0 bg-card border-b border-border px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedMatchId(null)}
                      className="md:hidden text-muted hover:text-primary p-1 -ml-1"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleOpenProfile}
                      disabled={isArchived}
                      className={`flex items-center gap-3 ${!isArchived ? "hover:opacity-80 cursor-pointer" : "cursor-default"} transition-opacity`}
                    >
                      <img
                        src={getProfileImage(conversationData.match.user.photos, conversationData.match.user.firstname, conversationData.match.user.lastname)}
                        alt={conversationData.match.user.firstname}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                      <div className="text-left">
                        <h2 className="font-semibold text-primary text-md">
                          {conversationData.match.user.firstname} {conversationData.match.user.lastname?.charAt(0)}.
                        </h2>
                        <p className="text-sm text-muted">{conversationData.match.event_name}</p>
                      </div>
                    </button>
                  </div>
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="p-2 text-muted hover:text-secondary rounded-lg hover:bg-hover transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                {/* Messages area */}
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
                      <p className="text-primary font-medium">Commencez la conversation !</p>
                      <p className="text-muted text-sm mt-1">
                        Envoyez un premier message a {conversationData.match.user.firstname}
                      </p>
                    </div>
                  ) : (
                    <>
                      {conversationData.messages.map((message, index) => {
                        const isMine = isMyMessage(message);
                        const showDate =
                          index === 0 ||
                          formatDate(message.sent_at) !== formatDate(conversationData.messages[index - 1].sent_at);
                        return (
                          <div key={message.id}>
                            {showDate && (
                              <div className="flex justify-center my-4">
                                <span className="px-3 py-1 bg-card rounded-full text-xs text-muted shadow-sm">
                                  {formatDate(message.sent_at)}
                                </span>
                              </div>
                            )}
                            <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                              <div
                                className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                                  isMine
                                    ? "bg-[#1271FF] text-white rounded-br-md"
                                    : "bg-received-msg text-primary shadow-sm rounded-bl-md"
                                }`}
                              >
                                <p className="whitespace-pre-wrap break-words hyphens-auto text-md">{message.content}</p>
                                <p className={`text-[15px] mt-1 ${isMine ? "text-white/60" : "text-muted"}`}>
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

                {/* Input area */}
                <div className="flex-shrink-0 bg-card border-t border-border p-4">
                  {isArchived ? (
                    <div className="bg-red-50 rounded-xl px-4 py-3 text-center">
                      <p className="text-red-500 text-sm">
                        Vous avez ete retire de cet evenement par l'organisateur
                      </p>
                    </div>
                  ) : isEventExpired ? (
                    <div className="bg-orange-50 rounded-xl px-4 py-3 text-center">
                      <p className="text-orange-500 text-sm">
                        La periode de disponibilite de cet evenement est terminee
                      </p>
                    </div>
                  ) : (
                    <div className="flex gap-3 items-end">
                      <textarea
                        ref={textareaRef}
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          sendTyping(e.target.value.length > 0);
                          e.target.style.height = "auto";
                          e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                        }}
                        onKeyDown={(e) => {
                          const isMobile = window.matchMedia("(pointer: coarse)").matches;
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
                        style={{ minHeight: "48px", maxHeight: "120px" }}
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
              /* Empty state (desktop) */
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-badge rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-10 h-10 text-muted" />
                  </div>
                  <h2 className="text-primary font-medium mb-1">Selectionnez une conversation</h2>
                  <p className="text-muted text-sm">
                    Choisissez un match pour commencer a discuter
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation userType="user" hidden={!!selectedMatchId} />

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowReportModal(false)} />
          <div className="relative bg-modal rounded-2xl p-6 max-w-sm mx-4 w-full shadow-xl">
            <h3 className="font-semibold text-lg text-primary mb-2">Signaler l'utilisateur</h3>
            <p className="text-muted text-sm mb-4">
              Pour quelle raison souhaitez-vous signaler cet utilisateur ?
            </p>
            <div className="flex flex-col gap-2">
              {[
                { label: "Comportement inapproprie", reason: "inappropriate" },
                { label: "Harcelement", reason: "harassment" },
                { label: "Spam", reason: "spam" },
              ].map((item) => (
                <button
                  key={item.reason}
                  onClick={() => handleReport(item.reason)}
                  className="w-full py-3 rounded-xl text-[#1271FF] font-medium hover:bg-[#1271FF]/5 transition-colors text-sm"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => setShowReportModal(false)}
                className="w-full py-3 rounded-xl text-muted font-medium hover:bg-hover transition-colors text-sm mt-1"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowProfileModal(false)} />
          <div className="relative bg-modal rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
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
                <div className="relative aspect-[3/4] max-h-[50vh] bg-badge rounded-t-2xl overflow-hidden">
                  {profileData.photos && profileData.photos.length > 0 ? (
                    <>
                      <img
                        src={getProfileImage([profileData.photos[profilePhotoIndex]], profileData.firstname, profileData.lastname)}
                        alt={profileData.firstname}
                        className="w-full h-full object-cover"
                      />
                      {profileData.photos.length > 1 && (
                        <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 px-4">
                          {profileData.photos.map((_, idx) => (
                            <div key={idx} className={`h-1 flex-1 rounded-full ${idx === profilePhotoIndex ? "bg-white" : "bg-white/40"}`} />
                          ))}
                        </div>
                      )}
                      {profileData.photos.length > 1 && (
                        <>
                          {profilePhotoIndex > 0 && (
                            <button
                              onClick={() => setProfilePhotoIndex((prev) => prev - 1)}
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center text-primary hover:bg-white transition-colors shadow-sm"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                          )}
                          {profilePhotoIndex < profileData.photos.length - 1 && (
                            <button
                              onClick={() => setProfilePhotoIndex((prev) => prev + 1)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center text-primary hover:bg-white transition-colors shadow-sm"
                            >
                              <ChevronRight className="w-5 h-5" />
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
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <h2 className="text-white text-2xl font-bold">
                      {profileData.firstname} {profileData.lastname?.charAt(0)}.
                      {calculateAge(profileData.birthday) && (
                        <span className="font-normal">, {calculateAge(profileData.birthday)}</span>
                      )}
                    </h2>
                  </div>
                </div>

                {/* Profile info */}
                <div className="p-5">
                  {profileData.profil_info && Object.keys(profileData.profil_info).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(profileData.profil_info).map(([key, value]) => {
                        if (!value || (Array.isArray(value) && value.length === 0)) return null;
                        const formatLabel = (fieldId: string): string =>
                          fieldId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

                        if (Array.isArray(value)) {
                          return (
                            <div key={key} className="bg-badge p-3.5 rounded-xl">
                              <p className="text-sm font-semibold text-primary mb-2">{formatLabel(key)}</p>
                              <div className="flex flex-wrap gap-2">
                                {value.map((item, idx) => (
                                  <span key={idx} className="px-3 py-1.5 bg-[#1271FF]/10 text-[#1271FF] rounded-full text-sm font-medium">
                                    {String(item)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div key={key} className="bg-badge p-3.5 rounded-xl overflow-hidden">
                            <p className="text-sm font-semibold text-primary mb-1">{formatLabel(key)}</p>
                            <p className="text-secondary whitespace-pre-wrap break-words hyphens-auto text-sm">{String(value)}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted text-center py-4 text-sm">Aucune information de profil disponible</p>
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

// Loading fallback for Suspense
function MessagesLoading() {
  return (
    <div className="min-h-screen bg-page">
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-page pointer-events-none" />
        <div className="relative px-6 md:px-12 w-full py-4 md:py-6 flex items-center justify-between">
          <div className="h-7 md:h-9 w-24 bg-border rounded animate-pulse"></div>
          <DesktopNav />
          <div className="h-6 w-20 bg-border rounded animate-pulse md:hidden"></div>
        </div>
      </header>
      <main className="pt-20 md:pt-24 flex items-center justify-center" style={{ minHeight: "calc(100vh - 80px)" }}>
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-[#1271FF]/20 border-t-[#1271FF] rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-muted text-sm">Chargement des messages...</p>
        </div>
      </main>
      <BottomNavigation userType="user" />
    </div>
  );
}

export default function GeneralMessagesPage() {
  return (
    <Suspense fallback={<MessagesLoading />}>
      <GeneralMessagesContent />
    </Suspense>
  );
}
