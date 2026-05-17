import type { Board, Cell, Piece, Position, SpawnWeights, Swap } from "./types";
import { PIECE_COLORS } from "./types";
import { cellOrThrow, cloneBoard, createPiece } from "./board";
import { findMatches, type MatchGroup } from "./match";
import { affectedByActivation, affectedByCombo, classifySpecial, isSpecial, type SpecialKind } from "./specials";
import { combinedMultiplier, scoreForGroup } from "./scoring";
import type { Rng } from "./rng";
import type { GravityEvent, MatchEvent, RefillEvent, TurnEvent } from "./events";

export interface TurnInput {
  board: Board;
  swap: Swap;
  rng: Rng;
  spawnWeights?: SpawnWeights;
}

export interface TurnResult {
  board: Board;
  events: TurnEvent[];
  scoreDelta: number;
  chainCount: number;
}

/**
 * Apply one player swap: validate, run cascade until no matches remain.
 * Returns a NEW board (input is not mutated).
 */
export function applyTurn(input: TurnInput): TurnResult {
  const board = cloneBoard(input.board);
  const events: TurnEvent[] = [];

  const a = cellOrThrow(board, input.swap.a);
  const b = cellOrThrow(board, input.swap.b);

  const aSpecialPre = isSpecial(a.piece);
  const bSpecialPre = isSpecial(b.piece);
  swapCells(a, b);
  // After swap: piece originally at a is now in cell b, and vice versa.

  // Special × Special combo on swap
  if (aSpecialPre && bSpecialPre) {
    events.push({ type: "swap-attempt", swap: input.swap, accepted: true });
    return runComboSwap(board, input, events, input.swap);
  }
  // Rainbow + normal: rainbow consumes all of the other color.
  // After swap, the rainbow lives in whichever cell receives it.
  const aIsRainbowNow = a.piece?.kind === "rainbow";
  const bIsRainbowNow = b.piece?.kind === "rainbow";
  if (aIsRainbowNow || bIsRainbowNow) {
    events.push({ type: "swap-attempt", swap: input.swap, accepted: true });
    return runRainbowSwap(board, input, events, input.swap);
  }

  const groups = findMatches(board);
  if (groups.length === 0) {
    // Revert
    swapCells(a, b);
    events.push({ type: "swap-attempt", swap: input.swap, accepted: false });
    return { board, events, scoreDelta: 0, chainCount: 0 };
  }

  events.push({ type: "swap-attempt", swap: input.swap, accepted: true });
  return runCascade(board, input, events, [input.swap.a, input.swap.b]);
}

function runComboSwap(
  board: Board,
  input: TurnInput,
  events: TurnEvent[],
  swap: Swap,
): TurnResult {
  const aCell = cellOrThrow(board, swap.b); // Note: cells already swapped above
  const bCell = cellOrThrow(board, swap.a);
  const kindA = aCell.piece?.kind as SpecialKind | undefined;
  const kindB = bCell.piece?.kind as SpecialKind | undefined;
  if (!kindA || !kindB) {
    return runCascade(board, input, events, [swap.a, swap.b]);
  }
  const affected = affectedByCombo(board, swap.b, kindA, swap.a, kindB);
  events.push({ type: "special-activated", position: swap.b, kind: kindA, affected });
  for (const p of affected) {
    erasePosition(board, p, events);
  }
  return runCascade(board, input, events, []);
}

function runRainbowSwap(
  board: Board,
  input: TurnInput,
  events: TurnEvent[],
  swap: Swap,
): TurnResult {
  const aCell = cellOrThrow(board, swap.b);
  const bCell = cellOrThrow(board, swap.a);
  const rainbowCell = aCell.piece?.kind === "rainbow" ? aCell : bCell;
  const otherCell = aCell === rainbowCell ? bCell : aCell;
  const targetColor = otherCell.piece?.color ?? null;
  const affected = affectedByActivation(
    board,
    { row: rainbowCell.row, col: rainbowCell.col },
    "rainbow",
    targetColor,
  );
  // Also erase the rainbow piece itself
  affected.push({ row: rainbowCell.row, col: rainbowCell.col });
  events.push({
    type: "special-activated",
    position: { row: rainbowCell.row, col: rainbowCell.col },
    kind: "rainbow",
    affected,
  });
  for (const p of affected) {
    erasePosition(board, p, events);
  }
  return runCascade(board, input, events, []);
}

