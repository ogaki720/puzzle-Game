import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/core/theme/colors";
import type { PieceColor } from "@/features/game/domain";

interface HudProps {
  score: number;
  movesLeft: number;
  movesLimit: number;
  goalLabel: string;
  goalProgress: { color: PieceColor; current: number; need: number }[];
  chainCount: number;
}

export function Hud({ score, movesLeft, movesLimit, goalLabel, goalProgress, chainCount }: HudProps) {
  const lowMoves = movesLeft <= 3 && movesLeft > 0;
  return (
    <View style={styles.bar}>
      <View style={styles.col}>
        <Text style={styles.label}>のこり</Text>
        <Text style={[styles.value, lowMoves && styles.valueWarn]}>{movesLeft}</Text>
        <Text style={styles.sub}>/ {movesLimit}</Text>
      </View>
      <View style={styles.colCenter}>
        <Text style={styles.label}>{goalLabel}</Text>
        <View style={styles.goalRow}>
          {goalProgress.map((g) => (
            <View key={g.color} style={styles.goalChip}>
              <View
                style={[
                  styles.goalDot,
                  { backgroundColor: colors.pieces[g.color] },
                ]}
              />
              <Text style={styles.goalText}>
                {Math.min(g.current, g.need)}/{g.need}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.col}>
        <Text style={styles.label}>スコア</Text>
        <Text style={styles.value}>{score.toLocaleString()}</Text>
        {chainCount >= 2 && <Text style={styles.chain}>×{chainCount} CHAIN!</Text>}
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
  chain: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "800",
    color: colors.accent,
  },
});
