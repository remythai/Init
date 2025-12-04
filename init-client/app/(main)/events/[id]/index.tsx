// events/[id]/index.tsx
import { Event, EventDetail } from "@/components/EventDetails";
import { eventService } from "@/services/event.service";
import { transformEventResponse } from "@/utils/event.utils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    loadEventDetails();
  }, [id]);

  const loadEventDetails = async () => {
    try {
      setLoading(true);
      const eventResponse = await eventService.getEventById(id as string);
      
      console.log("🔍 Réponse complète de l'API:", JSON.stringify(eventResponse, null, 2));
      
      const transformedEvent = transformEventResponse(eventResponse);
      setEvent(transformedEvent);
      setIsRegistered(transformedEvent.isRegistered);
      
      console.log("✅ isRegistered après transformation:", transformedEvent.isRegistered);
    } catch (error) {
      console.error("Erreur lors du chargement de l'événement:", error);
      Alert.alert(
        "Erreur",
        "Impossible de charger les détails de l'événement.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (eventId: string, profileInfo: Record<string, any>) => {
    try {
      await eventService.registerToEvent(eventId, {
        profil_info: profileInfo
      });
      
      setIsRegistered(true);
      await loadEventDetails();
      
      Alert.alert(
        "Succès",
        "Vous êtes maintenant inscrit à cet événement !"
      );
    } catch (error: any) {
      console.error("Erreur lors de l'inscription:", error);
      
      if (error.message?.includes("déjà inscrit")) {
        setIsRegistered(true);
        await loadEventDetails();
        Alert.alert(
          "Information",
          "Vous êtes déjà inscrit à cet événement !"
        );
      } else {
        Alert.alert(
          "Erreur",
          error.message || "Impossible de s'inscrire à l'événement."
        );
      }
    }
  };
  
  

  const handleUnregister = async (eventId: string) => {
    try {
      await eventService.unregisterFromEvent(eventId);
      
      setIsRegistered(false);
      await loadEventDetails();
      
      Alert.alert(
        "Désinscription réussie",
        "Vous n'êtes plus inscrit à cet événement"
      );
    } catch (error: any) {
      console.error("Erreur lors de la désinscription:", error);
      Alert.alert(
        "Erreur",
        error.message || "Impossible de se désinscrire de l'événement."
      );
    }
  };
  
  

  const handleEnterEvent = (event: Event) => {
    router.push(`/(main)/events/${event.id}/(event-tabs)/swiper`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#303030" />
      </View>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <EventDetail
      event={{ ...event, isRegistered }}
      onBack={() => router.back()}
      onRegister={handleRegister}
      onUnregister={handleUnregister}
      onEnterEvent={handleEnterEvent}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});