function runCascade(
  board: Board,
  input: TurnInput,
  events: TurnEvent[],
  pivots: Position[],
): TurnResult {
  let chainIndex = 0;
  let total = 0;
  let pivotsForThisStep = pivots;

  // Step 0 if no initial cascade pivots, still run match detection.
  for (;;) {
    const groups = findMatches(board);
    if (groups.length === 0) {
      // If we erased via specials and gravity happened pre-loop, we still need to apply gravity.
      const gravity = applyGravity(board);
      if (gravity.moves.length > 0) {
        events.push(gravity);
        const refill = refillTop(board, input.rng, input.spawnWeights);
        if (refill.positions.length > 0) events.push(refill);
        continue;
      }
      break;
    }
    chainIndex += 1;
    events.push({ type: "chain-step", index: chainIndex });

    // Special creation (one per group, anchored at the latest pivot if shared)
    const specialsToPlace: { position: Position; kind: SpecialKind; color: Piece["color"] }[] = [];
    for (const g of groups) {
      const pivot = findPivotInGroup(g, pivotsForThisStep);
      const sp = classifySpecial(g, pivot);
      if (sp) specialsToPlace.push(sp);
    }

    // Score per group
    let stepScore = 0;
    const matchEvents: MatchEvent[] = [];
    for (const g of groups) {
      const createdSpecials = specialsToPlace.filter((s) =>
        g.positions.some((p) => p.row === s.position.row && p.col === s.position.col),
      ).length;
      const s = scoreForGroup(g, chainIndex, createdSpecials);
      stepScore += s;
      matchEvents.push({
        type: "match",
        positions: g.positions,
        color: g.color,
        shape: g.shape,
        length: g.length,
      });
    }
    for (const e of matchEvents) events.push(e);
    total += stepScore;

    // Erase matched cells, but PRESERVE the cell that will receive a created special.
    const specialPositionsKey = new Set(specialsToPlace.map((s) => `${s.position.row}:${s.position.col}`));
    const erasedPositions: Position[] = [];
    const activatedFromSpecials: { position: Position; kind: SpecialKind; color: Piece["color"] | null }[] = [];

    for (const g of groups) {
      for (const p of g.positions) {
        const k = `${p.row}:${p.col}`;
        if (specialPositionsKey.has(k)) continue;
        const cell = cellOrThrow(board, p);
        if (isSpecial(cell.piece)) {
          activatedFromSpecials.push({
            position: p,
            kind: cell.piece!.kind as SpecialKind,
            color: cell.piece!.color,
          });
        }
        erasedPositions.push(p);
      }
    }
    if (erasedPositions.length > 0) {
      events.push({ type: "erase", positions: erasedPositions });
      for (const p of erasedPositions) {
        damageOrClear(board, p, events);
      }
    }

    events.push({
      type: "score",
      delta: stepScore,
      multiplier: combinedMultiplier(chainIndex),
      total,
    });

    // Place created specials
    for (const sp of specialsToPlace) {
      const cell = cellOrThrow(board, sp.position);
      cell.piece = createPiece(sp.color, sp.kind);
      events.push({
        type: "special-created",
        position: sp.position,
        kind: sp.kind,
        color: sp.color,
      });
    }

    // Activate specials that were matched (chain reaction)
    for (const sp of activatedFromSpecials) {
      const affected = affectedByActivation(board, sp.position, sp.kind, sp.color);
      events.push({
        type: "special-activated",
        position: sp.position,
        kind: sp.kind,
        affected,
      });
      for (const p of affected) {
        erasePosition(board, p, events);
      }
    }

    // Gravity + refill
    const gravity = applyGravity(board);
    if (gravity.moves.length > 0) events.push(gravity);
    const refill = refillTop(board, input.rng, input.spawnWeights);
    if (refill.positions.length > 0) events.push(refill);
    pivotsForThisStep = [];
  }

  return { board, events, scoreDelta: total, chainCount: chainIndex };
}

