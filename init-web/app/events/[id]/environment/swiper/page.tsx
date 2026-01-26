"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { X, Heart, Sparkles } from "lucide-react";
import { authService } from "../../../../services/auth.service";

interface Participant {
  id: string;
  firstname: string;
  lastname: string;
  age: number;
  bio?: string;
  image: string;
}

// Simulated participants data (will be replaced by API)
const mockParticipants: Participant[] = [
  {
    id: "1",
    firstname: "Marie",
    lastname: "D.",
    age: 25,
    bio: "Passionnée de musique et de nouvelles rencontres",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
  },
  {
    id: "2",
    firstname: "Thomas",
    lastname: "L.",
    age: 28,
    bio: "Entrepreneur dans la tech, toujours partant pour un café",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
  },
  {
    id: "3",
    firstname: "Sophie",
    lastname: "M.",
    age: 24,
    bio: "Designer freelance, j'adore les événements networking",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
  },
  {
    id: "4",
    firstname: "Lucas",
    lastname: "B.",
    age: 27,
    bio: "Développeur web passionné par l'innovation",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
  },
  {
    id: "5",
    firstname: "Emma",
    lastname: "R.",
    age: 26,
    bio: "Marketing digital et voyages sont mes passions",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
  },
];

export default function SwiperPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedUser, setMatchedUser] = useState<Participant | null>(null);
  const [likedUsers, setLikedUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/auth");
      return;
    }

    // Simulate loading participants
    setTimeout(() => {
      setParticipants(mockParticipants);
      setLoading(false);
    }, 500);
  }, [eventId]);

  const currentParticipant = participants[currentIndex];

  const handleSwipe = (direction: "left" | "right") => {
    if (!currentParticipant) return;

    setSwipeDirection(direction);

    setTimeout(() => {
      if (direction === "right") {
        setLikedUsers([...likedUsers, currentParticipant.id]);

        // Simulate 30% chance of match
        if (Math.random() < 0.3) {
          setMatchedUser(currentParticipant);
          setShowMatch(true);
        }
      }

      setSwipeDirection(null);
      setCurrentIndex(currentIndex + 1);
    }, 300);
  };

  const closeMatch = () => {
    setShowMatch(false);
    setMatchedUser(null);
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

  const isFinished = currentIndex >= participants.length;

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-0">
        {/* Swiper Card */}
        {!isFinished ? (
          <div className="flex-1 relative min-h-0">
            {/* Card Stack (show next card behind) */}
            {currentIndex + 1 < participants.length && (
              <div className="absolute inset-0 scale-95 opacity-50">
                <div className="w-full h-full bg-white rounded-3xl shadow-lg overflow-hidden">
                  <img
                    src={participants[currentIndex + 1].image}
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
                {/* Image */}
                <img
                  src={currentParticipant.image}
                  alt={currentParticipant.firstname}
                  className="w-full h-full object-cover"
                />

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

                {/* User Info */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h2 className="font-poppins text-3xl font-bold">
                    {currentParticipant.firstname} {currentParticipant.lastname},{" "}
                    <span className="font-normal">{currentParticipant.age}</span>
                  </h2>
                  {currentParticipant.bio && (
                    <p className="text-white/80 mt-2 text-sm leading-relaxed">
                      {currentParticipant.bio}
                    </p>
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
              Vous avez vu tous les participants de cet événement.
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
        {!isFinished && (
          <div className="flex-shrink-0 flex items-center justify-center gap-6 py-4">
            {/* Pass Button */}
            <button
              onClick={() => handleSwipe("left")}
              className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-red-500 hover:scale-110 transition-transform"
            >
              <X className="w-8 h-8" />
            </button>

            {/* Like Button */}
            <button
              onClick={() => handleSwipe("right")}
              className="w-16 h-16 bg-gradient-to-br from-pink-500 to-red-500 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform"
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
                  src={matchedUser.image}
                  alt={matchedUser.firstname}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href={`/events/${eventId}/environment/messages`}
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
    </div>
  );
}
