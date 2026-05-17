import type { MatchGroup } from "./match";

export interface ScoreOptions {
  baseMatchScore?: number;
  specialBonus?: number;
  boost?: number;
}

const DEFAULTS: Required<ScoreOptions> = {
  baseMatchScore: 10,
  specialBonus: 60,
  boost: 1,
};

export function scoreForGroup(
  group: MatchGroup,
  chainIndex: number,
  specialCreatedCount: number,
  opts: ScoreOptions = {},
): number {
  const merged = { ...DEFAULTS, ...opts };
  const base = group.positions.length * merged.baseMatchScore;
  const special = specialCreatedCount * merged.specialBonus;
  const multiplier = combinedMultiplier(chainIndex);
  return Math.round((base + special) * multiplier * merged.boost);
}

export function combinedMultiplier(chainIndex: number): number {
  return 1 + 0.5 * Math.max(0, chainIndex - 1);
}
