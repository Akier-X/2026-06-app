import React from 'react';
import Svg, { Circle, Line, Path } from 'react-native-svg';

/**
 * 手描きの筆致を意識した線画アイコン。
 * 24x24グリッド、丸い線端、わずかに揺らいだ曲線で「道具ではなく文房具」の温度感に。
 */

export type InkIconName =
  | 'sun' // 今日
  | 'speechLeaf' // コーチ（言の葉）
  | 'journal' // きろく（帳面）
  | 'sliders' // 設定
  | 'rain'
  | 'drizzle'
  | 'cloud'
  | 'sunCloud'
  | 'clearSun'
  | 'ember' // 継続の火
  | 'sprout' // 芽
  | 'share'
  | 'bell'
  | 'flag';

export default function InkIcon({
  name,
  size = 24,
  color,
  strokeWidth = 1.8,
}: {
  name: InkIconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };

  let content: React.ReactElement | null = null;

  switch (name) {
    case 'sun': {
      const rays: React.ReactElement[] = [];
      const lens = [2.6, 2.1, 2.8, 2.2, 2.7, 2.0, 2.5, 2.3];
      for (let i = 0; i < 8; i++) {
        const a = (i * 45 + 8) * (Math.PI / 180);
        const r1 = 6.6;
        const r2 = r1 + lens[i];
        rays.push(
          <Line
            key={i}
            x1={12 + Math.cos(a) * r1}
            y1={12 + Math.sin(a) * r1}
            x2={12 + Math.cos(a) * r2}
            y2={12 + Math.sin(a) * r2}
            {...common}
          />,
        );
      }
      content = (
        <>
          <Circle cx={12} cy={12} r={4.1} {...common} />
          {rays}
        </>
      );
      break;
    }
    case 'speechLeaf':
      content = (
        <>
          <Path
            d="M7.2 4.8 H16.6 C18.8 4.8 20.4 6.4 20.4 8.6 V12.4 C20.4 14.6 18.8 16.2 16.6 16.2 H11.4 L7.6 19.4 L7.7 16.1 C5.6 15.9 4 14.4 4 12.3 V8.6 C4 6.4 5.4 4.8 7.2 4.8 Z"
            {...common}
          />
          <Path
            d="M9.3 12.3 C9.6 9.8 11.8 8.5 14.6 8.9 C14.3 11.5 12.1 12.9 9.3 12.3 Z"
            {...common}
            strokeWidth={strokeWidth * 0.85}
          />
          <Path d="M9.3 12.3 C10.8 11.4 12.3 10.6 13.7 9.8" {...common} strokeWidth={strokeWidth * 0.7} />
        </>
      );
      break;
    case 'journal':
      content = (
        <>
          <Path
            d="M7 4.6 H16.7 C17.8 4.6 18.7 5.5 18.7 6.6 V19.4 H8.9 C7.8 19.4 7 18.5 7 17.4 Z"
            {...common}
          />
          <Path d="M7 17.4 C7 16.4 7.8 15.6 8.9 15.6 H18.7" {...common} />
          <Line x1={10.4} y1={8.6} x2={15.4} y2={8.6} {...common} strokeWidth={strokeWidth * 0.85} />
          <Line x1={10.4} y1={11.4} x2={14.2} y2={11.4} {...common} strokeWidth={strokeWidth * 0.85} />
        </>
      );
      break;
    case 'sliders':
      content = (
        <>
          <Line x1={4.5} y1={7.4} x2={19.5} y2={7.2} {...common} />
          <Line x1={4.5} y1={12.1} x2={19.5} y2={12} {...common} />
          <Line x1={4.5} y1={16.8} x2={19.5} y2={16.7} {...common} />
          <Circle cx={9.4} cy={7.3} r={1.9} fill={color} stroke="none" />
          <Circle cx={15.2} cy={12} r={1.9} fill={color} stroke="none" />
          <Circle cx={7.4} cy={16.7} r={1.9} fill={color} stroke="none" />
        </>
      );
      break;
    case 'cloud':
    case 'rain':
    case 'drizzle': {
      const drops =
        name === 'rain' ? (
          <>
            <Line x1={8.6} y1={17.2} x2={7.6} y2={20} {...common} />
            <Line x1={12.4} y1={17.4} x2={11.4} y2={20.2} {...common} />
            <Line x1={16.2} y1={17.2} x2={15.2} y2={20} {...common} />
          </>
        ) : name === 'drizzle' ? (
          <>
            <Line x1={9.6} y1={17.4} x2={9.2} y2={19.2} {...common} />
            <Line x1={14.6} y1={17.4} x2={14.2} y2={19.2} {...common} />
          </>
        ) : null;
      content = (
        <>
          <Path
            d="M7.1 15 H16.6 C18.5 15 20 13.6 20 11.9 C20 10.2 18.7 8.9 16.9 8.8 C16.4 6.7 14.5 5.1 12.2 5.1 C9.9 5.1 8 6.6 7.5 8.7 C5.7 8.9 4.1 10.3 4.1 12 C4.1 13.7 5.4 15 7.1 15 Z"
            {...common}
          />
          {drops}
        </>
      );
      break;
    }
    case 'sunCloud':
      content = (
        <>
          <Circle cx={15.6} cy={8.4} r={3.1} {...common} />
          <Line x1={15.7} y1={3.4} x2={15.7} y2={2.2} {...common} />
          <Line x1={20} y1={5} x2={20.9} y2={4.1} {...common} />
          <Line x1={21.4} y1={8.9} x2={22.6} y2={9} {...common} />
          <Path
            d="M5.9 18.6 H13.2 C14.8 18.6 16 17.4 16 15.9 C16 14.5 15 13.4 13.5 13.3 C13.1 11.6 11.6 10.4 9.8 10.4 C8 10.4 6.5 11.6 6.1 13.2 C4.7 13.4 3.5 14.5 3.5 15.9 C3.5 17.4 4.6 18.6 5.9 18.6 Z"
            {...common}
          />
        </>
      );
      break;
    case 'clearSun': {
      const rays: React.ReactElement[] = [];
      const lens = [3.0, 2.4, 3.1, 2.5, 3.0, 2.3, 2.9, 2.6];
      for (let i = 0; i < 8; i++) {
        const a = (i * 45 - 5) * (Math.PI / 180);
        const r1 = 6.2;
        const r2 = r1 + lens[i];
        rays.push(
          <Line
            key={i}
            x1={12 + Math.cos(a) * r1}
            y1={12 + Math.sin(a) * r1}
            x2={12 + Math.cos(a) * r2}
            y2={12 + Math.sin(a) * r2}
            {...common}
          />,
        );
      }
      content = (
        <>
          <Circle cx={12} cy={12} r={3.8} fill={color} stroke="none" />
          {rays}
        </>
      );
      break;
    }
    case 'ember':
      content = (
        <>
          <Path
            d="M12 4.6 C13.3 7.2 16.4 9.1 16.4 12.6 C16.4 15.6 14.4 17.9 12 17.9 C9.6 17.9 7.6 15.6 7.6 12.6 C7.6 10.7 8.6 9.4 9.7 8.1 C10.1 9.1 10.7 9.8 11.4 10.3 C11.2 8.2 11.4 6.3 12 4.6 Z"
            {...common}
          />
          <Path d="M10.6 14.6 C10.8 16 12.9 16.2 13.4 14.4" {...common} strokeWidth={strokeWidth * 0.8} />
          <Line x1={8.2} y1={20.4} x2={15.8} y2={20.4} {...common} strokeWidth={strokeWidth * 0.7} />
        </>
      );
      break;
    case 'sprout':
      content = (
        <>
          <Path d="M12 20 C12 16.5 12 13.5 12 11.2" {...common} />
          <Path
            d="M12 11.2 C11.8 8.2 9.4 6.6 6.6 6.9 C6.9 9.9 9.2 11.6 12 11.2 Z"
            {...common}
          />
          <Path
            d="M12 13.6 C12.3 11.2 14.3 9.9 16.9 10.3 C16.6 12.8 14.5 14.1 12 13.6 Z"
            {...common}
          />
        </>
      );
      break;
    case 'share':
      content = (
        <>
          <Line x1={12} y1={14.2} x2={12} y2={4.6} {...common} />
          <Path d="M8.6 7.8 L12 4.4 L15.4 7.8" {...common} />
          <Path
            d="M6.2 11.4 V17.4 C6.2 18.5 7.1 19.4 8.2 19.4 H15.8 C16.9 19.4 17.8 18.5 17.8 17.4 V11.4"
            {...common}
          />
        </>
      );
      break;
    case 'bell':
      content = (
        <>
          <Path
            d="M12 4.8 C9.2 4.8 7.4 6.9 7.4 9.6 C7.4 13.2 5.8 14.6 5.8 16 H18.2 C18.2 14.6 16.6 13.2 16.6 9.6 C16.6 6.9 14.8 4.8 12 4.8 Z"
            {...common}
          />
          <Path d="M10.2 18.6 C10.5 19.6 11.2 20.1 12 20.1 C12.8 20.1 13.5 19.6 13.8 18.6" {...common} />
        </>
      );
      break;
    case 'flag':
      content = (
        <>
          <Line x1={6.4} y1={4.4} x2={6.6} y2={20} {...common} />
          <Path d="M6.5 5.4 C10 3.8 13.5 7.4 17.6 5.6 L17.4 12.6 C13.4 14.4 10 10.8 6.6 12.4" {...common} />
        </>
      );
      break;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {content}
    </Svg>
  );
}

/** 気分値(1〜5) → 天気アイコン名。心の空模様のメタファー。 */
export const MOOD_ICONS: InkIconName[] = ['rain', 'drizzle', 'cloud', 'sunCloud', 'clearSun'];
