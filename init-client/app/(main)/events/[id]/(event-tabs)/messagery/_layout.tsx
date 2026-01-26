//app/(main)/events/[id]/(event-tabs)/messagery/_layout.tsx
import { Stack } from 'expo-router';

export default function EventMessageryLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: 'white' },
      }}
    />
  );
}
