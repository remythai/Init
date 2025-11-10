import { useRouter, useLocalSearchParams } from "expo-router";
import { EventDetail, Event } from "@/components/EventDetails";

// Mock data - À remplacer par votre logique de fetch
const MOCK_EVENTS: Record<string, Event> = {
  "1": {
    id: "1",
    name: "Soirée Jazz au Café",
    theme: "musique",
    date: "15 novembre 2025",
    location: "Le Café des Arts, Pau",
    participants: 12,
    maxParticipants: 20,
    image: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800",
    description:
      "Rejoignez-nous pour une soirée jazz intime dans l'ambiance chaleureuse du Café des Arts. Musiciens locaux et bonne ambiance garantie !",
    isRegistered: true,
  },
  "2": {
    id: "2",
    name: "Networking Startup",
    theme: "professionnel",
    date: "18 novembre 2025",
    location: "Tech Hub Pau",
    participants: 25,
    maxParticipants: 30,
    image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800",
    description:
      "Rencontrez des entrepreneurs et professionnels de la tech dans un cadre informel. Échangez vos idées et développez votre réseau !",
    isRegistered: false,
  },
};

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const event = MOCK_EVENTS[id as string] || MOCK_EVENTS["1"];

  const handleBack = () => {
    router.back();
  };

  const handleRegister = (eventId: string) => {
    // TODO: Implémenter la logique d'inscription
    console.log("Inscription à l'événement:", eventId);
  };

  const handleEnterEvent = (event: Event) => {
    router.push(`/events/${event.id}/swiper`);
  };

  return (
    <EventDetail
      event={event}
      onBack={handleBack}
      onRegister={handleRegister}
      onEnterEvent={handleEnterEvent}
    />
  );
}