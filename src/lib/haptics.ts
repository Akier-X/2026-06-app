import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * 触覚フィードバック。Webや未対応端末では静かに無視する。
 * 触り心地が「安いアプリ」と「良いアプリ」を分ける小さな積み重ね。
 */
export function hapticTap() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function hapticSelect() {
  if (Platform.OS === 'web') return;
  Haptics.selectionAsync().catch(() => {});
}

export function hapticSuccess() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
