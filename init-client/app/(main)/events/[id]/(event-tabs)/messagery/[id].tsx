// app/(main)/events/[id]/(event-tabs)/messagery/[id].tsx
import { ConversationScreen } from '@/components/ConversationScreen';
import { useEvent } from '@/context/EventContext';
import { useLocalSearchParams, useGlobalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect } from 'expo-router';

export default function EventConversationPage() {
  const router = useRouter();
  const { id: matchIdParam } = useLocalSearchParams<{ id: string }>();
  const globalParams = useGlobalSearchParams();
  const { currentEventId } = useEvent();
  const matchId = matchIdParam ? parseInt(matchIdParam) : 0;
  const eventId = globalParams.id ? parseInt(String(globalParams.id)) : currentEventId;

  const goBack = useCallback(() => {
    if (eventId) router.replace(`/(main)/events/${eventId}/(event-tabs)/messagery`);
    else router.replace('/(main)/messagery');
  }, [eventId, router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => { goBack(); return true; });
      return () => sub.remove();
    }, [goBack])
  );

  return (
    <ConversationScreen
      matchId={matchId}
      onBack={goBack}
    />
  );
}
