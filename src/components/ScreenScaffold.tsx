import type { ReactElement, ReactNode } from 'react';
import {
  ScrollView,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, spacing } from '../theme/tokens';

interface ScreenScaffoldProps {
  children: ReactNode;
  /** Scroll the body (default true). Set false for screens that manage their own scroll. */
  scroll?: boolean;
  /** Apply the 16pt horizontal screen padding to the body (default true). */
  padded?: boolean;
  /** Fixed content above the (optionally scrolling) body — e.g. a nav bar. Spans full width. */
  header?: ReactNode;
  /** Fixed content pinned to the bottom — e.g. a sticky primary CTA. Gets the bottom safe inset. */
  footer?: ReactNode;
  /** Pull-to-refresh control for the scroll body. */
  refreshControl?: ReactElement<RefreshControlProps>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

/**
 * Page canvas (§3): near-black background, top safe-area inset, and the standard
 * 16pt horizontal padding. Optional fixed `header`/`footer` slots bracket a body
 * that scrolls by default. Every screen sits on this so insets and padding stay
 * consistent and are never re-derived per screen.
 */
export function ScreenScaffold({
  children,
  scroll = true,
  padded = true,
  header,
  footer,
  refreshControl,
  contentContainerStyle,
  style,
}: ScreenScaffoldProps) {
  const insets = useSafeAreaInsets();
  const bodyPadding = padded ? { paddingHorizontal: layout.screenPaddingX } : null;

  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }, style]}>
      {header ? <View style={bodyPadding}>{header}</View> : null}

      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            bodyPadding,
            { paddingBottom: spacing[6] },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, bodyPadding, contentContainerStyle]}>{children}</View>
      )}

      {footer ? (
        <View style={[bodyPadding, { paddingBottom: insets.bottom + spacing[3], paddingTop: spacing[3] }]}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}
