// events/[id]/_layout.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { authService } from '@/services/auth.service';
import { eventService } from '@/services/event.service';

export default function EventLayout() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const segments = useSegments();
  
  const [userType, setUserType] = useState<"user" | "organizer" | null>(null);
  const isInEventTabs = segments.includes('(event-tabs)');

  useEffect(() => {
    checkUserType();
  }, []);

  const checkUserType = async () => {
    try {
      const role = await authService.getUserType();
      setUserType(role === "orga" ? "organizer" : "user");
    } catch (error) {
      console.error("Erreur lors de la récupération du type d'utilisateur:", error);
      setUserType("user");
    }
  };

  const handleDeleteEvent = async () => {
    Alert.alert(
      "Supprimer l'événement",
      "Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.",
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await eventService.deleteEvent(id as string);
              
              Alert.alert(
                "Succès",
                "L'événement a été supprimé avec succès",
                [
                  {
                    text: "OK",
                    onPress: () => router.push('/events')
                  }
                ]
              );
            } catch (error: any) {
              console.error("Erreur suppression événement:", error);
              Alert.alert(
                "Erreur",
                error.message || "Impossible de supprimer l'événement"
              );
            }
          }
        }
      ]
    );
  };

  const handleReportEvent = () => {
    Alert.alert(
      "Signaler l'événement",
      "Pour quelle raison souhaitez-vous signaler cet événement ?",
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Contenu inapproprié",
          onPress: () => submitReport("inappropriate")
        },
        {
          text: "Fausses informations",
          onPress: () => submitReport("false_info")
        },
        {
          text: "Spam",
          onPress: () => submitReport("spam")
        }
      ]
    );
  };

  const submitReport = async (reason: string) => {
    try {
      // todo
      
      Alert.alert(
        "Signalement envoyé",
        "Merci pour votre signalement. Notre équipe va l'examiner."
      );
    } catch (error: any) {
      console.error("Erreur signalement:", error);
      Alert.alert(
        "Erreur",
        "Impossible d'envoyer le signalement"
      );
    }
  };

  return (
    <View style={styles.container}>
      {!isInEventTabs && (
        <View style={styles.header}>
          <Pressable 
            onPress={() => router.push('/events')}
            style={styles.headerButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="#303030" />
          </Pressable>
          
          {userType === "organizer" ? (
            <Pressable 
              onPress={handleDeleteEvent}
              style={styles.headerButton}
            >
              <MaterialIcons name="delete" size={24} color="#dc2626" />
            </Pressable>
          ) : (
            <Pressable 
              onPress={handleReportEvent}
              style={styles.headerButton}
            >
              <MaterialIcons name="flag" size={24} color="#303030" />
            </Pressable>
          )}
        </View>
      )}

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(event-tabs)" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
});