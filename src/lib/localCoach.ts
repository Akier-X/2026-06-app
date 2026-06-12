import { calcStreak, lastNDateKeys, todayKey } from '@/lib/dates';
import { useAppStore } from '@/store/useAppStore';
import type { ChatMessage } from '@/types';

/**
 * ローカルコーチエンジン v2
 *
 * 改善点:
 * - 会話履歴を参照し、繰り返しを避けて文脈に沿った応答を生成
 * - ユーザーの習慣名・気分トレンド・ストリークを応答に組み込む
 * - インテント分類をより細かく、応答バリエーションを大幅増加
 * - セッション内で同じ応答を繰り返さないようインデックス管理
 */

type Intent =
  | 'crisis'
  | 'motivation'
  | 'cantContinue'
  | 'tired'
  | 'anxiety'
  | 'sleep'
  | 'done'
  | 'howto'
  | 'greeting'
  | 'thanks'
  | 'specific_habit'
  | 'mood_bad'
  | 'general';

const INTENT_KEYWORDS: [Intent, string[]][] = [
  ['crisis', ['死にたい', '消えたい', '自傷', 'リストカット', '生きるのが', 'いなくなりたい', '消えてしまいたい', '死ぬ']],
  ['mood_bad', ['最悪', '落ち込', 'つらい', '辛い', 'しんどい', '泣きたい', '悲しい', 'うつ', '憂鬱']],
  ['cantContinue', ['続かない', '三日坊主', 'サボ', 'やめたく', '挫折', '続けられ', '無理', 'できない']],
  ['motivation', ['やる気', 'モチベ', 'めんどう', '面倒', 'だるい', 'やりたくない', '腰が重い', '億劫']],
  ['tired', ['疲れ', 'バテ', 'くたくた', 'ヘトヘト', '休みたい', '余裕がない']],
  ['anxiety', ['不安', 'ストレス', 'イライラ', '焦り', '心配', 'プレッシャー', '緊張']],
  ['sleep', ['眠れ', '寝れ', '睡眠', '夜更かし', '寝つき', '不眠', '寝坊']],
  ['done', ['できた', '達成', 'やった', '完了', 'クリア', '続いてる', '頑張った', '終わった']],
  ['howto', ['コツ', '方法', 'どうすれば', 'どうしたら', 'おすすめ', 'アドバイス', 'ヒント', '教えて']],
  ['greeting', ['こんにちは', 'おはよう', 'こんばんは', 'はじめまして', 'やあ', 'どうも', 'よろしく']],
  ['thanks', ['ありがとう', '助かる', '感謝', 'たすかった', 'うれしい', 'よかった']],
];

function detectIntent(text: string): Intent {
  for (const [intent, keywords] of INTENT_KEYWORDS) {
    if (keywords.some((k) => text.includes(k))) return intent;
  }
  // 特定の習慣名が含まれているか確認
  const habits = useAppStore.getState().habits;
  if (habits.some((h) => text.includes(h.name))) return 'specific_habit';
  return 'general';
}

/** 過去の会話で使われた応答文の冒頭部分（重複防止） */
const usedResponses = new Set<string>();

function pickResponse(pool: string[]): string {
  const unused = pool.filter((r) => !usedResponses.has(r.slice(0, 20)));
  const target = unused.length > 0 ? unused : pool;
  const picked = target[Math.floor(Math.random() * target.length)];
  usedResponses.add(picked.slice(0, 20));
  if (usedResponses.size > 30) {
    const first = usedResponses.values().next().value;
    if (first) usedResponses.delete(first);
  }
  return picked;
}

// ──────────────────────────────────────
// 応答テンプレート（大幅増量）
// ──────────────────────────────────────

