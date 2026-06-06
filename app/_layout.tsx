import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
} from '@expo-google-fonts/archivo';
import { colors } from '../src/theme/tokens';
import { AuthProvider, useAuth } from '../src/features/auth/AuthProvider';
import { QueryProvider } from '../src/lib/offline';

SplashScreen.preventAutoHideAsync();

/** Redirects logged-out users to the auth flow and logged-in users into the app. */
function RootNavigator() {
  const { session, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/welcome');
    } else if (session && inAuthGroup) {
      router.replace('/home');
    }
  }, [session, initializing, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      {/* Native swipe-dismiss off — it can't be intercepted to confirm. The screen
          runs its own swipe-down → "Discard workout?" confirm instead. */}
      <Stack.Screen
        name="workout/active"
        options={{ presentation: 'modal', gestureEnabled: false }}
      />
      <Stack.Screen name="exercise-picker" options={{ presentation: 'modal' }} />
      <Stack.Screen name="exercise-detail" />
      <Stack.Screen name="program-editor" options={{ presentation: 'modal' }} />
      {/* gestureEnabled off so swipe-down can't bypass the unsaved-changes confirm. */}
      <Stack.Screen
        name="routine-builder"
        options={{ presentation: 'modal', gestureEnabled: false }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    ArchivoExpanded_700Bold: require('../assets/fonts/ArchivoExpanded-Bold.ttf'),
    ArchivoExpanded_800ExtraBold: require('../assets/fonts/ArchivoExpanded-ExtraBold.ttf'),
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <QueryProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
