import type { Board, Position, SpawnWeights } from "./types";
import { PIECE_COLORS, isMatchable } from "./types";
import { cellOrThrow, cloneBoard, createPiece } from "./board";
import { findMatches } from "./match";
import { isSpecial } from "./specials";
import type { Rng } from "./rng";

/**
 * Returns true if no swap on the current board can produce a match.
 * Specials count as movable; any swap involving a special is always a valid move
 * (it'll trigger an activation), so we report not-deadlocked if any special exists.
 */
export function isDeadlock(board: Board): boolean {
  // Specials are always a valid move
  for (let r = 0; r < board.height; r++) {
    for (let c = 0; c < board.width; c++) {
      if (isSpecial(board.grid[r]?.[c]?.piece ?? null)) return false;
    }
  }
  for (const swap of enumerateSwaps(board)) {
    if (swapWouldMatch(board, swap)) return false;
  }
  return true;
}

function enumerateSwaps(board: Board): { a: Position; b: Position }[] {
  const out: { a: Position; b: Position }[] = [];
  for (let r = 0; r < board.height; r++) {
    for (let c = 0; c < board.width; c++) {
      const cell = board.grid[r]?.[c];
      if (!cell || !isMatchable(cell.piece)) continue;
      if (c + 1 < board.width) {
        const right = board.grid[r]?.[c + 1];
        if (right && isMatchable(right.piece)) {
          out.push({ a: { row: r, col: c }, b: { row: r, col: c + 1 } });
        }
      }
      if (r + 1 < board.height) {
        const down = board.grid[r + 1]?.[c];
        if (down && isMatchable(down.piece)) {
          out.push({ a: { row: r, col: c }, b: { row: r + 1, col: c } });
        }
      }
    }
  }
  return out;
}

function swapWouldMatch(board: Board, swap: { a: Position; b: Position }): boolean {
  const a = cellOrThrow(board, swap.a);
  const b = cellOrThrow(board, swap.b);
  const tmp = a.piece;
  a.piece = b.piece;
  b.piece = tmp;
  const matched = findMatches(board).length > 0;
  // revert
  const t2 = a.piece;
  a.piece = b.piece;
  b.piece = t2;
  return matched;
}

export interface ShuffleOptions {
  rng: Rng;
  spawnWeights?: SpawnWeights;
  maxAttempts?: number;
}

/**
 * Reshuffles all normal pieces on the board until at least one valid swap exists.
 * Specials and tiles are preserved.
 */
export function shuffleBoard(board: Board, opts: ShuffleOptions): Board {
  const maxAttempts = opts.maxAttempts ?? 50;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const next = cloneBoard(board);
    // Collect normal piece positions
    const positions: Position[] = [];
    const colors: string[] = [];
    for (let r = 0; r < next.height; r++) {
      for (let c = 0; c < next.width; c++) {
        const cell = next.grid[r]?.[c];
        if (!cell || !isMatchable(cell.piece)) continue;
        if (isSpecial(cell.piece)) continue;
        positions.push({ row: r, col: c });
        colors.push(cell.piece!.color!);
      }
    }
    // Fisher–Yates shuffle on colors
    for (let i = colors.length - 1; i > 0; i--) {
      const j = opts.rng.int(i + 1);
      const tmp = colors[i]!;
      colors[i] = colors[j]!;
      colors[j] = tmp;
    }
    // Apply shuffled colors
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i]!;
      const cell = cellOrThrow(next, p);
      cell.piece = createPiece(colors[i] as (typeof PIECE_COLORS)[number]);
    }
    if (findMatches(next).length > 0) {
      // Re-roll if shuffle accidentally produced matches
      continue;
    }
    if (!isDeadlock(next)) return next;
  }
  // Fall back: re-roll colors with weights until we get a valid (no-initial-match, no-deadlock) board.
  const fallback = cloneBoard(board);
  for (let r = 0; r < fallback.height; r++) {
    for (let c = 0; c < fallback.width; c++) {
      const cell = fallback.grid[r]?.[c];
      if (!cell || !isMatchable(cell.piece)) continue;
      cell.piece = createPiece(opts.rng.pick(PIECE_COLORS));
    }
  }
  return fallback;
}