function swapCells(a: Cell, b: Cell): void {
  const tmp = a.piece;
  a.piece = b.piece;
  b.piece = tmp;
}

function findPivotInGroup(group: MatchGroup, pivots: Position[]): Position | null {
  for (const p of pivots) {
    if (group.positions.some((q) => q.row === p.row && q.col === p.col)) return p;
  }
  return null;
}

function erasePosition(board: Board, p: Position, events: TurnEvent[]): void {
  const cell = board.grid[p.row]?.[p.col];
  if (!cell) return;
  if (cell.tile === "wall" || cell.tile === "hole") return;
  if (cell.piece && isSpecial(cell.piece)) {
    // chain detonate
    const kind = cell.piece.kind as SpecialKind;
    const color = cell.piece.color;
    cell.piece = null;
    events.push({ type: "erase", positions: [p] });
    const affected = affectedByActivation(board, p, kind, color);
    events.push({
      type: "special-activated",
      position: p,
      kind,
      affected,
    });
    for (const q of affected) {
      erasePosition(board, q, events);
    }
    return;
  }
  damageOrClear(board, p, events);
  events.push({ type: "erase", positions: [p] });
}

function damageOrClear(board: Board, p: Position, events: TurnEvent[]): void {
  const cell = cellOrThrow(board, p);
  if (cell.tile === "ice2") {
    events.push({ type: "tile-damage", position: p, from: "ice2", to: "ice1" });
    cell.tile = "ice1";
    return;
  }
  if (cell.tile === "ice1" || cell.tile === "chain") {
    events.push({ type: "tile-damage", position: p, from: cell.tile, to: "normal" });
    cell.tile = "normal";
    return;
  }
  cell.piece = null;
}

function applyGravity(board: Board): GravityEvent {
  const moves: GravityEvent["moves"] = [];
  for (let c = 0; c < board.width; c++) {
    let writeRow = board.height - 1;
    for (let r = board.height - 1; r >= 0; r--) {
      const cell = board.grid[r]?.[c];
      if (!cell) continue;
      if (cell.tile === "wall" || cell.tile === "hole") {
        // Cannot pass through walls/holes; reset writeRow above this barrier.
        writeRow = r - 1;
        continue;
      }
      if (cell.piece !== null) {
        if (writeRow !== r) {
          const target = board.grid[writeRow]?.[c];
          if (target && target.tile !== "wall" && target.tile !== "hole") {
            target.piece = cell.piece;
            cell.piece = null;
            moves.push({ from: { row: r, col: c }, to: { row: writeRow, col: c } });
          }
        }
        writeRow -= 1;
      }
    }
  }
  return { type: "gravity", moves };
}

function refillTop(board: Board, rng: Rng, weights: SpawnWeights | undefined): RefillEvent {
  const positions: Position[] = [];
  const w = PIECE_COLORS.map((color) => weights?.[color] ?? 1);
  for (let r = 0; r < board.height; r++) {
    for (let c = 0; c < board.width; c++) {
      const cell = board.grid[r]?.[c];
      if (!cell) continue;
      if (cell.tile === "wall" || cell.tile === "hole") continue;
      if (cell.piece !== null) continue;
      const color = rng.pickWeighted(PIECE_COLORS, w);
      cell.piece = createPiece(color);
      positions.push({ row: r, col: c });
    }
  }
  return { type: "refill", positions };
}

