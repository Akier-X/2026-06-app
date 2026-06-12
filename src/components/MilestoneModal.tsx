import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, useThemeColors } from '@/constants/theme';

export interface MilestoneData {
  key: string;
  days: number;
  habitName: string;
  habitEmoji: string;
}

const MILESTONE_CONFIG: Record<number, { title: string; message: string; badge: string }> = {
  7: {
    title: '1週間達成!',
    message: '7日連続は素晴らしい一歩です。\nこの調子で続けましょう！',
    badge: '🥉',
  },
  30: {
    title: '1ヶ月達成!',
    message: '30日間やり遂げました。\nもはや本当の習慣になっています！',
    badge: '🥈',
  },
  100: {
    title: '100日達成!',
    message: '100日連続という偉業です。\nあなたは本物の習慣マスターです！',
    badge: '🏆',
  },
};

export const MILESTONE_DAYS = [7, 30, 100] as const;

interface Props {
  milestone: MilestoneData | null;
  onClose: () => void;
}

export default function MilestoneModal({ milestone, onClose }: Props) {
  const c = useThemeColors();
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (milestone) {
      scaleAnim.setValue(0.6);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [milestone, scaleAnim, opacityAnim]);

  if (!milestone) return null;
  const config = MILESTONE_CONFIG[milestone.days];
  if (!config) return null;

  return (
    <Modal transparent animationType="none" visible={!!milestone} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: c.card, borderColor: c.border },
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}>
          <Text style={styles.badge}>{config.badge}</Text>
          <Text style={styles.habitEmoji}>{milestone.habitEmoji}</Text>
          <Text style={[styles.title, { color: c.text }]}>{config.title}</Text>
          <Text style={[styles.habitName, { color: c.primary }]}>
            {milestone.habitName}
          </Text>
          <Text style={[styles.days, { color: c.accent }]}>🔥 {milestone.days}日連続</Text>
          <Text style={[styles.message, { color: c.textSecondary }]}>{config.message}</Text>
          <Pressable
            onPress={onClose}
            style={[styles.button, { backgroundColor: c.primary }]}>
            <Text style={styles.buttonText}>ありがとう!</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  badge: { fontSize: 48 },
  habitEmoji: { fontSize: 36 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  habitName: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  days: { fontSize: 20, fontWeight: '800' },
  message: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginVertical: Spacing.xs },
  button: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
