import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { useThemeColors } from '@/constants/theme';

import { BloomGlyph } from './Bloom';
import { createRng, hashSeed, mixHex } from './seed';

/**
 * 「こころの庭」— 記録した日々が一列の花畑になる。
 * その日の達成が花びらに、気分が色になる。空の日は小さな草。
 */

export interface GardenDay {
  /** 日付キー（シードになる） */
  key: string;
  /** 完了した習慣数 */
  petals: number;
  /** 気分 1〜5（未記録は0） */
  mood: number;
  /** 曜日など下に添えるラベル */
  label?: string;
}

/** 空の日に生える小さな草 */
function GrassTuft({ cx, baseY, seedKey, color }: { cx: number; baseY: number; seedKey: string; color: string }) {
  const rng = createRng(hashSeed(seedKey));
  const blades: React.ReactElement[] = [];
  const n = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < n; i++) {
    const dx = (i - (n - 1) / 2) * 3.4 + (rng() - 0.5) * 2;
    const h = 6 + rng() * 5;
    const sway = (rng() - 0.5) * 5;
    blades.push(
      <Path
        key={i}
        d={`M ${cx + dx} ${baseY} Q ${cx + dx + sway} ${baseY - h * 0.6} ${cx + dx + sway * 1.6} ${baseY - h}`}
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
      />,
    );
  }
  return <>{blades}</>;
}

/** 1日ぶんの花（茎つき） */
function GardenSprout({
  day,
  width,
  height,
  petalColor,
  coreColor,
  stemColor,
  grassColor,
}: {
  day: GardenDay;
  width: number;
  height: number;
  petalColor: string;
  coreColor: string;
  stemColor: string;
  grassColor: string;
}) {
  const rng = createRng(hashSeed(day.key + ':stem'));
  const cx = width / 2;
  const baseY = height - 2;
  const hasRecord = day.petals > 0 || day.mood > 0;

  if (!hasRecord) {
    return (
      <Svg width={width} height={height}>
        <GrassTuft cx={cx} baseY={baseY} seedKey={day.key} color={grassColor} />
      </Svg>
    );
  }

  // 茎の高さ: 達成数が多いほど高く伸びる（揺らぎ付き）
  const growth = Math.min(1, 0.45 + day.petals * 0.12 + rng() * 0.12);
  const headR = Math.min(width * 0.42, 8 + day.petals * 1.1);
  const headY = baseY - (height - headR - 8) * growth;
  const sway = (rng() - 0.5) * width * 0.35;

  return (
    <Svg width={width} height={height}>
      {/* 茎 */}
      <Path
        d={`M ${cx} ${baseY} C ${cx - sway * 0.3} ${baseY - (baseY - headY) * 0.4}, ${cx + sway} ${headY + (baseY - headY) * 0.35}, ${cx + sway * 0.5} ${headY + headR * 0.6}`}
        stroke={stemColor}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
      {/* 葉 */}
      <Path
        d={`M ${cx} ${baseY - 8} q ${-width * 0.22} ${-3} ${-width * 0.26} ${-9} q ${width * 0.2} ${1} ${width * 0.26} ${9} Z`}
        fill={stemColor}
        fillOpacity={0.7}
      />
      <BloomGlyph
        cx={cx + sway * 0.5}
        cy={headY}
        radius={headR}
        seedKey={day.key}
        petals={day.petals}
        color={petalColor}
        coreColor={coreColor}
        progress={1}
      />
    </Svg>
  );
}

/**
 * 横一列の花畑。days は古い→新しい順。
 */
export default function Garden({
  days,
  height = 92,
  showLabels = true,
}: {
  days: GardenDay[];
  height?: number;
  showLabels?: boolean;
}) {
  const c = useThemeColors();
  const stemColor = mixHex(c.primary, c.background, 0.15);
  const grassColor = mixHex(c.primary, c.background, 0.45);

  return (
    <View>
      <View style={styles.row}>
        {days.map((d) => (
          <View key={d.key} style={styles.col}>
            <GardenSprout
              day={d}
              width={34}
              height={height}
              petalColor={d.mood > 0 ? c.moodScale[d.mood - 1] : mixHex(c.primary, c.bloomCore, 0.35)}
              coreColor={c.bloomCore}
              stemColor={stemColor}
              grassColor={grassColor}
            />
          </View>
        ))}
      </View>
      {/* 地面のライン */}
      <Svg width="100%" height={4} style={styles.ground}>
        <Line x1="2%" y1={2} x2="98%" y2={2} stroke={c.border} strokeWidth={1.4} strokeLinecap="round" />
      </Svg>
      {showLabels && (
        <View style={styles.row}>
          {days.map((d) => (
            <View key={d.key} style={styles.col}>
              <Text style={[styles.label, { color: c.textTertiary }]}>{d.label ?? ''}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { flex: 1, alignItems: 'center' },
  ground: { marginTop: -2 },
  label: { fontSize: 10, marginTop: 4, fontWeight: '600' },
});
