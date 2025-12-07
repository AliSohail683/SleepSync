/**
 * Animated Sleep Score Component
 * Beautiful circular progress indicator for sleep score
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors, typography } from '../config/theme';
import { getSleepQuality } from '../utils/sleepUtils';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface AnimatedSleepScoreProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export const AnimatedSleepScore: React.FC<AnimatedSleepScoreProps> = ({
  score,
  size = 200,
  strokeWidth = 12,
}) => {
  const progress = useSharedValue(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const quality = getSleepQuality(score);

  useEffect(() => {
    progress.value = withTiming(score / 100, {
      duration: 1500,
      easing: Easing.out(Easing.cubic),
    });
  }, [score]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progress.value);
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.background.elevated}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={quality.color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeLinecap="round"
          animatedProps={animatedProps}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      
      <View style={styles.textContainer}>
        <Text style={styles.scoreText}>{score}</Text>
        <Text style={styles.labelText}>{quality.label}</Text>
        <Text style={styles.emojiText}>{quality.emoji}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    position: 'absolute',
  },
  textContainer: {
    alignItems: 'center',
  },
  scoreText: {
    fontSize: typography.sizes['4xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  labelText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
    marginTop: 4,
  },
  emojiText: {
    fontSize: typography.sizes['2xl'],
    marginTop: 4,
  },
});