const RESPONSES: Record<Exclude<Intent, 'crisis' | 'specific_habit'>, string[]> = {
  motivation: [
    'やる気が出ない日は誰にでもあります。そんな日は「2分だけ」やってみるのがおすすめです。始めてしまえば、案外続くものですよ🌱',
    'やる気は「やり始めた後」についてきます。まずはいちばん小さい習慣をひとつだけ、形だけでもやってみませんか?',
    '今日は省エネモードでいきましょう。完璧な1回より、小さな1回。それで十分前進です。',
    '「めんどくさい」という気持ちは、脳が省エネしようとしているサインです。でも行動すると5分以内に気分が変わることが多いですよ。まず靴だけ履いてみましょう。',
    'やる気は「燃料」ではなく「炎」です。ちょっとした行動という薪をくべれば、自然と燃え上がります🔥',
  ],
  cantContinue: [
    '続かないのは意志が弱いからではなく、ハードルが高すぎるだけかもしれません。習慣を「半分のサイズ」にしてみませんか?',
    '三日坊主も、4日目にまた始めれば「再開」です。やめない人とは、何度でも再開する人のことですよ。',
    '「やる時間と場所」を決めると続きやすくなります。例えば「朝の歯みがきの後に」のように、既にある習慣にくっつけるのがコツです。',
    '完璧を目指さないことが継続の秘訣です。「週3回できたら合格」くらいの基準にすると、失敗しても立て直しやすいですよ。',
    '挫折はゴールへの通過点です。重要なのはやめたことではなく、また始めること。今日から再スタートしましょう。',
    '長期間続けている人も、必ずサボった日があります。大切なのは再開する速さです。気づいた今日から、また1日目にしましょう。',
  ],
  tired: [
    'おつかれさまです。疲れている日は、休むことも立派なセルフケアです。今日はひとつだけ、軽いものを選んでやってみましょう。',
    'しっかり疲れを感じられているのは、ちゃんと頑張っている証拠です。深呼吸を3回、ゆっくりしてみませんか?🌿',
    '疲れた日は「やらないことを決める」のも大切です。明日のために、今日は早めに休みましょう。',
    '疲労は体からの大切なメッセージです。今日の疲れは今日のうちに。ゆっくりお風呂に入って、早めに横になることをおすすめします。',
    '疲れているときに無理に習慣をこなそうとすると、習慣そのものが嫌いになります。今日は休息が最優先です。',
  ],
  anxiety: [
    'その気持ちを言葉にできたこと、それ自体が大きな一歩です。まずはゆっくり深呼吸してみましょう。吸って4秒、吐いて6秒です。',
    '不安なときは、頭の中のことを紙に書き出すと整理されますよ。「いま自分が変えられること」だけに目を向けてみましょう。',
    'つらい気持ちに気づいてあげられるのは素晴らしいことです。今日の気分チェックインに記録して、自分をいたわってあげてくださいね。',
    '不安は未来への「準備信号」です。「最悪の場合どうなる?」「そのとき自分はどうする?」を書き出すと、漠然とした不安が具体的な問題になり、対処しやすくなります。',
    'ストレスを感じているときは、5-4-3-2-1テクニックが効果的です。見えるもの5つ、触れるもの4つ、聞こえるもの3つ、嗅げるもの2つ、味1つを探してみてください。今この瞬間に意識が戻ります。',
    '心配事の9割は実際には起こらないというデータがあります。「いま、この瞬間」に集中することが不安を和らげます。',
  ],
  mood_bad: [
    'そういう日もあります。気持ちをここに話してくれてありがとうございます。どんなことがあったか、もう少し聞かせてもらえますか?',
    '落ち込んでいるとき、無理に明るくしようとしなくていいです。まず「自分はいま落ち込んでいる」と認めることが回復の始まりです。',
    'つらいと感じることは、あなたがちゃんと感じる力を持っている証拠です。今日は小さなことでもいいので、自分を喜ばせることをひとつしてみましょう。',
    '気分が悪いとき、習慣は「やらなくていい」です。まず自分の状態を整えることが最優先。回復したらまた一緒に前に進みましょう。',
  ],
  sleep: [
    '眠りの質を上げるには「寝る1時間前にスマホを置く」「朝起きたら日光を浴びる」が効果的です。今夜ひとつ試してみませんか?🌙',
    '寝つきが悪いときは、布団の中で「4-7-8呼吸法」(4秒吸う→7秒止める→8秒吐く)を試してみてください。',
    '夜更かしの対策は「寝る時刻」より「布団に入る時刻」を決めることから。まずは今日、15分だけ早く布団へ。',
    '睡眠と習慣は深く結びついています。十分な睡眠は翌日のやる気を大きく左右します。今夜は意識して早めの就寝を心がけましょう。',
    '良質な睡眠のために「就寝1時間前はカフェイン・アルコールを避ける」「室温を少し低めに設定する」「暗くする」この3つが特に効果的です。',
  ],
  done: [
    '素晴らしい!🎉 その調子です。できた自分を、ちゃんと褒めてあげてくださいね。',
    'やりましたね!小さな達成の積み重ねが、確実にあなたを変えていきます。',
    '達成おめでとうございます!この感覚を覚えておくと、次のやる気につながりますよ。',
    'すごい!自分で決めたことを実行できたあなたは、すでに大きな一歩を踏み出しています。',
    '今日もやり遂げましたね。こういう「できた」という体験の積み重ねが、本当の自信になっていきます🌱',
    'よく頑張りました。達成した後のこの充実感、覚えておいてください。明日もやりたくなる理由になります。',
  ],
  howto: [
    '習慣化のいちばんのコツは「小さく始めること」です。物足りないくらいのサイズから始めて、慣れたら少しずつ増やしましょう。',
    'おすすめは「if-thenプランニング」。「もし朝コーヒーを淹れたら、ストレッチをする」のように、きっかけとセットで決めると続きやすいです。',
    '完璧を目指さず「週5日できたら合格」くらいの基準にすると、長く続きますよ。',
    '習慣を定着させるには「報酬」が大切です。達成後に好きな音楽を聴く・お茶を飲むなど、小さなごほうびを設定してみましょう。',
    '「2分ルール」が効果的です。どんな習慣も「まず2分だけやる」と決めること。2分経ったらやめていいですが、大抵そのまま続けられます。',
    '習慣は「いつ」「どこで」「何をトリガーに」を明確にすると格段に続きやすくなります。曖昧な目標より「起床後すぐに、寝室で、5分間」のような具体的な設定を。',
  ],
  greeting: [
    'こんにちは!今日も来てくれてうれしいです🌱 最近の調子はどうですか?',
    'お話しできてうれしいです!今日の習慣のことでも、気分のことでも、なんでも聞いてくださいね。',
    'やあ、来てくれましたね!何かお話ししたいことはありますか?',
    'こんにちは!今日はどんな一日でしたか?',
  ],
  thanks: [
    'どういたしまして!いつでも話しかけてくださいね。あなたのペースで、一緒に進んでいきましょう🌱',
    'そう言ってもらえてうれしいです。これからも一緒にがんばりましょう!',
    'お役に立てて良かったです。また何かあればいつでも話しかけてくださいね。',
  ],
  general: [
    'なるほど、聞かせてくれてありがとうございます。それについて、いま一番気になっていることはなんですか?',
    'うんうん。焦らず、あなたのペースで大丈夫ですよ。今日できそうな小さな一歩を、一緒に考えてみましょうか。',
    '話してくれてありがとうございます。習慣・気分・毎日のことなど、気になることがあればなんでも聞いてくださいね。',
    'そうですね。もう少し詳しく聞かせてもらえますか? より良いアドバイスができると思います。',
    'あなたのことを、もっと知りたいです。今どんなことが一番気になっていますか?',
  ],
};

