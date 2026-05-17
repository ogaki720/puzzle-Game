import { create } from "zustand";

import {
  applyTurn,
  createBoard,
  createRng,
  isAdjacent,
  type Board,
  type Position,
  type SpawnWeights,
  type TurnEvent,
} from "@/features/game/domain";

export type StageStatus = "idle" | "ready" | "playing" | "win" | "lose";

export interface StageGoalSpec {
  type: "score" | "collect";
  targets?: Partial<Record<string, number>>;
  targetScore?: number;
}

export interface StageConfig {
  id: number;
  world: number;
  width: number;
  height: number;
  moveLimit: number;
  goal: StageGoalSpec;
  starThresholds: readonly [number, number, number];
  spawnWeights?: SpawnWeights;
  seed?: number | string;
}

interface GameSessionState {
  stage: StageConfig | null;
  board: Board | null;
  movesLeft: number;
  score: number;
  collected: Record<string, number>;
  status: StageStatus;
  chainCount: number;
  lastEvents: TurnEvent[];
  isAnimating: boolean;

  startStage: (config: StageConfig) => void;
  trySwap: (a: Position, b: Position) => boolean;
  setAnimating: (animating: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  stage: null,
  board: null,
  movesLeft: 0,
  score: 0,
  collected: {},
  status: "idle" as StageStatus,
  chainCount: 0,
  lastEvents: [],
  isAnimating: false,
};

export const useGameSession = create<GameSessionState>((set, get) => ({
  ...INITIAL_STATE,

  startStage(config) {
    const seed = config.seed ?? `${config.id}:${Date.now()}`;
    const rng = createRng(seed);
    const board = createBoard({
      width: config.width,
      height: config.height,
      rng,
      spawnWeights: config.spawnWeights,
      ensureNoInitialMatch: true,
    });
    set({
      ...INITIAL_STATE,
      stage: config,
      board,
      movesLeft: config.moveLimit,
      status: "playing",
    });
  },

  trySwap(a, b) {
    const state = get();
    if (state.status !== "playing") return false;
    if (state.isAnimating) return false;
    if (!state.board || !state.stage) return false;
    if (!isAdjacent(a, b)) return false;

    const rng = createRng(`${state.stage.id}:${state.score}:${state.movesLeft}`);
    const result = applyTurn({
      board: state.board,
      swap: { a, b },
      rng,
      spawnWeights: state.stage.spawnWeights,
    });
    const accepted = result.events.some((e) => e.type === "swap-attempt" && e.accepted);
    if (!accepted) {
      set({ lastEvents: result.events });
      return false;
    }

    // Update collected from match events
    const collected = { ...state.collected };
    for (const e of result.events) {
      if (e.type === "match") {
        collected[e.color] = (collected[e.color] ?? 0) + e.positions.length;
      }
    }

    const movesLeft = state.movesLeft - 1;
    const score = state.score + result.scoreDelta;
    const won = checkWin(state.stage, score, collected);
    const lost = !won && movesLeft <= 0;

    set({
      board: result.board,
      score,
      movesLeft,
      collected,
      chainCount: result.chainCount,
      lastEvents: result.events,
      status: won ? "win" : lost ? "lose" : "playing",
    });
    return true;
  },

  setAnimating(animating) {
    set({ isAnimating: animating });
  },

  reset() {
    set(INITIAL_STATE);
  },
}));

function checkWin(
  stage: StageConfig,
  score: number,
  collected: Record<string, number>,
): boolean {
  if (stage.goal.type === "score") {
    return score >= (stage.goal.targetScore ?? 0);
  }
  if (stage.goal.type === "collect") {
    const targets = stage.goal.targets ?? {};
    for (const [color, need] of Object.entries(targets)) {
      if ((collected[color] ?? 0) < (need ?? 0)) return false;
    }
    return true;
  }
  return false;
}

export function starsForScore(
  thresholds: readonly [number, number, number],
  score: number,
): 0 | 1 | 2 | 3 {
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  if (score >= thresholds[0]) return 1;
  return 0;
}
