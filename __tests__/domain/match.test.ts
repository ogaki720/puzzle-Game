import { createBoard, resetPieceIdCounterForTest, setPiece, createPiece } from "@/features/game/domain/board";
import { createRng } from "@/features/game/domain/rng";
import { findMatches } from "@/features/game/domain/match";
import type { PieceColor } from "@/features/game/domain/types";

const COLORS: Record<string, PieceColor> = {
  B: "berry",
  M: "mint",
  L: "lemon",
  S: "sky",
  P: "peach",
  U: "plum",
};

function buildBoard(rows: string[]) {
  const height = rows.length;
  const width = rows[0]!.length;
  const rng = createRng(1);
  const board = createBoard({
    width,
    height,
    rng,
    layout: Array.from({ length: height }, () => ".".repeat(width)),
    ensureNoInitialMatch: false,
  });
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const ch = rows[r]![c]!;
      const color = COLORS[ch];
      setPiece(board, { row: r, col: c }, color ? createPiece(color) : null);
    }
  }
  return board;
}

describe("findMatches", () => {
  beforeEach(() => resetPieceIdCounterForTest());

  it("detects a horizontal 3-match", () => {
    const board = buildBoard(["BBBLM", "MLSBL", "SUBLM"]);
    const matches = findMatches(board);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.color).toBe("berry");
    expect(matches[0]?.length).toBe(3);
    expect(matches[0]?.shape).toBe("line");
  });

  it("detects a vertical 3-match", () => {
    const board = buildBoard(["BMS", "BLU", "BSM", "LSU"]);
    const matches = findMatches(board);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.color).toBe("berry");
    expect(matches[0]?.length).toBe(3);
  });

  it("detects 4-match (line)", () => {
    const board = buildBoard(["BBBBL", "MLSBL", "SUBLM"]);
    const matches = findMatches(board);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.length).toBe(4);
    expect(matches[0]?.shape).toBe("line");
  });

  it("detects 5-match (line)", () => {
    const board = buildBoard(["BBBBB", "MLSBL", "SUBLM"]);
    const matches = findMatches(board);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.length).toBe(5);
  });

  it("detects L-shape", () => {
    const board = buildBoard(["BBB", "LMB", "LSB", "MUL"]);
    const matches = findMatches(board);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.shape).toBe("L");
    expect(matches[0]?.positions).toHaveLength(5);
  });

  it("detects T-shape", () => {
    const board = buildBoard(["BBBBB", "LMBSL", "LSBLM", "MUBLU"]);
    const matches = findMatches(board);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.shape).toBe("T");
  });

  it("detects multiple disjoint matches", () => {
    const board = buildBoard(["BBBSS", "LLLMM", "SUMLL"]);
    const matches = findMatches(board);
    expect(matches).toHaveLength(2);
  });

  it("returns no match for a non-matching board", () => {
    const board = buildBoard(["BMSPU", "MSPUL", "SPULB", "PULBM"]);
    const matches = findMatches(board);
    expect(matches).toHaveLength(0);
  });

  it("does not merge same-color but disjoint runs", () => {
    const board = buildBoard(["BBBML", "MLLLB", "MUSBL"]);
    const matches = findMatches(board);
    expect(matches).toHaveLength(2);
    expect(matches.map((m) => m.color).sort()).toEqual(["berry", "lemon"]);
  });

  it("treats blockers as non-matching", () => {
    const board = buildBoard(["BBB", "MLS"]);
    const blockerCell = board.grid[1]?.[0];
    expect(blockerCell).toBeDefined();
    blockerCell!.piece = { id: "x", color: null, kind: "blocker" };
    const matches = findMatches(board);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.color).toBe("berry");
  });
});
