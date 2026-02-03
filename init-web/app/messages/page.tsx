"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle, Send, ArrowLeft, MoreVertical, ChevronDown, ChevronUp } from "lucide-react";
import { authService } from "../services/auth.service";
import { matchService, Conversation, Message, Photo } from "../services/match.service";

import { useRealTimeMessages } from "../hooks/useRealTimeMessages";
import { SocketConversationUpdate } from "../services/socket.service";
import BottomNavigation from "../components/BottomNavigation";
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = useRef<number | null>(null);

  // Handler for new real-time messages
  const handleNewMessage = useCallback((message: Message) => {
    setConversationData((prev) => {
      if (!prev) return prev;
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

  // Handler for conversation updates
  const handleConversationUpdate = useCallback((data: SocketConversationUpdate) => {
    // If this is the currently selected conversation, mark as read in context
    if (selectedMatchId === data.match_id) {
      markConversationAsRead(data.match_id);
    }

    setEventConversations((prev) => {
      return prev.map((eventGroup) => {
        const updatedConversations = eventGroup.conversations.map((conv) => {
          if (conv.match_id === data.match_id) {
            return {
              ...conv,
              last_message: data.last_message,
              unread_count: selectedMatchId === data.match_id ? conv.unread_count : conv.unread_count + 1,
            };
          }
          return conv;
        });

        // Move updated conversation to top
        const targetIndex = updatedConversations.findIndex((c) => c.match_id === data.match_id);
        if (targetIndex > 0) {
          const [conversation] = updatedConversations.splice(targetIndex, 1);
          updatedConversations.unshift(conversation);
        }

        return {
          ...eventGroup,
          conversations: updatedConversations,
        };
      });
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
    // Set active conversation in context (to prevent marking new messages as unread)
    setActiveConversation(selectedMatchId);

    if (selectedMatchId) {
      loadMessages(selectedMatchId);

      // Mark as read in context (for navigation badge)
      markConversationAsRead(selectedMatchId);

      // Reset unread count locally
      setEventConversations((prev) =>
        prev.map((eventGroup) => ({
          ...eventGroup,
          conversations: eventGroup.conversations.map((conv) =>
            conv.match_id === selectedMatchId
              ? { ...conv, unread_count: 0 }
              : conv
          ),
        }))
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
      const data = await matchService.getAllConversations();
      setEventConversations(data || []);

      // Expand all events by default
      const allEventIds = new Set(data.map((e) => e.event.id));
      setExpandedEvents(allEventIds);

      // If we have an initial match ID, select it
      if (initialMatchId && !selectedMatchId) {
        const matchIdNum = parseInt(initialMatchId);
        setSelectedMatchId(matchIdNum);
        // Find if the conversation is archived or event expired
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
        setConversationData({
          ...conversationData,
          messages: [...conversationData.messages, message],
        });
      }

      // Update conversation list
      setEventConversations((prev) => {
        return prev.map((eventGroup) => {
          const updatedConversations = eventGroup.conversations.map((conv) => {
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

          return {
            ...eventGroup,
            conversations: updatedConversations,
          };
        });
      });

      setNewMessage("");
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

  const toggleEventExpanded = (eventId: number) => {
    setExpandedEvents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
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

  const getTotalUnreadCount = (): number => {
    return eventConversations.reduce((total, eventGroup) => {
      return total + eventGroup.conversations.reduce((sum, conv) => sum + conv.unread_count, 0);
    }, 0);
  };

  const getTotalConversationsCount = (): number => {
    return eventConversations.reduce((total, eventGroup) => {
      return total + eventGroup.conversations.length;
    }, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1271FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des messages...</p>
        </div>
        <BottomNavigation userType="user" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#303030] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/initLogoGray.png"
              alt="Init Logo"
              width={200}
              height={80}
              className="h-12 md:h-16 w-auto"
            />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="font-poppins text-lg font-semibold text-white">Messages</h1>
            {getTotalUnreadCount() > 0 && (
              <span className="bg-[#1271FF] text-white text-xs font-bold px-2 py-1 rounded-full">
                {getTotalUnreadCount()}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-20 pb-20">
        <div className="h-[calc(100vh-10rem)] flex">
          {/* Left Panel - Conversations List */}
          <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col bg-white border-r border-gray-200 ${selectedMatchId ? "hidden md:flex" : "flex"}`}>
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-gray-100">
              <h2 className="font-poppins text-xl font-bold text-[#303030]">Conversations</h2>
              <p className="text-gray-500 text-sm mt-1">
                {getTotalConversationsCount()} conversation{getTotalConversationsCount() !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {error ? (
                <div className="p-4 text-center">
                  <p className="text-red-500 mb-4">{error}</p>
                  <button
                    onClick={loadConversations}
                    className="text-[#1271FF] hover:underline"
                  >
                    Reessayer
                  </button>
                </div>
              ) : getTotalConversationsCount() === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-10 h-10 text-gray-400" />
                  </div>
                  <h2 className="text-[#303030] font-semibold mb-2">Pas encore de matchs</h2>
                  <p className="text-gray-500 text-sm">
                    Inscrivez-vous a des evenements et commencez a swiper !
                  </p>
                  <Link
                    href="/events"
                    className="mt-4 bg-[#1271FF] hover:bg-[#0d5dd8] text-white px-6 py-3 rounded-full font-medium transition-colors"
                  >
                    Voir les evenements
                  </Link>
                </div>
              ) : (
                <div>
                  {eventConversations.map((eventGroup) => (
                    <div key={eventGroup.event.id} className="border-b border-gray-100">
                      {/* Event Header */}
                      <button
                        onClick={() => toggleEventExpanded(eventGroup.event.id)}
                        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#303030] text-sm">
                            {eventGroup.event.name}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                            {eventGroup.conversations.length}
                          </span>
                        </div>
                        {expandedEvents.has(eventGroup.event.id) ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </button>

                      {/* Conversations */}
                      {expandedEvents.has(eventGroup.event.id) && (
                        <div className="divide-y divide-gray-100">
                          {eventGroup.conversations.map((conv) => (
                            <button
                              key={conv.match_id}
                              onClick={() => {
                                setSelectedMatchId(conv.match_id);
                                setIsArchived(conv.is_archived || false);
                                setIsEventExpired(conv.is_event_expired || false);
                              }}
                              className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left ${
                                selectedMatchId === conv.match_id ? "bg-blue-50" : ""
                              } ${conv.is_archived ? "opacity-60" : ""}`}
                            >
                              <div className="relative">
                                <img
                                  src={getProfileImage(conv.user.photos, conv.user.firstname, conv.user.lastname)}
                                  alt={conv.user.firstname}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                                {conv.unread_count > 0 && (
                                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#1271FF] rounded-full border-2 border-white flex items-center justify-center text-xs text-white font-medium">
                                    {conv.unread_count}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-semibold text-[#303030]">
                                    {conv.user.firstname} {conv.user.lastname?.charAt(0)}.
                                  </h3>
                                  {conv.last_message && (
                                    <span className="text-xs text-gray-400">
                                      {formatTime(conv.last_message.sent_at)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 truncate">
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

          {/* Right Panel - Conversation */}
          <div className={`flex-1 flex flex-col bg-[#F5F5F5] ${!selectedMatchId ? "hidden md:flex" : "flex"}`}>
            {selectedMatchId && conversationData ? (
              <div className="h-full flex flex-col">
                {/* Conversation Header */}
                <div className="flex-shrink-0 bg-white border-b px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedMatchId(null)}
                      className="md:hidden text-gray-600 hover:text-gray-800 p-1"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <img
                      src={getProfileImage(
                        conversationData.match.user.photos,
                        conversationData.match.user.firstname,
                        conversationData.match.user.lastname
                      )}
                      alt={conversationData.match.user.firstname}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <h2 className="font-semibold text-[#303030]">
                        {conversationData.match.user.firstname} {conversationData.match.user.lastname?.charAt(0)}.
                      </h2>
                      <p className="text-xs text-gray-500">
                        {conversationData.match.event_name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
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
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <MessageCircle className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600">
                        Commencez la conversation !
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        Envoyez un premier message a {conversationData.match.user.firstname}
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
                                <span className="px-3 py-1 bg-gray-200 rounded-full text-xs text-gray-600">
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
                                    : "bg-white text-[#303030] rounded-bl-md shadow-sm"
                                }`}
                              >
                                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                <p
                                  className={`text-xs mt-1 ${
                                    isMine ? "text-white/70" : "text-gray-400"
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
                    <div className="inline-flex items-center gap-1.5 bg-gray-200 rounded-2xl px-4 py-3">
                      <span className="typing-dot w-2 h-2 bg-gray-500 rounded-full"></span>
                      <span className="typing-dot w-2 h-2 bg-gray-500 rounded-full"></span>
                      <span className="typing-dot w-2 h-2 bg-gray-500 rounded-full"></span>
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="flex-shrink-0 bg-white border-t p-4">
                  {isArchived ? (
                    <div className="bg-red-50 rounded-xl px-4 py-3 text-center">
                      <p className="text-red-600 text-sm">
                        Vous avez ete retire de cet evenement par l'organisateur
                      </p>
                    </div>
                  ) : isEventExpired ? (
                    <div className="bg-orange-50 rounded-xl px-4 py-3 text-center">
                      <p className="text-orange-600 text-sm">
                        La periode de disponibilite de cet evenement est terminee
                      </p>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          sendTyping(e.target.value.length > 0);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                        onBlur={() => sendTyping(false)}
                        placeholder="Ecrivez un message..."
                        maxLength={500}
                        className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-[#1271FF] text-[#303030]"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sending}
                        className="w-12 h-12 bg-[#1271FF] rounded-full flex items-center justify-center text-white hover:bg-[#0d5dd8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Empty state (Desktop)
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-12 h-12 text-gray-300" />
                  </div>
                  <h2 className="text-gray-500 font-medium mb-1">Selectionnez une conversation</h2>
                  <p className="text-gray-400 text-sm">
                    Choisissez un match pour commencer a discuter
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation userType="user" />

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowReportModal(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm mx-4 w-full">
            <h3 className="font-semibold text-lg text-[#303030] mb-2">
              Signaler l'utilisateur
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Pour quelle raison souhaitez-vous signaler cet utilisateur ?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="w-full py-3 rounded-xl text-[#303030] font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleReport("inappropriate")}
                className="w-full py-3 rounded-xl text-[#1271FF] font-medium hover:bg-blue-50 transition-colors"
              >
                Comportement inapproprie
              </button>
              <button
                onClick={() => handleReport("harassment")}
                className="w-full py-3 rounded-xl text-[#1271FF] font-medium hover:bg-blue-50 transition-colors"
              >
                Harcelement
              </button>
              <button
                onClick={() => handleReport("spam")}
                className="w-full py-3 rounded-xl text-[#1271FF] font-medium hover:bg-blue-50 transition-colors"
              >
                Spam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Loading fallback for Suspense
function MessagesLoading() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center pb-20">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#1271FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement des messages...</p>
      </div>
      <BottomNavigation userType="user" />
    </div>
  );
}

// Main export with Suspense wrapper
export default function GeneralMessagesPage() {
  return (
    <Suspense fallback={<MessagesLoading />}>
      <GeneralMessagesContent />
    </Suspense>
  );
}
