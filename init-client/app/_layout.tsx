// app/_layout.tsx
import { ThemeProvider as AppThemeProvider, useTheme } from '@/context/ThemeContext';
import { authService } from '@/services/auth.service';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider as NavThemeProvider, DefaultTheme, DarkTheme } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { EventProvider } from '@/context/EventContext';
import { SocketProvider } from '@/context/SocketContext';
import { LangProvider } from '@/context/LangContext';
import { UnreadProvider } from '@/context/UnreadContext';
import { registerAndSavePushToken, addNotificationResponseListener } from '@/services/notification.service';

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
        registerAndSavePushToken();
      } else {
        router.replace('/(auth)');
      }
    }, 100);
  }, [isReady, isAuthenticated]);

  useEffect(() => {
    const subscription = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'match') {
        router.push('/(main)/matches' as any);
      } else if (data?.type === 'message' && data?.matchId) {
        router.push(`/(main)/chat/${data.matchId}` as any);
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isReady && isAuthenticated !== null) {
      SplashScreen.hideAsync();
    }
  }, [isReady, isAuthenticated]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
    }
  }, [isDark]);

  const navigationTheme = useMemo(() => ({
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.colors.background,
      card: theme.colors.card,
      border: theme.colors.border,
      text: theme.colors.foreground,
      primary: theme.colors.primary,
    },
  }), [isDark, theme]);

  if (!isReady || isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const statusBarStyle = isDark ? 'light' : 'dark';

  return (
    <NavThemeProvider value={navigationTheme}>
    <EventProvider>
      <SocketProvider>
        <StatusBar style={statusBarStyle} />
        <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: theme.colors.background } }}>
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(main)" options={{ animation: 'fade' }} />
          <Stack.Screen
            name="settings"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              headerShown: false,
              title: 'Paramètres',
              headerBackVisible: false,
            }}
          />
          <Stack.Screen
            name="theme"
            options={{
              animation: 'slide_from_right',
              headerShown: false,
            }}
          />
          <Stack.Screen name="modal" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen
            name="language"
            options={{
              animation: 'slide_from_right',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="legal"
            options={{
              animation: 'slide_from_right',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="orga"
            options={{
              animation: 'slide_from_right',
              headerShown: false,
            }}
          />
        </Stack>
      </SocketProvider>
    </EventProvider>
    </NavThemeProvider>
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
    <AppThemeProvider>
      <LangProvider>
        <UnreadProvider>
          <SafeAreaProvider>
            <RootLayoutInner />
          </SafeAreaProvider>
        </UnreadProvider>
      </LangProvider>
    </AppThemeProvider>
  );
}
