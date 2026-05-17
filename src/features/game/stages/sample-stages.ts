import type { StageConfig } from "@/features/game/state/game-session.store";

/** Stage IDs ≤ 20 do not consume a heart on failure (onboarding grace). */
export const ONBOARDING_FREE_HEART_UNTIL = 20;

/** Stage IDs 1-3 use a tiny board + single-color goal for guaranteed clear. */
export const ONBOARDING_EASY_UNTIL = 3;

/**
 * Stage at which each special piece "debuts" with a tutorial overlay.
 * Keys match PieceKind values.
 */
export const SPECIAL_DEBUT: Record<string, number> = {
  stripedH: 5,
  stripedV: 5,
  wrapped: 8,
  rainbow: 12,
};

export const SAMPLE_STAGES: StageConfig[] = [
  // --- Onboarding (S1-3): tiny board, easy goal, slow ramp ---
  {
    id: 1,
    world: 1,
    width: 6,
    height: 6,
    moveLimit: 15,
    goal: { type: "collect", targets: { berry: 8 } },
    starThresholds: [300, 600, 1000],
    spawnWeights: { berry: 3, mint: 1, lemon: 1, sky: 1, peach: 1, plum: 1 },
  },
  {
    id: 2,
    world: 1,
    width: 6,
    height: 6,
    moveLimit: 16,
    goal: { type: "collect", targets: { mint: 8, lemon: 6 } },
    starThresholds: [400, 800, 1400],
    spawnWeights: { berry: 1, mint: 3, lemon: 3, sky: 1, peach: 1, plum: 1 },
  },
  {
    id: 3,
    world: 1,
    width: 7,
    height: 7,
    moveLimit: 18,
    goal: { type: "score", targetScore: 2000 },
    starThresholds: [1200, 2000, 3500],
  },
  // --- Normal stages ---
  {
    id: 4,
    world: 1,
    width: 7,
    height: 7,
    moveLimit: 20,
    goal: { type: "collect", targets: { sky: 12, peach: 10 } },
    starThresholds: [2000, 4500, 8000],
  },
  {
    id: 5,
    world: 1,
    width: 7,
    height: 8,
    moveLimit: 22,
    goal: { type: "collect", targets: { berry: 15, mint: 15 } },
    starThresholds: [3000, 7000, 12000],
  },
  {
    id: 6,
    world: 1,
    width: 8,
    height: 8,
    moveLimit: 22,
    goal: { type: "score", targetScore: 8000 },
    starThresholds: [5000, 8000, 14000],
  },
  {
    id: 7,
    world: 1,
    width: 8,
    height: 8,
    moveLimit: 20,
    goal: { type: "collect", targets: { plum: 12, peach: 12 } },
    starThresholds: [4000, 8000, 14000],
  },
  {
    id: 8,
    world: 1,
    width: 8,
    height: 8,
    moveLimit: 24,
    goal: { type: "collect", targets: { lemon: 18, sky: 12 } },
    starThresholds: [4000, 9000, 15000],
  },
  {
    id: 9,
    world: 1,
    width: 8,
    height: 8,
    moveLimit: 22,
    goal: { type: "score", targetScore: 12000 },
    starThresholds: [7000, 12000, 20000],
  },
  {
    id: 10,
    world: 1,
    width: 8,
    height: 9,
    moveLimit: 25,
    goal: { type: "collect", targets: { berry: 20, mint: 15, lemon: 10 } },
    starThresholds: [8000, 15000, 25000],
  },
];

export function findStage(id: number): StageConfig | null {
  return SAMPLE_STAGES.find((s) => s.id === id) ?? null;
}

export function isOnboardingStage(id: number): boolean {
  return id <= ONBOARDING_FREE_HEART_UNTIL;
}

export function isEasyStage(id: number): boolean {
  return id <= ONBOARDING_EASY_UNTIL;
}
