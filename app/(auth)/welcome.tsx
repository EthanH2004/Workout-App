import { Dimensions, Linking, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Envelope } from 'phosphor-react-native';
import { BrandMark } from '../../src/components/BrandMark';
import { Button, Text } from '../../src/components';
import { colors, spacing } from '../../src/theme/tokens';
import { PRIVACY_URL, TERMS_URL } from '../../src/config/links';

const { width, height } = Dimensions.get('window');

function openExternal(url: string) {
  Linking.openURL(url).catch(() => {});
}

/** Welcome / sign-in entry (§2.11). Apple sign-in is intentionally hidden until
 *  the real native flow lands; email is the working path for now. */
export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* Subtle warm glow from the bottom (§2.11). */}
      <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
        <Defs>
          <RadialGradient id="welcomeGlow" cx="50%" cy="100%" r="75%">
            <Stop offset="0" stopColor={colors.accent} stopOpacity={0.12} />
            <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#welcomeGlow)" />
      </Svg>

      <View
        style={[
          styles.content,
          { paddingTop: insets.top + spacing[2], paddingBottom: insets.bottom + spacing[2] },
        ]}
      >
        <View style={styles.hero}>
          <BrandMark />
          <Text variant="displayL" style={styles.wordmark}>
            Onset
          </Text>
          <Text variant="body" color="textSecondary" style={styles.tagline}>
            Log your lifts in seconds.{' '}
            <Text variant="body" color="accentText">
              Watch yourself get stronger.
            </Text>
          </Text>
        </View>

        <Button
          label="Continue with email"
          onPress={() => router.push('/sign-in')}
          icon={<Envelope size={18} color={colors.textOnAccent} weight="regular" />}
        />

        <Text variant="caption" color="textTertiary" style={styles.legal}>
          By continuing you agree to our{' '}
          <Text variant="caption" color="textSecondary" onPress={() => openExternal(TERMS_URL)}>
            Terms
          </Text>{' '}
          and{' '}
          <Text variant="caption" color="textSecondary" onPress={() => openExternal(PRIVACY_URL)}>
            Privacy Policy
          </Text>
          .
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[6],
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    marginTop: spacing[6],
  },
  tagline: {
    marginTop: spacing[4],
    textAlign: 'center',
    maxWidth: 240,
  },
  legal: {
    textAlign: 'center',
    marginTop: spacing[4],
    lineHeight: 18,
  },
});
