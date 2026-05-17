import { useCallback } from "react";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";

import type { TurnEvent } from "@/features/game/domain";
import {
  ERASE_TOTAL_MS,
  REFILL_DELAY_MS,
  REFILL_MS as REFILL_TOTAL_MS,
} from "@/core/juicy";

/**
 * eraseProgress 0→1: matched cells fade out
 * refillProgress 0→1: new cells pop in
 * erasedKeys / refillKeys: SharedValue<string[]> so worklets can read them
 */
export function usePieceAnimations() {
  const eraseProgress = useSharedValue(0);
  const refillProgress = useSharedValue(0);
  const erasedKeys = useSharedValue<string[]>([]);
  const refillKeys = useSharedValue<string[]>([]);

  const resetAll = useCallback(() => {
    eraseProgress.value = 0;
    refillProgress.value = 0;
    erasedKeys.value = [];
    refillKeys.value = [];
  }, [eraseProgress, refillProgress, erasedKeys, refillKeys]);

  const playTurnAnimation = useCallback(
    (events: TurnEvent[], onDone: () => void) => {
      const erased: string[] = [];
      const refilled: string[] = [];

      for (const e of events) {
        if (e.type === "erase") {
          for (const p of e.positions) erased.push(`${p.row}:${p.col}`);
        }
        if (e.type === "refill") {
          for (const p of e.positions) refilled.push(`${p.row}:${p.col}`);
        }
      }

      if (erased.length === 0 && refilled.length === 0) {
        onDone();
        return;
      }

      eraseProgress.value = 0;
      refillProgress.value = 0;
      erasedKeys.value = erased;
      refillKeys.value = refilled;

      // Phase 1 — erase fade-out
      eraseProgress.value = withTiming(1, {
        duration: ERASE_TOTAL_MS,
        easing: Easing.in(Easing.quad),
      });

      // Phase 2 — refill fall-in (after erase)
      const refillStart = erased.length > 0 ? ERASE_TOTAL_MS + REFILL_DELAY_MS : 0;
      setTimeout(() => {
        refillProgress.value = withTiming(1, {
          duration: REFILL_TOTAL_MS,
          easing: Easing.out(Easing.back(1.2)),
        });
      }, refillStart);

      // Done: clear keys + fire callback
      const total = refillStart + REFILL_TOTAL_MS + 60;
      setTimeout(() => {
        erasedKeys.value = [];
        refillKeys.value = [];
        onDone();
      }, total);
    },
    [eraseProgress, refillProgress, erasedKeys, refillKeys],
  );

  return { eraseProgress, refillProgress, erasedKeys, refillKeys, playTurnAnimation, resetAll };
}

export type PieceAnimations = ReturnType<typeof usePieceAnimations>;
