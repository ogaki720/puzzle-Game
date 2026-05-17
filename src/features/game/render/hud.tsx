import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { NEAR_MISS_MOVE_THRESHOLD, NEAR_MISS_PULSE_PERIOD_MS } from "@/core/juicy";
import { colors } from "@/core/theme/colors";
import type { PieceColor } from "@/features/game/domain";

interface HudProps {
  score: number;
  movesLeft: number;
  movesLimit: number;
  goalLabel: string;
  goalProgress: { color: PieceColor; current: number; need: number }[];
  chainCount: number;
  nearMiss?: boolean;
}

export function Hud({
  score,
  movesLeft,
  movesLimit,
  goalLabel,
  goalProgress,
  chainCount,
  nearMiss,
}: HudProps) {
  const lowMoves = movesLeft <= NEAR_MISS_MOVE_THRESHOLD && movesLeft > 0;
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (lowMoves) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.18, {
            duration: NEAR_MISS_PULSE_PERIOD_MS / 2,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(1.0, {
            duration: NEAR_MISS_PULSE_PERIOD_MS / 2,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        true,
      );
    } else {
      pulseScale.value = withTiming(1.0, { duration: 200 });
    }
  }, [lowMoves, pulseScale]);

  const movesStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <View style={styles.bar}>
      <Animated.View style={[styles.col, movesStyle]}>
        <Text style={styles.label}>のこり</Text>
        <Text style={[styles.value, lowMoves && styles.valueWarn]}>{movesLeft}</Text>
        <Text style={styles.sub}>/ {movesLimit}</Text>
      </Animated.View>

      <View style={styles.colCenter}>
        <Text style={styles.label}>{goalLabel}</Text>
        {nearMiss && (
          <Text style={styles.nearMiss}>あと少し！</Text>
        )}
        <View style={styles.goalRow}>
          {goalProgress.map((g) => (
            <View key={g.color} style={styles.goalChip}>
              <View style={[styles.goalDot, { backgroundColor: colors.pieces[g.color] }]} />
              <Text style={[
                styles.goalText,
                g.current >= g.need && styles.goalDone,
              ]}>
                {Math.min(g.current, g.need)}/{g.need}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.col}>
        <Text style={styles.label}>スコア</Text>
        <Text style={styles.value}>{score.toLocaleString()}</Text>
        {chainCount >= 2 && (
          <Text style={styles.chain}>×{chainCount} CHAIN!</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderRadius: 20,
    marginHorizontal: 12,
    marginTop: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  col: {
    alignItems: "center",
    minWidth: 72,
  },
  colCenter: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  label: {
    fontSize: 11,
    color: colors.inkSoft,
    fontWeight: "600",
  },
  value: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink,
  },
  valueWarn: {
    color: colors.accent,
  },
  sub: {
    fontSize: 10,
    color: colors.inkSoft,
  },
  goalRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  goalChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.bg,
    borderRadius: 12,
  },
  goalDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  goalText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  goalDone: {
    color: "#4CAF50",
  },
  chain: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "800",
    color: colors.accent,
  },
  nearMiss: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.accent,
    backgroundColor: colors.bg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
});
