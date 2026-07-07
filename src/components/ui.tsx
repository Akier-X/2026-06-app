import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Radius, Shadows, Spacing, useThemeColors } from '@/constants/theme';
import { hapticTap } from '@/lib/haptics';

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useThemeColors();
  const isDark = useColorScheme() === 'dark';
  return (
    <View
      style={[
        {
          backgroundColor: c.card,
          borderRadius: Radius.md,
          padding: Spacing.md,
        },
        // ライトは影で浮かせ、ダークは影が見えないため輪郭線で区切る
        isDark
          ? { borderWidth: StyleSheet.hairlineWidth, borderColor: c.border }
          : Shadows.card,
        style,
      ]}>
      {children}
    </View>
  );
}

/** 押すとふわっと縮む触覚付きPressable。カード・ボタン類の共通挙動。 */
export function PressableScale({
  children,
  style,
  onPress,
  haptic = true,
  scaleTo = 0.97,
  ...rest
}: PressableProps & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
  scaleTo?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  return (
    <Pressable
      onPressIn={() => animate(scaleTo)}
      onPressOut={() => animate(1)}
      onPress={(e) => {
        if (haptic) hapticTap();
        onPress?.(e);
      }}
      {...rest}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  style,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const c = useThemeColors();
  const inactive = disabled || loading;
  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      haptic={!inactive}
      style={[{ opacity: inactive ? 0.5 : 1 }, !inactive && Shadows.cta, style]}>
      <LinearGradient
        colors={c.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.buttonGradient}>
        {loading ? (
          <ActivityIndicator color={c.onGradient} />
        ) : (
          <View style={styles.buttonInner}>
            {icon && <Ionicons name={icon} size={18} color={c.onGradient} />}
            <Text style={[styles.buttonLabel, { color: c.onGradient }]}>{label}</Text>
          </View>
        )}
      </LinearGradient>
    </PressableScale>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  const c = useThemeColors();
  return (
    <Text
      style={{
        color: c.textSecondary,
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.4,
        marginBottom: Spacing.sm,
        marginTop: Spacing.lg,
      }}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  buttonGradient: {
    borderRadius: Radius.full,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  buttonLabel: { fontSize: 16, fontWeight: '700' },
});
