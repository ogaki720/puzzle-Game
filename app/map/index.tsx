import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { colors } from "@/core/theme/colors";
import { SAMPLE_STAGES } from "@/features/game/stages/sample-stages";

export default function MapRoute() {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.title}>ワールド 1</Text>
        <View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {SAMPLE_STAGES.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => router.push(`/stage/${s.id}/play`)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <Text style={styles.stageNum}>{s.id}</Text>
            <Text style={styles.stageGoal}>
              {s.goal.type === "score"
                ? `スコア ${s.goal.targetScore}`
                : `あつめる ${Object.values(s.goal.targets ?? {}).reduce<number>(
                    (a, b) => a + (b ?? 0),
                    0,
                  )}個`}
            </Text>
            <Text style={styles.stageMoves}>{s.moveLimit}手</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backText: { fontSize: 24, color: colors.accent, fontWeight: "800" },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink },
  spacer: { width: 24 },
  grid: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  card: {
    width: 130,
    aspectRatio: 1,
    backgroundColor: "white",
    borderRadius: 22,
    borderWidth: 3,
    borderColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  stageNum: {
    fontSize: 40,
    fontWeight: "900",
    color: colors.accent,
  },
  stageGoal: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
  },
  stageMoves: {
    fontSize: 10,
    color: colors.inkSoft,
  },
});
