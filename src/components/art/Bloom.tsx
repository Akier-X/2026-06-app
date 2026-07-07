import React from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { createRng, hashSeed, mixHex } from './seed';

/**
 * 「今日の一輪」— 日付シードから咲く生成アートの花。
 * 花びらの数=完了した習慣、色=その日の気分、形の揺らぎ=日付のシード。
 * 同じ日は常に同じ姿に咲き、二つとして同じ花はない。
 */

/** 花びら1枚のパス（原点から上方向、後でrotateする） */
function petalPath(len: number, width: number, curl: number): string {
  const w = width / 2;
  // しずく型: 根本から先端へ膨らんで戻る。curlで左右非対称の揺らぎ。
  return [
    `M 0 0`,
    `C ${w * (1 + curl)} ${-len * 0.28}, ${w * 0.9} ${-len * 0.72}, 0 ${-len}`,
    `C ${-w * 0.9} ${-len * 0.72}, ${-w * (1 - curl)} ${-len * 0.28}, 0 0`,
    `Z`,
  ].join(' ');
}

export interface BloomGlyphProps {
  cx: number;
  cy: number;
  /** 花の半径（花びらの長さ） */
  radius: number;
  /** シード文字列（日付キーなど） */
  seedKey: string;
  /** 花びらの枚数。0ならつぼみ */
  petals: number;
  /** 花びらの色 */
  color: string;
  /** 花芯の色 */
  coreColor: string;
  /** 開き具合 0〜1（1で満開） */
  progress?: number;
  /** つぼみ・茎の色（未指定は花色を暗めに） */
  stemColor?: string;
}

/**
 * Svg内に置ける花のグリフ。<Svg>を持たないので、
 * 庭(Garden)やシェアカードなど任意のキャンバスに植えられる。
 */
export function BloomGlyph({
  cx,
  cy,
  radius,
  seedKey,
  petals,
  color,
  coreColor,
  progress = 1,
  stemColor,
}: BloomGlyphProps) {
  const rng = createRng(hashSeed(seedKey));
  const open = 0.55 + 0.45 * Math.max(0, Math.min(1, progress));
  const sepal = stemColor ?? mixHex(color, '#26322B', 0.35);

  // ── つぼみ（花びら0枚）──
  if (petals <= 0) {
    const budH = radius * 1.1;
    const lean = (rng() - 0.5) * 0.3;
    return (
      <G x={cx} y={cy} rotation={lean * 30}>
        <Path
          d={petalPath(budH, budH * 0.62, 0.05)}
          fill={color}
          fillOpacity={0.55}
        />
        <Path
          d={petalPath(budH * 0.78, budH * 0.4, 0)}
          fill={mixHex(color, '#FFFFFF', 0.3)}
          fillOpacity={0.7}
        />
        {/* 萼(がく) */}
        <Path
          d={`M 0 0 C ${budH * 0.3} ${-budH * 0.12}, ${budH * 0.32} ${budH * 0.18}, 0 ${budH * 0.22} C ${-budH * 0.32} ${budH * 0.18}, ${-budH * 0.3} ${-budH * 0.12}, 0 0 Z`}
          fill={sepal}
          fillOpacity={0.85}
        />
      </G>
    );
  }

  const n = Math.min(petals + 4, 13); // 最低5枚から、増えるほど豪華に
  const baseRot = rng() * 360;
  const outer: React.ReactElement[] = [];
  const inner: React.ReactElement[] = [];

  for (let i = 0; i < n; i++) {
    const angle = baseRot + (i * 360) / n + (rng() - 0.5) * 9;
    const len = radius * open * (0.9 + rng() * 0.18);
    const width = len * (0.5 + rng() * 0.14);
    const curl = (rng() - 0.5) * 0.25;
    outer.push(
      <Path
        key={`o${i}`}
        d={petalPath(len, width, curl)}
        fill={color}
        fillOpacity={0.5}
        rotation={angle}
      />,
    );
    inner.push(
      <Path
        key={`i${i}`}
        d={petalPath(len * 0.64, width * 0.6, curl * 0.5)}
        fill={mixHex(color, '#FFFFFF', 0.32)}
        fillOpacity={0.65}
        rotation={angle + (rng() - 0.5) * 6}
      />,
    );
  }

  // 花芯のまわりの小さな種子ドット
  const coreR = radius * 0.2;
  const seeds: React.ReactElement[] = [];
  const seedCount = 5 + Math.floor(rng() * 3);
  for (let i = 0; i < seedCount; i++) {
    const a = ((i * 360) / seedCount + rng() * 20) * (Math.PI / 180);
    const rr = coreR * (1.55 + rng() * 0.3);
    seeds.push(
      <Circle
        key={`s${i}`}
        cx={Math.cos(a) * rr}
        cy={Math.sin(a) * rr}
        r={radius * 0.045}
        fill={mixHex(coreColor, '#26322B', 0.25)}
        fillOpacity={0.9}
      />,
    );
  }

  return (
    <G x={cx} y={cy}>
      {outer}
      {inner}
      <Circle r={coreR} fill={coreColor} />
      <Circle r={coreR * 0.45} fill={mixHex(coreColor, '#FFFFFF', 0.45)} />
      {seeds}
    </G>
  );
}

/** 単体で使える正方形の花。ヒーローカードやモーダル用。 */
export default function Bloom({
  size,
  seedKey,
  petals,
  color,
  coreColor,
  progress = 1,
}: {
  size: number;
  seedKey: string;
  petals: number;
  color: string;
  coreColor: string;
  progress?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <BloomGlyph
        cx={size / 2}
        cy={size / 2}
        radius={size * 0.36}
        seedKey={seedKey}
        petals={petals}
        color={color}
        coreColor={coreColor}
        progress={progress}
      />
    </Svg>
  );
}
