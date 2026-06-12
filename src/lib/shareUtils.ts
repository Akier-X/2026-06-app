import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

export async function shareImageFromRef(
  captureAsync: () => Promise<string>,
  fallbackText: string,
): Promise<void> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      const uri = await captureAsync();
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'シェアする' });
      return;
    }
  } catch { /* fall through to text share */ }
  try {
    await Share.share({ message: fallbackText });
  } catch { /* ignore */ }
}
