import { useRef } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg from 'react-native-svg';
import { captureRef as captureViewRef } from 'react-native-view-shot';

import { BloomGlyph } from '@/components/art/Bloom';
import InkIcon, { MOOD_ICONS } from '@/components/art/InkIcon';
import { Colors, Fonts } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { shareImageFromRef } from '@/lib/shareUtils';
import { useAppStore } from '@/store/useAppStore';
import type { MoodValue } from '@/types';

const { width: SW } = Dimensions.get('window');

/**
 * 「今日の一輪」シェアカード — 短冊(たんざく)をモチーフにした縦型カード。
 * 生成アートの花・縦書きの日付・淡い和紙。スクショ映えを最優先に設計。
 */

export interface BloomShareData {
  dateKey: string;
  done: number;
  total: number;
  mood: MoodValue | undefined;
  streak: number;
}

// シェア画像はライトの和紙トーンで固定（受け取る側の画面設定に依存させない）
const P = Colors.light;

function dateLabels(dateKey: string): { vertical: string[]; weekday: string } {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const kanjiDigits = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  const kanjiNum = (n: number): string => {
    if (n <= 10) return kanjiDigits[n];
    if (n < 20) return `十${n % 10 === 0 ? '' : kanjiDigits[n % 10]}`;
    return `${kanjiDigits[Math.floor(n / 10)]}十${n % 10 === 0 ? '' : kanjiDigits[n % 10]}`;
  };
  const chars = [...`${kanjiNum(m)}月${kanjiNum(d)}日`];
  return { vertical: chars, weekday: `${weekdays[date.getDay()]}曜日` };
}

export default function BloomShareModal({
  data,
  onClose,
}: {
  data: BloomShareData | null;
  onClose: () => void;
}) {
  const cardRef = useRef<View>(null);
  const bloomTheme = useAppStore((s) => s.bloomTheme);

  if (!data) return null;

  const { vertical, weekday } = dateLabels(data.dateKey);
  const bloomColor =
    data.mood && data.mood > 0
      ? P.moodScale[data.mood - 1]
      : P.moodScale[2];
  const cardW = Math.min(SW - 48, 340);
  const cardH = cardW * 1.3;
  const bloomSize = cardW * 0.66;

  const handleShare = async () => {
    track('share', { kind: 'bloom' });
    const fallback =
      `今日の一輪が咲きました。\n` +
      `習慣 ${data.done}/${data.total}${data.streak > 0 ? ` ・ ${data.streak}日目` : ''}\n\n` +
      `#ここロコーチ #今日の一輪 #習慣化`;
    await shareImageFromRef(
      () => captureViewRef(cardRef, { format: 'png', quality: 1.0 }),
      fallback,
    );
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={() => {}}>
          {/* ── キャプチャ対象: 短冊カード ── */}
          <View
            ref={cardRef}
            style={[styles.card, { width: cardW, height: cardH }]}>
            <View style={styles.frame}>
              {/* 縦書きの日付（掛け軸のように右端へ） */}
              <View style={styles.dateColumn}>
                {vertical.map((ch, i) => (
                  <Text key={i} style={styles.dateChar}>
                    {ch}
                  </Text>
                ))}
                <View style={styles.dateSeal}>
                  <Text style={styles.dateSealText}>{weekday}</Text>
                </View>
              </View>

              {/* 今日の一輪 */}
              <View style={styles.bloomWrap}>
                <Svg width={bloomSize} height={bloomSize}>
                  <BloomGlyph
                    cx={bloomSize / 2}
                    cy={bloomSize / 2}
                    radius={bloomSize * 0.37}
                    seedKey={data.dateKey}
                    petals={data.done}
                    color={bloomColor}
                    coreColor={P.bloomCore}
                    progress={data.total > 0 ? data.done / data.total : 0}
                    theme={bloomTheme}
                  />
                </Svg>
                <Text style={styles.caption}>今日の一輪</Text>
                <View style={styles.statsRow}>
                  <Text style={styles.stats}>
                    習慣 {data.done}
                    <Text style={styles.statsMuted}>/{data.total}</Text>
                  </Text>
                  {data.streak > 0 && (
                    <>
                      <View style={styles.statsDot} />
                      <Text style={styles.stats}>{data.streak}日目</Text>
                    </>
                  )}
                  {data.mood ? (
                    <>
                      <View style={styles.statsDot} />
                      <InkIcon
                        name={MOOD_ICONS[data.mood - 1]}
                        size={16}
                        color={P.textSecondary}
                        strokeWidth={1.6}
                      />
                    </>
                  ) : null}
                </View>
              </View>

              {/* 落款（らっかん）風のアプリ名 */}
              <View style={styles.footer}>
                <View style={styles.seal}>
                  <Text style={styles.sealText}>心</Text>
                </View>
                <Text style={styles.appName}>ここロコーチ</Text>
              </View>
            </View>
          </View>

          {/* ── アクション（キャプチャ外） ── */}
          <View style={styles.actions}>
            <Pressable style={styles.shareBtn} onPress={handleShare}>
              <InkIcon name="share" size={18} color={P.card} strokeWidth={2} />
              <Text style={styles.shareBtnText}>この一輪をシェア</Text>
            </Pressable>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>閉じる</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 20, 16, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: P.background,
    borderRadius: 14,
    padding: 10,
  },
  frame: {
    flex: 1,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 8,
    backgroundColor: P.card,
    overflow: 'hidden',
  },
  dateColumn: {
    position: 'absolute',
    top: 18,
    right: 16,
    alignItems: 'center',
    gap: 1,
  },
  dateChar: {
    fontFamily: Fonts.displayMedium,
    fontSize: 17,
    color: P.text,
    lineHeight: 21,
  },
  dateSeal: { marginTop: 8, transform: [{ rotate: '90deg' }] },
  dateSealText: {
    fontSize: 9,
    letterSpacing: 2,
    color: P.textTertiary,
    fontWeight: '600',
  },
  bloomWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
  },
  caption: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: P.text,
    letterSpacing: 6,
    marginTop: 2,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  stats: { fontSize: 13, color: P.textSecondary, fontWeight: '600' },
  statsMuted: { color: P.textTertiary },
  statsDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: P.border },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 16,
  },
  seal: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: P.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealText: { color: P.card, fontSize: 11, fontFamily: Fonts.display },
  appName: { fontSize: 11, color: P.textTertiary, letterSpacing: 1.5, fontWeight: '600' },
  actions: { alignItems: 'center', gap: 10, marginTop: 18 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: P.primary,
    paddingHorizontal: 26,
    paddingVertical: 13,
    borderRadius: 50,
  },
  shareBtnText: { color: P.card, fontSize: 15, fontWeight: '700' },
  closeBtn: { paddingVertical: 6 },
  closeBtnText: { color: 'rgba(255,255,255,0.65)', fontSize: 14, fontWeight: '600' },
});
