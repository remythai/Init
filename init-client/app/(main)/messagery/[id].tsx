// app/(main)/messagery/[id].tsx
// Conversation page accessed from global messagery
import { ConversationScreen } from '@/components/ConversationScreen';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function GlobalConversationPage() {
  const router = useRouter();
  const { id: matchIdParam } = useLocalSearchParams<{ id: string }>();
  const matchId = matchIdParam ? parseInt(matchIdParam) : 0;

  return (
    <ConversationScreen
      matchId={matchId}
      onBack={() => router.back()}
    />
  );
}
