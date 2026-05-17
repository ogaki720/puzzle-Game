import type { Board, Cell, Piece, PieceColor, Position, SpawnWeights, TileType } from "./types";
import { PIECE_COLORS, inBounds } from "./types";
import type { Rng } from "./rng";

const TILE_FROM_CHAR: Record<string, TileType> = {
  ".": "normal",
  "#": "wall",
  i: "ice1",
  I: "ice2",
  c: "chain",
  " ": "hole",
};

let pieceCounter = 0;
function nextPieceId(): string {
  pieceCounter += 1;
  return `p${pieceCounter}`;
}

export function resetPieceIdCounterForTest(): void {
  pieceCounter = 0;
}

export function createPiece(color: PieceColor | null, kind: Piece["kind"] = "normal"): Piece {
  return { id: nextPieceId(), color, kind };
}

export function parseLayout(layout: readonly string[]): TileType[][] {
  const height = layout.length;
  const width = layout[0]?.length ?? 0;
  const grid: TileType[][] = [];
  for (let r = 0; r < height; r++) {
    const row: TileType[] = [];
    const line = layout[r] ?? "";
    if (line.length !== width) {
      throw new Error(`parseLayout: inconsistent width at row ${r}`);
    }
    for (let c = 0; c < width; c++) {
      const ch = line[c] ?? ".";
      const tile = TILE_FROM_CHAR[ch];
      if (!tile) {
        throw new Error(`parseLayout: unknown tile char "${ch}" at ${r},${c}`);
      }
      row.push(tile);
    }
    grid.push(row);
  }
  return grid;
}

export interface CreateBoardOptions {
  width: number;
  height: number;
  rng: Rng;
  layout?: readonly string[];
  spawnWeights?: SpawnWeights;
  ensureNoInitialMatch?: boolean;
}

export function createBoard(opts: CreateBoardOptions): Board {
  const tiles = opts.layout
    ? parseLayout(opts.layout)
    : (Array.from({ length: opts.height }, () =>
        Array.from({ length: opts.width }, () => "normal" as TileType),
      ) satisfies TileType[][]);
  if (tiles.length !== opts.height) {
    throw new Error("createBoard: layout height mismatch");
  }
  const grid: Cell[][] = [];
  for (let r = 0; r < opts.height; r++) {
    const row: Cell[] = [];
    const tileRow = tiles[r];
    if (!tileRow) throw new Error("createBoard: missing tile row");
    for (let c = 0; c < opts.width; c++) {
      const tile = tileRow[c] ?? "normal";
      row.push({ row: r, col: c, piece: null, tile });
    }
    grid.push(row);
  }
  const board: Board = { width: opts.width, height: opts.height, grid };
  fillBoard(board, opts.rng, opts.spawnWeights, opts.ensureNoInitialMatch ?? true);
  return board;
}

export function fillBoard(
  board: Board,
  rng: Rng,
  weights: SpawnWeights | undefined,
  ensureNoMatch: boolean,
): void {
  for (let r = 0; r < board.height; r++) {
    for (let c = 0; c < board.width; c++) {
      const cell = cellOrThrow(board, { row: r, col: c });
      if (cell.tile === "wall" || cell.tile === "hole") continue;
      if (cell.piece !== null) continue;
      cell.piece = createPiece(pickColor(rng, weights, ensureNoMatch ? board : null, r, c));
    }
  }
}

function pickColor(
  rng: Rng,
  weights: SpawnWeights | undefined,
  boardForCheck: Board | null,
  r: number,
  c: number,
): PieceColor {
  const colors = PIECE_COLORS;
  const w = colors.map((color) => weights?.[color] ?? 1);
  for (let attempt = 0; attempt < 8; attempt++) {
    const color = rng.pickWeighted(colors, w);
    if (!boardForCheck) return color;
    if (!wouldFormMatch(boardForCheck, r, c, color)) return color;
  }
  const fallback = colors[0];
  if (!fallback) throw new Error("pickColor: no fallback color");
  return fallback;
}

function wouldFormMatch(board: Board, r: number, c: number, color: PieceColor): boolean {
  // Check left two
  if (c >= 2) {
    const a = colorAt(board, { row: r, col: c - 1 });
    const b = colorAt(board, { row: r, col: c - 2 });
    if (a === color && b === color) return true;
  }
  // Check up two
  if (r >= 2) {
    const a = colorAt(board, { row: r - 1, col: c });
    const b = colorAt(board, { row: r - 2, col: c });
    if (a === color && b === color) return true;
  }
  return false;
}

function colorAt(board: Board, p: Position): PieceColor | null {
  if (!inBounds(board, p)) return null;
  const row = board.grid[p.row];
  if (!row) return null;
  return row[p.col]?.piece?.color ?? null;
}

export function cellOrThrow(board: Board, p: Position): Cell {
  if (!inBounds(board, p)) {
    throw new Error(`cellOrThrow: out of bounds ${p.row},${p.col}`);
  }
  const row = board.grid[p.row];
  if (!row) throw new Error("cellOrThrow: missing row");
  const cell = row[p.col];
  if (!cell) throw new Error("cellOrThrow: missing cell");
  return cell;
}

export function cloneBoard(board: Board): Board {
  const grid: Cell[][] = board.grid.map((row) =>
    row.map((cell) => ({
      row: cell.row,
      col: cell.col,
      tile: cell.tile,
      piece: cell.piece ? { ...cell.piece } : null,
    })),
  );
  return { width: board.width, height: board.height, grid };
}

export function setPiece(board: Board, p: Position, piece: Piece | null): void {
  const cell = cellOrThrow(board, p);
  cell.piece = piece;
}

export function piecesEqual(a: Piece | null, b: Piece | null): boolean {
  if (a === null || b === null) return a === b;
  return a.color === b.color && a.kind === b.kind;
}
