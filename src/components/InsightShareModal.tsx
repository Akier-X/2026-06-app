import { useRef } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { captureRef as captureViewRef } from 'react-native-view-shot';

import { shareImageFromRef } from '@/lib/shareUtils';

const { width: SW } = Dimensions.get('window');

interface Props {
  insight: string | null;
  onClose: () => void;
}

export default function InsightShareModal({ insight, onClose }: Props) {
  const cardRef = useRef<View>(null);

  if (!insight) return null;

  const handleShare = async () => {
    const fallback =
      `💡 ${insight}\n\n#ここロコーチ #習慣化 #自己分析`;
    await shareImageFromRef(
      () => captureViewRef(cardRef, { format: 'png', quality: 1.0 }),
      fallback,
    );
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={!!insight}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={() => {}}>

          {/* キャプチャ対象カード */}
          <View ref={cardRef} style={styles.card}>
            {/* 装飾サークル */}
            <View style={[styles.decoCircle, styles.decoTop]} />
            <View style={[styles.decoCircle, styles.decoBottom]} />

            <View style={styles.cardInner}>
              <Text style={styles.appEmoji}>🌿</Text>
              <Text style={styles.appName}>ここロコーチ</Text>
              <Text style={styles.cardLabel}>AIが発見したインサイト</Text>

              <View style={styles.divider} />

              <Text style={styles.insightText}>{insight}</Text>

              <View style={styles.divider} />

              <Text style={styles.hashtags}>#ここロコーチ  #習慣化  #自己分析</Text>
            </View>
          </View>

          {/* アクションボタン（キャプチャ外） */}
          <Pressable style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>📤  このカードをシェアする</Text>
          </Pressable>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>閉じる</Text>
          </Pressable>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

const CARD_BG = '#1A6650';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
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
    width: SW - 40,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  decoCircle: {
    position: 'absolute',
    width: SW * 0.75,
    height: SW * 0.75,
    borderRadius: SW * 0.375,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  decoTop: { top: -(SW * 0.25), right: -(SW * 0.18) },
  decoBottom: { bottom: -(SW * 0.2), left: -(SW * 0.15) },
  cardInner: {
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  appEmoji: { fontSize: 36 },
  appName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  divider: {
    width: 40,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: 4,
  },
  insightText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 30,
  },
  hashtags: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  shareBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 50,
  },
  shareBtnText: {
    color: CARD_BG,
    fontSize: 15,
    fontWeight: '800',
  },
  closeBtn: {
    paddingVertical: 8,
  },
  closeBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
});
