
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import {
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
  useSegments,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { colors, useReducedMotion } from '@/ui';
import { SessionsProvider } from '@/modules/workout-sessions';
import { AuthProvider, useAuth } from '@/modules/auth';

export { ErrorBoundary } from 'expo-router';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.action,
    background: colors.canvas,
    card: colors.canvas,
    text: colors.textPrimary,
    border: colors.border,
  },
};

function AuthGuard() {
  const reduceMotion = useReducedMotion();
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const currentRoute = String(segments[0] ?? '');
    const isAuthRoute =
      currentRoute === 'login' || currentRoute === 'signup';
    if (!session && !isAuthRoute) {
      router.replace('/login' as never);
    } else if (session && isAuthRoute) {
      router.replace('/(tabs)/home');
    }
  }, [session, loading, segments, router]);

  if (loading) return null;

  return (
    <Stack
      screenOptions={{
        animation: reduceMotion ? 'none' : 'default',
        contentStyle: { backgroundColor: colors.canvas },
        headerStyle: { backgroundColor: colors.canvas },
        headerTintColor: colors.action,
        headerTitleStyle: { color: colors.textPrimary },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="workout"
        options={{ title: 'Workout', headerBackTitle: 'Train' }}
      />
      <Stack.Screen
        name="session"
        options={{ title: 'Your session', headerBackTitle: 'Train' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (fontError) throw fontError;
  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="dark" />
      <AuthProvider>
        <SessionsProvider>
          <AuthGuard />
        </SessionsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
