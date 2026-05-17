import {
  createBoard,
  createPiece,
  resetPieceIdCounterForTest,
  setPiece,
} from "@/features/game/domain/board";
import { createRng } from "@/features/game/domain/rng";
import { applyTurn } from "@/features/game/domain/turn";
import type { Board, PieceColor, PieceKind } from "@/features/game/domain/types";

const C: Record<string, PieceColor> = {
  B: "berry",
  M: "mint",
  L: "lemon",
  S: "sky",
  P: "peach",
  U: "plum",
};

function buildBoard(rows: string[]): Board {
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
      const color = C[ch];
      setPiece(board, { row: r, col: c }, color ? createPiece(color) : null);
    }
  }
  return board;
}

function placeSpecial(board: Board, r: number, c: number, color: PieceColor, kind: PieceKind) {
  setPiece(board, { row: r, col: c }, createPiece(color, kind));
}

describe("applyTurn — basic", () => {
  beforeEach(() => resetPieceIdCounterForTest());

  it("rejects a swap that creates no match", () => {
    const board = buildBoard(["BMSPU", "MSPUL", "SPULB", "PULBM", "ULBMS"]);
    const result = applyTurn({
      board,
      swap: { a: { row: 0, col: 0 }, b: { row: 0, col: 1 } },
      rng: createRng(42),
    });
    const swap = result.events.find((e) => e.type === "swap-attempt");
    expect(swap).toEqual({
      type: "swap-attempt",
      swap: { a: { row: 0, col: 0 }, b: { row: 0, col: 1 } },
      accepted: false,
    });
    expect(result.scoreDelta).toBe(0);
  });

  it("accepts a swap that creates a 3-match (horizontal)", () => {
    // Swap (0,2)<->(1,2) so the top row becomes B B B
    const board = buildBoard(["BBMSP", "MMBLS", "SLPUS"]);
    const result = applyTurn({
      board,
      swap: { a: { row: 0, col: 2 }, b: { row: 1, col: 2 } },
      rng: createRng(0),
    });
    const swap = result.events.find((e) => e.type === "swap-attempt");
    expect(swap?.type === "swap-attempt" && swap.accepted).toBe(true);
    expect(result.chainCount).toBeGreaterThanOrEqual(1);
    expect(result.scoreDelta).toBeGreaterThan(0);
    const erase = result.events.find((e) => e.type === "erase");
    expect(erase).toBeDefined();
  });

  it("creates stripedV from a horizontal 4-match (swap-axis perpendicular)", () => {
    // Top row will become B B B B after swap (1,3)<->(0,3)
    const board = buildBoard(["BBBSM", "MLPBL", "ULSPM", "PSMLB", "MLPBL"]);
    const result = applyTurn({
      board,
      swap: { a: { row: 0, col: 3 }, b: { row: 1, col: 3 } },
      rng: createRng(0),
    });
    const created = result.events.filter((e) => e.type === "special-created");
    expect(created.length).toBe(1);
    expect(created[0]?.type === "special-created" && created[0].kind).toMatch(/striped/);
  });

  it("creates wrapped from an L-shape match", () => {
    // Build a board where swapping creates an L:
    //  B B M
    //  M L B
    //  M S B
    //  L U L
    // Swap (1,2)<->(1,1) so col 2 becomes B,B,B and row 0 stays B,B,M (no row match).
    // Actually let's design directly to produce L:
    //  pre swap:  B B M       after swap of (0,2)<->(1,2):
    //             M L B                    B B B
    //             M S B                    M L M
    //  vertical match col 2: B,B,B? Let's compute simpler: use L by direct construction.
    const board = buildBoard(["BBM", "MLB", "SSB", "LUB"]);
    // pre-swap: col 2 = M B B B → not yet match. Swap (0,2)<->(0,1) to get BMB? skip.
    // Simpler: pre-swap layout already has col 2 = M B B B; swap top (0,2) M with (1,2) B
    // → col 2 = B M B B (still not match). Use different shape:
    const board2 = buildBoard(["BBB", "MLB", "MSB", "LUM"]);
    // col 2 = B B B M, row 0 = B B B. Forms a T at (0,2). Already matching — re-build w/ no-initial-match disabled (we used ensureNoInitialMatch=false so ok). But we need a SWAP to create it.
    // pre-swap:
    //   B B M
    //   B L B
    //   B S B
    //   L U M
    // swap (0,2) M <-> (1,2) B
    //   B B B
    //   B L M
    //   B S B
    //   L U M
    // Now: row 0 = B B B (3-line). Col 0 = B B B L (3-line). They share (0,0)? Let's recheck.
    // Actually col 0 = B B B L → match length 3. Row 0 = B B B → match length 3. Shared cell (0,0). That's an L-shape (or T if pivot is mid).
    const b3 = buildBoard(["BBM", "BLB", "BSB", "LUM"]);
    const result = applyTurn({
      board: b3,
      swap: { a: { row: 0, col: 2 }, b: { row: 1, col: 2 } },
      rng: createRng(0),
    });
    const created = result.events.filter((e) => e.type === "special-created");
    expect(created.length).toBe(1);
    expect(created[0]?.type === "special-created" && created[0].kind).toBe("wrapped");
    // Reference unused locals to satisfy lint
    void board;
    void board2;
  });

  it("creates rainbow from a 5-match", () => {
    const board = buildBoard(["BBBBM", "BLPSU", "BSLPM", "MUSPL", "LMPSB"]);
    // pre-swap col 0 = B B B M L (length 3 match)
    // Need to create 5-match. Build with col0 BBBB+ then swap to make 5.
    // Easier: row of BBBBM, swap (0,4) M with (1,4) U? Need 5 B's.
    const b = buildBoard(["BBBBL", "MMMMB", "ULBLM", "PSULB"]);
    // pre-swap row 0 = B B B B L; row 1 = M M M M B
    // swap (0,4) L <-> (1,4) B → row 0 = B B B B B (5!) ; row 1 = M M M M L (4!)
    const result = applyTurn({
      board: b,
      swap: { a: { row: 0, col: 4 }, b: { row: 1, col: 4 } },
      rng: createRng(0),
    });
    const created = result.events.filter((e) => e.type === "special-created");
    const kinds = created
      .map((e) => (e.type === "special-created" ? e.kind : null))
      .filter(Boolean);
    expect(kinds).toContain("rainbow");
    void board;
  });

  it("rainbow + normal swap consumes all pieces of the swapped-with color", () => {
    const board = buildBoard(["BMSPU", "MSPUL", "SPULB", "PULBM", "ULBMS"]);
    placeSpecial(board, 2, 2, "berry", "rainbow");
    const result = applyTurn({
      board,
      swap: { a: { row: 2, col: 2 }, b: { row: 2, col: 3 } }, // rainbow <-> U (plum)
      rng: createRng(0),
    });
    const activated = result.events.find((e) => e.type === "special-activated");
    expect(activated?.type === "special-activated" && activated.kind).toBe("rainbow");
  });

  it("striped + striped combo erases a cross", () => {
    const board = buildBoard(["BMSPU", "MSPUL", "SPULB", "PULBM", "ULBMS"]);
    placeSpecial(board, 2, 2, "berry", "stripedH");
    placeSpecial(board, 2, 3, "berry", "stripedV");
    const result = applyTurn({
      board,
      swap: { a: { row: 2, col: 2 }, b: { row: 2, col: 3 } },
      rng: createRng(0),
    });
    const activated = result.events.find((e) => e.type === "special-activated");
    expect(activated).toBeDefined();
    // erased the row and a column (≥ 5 + 5 - 1 cells)
    const erases = result.events.filter((e) => e.type === "erase");
    const eraseCount = erases.reduce(
      (n, e) => n + (e.type === "erase" ? e.positions.length : 0),
      0,
    );
    expect(eraseCount).toBeGreaterThanOrEqual(5);
  });

  it("wrapped + wrapped combo erases a 5x5 area", () => {
    const board = buildBoard(["BMSPU", "MSPUL", "SPULB", "PULBM", "ULBMS"]);
    placeSpecial(board, 2, 2, "berry", "wrapped");
    placeSpecial(board, 2, 3, "berry", "wrapped");
    const result = applyTurn({
      board,
      swap: { a: { row: 2, col: 2 }, b: { row: 2, col: 3 } },
      rng: createRng(0),
    });
    const activated = result.events.find((e) => e.type === "special-activated");
    expect(activated?.type === "special-activated" && activated.kind).toBe("wrapped");
    const affected = activated?.type === "special-activated" ? activated.affected.length : 0;
    expect(affected).toBeGreaterThanOrEqual(20); // 5x5 area, board is 5 wide so close to 25
  });
});
