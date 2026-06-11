import { calcStreak, todayKey } from '@/lib/dates';
import { useAppStore } from '@/store/useAppStore';

/**
 * ローカルコーチエンジン
 *
 * 外部APIを一切使わず、端末内で完結するルールベースのコーチ。
 * ユーザーの記録(習慣・ストリーク・気分)と入力の意図判定を組み合わせて、
 * 文脈に合った応援メッセージを生成する。APIキー不要・通信費ゼロ・オフライン動作。
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
  | 'general';

const INTENT_KEYWORDS: [Intent, string[]][] = [
  ['crisis', ['死にたい', '消えたい', '自傷', 'リストカット', '生きるのが', 'いなくなりたい']],
  ['cantContinue', ['続かない', '三日坊主', 'サボ', 'やめたく', '挫折', '続けられ']],
  ['motivation', ['やる気', 'モチベ', 'めんどう', '面倒', 'だるい', 'やりたくない']],
  ['tired', ['疲れ', 'しんどい', 'バテ', 'くたくた', 'ヘトヘト']],
  ['anxiety', ['不安', '落ち込', 'つらい', '辛い', 'ストレス', 'イライラ', '焦り', '心配']],
  ['sleep', ['眠れ', '寝れ', '睡眠', '夜更かし', '寝つき']],
  ['done', ['できた', '達成', 'やった', '完了', 'クリア', '続いてる']],
  ['howto', ['コツ', '方法', 'どうすれば', 'どうしたら', 'おすすめ', 'アドバイス']],
  ['greeting', ['こんにちは', 'おはよう', 'こんばんは', 'はじめまして', 'やあ']],
  ['thanks', ['ありがとう', '助かる', '感謝']],
];

function detectIntent(text: string): Intent {
  for (const [intent, keywords] of INTENT_KEYWORDS) {
    if (keywords.some((k) => text.includes(k))) return intent;
  }
  return 'general';
}

const RESPONSES: Record<Exclude<Intent, 'crisis'>, string[]> = {
  motivation: [
    'やる気が出ない日は誰にでもあります。そんな日は「2分だけ」やってみるのがおすすめです。始めてしまえば、案外続くものですよ🌱',
    'やる気は「やり始めた後」についてきます。まずはいちばん小さい習慣をひとつだけ、形だけでもやってみませんか?',
    '今日は省エネモードでいきましょう。完璧な1回より、小さな1回。それで十分前進です。',
  ],
  cantContinue: [
    '続かないのは意志が弱いからではなく、ハードルが高すぎるだけかもしれません。習慣を「半分のサイズ」にしてみませんか?',
    '三日坊主も、4日目にまた始めれば「再開」です。やめない人とは、何度でも再開する人のことですよ。',
    '「やる時間と場所」を決めると続きやすくなります。例えば「朝の歯みがきの後に」のように、既にある習慣にくっつけるのがコツです。',
  ],
  tired: [
    'おつかれさまです。疲れている日は、休むことも立派なセルフケアです。今日はひとつだけ、軽いものを選んでやってみましょう。',
    'しっかり疲れを感じられているのは、ちゃんと頑張っている証拠です。深呼吸を3回、ゆっくりしてみませんか?🌿',
    '疲れた日は「やらないことを決める」のも大切です。明日のために、今日は早めに休みましょう。',
  ],
  anxiety: [
    'その気持ちを言葉にできたこと、それ自体が大きな一歩です。まずはゆっくり深呼吸してみましょう。吸って4秒、吐いて6秒です。',
    '不安なときは、頭の中のことを紙に書き出すと整理されますよ。「いま自分が変えられること」だけに目を向けてみましょう。',
    'つらい気持ちに気づいてあげられるのは素晴らしいことです。今日の気分チェックインに記録して、自分をいたわってあげてくださいね。',
  ],
  sleep: [
    '眠りの質を上げるには「寝る1時間前にスマホを置く」「朝起きたら日光を浴びる」が効果的です。今夜ひとつ試してみませんか?🌙',
    '寝つきが悪いときは、布団の中で「4-7-8呼吸法」(4秒吸う→7秒止める→8秒吐く)を試してみてください。',
    '夜更かしの対策は「寝る時刻」より「布団に入る時刻」を決めることから。まずは今日、15分だけ早く布団へ。',
  ],
  done: [
    '素晴らしい!🎉 その調子です。できた自分を、ちゃんと褒めてあげてくださいね。',
    'やりましたね!小さな達成の積み重ねが、確実にあなたを変えていきます。',
    '達成おめでとうございます!この感覚を覚えておくと、次のやる気につながりますよ。',
  ],
  howto: [
    '習慣化のいちばんのコツは「小さく始めること」です。物足りないくらいのサイズから始めて、慣れたら少しずつ増やしましょう。',
    'おすすめは「if-thenプランニング」。「もし朝コーヒーを淹れたら、ストレッチをする」のように、きっかけとセットで決めると続きやすいです。',
    '完璧を目指さず「週5日できたら合格」くらいの基準にすると、長く続きますよ。',
  ],
  greeting: [
    'こんにちは!今日も来てくれてうれしいです🌱 最近の調子はどうですか?',
    'お話しできてうれしいです!今日の習慣のことでも、気分のことでも、なんでも聞いてくださいね。',
  ],
  thanks: [
    'どういたしまして!いつでも話しかけてくださいね。あなたのペースで、一緒に進んでいきましょう🌱',
    'そう言ってもらえてうれしいです。これからも一緒にがんばりましょう!',
  ],
  general: [
    'なるほど、聞かせてくれてありがとうございます。それについて、いま一番気になっていることはなんですか?',
    'うんうん。焦らず、あなたのペースで大丈夫ですよ。今日できそうな小さな一歩を、一緒に考えてみましょうか。',
    '話してくれてありがとうございます。続けること・気分のこと・習慣のコツなど、気になることがあればなんでも聞いてくださいね。',
  ],
};

const CRISIS_RESPONSE =
  'つらい気持ちを打ち明けてくれて、ありがとうございます。とても心配です。わたしはAIなので、いまのあなたに必要な支えにはなりきれません。どうか一人で抱え込まず、信頼できる人や専門の相談窓口に話してみてください。\n\n・まもろうよ こころ(厚生労働省): https://www.mhlw.go.jp/mamorouyokokoro/\n・よりそいホットライン: 0120-279-338(24時間・無料)\n\nあなたの存在は大切です。';

/** 記録に基づくひとことを返答に添える(該当する場合のみ)。 */
function contextNudge(): string | null {
  const s = useAppStore.getState();
  const today = todayKey();
  const done = s.completions[today] ?? [];
  const undone = s.habits.filter((h) => !done.includes(h.id));

  const bestStreak = s.habits.reduce((best, h) => {
    const streak = calcStreak((key) => (s.completions[key] ?? []).includes(h.id));
    return Math.max(best, streak);
  }, 0);

  if (s.habits.length > 0 && undone.length === 0) {
    return '今日の習慣はぜんぶ達成済みですね。すごい!👏';
  }
  if (bestStreak >= 3) {
    return `いま${bestStreak}日連続の記録が続いていますよ。🔥`;
  }
  if (undone.length > 0) {
    const h = undone[0];
    return `ちなみに「${h.emoji} ${h.name}」は今日まだのようです。よかったら5分だけ試してみませんか?`;
  }
  return null;
}

let counter = 0;

/** ローカルでコーチ応答を生成する。 */
export function generateLocalCoachReply(userMessage: string): string {
  const intent = detectIntent(userMessage);
  if (intent === 'crisis') return CRISIS_RESPONSE;

  const pool = RESPONSES[intent];
  counter += 1;
  const base = pool[(userMessage.length + counter) % pool.length];

  // 文脈ヒントは挨拶・感謝・一般会話のときに添える(本題の応答を邪魔しない)
  if (intent === 'greeting' || intent === 'thanks' || intent === 'general') {
    const nudge = contextNudge();
    if (nudge && counter % 2 === 0) {
      return `${base}\n\n${nudge}`;
    }
  }
  return base;
}
