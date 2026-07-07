import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import { createRng, hashSeed, mixHex } from './seed';

/**
 * 「ここロコーチの木」— 継続日数のレベルで育つ生成アートの木。
 * Lv.1 芽生え → Lv.2 若木 → Lv.3 根づき → Lv.4 開花 → Lv.5 満開
 * 再帰的な枝分かれで、水彩のような葉むらと花を重ねる。
 */

interface Branch {
  d: string;
  width: number;
  tipX: number;
  tipY: number;
  depth: number;
}

function growBranches(
  rng: () => number,
  x: number,
  y: number,
  angle: number,
  len: number,
  width: number,
  depth: number,
  maxDepth: number,
  out: Branch[],
) {
  const rad = (angle * Math.PI) / 180;
  const midBend = (rng() - 0.5) * len * 0.35;
  const nx = x + Math.cos(rad) * len;
  const ny = y + Math.sin(rad) * len;
  const mx = x + Math.cos(rad) * len * 0.5 - Math.sin(rad) * midBend;
  const my = y + Math.sin(rad) * len * 0.5 + Math.cos(rad) * midBend;
  out.push({
    d: `M ${x.toFixed(1)} ${y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`,
    width,
    tipX: nx,
    tipY: ny,
    depth,
  });
  if (depth >= maxDepth) return;
  const kids = depth === 0 ? 3 : 2;
  for (let i = 0; i < kids; i++) {
    const spread = 24 + rng() * 18;
    const dir = i === 0 ? -1 : i === 1 ? 1 : (rng() < 0.5 ? -1 : 1) * 0.3;
    growBranches(
      rng,
      nx,
      ny,
      angle + dir * spread * (0.7 + rng() * 0.5),
      len * (0.62 + rng() * 0.14),
      width * 0.6,
      depth + 1,
      maxDepth,
      out,
    );
  }
}

export default function TreeArt({
  size,
  level,
  trunkColor,
  leafColor,
  bloomColor,
  coreColor,
}: {
  size: number;
  /** 1〜5 */
  level: number;
  trunkColor: string;
  leafColor: string;
  bloomColor: string;
  coreColor: string;
}) {
  const lv = Math.max(1, Math.min(5, level));
  const rng = createRng(hashSeed(`kokoro-tree-lv${lv}`));
  const baseX = size / 2;
  const baseY = size * 0.94;

  // ── Lv.1: 芽生え（双葉）──
  if (lv === 1) {
    const h = size * 0.34;
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Path
          d={`M ${baseX} ${baseY} Q ${baseX + size * 0.03} ${baseY - h * 0.6} ${baseX} ${baseY - h}`}
          stroke={trunkColor}
          strokeWidth={size * 0.028}
          strokeLinecap="round"
          fill="none"
        />
        {[-1, 1].map((dir) => (
          <Path
            key={dir}
            d={`M ${baseX} ${baseY - h} C ${baseX + dir * size * 0.16} ${baseY - h - size * 0.05}, ${baseX + dir * size * 0.2} ${baseY - h - size * 0.2}, ${baseX + dir * size * 0.05} ${baseY - h - size * 0.22} C ${baseX + dir * size * 0.02} ${baseY - h - size * 0.1}, ${baseX} ${baseY - h - size * 0.04}, ${baseX} ${baseY - h} Z`}
            fill={leafColor}
            fillOpacity={0.8}
          />
        ))}
        <Path
          d={`M ${baseX - size * 0.12} ${baseY} Q ${baseX} ${baseY + size * 0.04} ${baseX + size * 0.12} ${baseY}`}
          stroke={trunkColor}
          strokeWidth={size * 0.02}
          strokeLinecap="round"
          fill="none"
          opacity={0.5}
        />
      </Svg>
    );
  }

  // ── Lv.2以上: 再帰の木 ──
  const maxDepth = lv; // 2〜5
  const branches: Branch[] = [];
  growBranches(
    rng,
    baseX,
    baseY,
    -90 + (rng() - 0.5) * 8,
    size * (0.2 + lv * 0.022),
    size * 0.05,
    0,
    maxDepth,
    branches,
  );

  const tips = branches.filter((b) => b.depth >= maxDepth - 1);
  const leaves: React.ReactElement[] = [];
  const blooms: React.ReactElement[] = [];

  tips.forEach((b, i) => {
    // 葉むら（水彩のように重ねる）
    if (lv >= 2) {
      const lr = size * (0.035 + rng() * 0.035) * (1 + (lv - 2) * 0.18);
      leaves.push(
        <Circle
          key={`l${i}`}
          cx={b.tipX + (rng() - 0.5) * lr}
          cy={b.tipY + (rng() - 0.5) * lr}
          r={lr}
          fill={i % 3 === 0 ? mixHex(leafColor, '#FFFFFF', 0.18) : leafColor}
          fillOpacity={0.32}
        />,
      );
    }
    // 花（Lv.4〜）
    if (lv >= 4 && (lv === 5 || i % 2 === 0)) {
      const fr = size * 0.014;
      const petals: React.ReactElement[] = [];
      for (let p = 0; p < 5; p++) {
        const a = ((p * 72 + rng() * 20) * Math.PI) / 180;
        petals.push(
          <Circle
            key={p}
            cx={b.tipX + Math.cos(a) * fr * 1.6}
            cy={b.tipY + Math.sin(a) * fr * 1.6}
            r={fr}
            fill={bloomColor}
            fillOpacity={0.85}
          />,
        );
      }
      blooms.push(
        <React.Fragment key={`f${i}`}>
          {petals}
          <Circle cx={b.tipX} cy={b.tipY} r={fr * 0.7} fill={coreColor} />
        </React.Fragment>,
      );
    }
  });

  // Lv.5: 舞い散る花びら
  const falling: React.ReactElement[] = [];
  if (lv === 5) {
    for (let i = 0; i < 7; i++) {
      falling.push(
        <Circle
          key={`p${i}`}
          cx={rng() * size}
          cy={size * 0.25 + rng() * size * 0.6}
          r={size * 0.008 + rng() * size * 0.006}
          fill={bloomColor}
          fillOpacity={0.5}
        />,
      );
    }
  }

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {leaves}
      {branches.map((b, i) => (
        <Path
          key={i}
          d={b.d}
          stroke={trunkColor}
          strokeWidth={Math.max(b.width, size * 0.008)}
          strokeLinecap="round"
          fill="none"
        />
      ))}
      {blooms}
      {falling}
      <Path
        d={`M ${baseX - size * 0.16} ${baseY} Q ${baseX} ${baseY + size * 0.05} ${baseX + size * 0.16} ${baseY}`}
        stroke={trunkColor}
        strokeWidth={size * 0.016}
        strokeLinecap="round"
        fill="none"
        opacity={0.4}
      />
    </Svg>
  );
}
