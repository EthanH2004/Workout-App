import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
} from '@expo-google-fonts/archivo';
import { colors } from '../src/theme/tokens';

// Keep the splash up until fonts are ready so the UI never flashes a fallback face.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Keys here ARE the fontFamily values used in tokens.ts. Standard Archivo comes
  // from the Google Fonts package; the Expanded display style is a separate STATIC
  // font (assets/fonts) — never the runtime variable-width axis (see design §2.1).
  const [loaded, error] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    ArchivoExpanded_700Bold: require('../assets/fonts/ArchivoExpanded-Bold.ttf'),
    ArchivoExpanded_800ExtraBold: require('../assets/fonts/ArchivoExpanded-ExtraBold.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="workout/active" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
