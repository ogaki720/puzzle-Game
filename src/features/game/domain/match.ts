import type { Board, Piece, PieceColor, Position } from "./types";
import { isMatchable } from "./types";

export type MatchShape = "line" | "L" | "T";

export interface MatchGroup {
  color: PieceColor;
  positions: Position[];
  shape: MatchShape;
  primaryAxis: "row" | "col";
  length: number;
}

/**
 * Detects all 3+ in-a-row matches on the board.
 * Combines overlapping line matches into L/T shapes.
 */
export function findMatches(board: Board): MatchGroup[] {
  const horizontal = findLineMatches(board, "row");
  const vertical = findLineMatches(board, "col");
  return mergeIntoShapes(horizontal, vertical);
}

function findLineMatches(
  board: Board,
  axis: "row" | "col",
): { color: PieceColor; positions: Position[]; primaryAxis: "row" | "col" }[] {
  const groups: { color: PieceColor; positions: Position[]; primaryAxis: "row" | "col" }[] = [];
  const outer = axis === "row" ? board.height : board.width;
  const inner = axis === "row" ? board.width : board.height;
  for (let o = 0; o < outer; o++) {
    let runColor: PieceColor | null = null;
    let runStart = 0;
    for (let i = 0; i <= inner; i++) {
      const pos: Position = axis === "row" ? { row: o, col: i } : { row: i, col: o };
      const piece = i < inner ? pieceAt(board, pos) : null;
      const color = piece && isMatchable(piece) ? piece.color : null;
      if (color !== null && color === runColor) {
        continue;
      }
      if (runColor !== null && i - runStart >= 3) {
        const positions: Position[] = [];
        for (let k = runStart; k < i; k++) {
          positions.push(axis === "row" ? { row: o, col: k } : { row: k, col: o });
        }
        groups.push({ color: runColor, positions, primaryAxis: axis });
      }
      runColor = color;
      runStart = i;
    }
  }
  return groups;
}

function mergeIntoShapes(
  horizontal: { color: PieceColor; positions: Position[]; primaryAxis: "row" | "col" }[],
  vertical: { color: PieceColor; positions: Position[]; primaryAxis: "row" | "col" }[],
): MatchGroup[] {
  const result: MatchGroup[] = [];
  const usedVertical = new Set<number>();

  for (const h of horizontal) {
    const overlappingVerticals: number[] = [];
    for (let vi = 0; vi < vertical.length; vi++) {
      const v = vertical[vi]!;
      if (v.color !== h.color) continue;
      if (intersects(h.positions, v.positions)) {
        overlappingVerticals.push(vi);
      }
    }
    if (overlappingVerticals.length > 0) {
      const positions = unique([
        ...h.positions,
        ...overlappingVerticals.flatMap((vi) => vertical[vi]!.positions),
      ]);
      overlappingVerticals.forEach((vi) => usedVertical.add(vi));
      result.push({
        color: h.color,
        positions,
        shape: classifyShape(h.positions, vertical[overlappingVerticals[0]!]!.positions),
        primaryAxis: h.positions.length >= vertical[overlappingVerticals[0]!]!.positions.length
          ? "row"
          : "col",
        length: Math.max(
          h.positions.length,
          ...overlappingVerticals.map((vi) => vertical[vi]!.positions.length),
        ),
      });
    } else {
      result.push({
        color: h.color,
        positions: h.positions,
        shape: "line",
        primaryAxis: "row",
        length: h.positions.length,
      });
    }
  }

  for (let vi = 0; vi < vertical.length; vi++) {
    if (usedVertical.has(vi)) continue;
    const v = vertical[vi]!;
    result.push({
      color: v.color,
      positions: v.positions,
      shape: "line",
      primaryAxis: "col",
      length: v.positions.length,
    });
  }

  return result;
}

function classifyShape(rowRun: Position[], colRun: Position[]): MatchShape {
  if (rowRun.length === 0 || colRun.length === 0) return "line";
  // Pivot is the shared cell.
  const pivot = rowRun.find((p) => colRun.some((q) => q.row === p.row && q.col === p.col));
  if (!pivot) return "L";
  const rowEndpoints = endpoints(rowRun, "col");
  const colEndpoints = endpoints(colRun, "row");
  const pivotAtRowEnd = pivot.col === rowEndpoints.min || pivot.col === rowEndpoints.max;
  const pivotAtColEnd = pivot.row === colEndpoints.min || pivot.row === colEndpoints.max;
  if (pivotAtRowEnd && pivotAtColEnd) return "L";
  return "T";
}

function endpoints(positions: Position[], key: "row" | "col"): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const p of positions) {
    const v = p[key];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}

function intersects(a: Position[], b: Position[]): boolean {
  for (const x of a) {
    for (const y of b) {
      if (x.row === y.row && x.col === y.col) return true;
    }
  }
  return false;
}

function unique(positions: Position[]): Position[] {
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

function pieceAt(board: Board, p: Position): Piece | null {
  return board.grid[p.row]?.[p.col]?.piece ?? null;
}
