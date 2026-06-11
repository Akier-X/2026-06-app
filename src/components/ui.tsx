import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Radius, Spacing, useThemeColors } from '@/constants/theme';

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useThemeColors();
  return (
    <View
      style={[
        {
          backgroundColor: c.card,
          borderRadius: Radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border,
          padding: Spacing.md,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useThemeColors();
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        {
          backgroundColor: c.primary,
          opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
          borderRadius: Radius.full,
          paddingVertical: 14,
          alignItems: 'center',
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{label}</Text>
      )}
    </Pressable>
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
        marginBottom: Spacing.sm,
        marginTop: Spacing.lg,
      }}>
      {children}
    </Text>
  );
}
