import type { StageConfig } from "@/features/game/state/game-session.store";

export const SAMPLE_STAGES: StageConfig[] = [
  {
    id: 1,
    world: 1,
    width: 7,
    height: 8,
    moveLimit: 20,
    goal: {
      type: "collect",
      targets: { berry: 15, mint: 15 },
    },
    starThresholds: [3000, 7000, 12000],
  },
  {
    id: 2,
    world: 1,
    width: 8,
    height: 8,
    moveLimit: 22,
    goal: {
      type: "score",
      targetScore: 8000,
    },
    starThresholds: [5000, 8000, 14000],
  },
  {
    id: 3,
    world: 1,
    width: 8,
    height: 8,
    moveLimit: 18,
    goal: {
      type: "collect",
      targets: { lemon: 18, sky: 12 },
    },
    starThresholds: [4000, 9000, 15000],
  },
];

export function findStage(id: number): StageConfig | null {
  return SAMPLE_STAGES.find((s) => s.id === id) ?? null;
}
