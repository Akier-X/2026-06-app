import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';

import { PrimaryButton, SectionTitle } from '@/components/ui';
import { SUPPORT_EMAIL } from '@/constants/legal';
import { Radius, Spacing, useThemeColors } from '@/constants/theme';
import {
  buildFeedbackMailto,
  isFeedbackServerConfigured,
  submitFeedback,
  type FeedbackCategory,
} from '@/lib/feedback';

const CATEGORIES: { id: FeedbackCategory; emoji: string; label: string }[] = [
  { id: 'bug', emoji: '🐞', label: '不具合' },
  { id: 'idea', emoji: '💡', label: '要望' },
  { id: 'question', emoji: '❓', label: '質問' },
  { id: 'other', emoji: '💬', label: 'その他' },
];

export default function FeedbackScreen() {
  const c = useThemeColors();
  const [category, setCategory] = useState<FeedbackCategory>('idea');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);

  const sendViaMail = () => {
    Linking.openURL(buildFeedbackMailto(SUPPORT_EMAIL, { category, message }));
  };

  const onSubmit = async () => {
    const text = message.trim();
    if (!text) return;

    if (!isFeedbackServerConfigured()) {
      sendViaMail();
      return;
    }

    setSending(true);
    try {
      await submitFeedback({ category, message: text, contact: contact.trim() });
      Alert.alert('ありがとうございます!', 'いただいたご意見は今後のアップデートに活用させていただきます。');
      router.back();
    } catch {
      Alert.alert(
        '送信できませんでした',
        '通信に失敗しました。メールで送信しますか?',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: 'メールで送る', onPress: sendViaMail },
        ],
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionTitle>種類</SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CATEGORIES.map((cat) => {
            const selected = category === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setCategory(cat.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? c.primarySoft : c.card,
                    borderColor: selected ? c.primary : c.border,
                  },
                ]}>
                <Text style={{ fontSize: 15 }}>
                  {cat.emoji} <Text style={{ color: c.text, fontWeight: '600' }}>{cat.label}</Text>
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <SectionTitle>内容</SectionTitle>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="お気づきの点・欲しい機能など、なんでもお書きください"
          placeholderTextColor={c.textSecondary}
          multiline
          style={[
            styles.input,
            styles.messageInput,
            { backgroundColor: c.card, color: c.text, borderColor: c.border },
          ]}
        />

        <SectionTitle>返信先(任意)</SectionTitle>
        <TextInput
          value={contact}
          onChangeText={setContact}
          placeholder="メールアドレス(返信が必要な場合)"
          placeholderTextColor={c.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          style={[
            styles.input,
            { backgroundColor: c.card, color: c.text, borderColor: c.border },
          ]}
        />

        <PrimaryButton
          label="送信する"
          onPress={onSubmit}
          loading={sending}
          disabled={!message.trim()}
          style={styles.button}
        />
        <Text style={[styles.note, { color: c.textSecondary }]}>
          いただいた内容はアプリ改善の目的にのみ利用します。
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  chip: {
    borderWidth: 1.5,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    marginRight: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
  },
  messageInput: { minHeight: 140, textAlignVertical: 'top' },
  button: { marginTop: Spacing.lg },
  note: { fontSize: 12, textAlign: 'center', marginTop: Spacing.md },
});
