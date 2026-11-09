import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { colors, useReducedMotion } from '@/ui';
import { SessionsProvider } from '@/modules/workout-sessions';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = { anchor: '(tabs)' };

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

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (fontError) throw fontError;
  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="dark" />
      <SessionsProvider>
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.canvas },
            headerStyle: { backgroundColor: colors.canvas },
            headerTintColor: colors.action,
            headerTitleStyle: { color: colors.textPrimary },
            headerShadowVisible: false,
            animation: reduceMotion ? 'none' : 'default',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="workout" options={{ title: 'Workout', headerBackTitle: 'Train' }} />
          <Stack.Screen name="session" options={{ title: 'Your session', headerBackTitle: 'Train' }} />
        </Stack>
      </SessionsProvider>
    </ThemeProvider>
  );
}
