// app/(main)/events/[id]/(event-tabs)/messagery/[matchId].tsx
import { ConversationScreen } from '@/components/ConversationScreen';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function EventConversationPage() {
  const router = useRouter();
  const { matchId: matchIdParam } = useLocalSearchParams<{ matchId: string }>();
  const matchId = matchIdParam ? parseInt(matchIdParam) : 0;

  return (
    <ConversationScreen
      matchId={matchId}
      onBack={() => router.back()}
    />
  );
}
