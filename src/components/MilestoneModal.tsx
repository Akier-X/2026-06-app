import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { captureRef as captureViewRef } from 'react-native-view-shot';

import Bloom from '@/components/art/Bloom';
import InkIcon from '@/components/art/InkIcon';
import { Fonts, Radius, Spacing, useThemeColors } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { shareImageFromRef } from '@/lib/shareUtils';

export interface MilestoneData {
  key: string;
  days: number;
  habitName: string;
  habitEmoji: string;
}

const MILESTONE_CONFIG: Record<
  number,
  { title: string; kanji: string; message: string; petals: number }
> = {
  7: {
    title: '一週間、咲きました',
    kanji: '七日',
    message: '7日連続は素晴らしい一歩です。この調子で続けましょう。',
    petals: 7,
  },
  30: {
    title: 'ひと月、根づきました',
    kanji: '三十日',
    message: '30日間やり遂げました。もはや本当の習慣になっています。',
    petals: 10,
  },
  100: {
    title: '百日、満開です',
    kanji: '百日',
    message: '100日連続という偉業です。あなたは本物の習慣の人です。',
    petals: 13,
  },
};

export const MILESTONE_DAYS = [7, 30, 100] as const;

interface Props {
  milestone: MilestoneData | null;
  onClose: () => void;
}

export default function MilestoneModal({ milestone, onClose }: Props) {
  const c = useThemeColors();
  const cardRef = useRef<View>(null);
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

  const handleShare = async () => {
    track('share', { kind: 'milestone', days: milestone.days });
    const fallback =
      `「${milestone.habitName}」${milestone.days}日連続達成。\n` +
      `${config.message}\n\n#ここロコーチ #習慣化`;
    await shareImageFromRef(
      () => captureViewRef(cardRef, { format: 'png', quality: 1.0 }),
      fallback,
    );
  };

  const bloomSize = 132;

  return (
    <Modal transparent animationType="none" visible={!!milestone} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          ref={cardRef as unknown as React.RefObject<View>}
          style={[
            styles.card,
            { backgroundColor: c.card, borderColor: c.border },
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}>
          {/* 記念の一輪: 節目の日数だけ花びらが増える */}
          <View style={styles.bloomWrap}>
            <Svg width={bloomSize} height={bloomSize} style={StyleSheet.absoluteFill}>
              <Circle
                cx={bloomSize / 2}
                cy={bloomSize / 2}
                r={bloomSize / 2 - 2}
                stroke={c.bloomCore}
                strokeWidth={1.5}
                strokeDasharray="1 5"
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
            <Bloom
              size={bloomSize - 16}
              seedKey={`milestone-${milestone.key}`}
              petals={config.petals}
              color={c.moodScale[4]}
              coreColor={c.bloomCore}
            />
          </View>
          <Text style={[styles.kanji, { color: c.accent }]}>{config.kanji}</Text>
          <Text style={[styles.title, { color: c.text }]}>{config.title}</Text>
          <Text style={[styles.habitName, { color: c.primary }]}>
            {milestone.habitEmoji} {milestone.habitName}
          </Text>
          <View style={styles.daysRow}>
            <InkIcon name="ember" size={18} color={c.accent} strokeWidth={1.9} />
            <Text style={[styles.days, { color: c.accent }]}>{milestone.days}日連続</Text>
          </View>
          <Text style={[styles.message, { color: c.textSecondary }]}>{config.message}</Text>
          <Pressable
            onPress={handleShare}
            style={[styles.shareButton, { borderColor: c.border }]}>
            <InkIcon name="share" size={16} color={c.textSecondary} strokeWidth={1.8} />
            <Text style={[styles.shareButtonText, { color: c.textSecondary }]}>シェアする</Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            style={[styles.button, { backgroundColor: c.primary }]}>
            <Text style={styles.buttonText}>ありがとう！</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 20, 16, 0.6)',
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
  bloomWrap: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kanji: { fontFamily: Fonts.display, fontSize: 30, letterSpacing: 6, marginTop: -4 },
  title: { fontSize: 20, fontFamily: Fonts.display, textAlign: 'center', letterSpacing: 1 },
  habitName: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  daysRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  days: { fontSize: 18, fontWeight: '800' },
  message: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginVertical: Spacing.xs },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  shareButtonText: { fontSize: 15, fontWeight: '700' },
  button: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
