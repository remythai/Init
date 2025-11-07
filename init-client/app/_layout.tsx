// app/_layout.tsx
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from '@/context/ThemeContext';
import { authService } from '@/services/auth.service';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [fontsLoaded] = useFonts({
    'Roboto': require('../assets/fonts/Roboto-Regular.ttf'),
    'Roboto-Bold': require('../assets/fonts/Roboto-Bold.ttf'),
    'Roboto-Medium': require('../assets/fonts/Roboto-Medium.ttf'),
    'Poppins': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-Medium': require('../assets/fonts/Poppins-Medium.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded && isAuthReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isAuthReady]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuthenticated = await authService.isAuthenticated();
        const inAuthGroup = segments[0] === '(auth)';

        if (!isAuthReady) {
          if (isAuthenticated && inAuthGroup) {
            router.replace('/(main)/events');
          } else if (!isAuthenticated && !inAuthGroup) {
            router.replace('/(auth)/login');
          }
          setIsAuthReady(true);
        } else {
          if (!isAuthenticated && !inAuthGroup) {
            router.replace('/(auth)/login');
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsAuthReady(true);
      }
    };

    if (fontsLoaded) {
      checkAuth();
    }
  }, [segments, isAuthReady, fontsLoaded]);

  if (!fontsLoaded || !isAuthReady) {
    return null;
  }

  return (
    <ThemeProvider>
      <Stack 
        screenOptions={{ 
          headerShown: false,
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="settings" />
        <Stack.Screen 
          name="modal" 
          options={{ presentation: 'modal' }} 
        />
      </Stack>
    </ThemeProvider>
  );
}