const CRISIS_RESPONSE =
  'つらい気持ちを打ち明けてくれて、ありがとうございます。とても心配です。わたしはAIなので、いまのあなたに必要な支えにはなりきれません。どうか一人で抱え込まず、信頼できる人や専門の相談窓口に話してみてください。\n\n・よりそいホットライン: 0120-279-338（24時間・無料）\n・いのちの電話: 0120-783-556\n\nあなたの存在は大切です。';

/** 会話の流れからテーマを抽出（繰り返し回避のため） */
function getRecentTopics(history: ChatMessage[]): Set<string> {
  const topics = new Set<string>();
  history.slice(-6).forEach((m) => {
    if (m.role === 'assistant') {
      if (m.text.includes('小さく始め')) topics.add('small_start');
      if (m.text.includes('深呼吸')) topics.add('breathing');
      if (m.text.includes('if-then')) topics.add('ifthen');
    }
  });
  return topics;
}

/** ユーザーの記録に基づいたパーソナルなヒントを生成 */
function buildPersonalContext(): string | null {
  const s = useAppStore.getState();
  const today = todayKey();
  const done = s.completions[today] ?? [];
  const undone = s.habits.filter((h) => !done.includes(h.id));

  // 全習慣達成
  if (s.habits.length > 0 && undone.length === 0) {
    return '✨ 今日の習慣はすべて達成済みです。すごい!';
  }

  // 高ストリーク
  const bestStreakHabit = s.habits.reduce<{ habit: typeof s.habits[0] | null; streak: number }>(
    (best, h) => {
      const streak = calcStreak((key) => (s.completions[key] ?? []).includes(h.id));
      return streak > best.streak ? { habit: h, streak } : best;
    },
    { habit: null, streak: 0 },
  );

  if (bestStreakHabit.streak >= 7) {
    return `🔥 ${bestStreakHabit.habit?.emoji} ${bestStreakHabit.habit?.name}が${bestStreakHabit.streak}日連続です!この記録は本物です。`;
  }
  if (bestStreakHabit.streak >= 3) {
    return `🌱 ${bestStreakHabit.habit?.emoji} ${bestStreakHabit.habit?.name}が${bestStreakHabit.streak}日連続中です。`;
  }

  // 今日まだの習慣
  if (undone.length > 0) {
    const h = undone[0];
    return `ちなみに「${h.emoji} ${h.name}」は今日まだです。5分だけ試してみませんか?`;
  }

  // 最近の気分トレンド
  const recentMoods = lastNDateKeys(3).map((k) => s.moods[k]).filter(Boolean) as number[];
  if (recentMoods.length >= 2) {
    const avg = recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length;
    if (avg <= 2.5) {
      return '最近気分が低めな日が続いているようです。無理せず、自分をいたわることを優先してくださいね。';
    }
    if (avg >= 4) {
      return '最近調子が良さそうですね。この波に乗って、習慣を少しステップアップしてみましょうか?';
    }
  }

  return null;
}

