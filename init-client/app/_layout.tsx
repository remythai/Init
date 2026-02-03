// app/_layout.tsx
import { ThemeProvider } from '@/context/ThemeContext';
import { authService } from '@/services/auth.service';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { EventProvider } from '@/context/EventContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const hasNavigated = useRef(false);
  
  const [fontsLoaded] = useFonts({
    'Roboto': require('../assets/fonts/Roboto-Regular.ttf'),
    'Roboto-Bold': require('../assets/fonts/Roboto-Bold.ttf'),
    'Roboto-Medium': require('../assets/fonts/Roboto-Medium.ttf'),
    'Poppins': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-Medium': require('../assets/fonts/Poppins-Medium.ttf'),
  });

  useEffect(() => {
    if (!fontsLoaded) return;

    const checkAuth = async () => {
      try {
        const authenticated = await authService.isAuthenticated();
        setIsAuthenticated(authenticated);
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      } finally {
        setIsReady(true);
      }
    };

    checkAuth();
  }, [fontsLoaded]);

  useEffect(() => {
    if (!isReady || isAuthenticated === null || hasNavigated.current) return;

    hasNavigated.current = true;

    setTimeout(() => {
      if (isAuthenticated) {
        router.replace('/(main)/events');
      } else {
        router.replace('/(auth)');
      }
    }, 100);
  }, [isReady, isAuthenticated]);

  useEffect(() => {
    if (isReady && fontsLoaded && isAuthenticated !== null) {
      SplashScreen.hideAsync();
    }
  }, [isReady, fontsLoaded, isAuthenticated]);

  if (!fontsLoaded || !isReady || isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <EventProvider >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ animation: 'none' }} />
        <Stack.Screen name="(main)" options={{ animation: 'none' }} />
        <Stack.Screen 
          name="settings" 
          options={{ 
            presentation: 'modal',
            headerShown: false,
            title: 'Paramètres',
            headerBackVisible: false,
          }} 
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      </EventProvider>
    </ThemeProvider>
  );
}