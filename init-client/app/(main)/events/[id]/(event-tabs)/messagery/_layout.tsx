//app/(main)/events/[ið]/(event-tabs)/messagery/_layout.tsx
import { Stack, useLocalSearchParams } from 'expo-router';

export default function EventMessageryLayout() {
  const params = useLocalSearchParams();
  console.log('🔍 MessageryLayout ALL params:', params);
  
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: 'white' },
      }}
    />
  );
}