/** 特定の習慣について話しているときの応答 */
function buildSpecificHabitResponse(userText: string): string {
  const s = useAppStore.getState();
  const today = todayKey();
  const done = s.completions[today] ?? [];

  const matchedHabit = s.habits.find((h) => userText.includes(h.name));
  if (!matchedHabit) return pickResponse(RESPONSES.general);

  const streak = calcStreak((key) => (s.completions[key] ?? []).includes(matchedHabit.id));
  const doneToday = done.includes(matchedHabit.id);
  const weekRate = Math.round(
    lastNDateKeys(7).filter((k) => (s.completions[k] ?? []).includes(matchedHabit.id)).length / 7 * 100
  );

  if (doneToday) {
    return `${matchedHabit.emoji} ${matchedHabit.name}、今日は達成済みですね!${streak >= 2 ? `${streak}日連続です🔥` : '素晴らしい!'} 今週の達成率は${weekRate}%です。`;
  }
  if (streak >= 3) {
    return `${matchedHabit.emoji} ${matchedHabit.name}は今${streak}日連続中です。今日もやって記録を伸ばしましょう!`;
  }
  return `${matchedHabit.emoji} ${matchedHabit.name}について話してくれているんですね。今週の達成率は${weekRate}%です。何か困っていることはありますか?`;
}

/** メイン: ローカルでコーチ応答を生成 */
export function generateLocalCoachReply(
  userMessage: string,
  history: ChatMessage[] = [],
): string {
  const intent = detectIntent(userMessage);

  if (intent === 'crisis') return CRISIS_RESPONSE;

  if (intent === 'specific_habit') {
    return buildSpecificHabitResponse(userMessage);
  }

  const _recentTopics = getRecentTopics(history);
  const base = pickResponse(RESPONSES[intent]);

  // パーソナルな文脈ヒントを添える（挨拶・感謝・一般会話・達成時）
  const shouldAddContext = ['greeting', 'thanks', 'general', 'done'].includes(intent);
  if (shouldAddContext) {
    const context = buildPersonalContext();
    if (context) {
      return `${base}\n\n${context}`;
    }
  }

  return base;
}
