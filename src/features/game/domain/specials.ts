import type { Board, Position, Piece, PieceColor, PieceKind } from "./types";
import { inBounds } from "./types";
import { cellOrThrow } from "./board";
import type { MatchGroup } from "./match";

export type SpecialKind = Exclude<PieceKind, "normal" | "blocker">;

/**
 * Decide which special piece (if any) to spawn from a match group.
 * Returns the spawn position (typically the pivot or the last-moved cell) and the kind.
 */
export function classifySpecial(
  group: MatchGroup,
  pivot: Position | null,
): { position: Position; kind: SpecialKind; color: PieceColor } | null {
  const positionsByKey = new Map<string, Position>();
  for (const p of group.positions) {
    positionsByKey.set(`${p.row}:${p.col}`, p);
  }
  const anchor = pivot && positionsByKey.has(`${pivot.row}:${pivot.col}`) ? pivot : group.positions[0]!;

  if (group.shape === "L" || group.shape === "T") {
    return { position: anchor, kind: "wrapped", color: group.color };
  }
  if (group.length >= 5) {
    return { position: anchor, kind: "rainbow", color: group.color };
  }
  if (group.length === 4) {
    return {
      position: anchor,
      kind: group.primaryAxis === "row" ? "stripedV" : "stripedH",
      color: group.color,
    };
  }
  return null;
}

/**
 * Compute affected positions when activating a special piece.
 */
export function affectedByActivation(
  board: Board,
  pos: Position,
  kind: SpecialKind,
  targetColor: PieceColor | null = null,
): Position[] {
  switch (kind) {
    case "stripedH":
      return rowCells(board, pos.row);
    case "stripedV":
      return colCells(board, pos.col);
    case "wrapped":
      return wrappedCells(board, pos);
    case "rainbow":
      return rainbowCells(board, targetColor);
  }
}

function rowCells(board: Board, row: number): Position[] {
  const out: Position[] = [];
  for (let c = 0; c < board.width; c++) {
    const cell = board.grid[row]?.[c];
    if (cell && cell.tile !== "wall" && cell.tile !== "hole") {
      out.push({ row, col: c });
    }
  }
  return out;
}

function colCells(board: Board, col: number): Position[] {
  const out: Position[] = [];
  for (let r = 0; r < board.height; r++) {
    const cell = board.grid[r]?.[col];
    if (cell && cell.tile !== "wall" && cell.tile !== "hole") {
      out.push({ row: r, col });
    }
  }
  return out;
}

function wrappedCells(board: Board, pos: Position): Position[] {
  const out: Position[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const p = { row: pos.row + dr, col: pos.col + dc };
      if (!inBounds(board, p)) continue;
      const cell = cellOrThrow(board, p);
      if (cell.tile === "wall" || cell.tile === "hole") continue;
      out.push(p);
    }
  }
  return out;
}

function rainbowCells(board: Board, targetColor: PieceColor | null): Position[] {
  const out: Position[] = [];
  if (!targetColor) return out;
  for (let r = 0; r < board.height; r++) {
    for (let c = 0; c < board.width; c++) {
      const cell = board.grid[r]?.[c];
      if (cell?.piece?.color === targetColor) {
        out.push({ row: r, col: c });
      }
    }
  }
  return out;
}

/**
 * Compute affected positions for special × special combos.
 */
export function affectedByCombo(
  board: Board,
  posA: Position,
  kindA: SpecialKind,
  posB: Position,
  kindB: SpecialKind,
): Position[] {
  // Normalize: alphabetical order for symmetric handling
  const pair = sortPair(kindA, kindB);

  if (pair === "rainbow+rainbow") {
    return allPlayable(board);
  }
  if (pair === "rainbow+stripedH" || pair === "rainbow+stripedV") {
    // Convert all of one color to striped, then activate.
    const otherPos = kindA === "rainbow" ? posB : posA;
    const otherCell = board.grid[otherPos.row]?.[otherPos.col];
    const targetColor = otherCell?.piece?.color ?? null;
    if (!targetColor) return [posA, posB];
    const out: Position[] = [posA, posB];
    for (let r = 0; r < board.height; r++) {
      for (let c = 0; c < board.width; c++) {
        if (board.grid[r]?.[c]?.piece?.color === targetColor) {
          // each same-color triggers a striped (rotate row/col by parity)
          if ((r + c) % 2 === 0) out.push(...rowCells(board, r));
          else out.push(...colCells(board, c));
        }
      }
    }
    return uniquePositions(out);
  }
  if (pair === "rainbow+wrapped") {
    const otherPos = kindA === "rainbow" ? posB : posA;
    const otherCell = board.grid[otherPos.row]?.[otherPos.col];
    const targetColor = otherCell?.piece?.color ?? null;
    if (!targetColor) return [posA, posB];
    const out: Position[] = [posA, posB];
    for (let r = 0; r < board.height; r++) {
      for (let c = 0; c < board.width; c++) {
        if (board.grid[r]?.[c]?.piece?.color === targetColor) {
          out.push(...wrappedCells(board, { row: r, col: c }));
        }
      }
    }
    return uniquePositions(out);
  }
  if (pair === "stripedH+stripedH" || pair === "stripedV+stripedV" || pair === "stripedH+stripedV") {
    // Cross: row of A + col of A (or both rows / both cols)
    const out: Position[] = [
      ...rowCells(board, posA.row),
      ...colCells(board, posA.col),
    ];
    return uniquePositions(out);
  }
  if (pair === "stripedH+wrapped" || pair === "stripedV+wrapped") {
    // 3 rows + 3 cols centered on striped position
    const stripedPos = kindA === "wrapped" ? posB : posA;
    const out: Position[] = [];
    for (let d = -1; d <= 1; d++) {
      out.push(...rowCells(board, stripedPos.row + d));
      out.push(...colCells(board, stripedPos.col + d));
    }
    return uniquePositions(out);
  }
  if (pair === "wrapped+wrapped") {
    // 5x5 around posA
    const out: Position[] = [];
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const p = { row: posA.row + dr, col: posA.col + dc };
        if (!inBounds(board, p)) continue;
        const cell = cellOrThrow(board, p);
        if (cell.tile === "wall" || cell.tile === "hole") continue;
        out.push(p);
      }
    }
    return out;
  }
  return [posA, posB];
}

function sortPair(a: SpecialKind, b: SpecialKind): string {
  return [a, b].sort().join("+");
}

function allPlayable(board: Board): Position[] {
  const out: Position[] = [];
  for (let r = 0; r < board.height; r++) {
    for (let c = 0; c < board.width; c++) {
      const cell = board.grid[r]?.[c];
      if (cell && cell.tile !== "wall" && cell.tile !== "hole") {
        out.push({ row: r, col: c });
      }
    }
  }
  return out;
}

function uniquePositions(positions: Position[]): Position[] {
  const seen = new Set<string>();
  const out: Position[] = [];
  for (const p of positions) {
    const k = `${p.row}:${p.col}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

export function isSpecial(piece: Piece | null): boolean {
  if (!piece) return false;
  return piece.kind !== "normal" && piece.kind !== "blocker";
}
