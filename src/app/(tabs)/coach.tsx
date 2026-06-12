import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing, useThemeColors } from '@/constants/theme';
import { sendToCoachStreaming } from '@/lib/coach';
import { isModelDownloaded, isNativeSupported, loadModel } from '@/lib/llm';
import { newId, useAppStore } from '@/store/useAppStore';
import type { ChatMessage } from '@/types';

type LLMStatus = 'checking' | 'not-downloaded' | 'loading' | 'ready' | 'unavailable';

export default function CoachScreen() {
  const c = useThemeColors();
  const chat = useAppStore((s) => s.chat);
  const appendChat = useAppStore((s) => s.appendChat);
  const consumeCoachMessage = useAppStore((s) => s.consumeCoachMessage);
  const coachMessagesLeftToday = useAppStore((s) => s.coachMessagesLeftToday);
  const isPremium = useAppStore((s) => s.isPremium);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [llmStatus, setLLMStatus] = useState<LLMStatus>('checking');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const left = coachMessagesLeftToday();

  // 起動時にモデル状態を確認し、ダウンロード済みならロード
  useEffect(() => {
    (async () => {
      if (!isNativeSupported()) {
        setLLMStatus('unavailable');
        return;
      }
      const downloaded = await isModelDownloaded();
      if (!downloaded) {
        setLLMStatus('not-downloaded');
        return;
      }
      setLLMStatus('loading');
      const ok = await loadModel();
      setLLMStatus(ok ? 'ready' : 'unavailable');
    })();
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    if (!consumeCoachMessage()) {
      router.push('/paywall');
      return;
    }

    const userMessage: ChatMessage = {
      id: newId(),
      role: 'user',
      text,
      createdAt: new Date().toISOString(),
    };
    appendChat(userMessage);
    setInput('');
    setSending(true);
    setStreamingText('');

    try {
      const reply = await sendToCoachStreaming(
        [...chat, userMessage],
        (token) => {
          setStreamingText((prev) => (prev ?? '') + token);
          setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 0);
        },
      );
      appendChat({
        id: newId(),
        role: 'assistant',
        text: reply,
        createdAt: new Date().toISOString(),
      });
    } catch {
      appendChat({
        id: newId(),
        role: 'assistant',
        text: 'ごめんなさい、うまく応答できませんでした。もう一度試してみてください。',
        createdAt: new Date().toISOString(),
      });
    } finally {
      setStreamingText(null);
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const statusBadge = () => {
    if (llmStatus === 'ready') {
      return (
        <View style={[styles.badge, { backgroundColor: '#1A6650' }]}>
          <Text style={styles.badgeText}>🧠 AIコーチ（LLM）</Text>
        </View>
      );
    }
    if (llmStatus === 'loading') {
      return (
        <View style={[styles.badge, { backgroundColor: c.card, borderWidth: 1, borderColor: c.border }]}>
          <ActivityIndicator size="small" color={c.primary} />
          <Text style={[styles.badgeText, { color: c.textSecondary }]}>モデル読み込み中...</Text>
        </View>
      );
    }
    if (llmStatus === 'not-downloaded') {
      return (
        <Pressable
          style={[styles.badge, { backgroundColor: c.card, borderWidth: 1, borderColor: c.border }]}
          onPress={() => router.push('/(tabs)/settings')}
        >
          <Text style={[styles.badgeText, { color: c.textSecondary }]}>
            💡 設定からLLMをDLすると返答が向上します
          </Text>
        </Pressable>
      );
    }
    return null;
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>

      {statusBadge()}

      <FlatList
        ref={listRef}
        data={chat}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🧘</Text>
            <Text style={[styles.emptyTitle, { color: c.text }]}>AIコーチに相談しよう</Text>
            <Text style={[styles.emptyBody, { color: c.textSecondary }]}>
              「やる気が出ない」「続けるコツは?」など、なんでも話しかけてください。
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const mine = item.role === 'user';
          return (
            <View
              style={[
                styles.bubble,
                mine
                  ? { backgroundColor: c.primary, alignSelf: 'flex-end' }
                  : { backgroundColor: c.card, alignSelf: 'flex-start' },
              ]}>
              <Text style={{ color: mine ? '#fff' : c.text, fontSize: 15, lineHeight: 22 }}>
                {item.text}
              </Text>
            </View>
          );
        }}
        ListFooterComponent={
          streamingText !== null ? (
            <View style={[styles.bubble, { backgroundColor: c.card, alignSelf: 'flex-start' }]}>
              <Text style={{ color: c.text, fontSize: 15, lineHeight: 22 }}>
                {streamingText.length === 0 ? (
                  <Text style={{ color: c.textSecondary }}>考え中...</Text>
                ) : streamingText}
              </Text>
            </View>
          ) : null
        }
      />

      {!isPremium && (
        <Text style={[styles.quota, { color: c.textSecondary }]}>
          今日の残り回数: {left}回（プレミアムで無制限）
        </Text>
      )}

      <View style={[styles.inputRow, { backgroundColor: c.card, borderColor: c.border }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="メッセージを入力..."
          placeholderTextColor={c.textSecondary}
          multiline
          style={[styles.input, { color: c.text }]}
          onSubmitEditing={send}
        />
        <Pressable
          onPress={send}
          disabled={sending || !input.trim()}
          style={[
            styles.sendButton,
            { backgroundColor: c.primary, opacity: sending || !input.trim() ? 0.4 : 1 },
          ]}>
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="arrow-up" size={20} color="#fff" />
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: Spacing.sm,
    marginBottom: 2,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  list: { padding: Spacing.md, gap: Spacing.sm, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptyBody: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  bubble: {
    maxWidth: '82%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  quota: { fontSize: 12, textAlign: 'center', marginBottom: Spacing.xs },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    margin: Spacing.md,
    marginTop: 0,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingLeft: Spacing.md,
    paddingRight: 6,
    paddingVertical: 6,
    gap: Spacing.sm,
  },
  input: { flex: 1, fontSize: 15, maxHeight: 120, paddingTop: 8, paddingBottom: 8 },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
