import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { colors } from "@/core/theme/colors";
import { BoardCanvas } from "@/features/game/render/board-canvas";
import { BoardGestureLayer } from "@/features/game/render/board-gestures";
import { Hud } from "@/features/game/render/hud";
import { PauseModal, ResultModal } from "@/features/game/render/pause-modal";
import { usePieceAnimations } from "@/features/game/render/use-piece-animations";
import { findStage } from "@/features/game/stages/sample-stages";
import { starsForScore, useGameSession } from "@/features/game/state/game-session.store";
import type { PieceColor, Position } from "@/features/game/domain";

export default function PlayRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const stageId = Number.parseInt(params.id ?? "1", 10);
  const stage = useMemo(() => findStage(stageId), [stageId]);

  const board = useGameSession((s) => s.board);
  const movesLeft = useGameSession((s) => s.movesLeft);
  const score = useGameSession((s) => s.score);
  const collected = useGameSession((s) => s.collected);
  const status = useGameSession((s) => s.status);
  const chainCount = useGameSession((s) => s.chainCount);
  const lastEvents = useGameSession((s) => s.lastEvents);
  const startStage = useGameSession((s) => s.startStage);
  const trySwap = useGameSession((s) => s.trySwap);
  const setAnimating = useGameSession((s) => s.setAnimating);
  const reset = useGameSession((s) => s.reset);

  const [selected, setSelected] = useState<Position | null>(null);
  const [paused, setPaused] = useState(false);
  const dims = useWindowDimensions();
  const boardSize = Math.min(dims.width - 24, 460);

  const anims = usePieceAnimations();
  const lastEventsRef = useRef(lastEvents);

  // Trigger animation whenever lastEvents changes
  useEffect(() => {
    if (lastEvents === lastEventsRef.current) return;
    lastEventsRef.current = lastEvents;

    const wasAccepted = lastEvents.some((e) => e.type === "swap-attempt" && e.accepted);
    if (!wasAccepted) return;

    setAnimating(true);
    anims.playTurnAnimation(lastEvents, () => {
      setAnimating(false);
    });
  }, [lastEvents, anims, setAnimating]);

  useEffect(() => {
    if (stage) {
      startStage(stage);
      anims.resetAll();
    }
    return () => reset();
  }, [stage, startStage, reset, anims]);

  if (!stage) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.title}>ステージが みつかりません</Text>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← もどる</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!board) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.title}>よみこみ中…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const goalProgress =
    stage.goal.type === "collect"
      ? Object.entries(stage.goal.targets ?? {}).map(([color, need]) => ({
          color: color as PieceColor,
          current: collected[color] ?? 0,
          need: need ?? 0,
        }))
      : [];

  const isAnimating = useGameSession.getState().isAnimating;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => setPaused(true)}
          style={styles.pauseBtn}
          accessibilityRole="button"
        >
          <Text style={styles.pauseText}>‖</Text>
        </Pressable>
        <Text style={styles.stageTag}>ステージ {stage.id}</Text>
      </View>

      <Hud
        score={score}
        movesLeft={movesLeft}
        movesLimit={stage.moveLimit}
        goalLabel={
          stage.goal.type === "score"
            ? `スコア ${stage.goal.targetScore ?? 0}`
            : "あつめよう"
        }
        goalProgress={goalProgress}
        chainCount={chainCount}
      />

      <View style={styles.boardArea}>
        <View style={{ width: boardSize, height: boardSize }}>
          <BoardCanvas board={board} size={boardSize} selected={selected} anims={anims} />
          <BoardGestureLayer
            board={board}
            size={boardSize}
            selected={selected}
            onSelect={setSelected}
            onSwap={(a, b) => {
              trySwap(a, b);
            }}
            disabled={status !== "playing" || isAnimating}
          />
        </View>
      </View>

      <PauseModal
        visible={paused}
        onResume={() => setPaused(false)}
        onRetry={() => {
          setPaused(false);
          anims.resetAll();
          startStage(stage);
          setSelected(null);
        }}
        onQuit={() => {
          setPaused(false);
          router.replace("/map");
        }}
      />

      <ResultModal
        visible={status === "win" || status === "lose"}
        won={status === "win"}
        score={score}
        stars={status === "win" ? starsForScore(stage.starThresholds, score) : 0}
        onRetry={() => {
          anims.resetAll();
          startStage(stage);
          setSelected(null);
        }}
        onQuit={() => router.replace("/map")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  title: { fontSize: 20, fontWeight: "700", color: colors.ink },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  pauseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.accentSoft,
  },
  pauseText: { fontSize: 18, color: colors.accent, fontWeight: "800" },
  stageTag: { fontSize: 14, fontWeight: "700", color: colors.inkSoft },
  boardArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  back: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "white",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.accentSoft,
  },
  backText: { color: colors.accent, fontWeight: "600" },
});
