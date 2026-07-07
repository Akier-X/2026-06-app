import { Platform, useColorScheme, type TextStyle, type ViewStyle } from 'react-native';

/**
 * デザインコンセプト「こころの庭」
 * 和紙のような温かい紙色に、墨・松葉・洗朱の和色を重ねる。
 * 見出しはしっぽり明朝(Shippori Mincho B1)で文芸的な佇まいに。
 */

export interface ThemeColors {
  text: string;
  textSecondary: string;
  textTertiary: string;
  background: string;
  card: string;
  cardPressed: string;
  border: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  danger: string;
  success: string;
  /** ヒーローカード・CTA用のグラデーション（濃→淡） */
  gradient: [string, string];
  /** ペイウォール・年間レポート等の特別感グラデーション */
  gradientWarm: [string, string];
  /** グラデーション上の文字色 */
  onGradient: string;
  onGradientMuted: string;
  /** 気分1〜5の色。雨(藍鼠)→快晴(茜)へ、寒色から暖色に移ろう */
  moodScale: [string, string, string, string, string];
  /** 生成アートの花芯・実の色（山吹） */
  bloomCore: string;
}

export const Colors: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    text: '#26322B', // 墨
    textSecondary: '#5F6D65',
    textTertiary: '#96A29A',
    background: '#F7F2E7', // 生成り（washi）
    card: '#FFFDF6',
    cardPressed: '#EFE9DA',
    border: '#E5DECC',
    primary: '#3E7053', // 松葉
    primaryDark: '#2B5540',
    primarySoft: '#E4EDDF',
    accent: '#C0653F', // 洗朱
    accentSoft: '#F6E7DB',
    danger: '#B5493C',
    success: '#3E7053',
    gradient: ['#48795C', '#2B5540'],
    gradientWarm: ['#39624B', '#1E3B2C'],
    onGradient: '#FBF7EC',
    onGradientMuted: 'rgba(251,247,236,0.78)',
    moodScale: ['#7C8FA0', '#8AA69E', '#A9B47F', '#DCAC4E', '#D0684A'],
    bloomCore: '#E3B54F',
  },
  dark: {
    text: '#EDE8DB',
    textSecondary: '#A5B0A6',
    textTertiary: '#6F7B72',
    background: '#161D18', // 夜の庭
    card: '#1F2822',
    cardPressed: '#2A352E',
    border: '#323D34',
    primary: '#7FAE8E',
    primaryDark: '#5C8F73',
    primarySoft: '#263A2E',
    accent: '#D4835C',
    accentSoft: '#3C2B20',
    danger: '#D0776A',
    success: '#7FAE8E',
    gradient: ['#3A6B50', '#22422F'],
    gradientWarm: ['#2F5943', '#152B1F'],
    onGradient: '#F4EFE2',
    onGradientMuted: 'rgba(244,239,226,0.75)',
    moodScale: ['#7A8FA3', '#83A79E', '#A9B584', '#DBAE59', '#D57855'],
    bloomCore: '#D9B45C',
  },
};

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
}

/**
 * 見出し用の明朝フォント。ルートレイアウトで読み込み完了を待つ前提。
 * Androidでは fontFamily 指定時に fontWeight を併記しない（合成太字を避ける）。
 */
export const Fonts = {
  display: 'ShipporiMinchoB1_700Bold',
  displayHeavy: 'ShipporiMinchoB1_800ExtraBold',
  displayMedium: 'ShipporiMinchoB1_600SemiBold',
  displayRegular: 'ShipporiMinchoB1_400Regular',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 24,
  full: 999,
} as const;

/**
 * 柔らかい浮き上がり感を出す影。iOSはshadow系、Androidはelevation、
 * Webはelevationが効かないためboxShadowを併用する。
 */
function makeShadow(opacity: number, radius: number, offsetY: number, elevation: number): ViewStyle {
  if (Platform.OS === 'web') {
    return { boxShadow: `0px ${offsetY}px ${radius}px rgba(38, 50, 43, ${opacity})` } as ViewStyle;
  }
  return {
    shadowColor: '#26322B',
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
}

export const Shadows = {
  /** 通常カード */
  card: makeShadow(0.06, 10, 3, 2),
  /** ヒーローカード・モーダルなど強めの浮き */
  raised: makeShadow(0.12, 18, 6, 6),
  /** CTAボタン */
  cta: makeShadow(0.2, 12, 4, 5),
} as const;

/** タイポグラフィスケール。hero/title/serif系は明朝で文芸的に。 */
export const Type = {
  hero: { fontSize: 28, fontFamily: Fonts.display, letterSpacing: 0.6 } as TextStyle,
  title: { fontSize: 20, fontFamily: Fonts.display, letterSpacing: 0.4 } as TextStyle,
  headline: { fontSize: 16, fontWeight: '700' as TextStyle['fontWeight'] },
  body: { fontSize: 15, lineHeight: 22 },
  caption: { fontSize: 12 },
  /** 大きな数字・日付など、しるし的に見せる明朝 */
  numeral: { fontFamily: Fonts.display, letterSpacing: 1 } as TextStyle,
} as const;
