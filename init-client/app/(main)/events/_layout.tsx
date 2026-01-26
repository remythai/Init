//app/(main)/events/_layout.tsx
import { Stack } from 'expo-router';

export default function EventsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
