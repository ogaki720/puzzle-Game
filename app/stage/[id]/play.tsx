import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { colors } from "@/core/theme/colors";
import { BoardCanvas } from "@/features/game/render/board-canvas";
import { BoardGestureLayer } from "@/features/game/render/board-gestures";
import { Hud } from "@/features/game/render/hud";
import { Mascot } from "@/features/game/render/mascot";
import { PauseModal, ResultModal } from "@/features/game/render/pause-modal";
import { SpecialDebutNotice } from "@/features/game/render/special-debut";
import { usePieceAnimations } from "@/features/game/render/use-piece-animations";
import { findStage, isOnboardingStage } from "@/features/game/stages/sample-stages";
import { starsForScore, useGameSession } from "@/features/game/state/game-session.store";
import { useMascot } from "@/features/game/state/mascot.store";
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
  const showFreePlus5 = useGameSession((s) => s.showFreePlus5);
  const applyFreePlus5 = useGameSession((s) => s.applyFreePlus5);
  const dismissFreePlus5 = useGameSession((s) => s.dismissFreePlus5);

  const [selected, setSelected] = useState<Position | null>(null);
  const [paused, setPaused] = useState(false);
  const [debutDismissed, setDebutDismissed] = useState(false);
  const dims = useWindowDimensions();
  const boardSize = Math.min(dims.width - 24, 460);

  const anims = usePieceAnimations();
  const mascotCheer = useMascot((s) => s.cheer);
  const mascotSad = useMascot((s) => s.sad);

  // Mascot reacts to win/lose
  const prevStatus = useRef(status);
  useEffect(() => {
    if (status === prevStatus.current) return;
    prevStatus.current = status;
    if (status === "win") mascotCheer();
    if (status === "lose") mascotSad();
  }, [status, mascotCheer, mascotSad]);

  // Stable refs so useEffects don't re-fire when callbacks change identity
  const animsRef = useRef(anims);
  animsRef.current = anims;
  const setAnimatingRef = useRef(setAnimating);
  setAnimatingRef.current = setAnimating;
  const resetRef = useRef(reset);
  resetRef.current = reset;
  const startStageRef = useRef(startStage);
  startStageRef.current = startStage;

  const lastEventsRef = useRef(lastEvents);

  // Trigger animation whenever lastEvents changes
  useEffect(() => {
    if (lastEvents === lastEventsRef.current) return;
    lastEventsRef.current = lastEvents;

    const wasAccepted = lastEvents.some((e) => e.type === "swap-attempt" && e.accepted);
    if (!wasAccepted) return;

    setAnimatingRef.current(true);
    animsRef.current.playTurnAnimation(lastEvents, () => {
      setAnimatingRef.current(false);
    });
  }, [lastEvents]); // only lastEvents as dep — all others accessed via stable refs

  // Start stage when stageId changes; cleanup on unmount only
  useEffect(() => {
    if (!stage) return;
    startStageRef.current(stage);
    animsRef.current.resetAll();
  }, [stage]); // stage is stable (derived from stageId via useMemo)

  // Unmount cleanup — separate effect so it only runs once
  useEffect(() => {
    return () => {
      resetRef.current();
    };
  }, []);

  // goalProgress and nearMiss must be computed before any early returns (Rules of Hooks)
  const goalProgress = useMemo(
    () =>
      stage?.goal.type === "collect"
        ? Object.entries(stage.goal.targets ?? {}).map(([color, need]) => ({
            color: color as PieceColor,
            current: collected[color] ?? 0,
            need: need ?? 0,
          }))
        : [],
    [stage, collected],
  );

  const nearMiss = useMemo(() => {
    if (status !== "lose" || !stage) return false;
    if (stage.goal.type === "collect") {
      const total = Object.values(stage.goal.targets ?? {}).reduce<number>((a, b) => a + (b ?? 0), 0);
      const done = Object.entries(stage.goal.targets ?? {}).reduce<number>(
        (a, [c, n]) => a + Math.min(collected[c] ?? 0, n ?? 0),
        0,
      );
      return total > 0 && done / total >= 0.8;
    }
    if (stage.goal.type === "score") {
      return stage.goal.targetScore != null && score / stage.goal.targetScore >= 0.8;
    }
    return false;
  }, [status, stage, collected, score]);

  const isAnimating = useGameSession.getState().isAnimating;

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
        nearMiss={nearMiss}
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

      {/* Onboarding: special piece debut notice */}
      {!debutDismissed && (
        <SpecialDebutNotice
          stageId={stageId}
          onClose={() => setDebutDismissed(true)}
        />
      )}

      <FreePlus5Modal
        visible={showFreePlus5}
        onAccept={applyFreePlus5}
        onDecline={dismissFreePlus5}
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

function FreePlus5Modal({
  visible,
  onAccept,
  onDecline,
}: {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  if (!visible) return null;
  return (
    <Pressable style={freePlus5Styles.backdrop} onPress={onDecline}>
      <View style={freePlus5Styles.card}>
        <Text style={freePlus5Styles.emoji}>🐰</Text>
        <Text style={freePlus5Styles.title}>あと少しだよ！</Text>
        <Text style={freePlus5Styles.sub}>+5手 (今回だけ無料)</Text>
        <Pressable
          onPress={onAccept}
          style={({ pressed }) => [freePlus5Styles.btn, pressed && { opacity: 0.75 }]}
        >
          <Text style={freePlus5Styles.btnText}>+5手 もらう！</Text>
        </Pressable>
        <Pressable onPress={onDecline}>
          <Text style={freePlus5Styles.skip}>やめる</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const freePlus5Styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  emoji: { fontSize: 52 },
  title: { fontSize: 22, fontWeight: "800", color: colors.accent },
  sub: { fontSize: 14, color: colors.inkSoft },
  btn: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 22,
  },
  btnText: { color: "white", fontSize: 16, fontWeight: "700" },
  skip: { fontSize: 13, color: colors.inkSoft, marginTop: 4 },
});

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
