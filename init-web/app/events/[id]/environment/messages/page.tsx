"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { MessageCircle, Send } from "lucide-react";
import { authService } from "../../../../services/auth.service";

interface Match {
  id: string;
  user: {
    id: string;
    firstname: string;
    lastname: string;
    image: string;
  };
  lastMessage?: {
    content: string;
    timestamp: string;
    isRead: boolean;
  };
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
}

// Simulated matches data
const mockMatches: Match[] = [
  {
    id: "1",
    user: {
      id: "1",
      firstname: "Marie",
      lastname: "D.",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
    },
    lastMessage: {
      content: "Salut ! Ravie de t'avoir matché !",
      timestamp: "14:30",
      isRead: false,
    },
  },
  {
    id: "2",
    user: {
      id: "2",
      firstname: "Thomas",
      lastname: "L.",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    },
    lastMessage: {
      content: "Tu travailles dans quel domaine ?",
      timestamp: "12:15",
      isRead: true,
    },
  },
  {
    id: "3",
    user: {
      id: "3",
      firstname: "Sophie",
      lastname: "M.",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
    },
  },
];

// Simulated conversation
const mockMessages: Message[] = [
  { id: "1", senderId: "1", content: "Salut ! Ravie de t'avoir matché !", timestamp: "14:30" },
  { id: "2", senderId: "me", content: "Salut Marie ! Moi aussi, enchanté !", timestamp: "14:32" },
  { id: "3", senderId: "1", content: "Tu participes souvent à ce genre d'événements ?", timestamp: "14:33" },
];

export default function MessagesPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/auth");
      return;
    }

    // Simulate loading matches
    setTimeout(() => {
      setMatches(mockMatches);
      setLoading(false);
    }, 500);
  }, [eventId]);

  const openConversation = (match: Match) => {
    setSelectedMatch(match);
    setMessages(mockMessages);
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: String(messages.length + 1),
      senderId: "me",
      content: newMessage,
      timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages([...messages, message]);
    setNewMessage("");
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
      {/* Left Panel - Contacts List */}
      <div className="w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col border-r border-white/10 md:block hidden">
        {/* Title */}
        <div className="flex-shrink-0 p-4">
          <h1 className="font-poppins text-2xl font-bold text-white">Messages</h1>
          <p className="text-white/60 text-sm mt-1">Vos conversations avec vos matchs</p>
        </div>

        {/* Matches List */}
        <div className="flex-1 overflow-y-auto">
          {matches.length === 0 ? (
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
              {matches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => openConversation(match)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left ${
                    selectedMatch?.id === match.id ? "bg-white/10" : ""
                  }`}
                >
                  <div className="relative">
                    <img
                      src={match.user.image}
                      alt={match.user.firstname}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                    {match.lastMessage && !match.lastMessage.isRead && (
                      <span className="absolute top-0 right-0 w-3 h-3 bg-[#1271FF] rounded-full border-2 border-[#303030]"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">
                        {match.user.firstname} {match.user.lastname}
                      </h3>
                      {match.lastMessage && (
                        <span className="text-xs text-white/50">{match.lastMessage.timestamp}</span>
                      )}
                    </div>
                    <p className="text-sm text-white/60 truncate">
                      {match.lastMessage?.content || "Nouveau match ! Dites bonjour"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile view - show list or conversation */}
      <div className="w-full md:hidden flex flex-col">
        {selectedMatch ? (
          // Mobile Conversation View
          <div className="h-full flex flex-col bg-[#F5F5F5]">
            {/* Conversation Header */}
            <div className="flex-shrink-0 bg-white border-b px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => setSelectedMatch(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ←
              </button>
              <img
                src={selectedMatch.user.image}
                alt={selectedMatch.user.firstname}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <h2 className="font-semibold text-[#303030]">
                  {selectedMatch.user.firstname} {selectedMatch.user.lastname}
                </h2>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === "me" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                      message.senderId === "me"
                        ? "bg-[#1271FF] text-white rounded-br-md"
                        : "bg-white text-[#303030] rounded-bl-md"
                    }`}
                  >
                    <p>{message.content}</p>
                    <p className={`text-xs mt-1 ${message.senderId === "me" ? "text-white/70" : "text-gray-400"}`}>
                      {message.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="flex-shrink-0 bg-white border-t p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Écrivez un message..."
                  className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-[#1271FF]"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 bg-[#1271FF] rounded-full flex items-center justify-center text-white hover:bg-[#0d5dd8] transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Mobile Matches List
          <div className="h-full flex flex-col">
            <div className="flex-shrink-0 p-4">
              <h1 className="font-poppins text-2xl font-bold text-white">Messages</h1>
              <p className="text-white/60 text-sm mt-1">Vos conversations avec vos matchs</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {matches.length === 0 ? (
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
                  {matches.map((match) => (
                    <button
                      key={match.id}
                      onClick={() => openConversation(match)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="relative">
                        <img
                          src={match.user.image}
                          alt={match.user.firstname}
                          className="w-14 h-14 rounded-full object-cover"
                        />
                        {match.lastMessage && !match.lastMessage.isRead && (
                          <span className="absolute top-0 right-0 w-3 h-3 bg-[#1271FF] rounded-full border-2 border-[#303030]"></span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-white">
                            {match.user.firstname} {match.user.lastname}
                          </h3>
                          {match.lastMessage && (
                            <span className="text-xs text-white/50">{match.lastMessage.timestamp}</span>
                          )}
                        </div>
                        <p className="text-sm text-white/60 truncate">
                          {match.lastMessage?.content || "Nouveau match ! Dites bonjour"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Conversation (Desktop) */}
      <div className="hidden md:flex flex-1 flex-col">
        {selectedMatch ? (
          <div className="h-full flex flex-col bg-[#F5F5F5]">
            {/* Conversation Header */}
            <div className="flex-shrink-0 bg-white border-b px-4 py-3 flex items-center gap-3">
              <img
                src={selectedMatch.user.image}
                alt={selectedMatch.user.firstname}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <h2 className="font-semibold text-[#303030]">
                  {selectedMatch.user.firstname} {selectedMatch.user.lastname}
                </h2>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === "me" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[60%] px-4 py-2 rounded-2xl ${
                      message.senderId === "me"
                        ? "bg-[#1271FF] text-white rounded-br-md"
                        : "bg-white text-[#303030] rounded-bl-md"
                    }`}
                  >
                    <p>{message.content}</p>
                    <p className={`text-xs mt-1 ${message.senderId === "me" ? "text-white/70" : "text-gray-400"}`}>
                      {message.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="flex-shrink-0 bg-white border-t p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Écrivez un message..."
                  className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-[#1271FF]"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 bg-[#1271FF] rounded-full flex items-center justify-center text-white hover:bg-[#0d5dd8] transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Empty state
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
    </div>
  );
}
