import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { Board, Position } from "@/features/game/domain";

interface BoardGestureLayerProps {
  board: Board;
  size: number;
  selected: Position | null;
  onSelect: (pos: Position | null) => void;
  onSwap: (a: Position, b: Position) => void;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 14;

export function BoardGestureLayer({
  board,
  size,
  selected,
  onSelect,
  onSwap,
  disabled,
}: BoardGestureLayerProps) {
  const cellSize = Math.floor(size / Math.max(board.width, board.height));
  const canvasW = cellSize * board.width;
  const canvasH = cellSize * board.height;
  const [start, setStart] = useState<{ x: number; y: number; pos: Position } | null>(null);

  return (
    <View
      style={[styles.layer, { width: canvasW, height: canvasH }]}
      pointerEvents={disabled ? "none" : "auto"}
    >
      {board.grid.map((row, r) =>
        row.map((cell, c) => {
          if (cell.tile === "wall" || cell.tile === "hole") return null;
          return (
            <Pressable
              key={`cell-${r}-${c}`}
              style={[
                styles.cell,
                {
                  left: c * cellSize,
                  top: r * cellSize,
                  width: cellSize,
                  height: cellSize,
                },
              ]}
              onPressIn={(e) => {
                if (disabled) return;
                const px = e.nativeEvent.locationX + c * cellSize;
                const py = e.nativeEvent.locationY + r * cellSize;
                setStart({ x: px, y: py, pos: { row: r, col: c } });
              }}
              onPressOut={(e) => {
                if (!start) return;
                const px = e.nativeEvent.locationX + c * cellSize;
                const py = e.nativeEvent.locationY + r * cellSize;
                const dx = px - start.x;
                const dy = py - start.y;
                handleEnd(start.pos, dx, dy);
                setStart(null);
              }}
            />
          );
        }),
      )}
    </View>
  );

  function handleEnd(origin: Position, dx: number, dy: number) {
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    // Tap (no swipe): toggle selection / commit selected-pair swap
    if (absX < SWIPE_THRESHOLD && absY < SWIPE_THRESHOLD) {
      if (selected && isAdjacent(selected, origin)) {
        onSwap(selected, origin);
        onSelect(null);
        return;
      }
      onSelect(samePos(selected, origin) ? null : origin);
      return;
    }
    // Swipe: dominant axis determines neighbor
    let target: Position | null = null;
    if (absX > absY) {
      target = { row: origin.row, col: origin.col + (dx > 0 ? 1 : -1) };
    } else {
      target = { row: origin.row + (dy > 0 ? 1 : -1), col: origin.col };
    }
    if (!inBounds(board, target)) return;
    onSwap(origin, target);
    onSelect(null);
  }
}

function samePos(a: Position | null, b: Position): boolean {
  return a !== null && a.row === b.row && a.col === b.col;
}

function isAdjacent(a: Position, b: Position): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

function inBounds(board: Board, p: Position): boolean {
  return p.row >= 0 && p.row < board.height && p.col >= 0 && p.col < board.width;
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  cell: {
    position: "absolute",
  },
});
