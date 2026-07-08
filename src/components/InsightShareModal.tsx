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
import InkIcon from '@/components/art/InkIcon';
import { Colors, Fonts } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { shareImageFromRef } from '@/lib/shareUtils';

const { width: SW } = Dimensions.get('window');

// シェア画像はライトの和紙トーンで固定
const P = Colors.light;

interface Props {
  insight: string | null;
  onClose: () => void;
}

/**
 * 気づきのシェアカード — 一筆箋(いっぴつせん)をモチーフに、
 * 和紙の上へ明朝の言葉をしたため、隅に小さな花を添える。
 */
export default function InsightShareModal({ insight, onClose }: Props) {
  const cardRef = useRef<View>(null);

  if (!insight) return null;

  const handleShare = async () => {
    track('share', { kind: 'insight' });
    const fallback = `${insight}\n\n#ここロコーチ #こころの庭 #自己分析`;
    await shareImageFromRef(
      () => captureViewRef(cardRef, { format: 'png', quality: 1.0 }),
      fallback,
    );
  };

  const cardW = SW - 48;
  const bloomSize = 64;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={!!insight}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={() => {}}>

          {/* キャプチャ対象: 一筆箋カード */}
          <View ref={cardRef} style={[styles.card, { width: cardW }]}>
            <View style={styles.frame}>
              <Text style={styles.cardLabel}>けさの気づき</Text>
              <View style={styles.rule} />

              <Text style={styles.insightText}>{insight}</Text>

              <View style={styles.footerRow}>
                <View style={styles.brandRow}>
                  <View style={styles.seal}>
                    <Text style={styles.sealText}>心</Text>
                  </View>
                  <Text style={styles.appName}>ここロコーチ</Text>
                </View>
                <Svg width={bloomSize} height={bloomSize}>
                  <BloomGlyph
                    cx={bloomSize / 2}
                    cy={bloomSize / 2}
                    radius={bloomSize * 0.36}
                    seedKey={insight}
                    petals={7}
                    color={P.moodScale[3]}
                    coreColor={P.bloomCore}
                  />
                </Svg>
              </View>
            </View>
          </View>

          {/* アクションボタン（キャプチャ外） */}
          <Pressable style={styles.shareBtn} onPress={handleShare}>
            <InkIcon name="share" size={17} color={P.card} strokeWidth={2} />
            <Text style={styles.shareBtnText}>このカードをシェアする</Text>
          </Pressable>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>閉じる</Text>
          </Pressable>

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
    padding: 20,
  },
  container: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
  },
  card: {
    backgroundColor: P.background,
    borderRadius: 14,
    padding: 10,
  },
  frame: {
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 8,
    backgroundColor: P.card,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 14,
  },
  cardLabel: {
    fontSize: 11,
    letterSpacing: 4,
    color: P.textTertiary,
    fontWeight: '600',
  },
  rule: {
    width: 34,
    height: 2,
    backgroundColor: P.accent,
    borderRadius: 1,
    marginTop: 10,
    marginBottom: 18,
  },
  insightText: {
    fontFamily: Fonts.displayMedium,
    color: P.text,
    fontSize: 21,
    lineHeight: 36,
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10 },
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
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: P.primary,
    paddingHorizontal: 26,
    paddingVertical: 13,
    borderRadius: 50,
  },
  shareBtnText: {
    color: P.card,
    fontSize: 15,
    fontWeight: '700',
  },
  closeBtn: {
    paddingVertical: 8,
  },
  closeBtnText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    fontWeight: '600',
  },
});
