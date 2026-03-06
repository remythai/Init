// app/_layout.tsx
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { authService } from '@/services/auth.service';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { EventProvider } from '@/context/EventContext';
import { SocketProvider } from '@/context/SocketContext';

SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const router = useRouter();
  const segments = useSegments();
  const { theme, isDark } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const hasNavigated = useRef(false);

  useEffect(() => {
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
  }, []);

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
    if (isReady && isAuthenticated !== null) {
      SplashScreen.hideAsync();
    }
  }, [isReady, isAuthenticated]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync(theme.colors.background);
      NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
    }
  }, [isDark, theme.colors.background]);

  if (!isReady || isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.card }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const statusBarStyle = isDark ? 'light' : 'dark';

  return (
    <EventProvider>
      <SocketProvider>
        <StatusBar style={statusBarStyle} />
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
      </SocketProvider>
    </EventProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Roboto': require('../assets/fonts/Roboto-Regular.ttf'),
    'Roboto-Bold': require('../assets/fonts/Roboto-Bold.ttf'),
    'Roboto-Medium': require('../assets/fonts/Roboto-Medium.ttf'),
    'Poppins': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-Medium': require('../assets/fonts/Poppins-Medium.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <RootLayoutInner />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
