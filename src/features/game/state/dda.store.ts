/**
 * Dynamic Difficulty Adjustment (DDA) — design.md § 13
 * Tracks consecutive failures per stage and biases spawn weights.
 * Not exposed to the player; data persisted via localStorage / MMKV.
 */
import { getJson, setJson } from "@/core/persistence/store";
import type { SpawnWeights } from "@/features/game/domain";
import { PIECE_COLORS } from "@/features/game/domain";

const DDA_KEY = "dda.failures";
const TRIGGER_FAILURES = 3;
const BIAS_FACTOR = 0.1; // 10% weight increase toward goal colors

function loadFailures(): Record<number, number> {
  return getJson<Record<number, number>>(DDA_KEY, {});
}

function saveFailures(data: Record<number, number>): void {
  setJson(DDA_KEY, data);
}

export function recordFailure(stageId: number): number {
  const data = loadFailures();
  data[stageId] = (data[stageId] ?? 0) + 1;
  saveFailures(data);
  return data[stageId] ?? 1;
}

export function recordSuccess(stageId: number): void {
  const data = loadFailures();
  delete data[stageId];
  saveFailures(data);
}

export function getFailureCount(stageId: number): number {
  return loadFailures()[stageId] ?? 0;
}

/**
 * Returns biased spawn weights if player has failed ≥ 3 times on this stage.
 * Goal colors get +10% relative weight. Returns null if no bias needed.
 */
export function getDdaWeights(
  stageId: number,
  baseWeights: SpawnWeights | undefined,
  goalColors: string[],
): SpawnWeights | null {
  const failures = getFailureCount(stageId);
  if (failures < TRIGGER_FAILURES || goalColors.length === 0) return null;

  const weights: Record<string, number> = {};
  for (const color of PIECE_COLORS) {
    weights[color] = baseWeights?.[color] ?? 1;
  }
  for (const color of goalColors) {
    if (color in weights) {
      weights[color] = (weights[color] ?? 1) * (1 + BIAS_FACTOR);
    }
  }
  return weights as SpawnWeights;
}

// Persistent record of stages where the free +5 moves was used
const PLUS5_KEY = "dda.plus5used";

export function hasUsedFreePlus5(stageId: number): boolean {
  const used = getJson<number[]>(PLUS5_KEY, []);
  return used.includes(stageId);
}

export function markFreePlus5Used(stageId: number): void {
  const used = getJson<number[]>(PLUS5_KEY, []);
  if (!used.includes(stageId)) {
    used.push(stageId);
    setJson(PLUS5_KEY, used);
  }
}
