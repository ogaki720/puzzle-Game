import { createBoard, resetPieceIdCounterForTest } from "@/features/game/domain/board";
import { createRng } from "@/features/game/domain/rng";
import { findMatches } from "@/features/game/domain/match";

describe("createBoard", () => {
  beforeEach(() => {
    resetPieceIdCounterForTest();
  });

  it("creates a board with the requested size", () => {
    const rng = createRng(42);
    const board = createBoard({ width: 8, height: 8, rng });
    expect(board.width).toBe(8);
    expect(board.height).toBe(8);
    expect(board.grid).toHaveLength(8);
    expect(board.grid[0]).toHaveLength(8);
  });

  it("fills every playable cell with a piece", () => {
    const rng = createRng(1);
    const board = createBoard({ width: 6, height: 6, rng });
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const row = board.grid[r];
        expect(row).toBeDefined();
        expect(row![c]?.piece).not.toBeNull();
      }
    }
  });

  it("produces zero initial matches for 100 random seeds (8x8)", () => {
    for (let seed = 0; seed < 100; seed++) {
      const rng = createRng(seed);
      const board = createBoard({ width: 8, height: 8, rng, ensureNoInitialMatch: true });
      const matches = findMatches(board);
      expect(matches).toHaveLength(0);
    }
  });

  it("respects layout: walls and holes have no piece", () => {
    const rng = createRng(7);
    const board = createBoard({
      width: 5,
      height: 3,
      rng,
      layout: ["..#..", ".# #.", "....."],
    });
    expect(board.grid[0]?.[2]?.tile).toBe("wall");
    expect(board.grid[0]?.[2]?.piece).toBeNull();
    expect(board.grid[1]?.[2]?.tile).toBe("hole");
    expect(board.grid[1]?.[2]?.piece).toBeNull();
  });
});
