import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  /** 0〜1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  /** リングの進捗色 */
  color: string;
  /** リングの背景色 */
  trackColor: string;
  children?: React.ReactNode;
}

/** 円形の進捗リング。中央にchildrenを重ねられる。 */
export default function ProgressRing({
  progress,
  size = 96,
  strokeWidth = 9,
  color,
  trackColor,
  children,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));

  const anim = useRef(new Animated.Value(clamped)).current;
  useEffect(() => {
    Animated.spring(anim, {
      toValue: clamped,
      useNativeDriver: false, // strokeDashoffsetはネイティブドライバ非対応
      tension: 40,
      friction: 9,
    }).start();
  }, [clamped, anim]);

  const dashOffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
