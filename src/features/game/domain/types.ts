export const PIECE_COLORS = ["berry", "mint", "lemon", "sky", "peach", "plum"] as const;
export type PieceColor = (typeof PIECE_COLORS)[number];

export type PieceKind =
  | "normal"
  | "stripedH"
  | "stripedV"
  | "wrapped"
  | "rainbow"
  | "blocker";

export interface Piece {
  id: string;
  color: PieceColor | null;
  kind: PieceKind;
}

export type TileType = "normal" | "ice1" | "ice2" | "chain" | "hole" | "wall";

export interface Cell {
  row: number;
  col: number;
  piece: Piece | null;
  tile: TileType;
}

export interface Board {
  width: number;
  height: number;
  grid: Cell[][];
}

export interface Position {
  row: number;
  col: number;
}

export interface Swap {
  a: Position;
  b: Position;
}

export type SpawnWeights = Partial<Record<PieceColor, number>>;

export function isAdjacent(a: Position, b: Position): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

export function inBounds(board: Board, p: Position): boolean {
  return p.row >= 0 && p.row < board.height && p.col >= 0 && p.col < board.width;
}

export function cellAt(board: Board, p: Position): Cell | null {
  if (!inBounds(board, p)) return null;
  const row = board.grid[p.row];
  if (!row) return null;
  return row[p.col] ?? null;
}

export function isPlayable(tile: TileType): boolean {
  return tile !== "wall" && tile !== "hole";
}

export function isMatchable(piece: Piece | null): piece is Piece & { color: PieceColor } {
  return piece !== null && piece.color !== null && piece.kind !== "blocker";
}
