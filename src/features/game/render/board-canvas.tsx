import { Canvas, Circle, Group, RoundedRect } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { colors } from "@/core/theme/colors";
import type { Board, Cell, Piece, PieceColor } from "@/features/game/domain";
import type { PieceAnimations } from "./use-piece-animations";

const TILE_PAD = 4;

interface BoardCanvasProps {
  board: Board;
  size: number;
  selected: { row: number; col: number } | null;
  anims: PieceAnimations;
}

export function BoardCanvas({ board, size, selected, anims }: BoardCanvasProps) {
  const cellSize = useMemo(
    () => Math.floor(size / Math.max(board.width, board.height)),
    [board.width, board.height, size],
  );
  const canvasW = cellSize * board.width;
  const canvasH = cellSize * board.height;

  return (
    <View style={[styles.wrap, { width: canvasW, height: canvasH }]}>
      <Canvas style={{ width: canvasW, height: canvasH }}>
        {board.grid.map((row) =>
          row.map((cell) => (
            <CellBg key={`bg-${cell.row}-${cell.col}`} cell={cell} size={cellSize} />
          )),
        )}
        {board.grid.map((row) =>
          row.map((cell) =>
            cell.piece ? (
              <AnimatedPiece
                key={`p-${cell.row}-${cell.col}`}
                piece={cell.piece}
                row={cell.row}
                col={cell.col}
                size={cellSize}
                selected={selected?.row === cell.row && selected?.col === cell.col}
                anims={anims}
              />
            ) : null,
          ),
        )}
      </Canvas>
    </View>
  );
}

function CellBg({ cell, size }: { cell: Cell; size: number }) {
  if (cell.tile === "hole" || cell.tile === "wall") return null;
  const bg =
    cell.tile === "ice1" || cell.tile === "ice2"
      ? "#D5EBFF"
      : cell.tile === "chain"
        ? "#E0D0E5"
        : "#FFFFFF";
  return (
    <RoundedRect
      x={cell.col * size + TILE_PAD / 2}
      y={cell.row * size + TILE_PAD / 2}
      width={size - TILE_PAD}
      height={size - TILE_PAD}
      r={size * 0.18}
      color={bg}
      opacity={0.6}
    />
  );
}

function AnimatedPiece({
  piece,
  row,
  col,
  size,
  selected,
  anims,
}: {
  piece: Piece;
  row: number;
  col: number;
  size: number;
  selected: boolean;
  anims: PieceAnimations;
}) {
  const cellKey = `${row}:${col}`;

  const opacity = useDerivedValue(() => {
    "worklet";
    if (anims.erasedKeys.value.includes(cellKey)) {
      return Math.max(0, 1 - anims.eraseProgress.value);
    }
    if (anims.refillKeys.value.includes(cellKey)) {
      return Math.min(1, anims.refillProgress.value);
    }
    return 1;
  });

  const scale = useDerivedValue(() => {
    "worklet";
    if (anims.erasedKeys.value.includes(cellKey)) {
      const p = anims.eraseProgress.value;
      if (p < 0.25) return 1 + 0.18 * (p / 0.25);
      return Math.max(0, 1.18 * (1 - (p - 0.25) / 0.75));
    }
    if (anims.refillKeys.value.includes(cellKey)) {
      const p = anims.refillProgress.value;
      return p < 0.8 ? p * 1.1 : 1.1 - (p - 0.8) * 0.5;
    }
    return 1;
  });

  const translateY = useDerivedValue(() => {
    "worklet";
    if (anims.refillKeys.value.includes(cellKey)) {
      return -size * 1.5 * (1 - anims.refillProgress.value);
    }
    return 0;
  });

  const transform = useDerivedValue(() => {
    "worklet";
    const cx = col * size + size / 2;
    const cy = row * size + size / 2;
    const ty = translateY.value;
    const s = scale.value;
    return [
      { translateX: cx },
      { translateY: cy + ty },
      { scale: s },
      { translateX: -cx },
      { translateY: -(cy + ty) },
    ];
  });

  const cx = col * size + size / 2;
  const cy = row * size + size / 2;
  const radius = (size - TILE_PAD * 2) / 2;

  if (piece.kind === "blocker") {
    return (
      <Group opacity={opacity} transform={transform}>
        <RoundedRect
          x={col * size + TILE_PAD}
          y={row * size + TILE_PAD}
          width={size - TILE_PAD * 2}
          height={size - TILE_PAD * 2}
          r={size * 0.15}
          color="#8C7B89"
        />
      </Group>
    );
  }

  const pieceColor = piece.color ? colors.pieces[piece.color as PieceColor] : "#FFFFFF";

  return (
    <Group opacity={opacity} transform={transform}>
      <Circle cx={cx} cy={cy + 2} r={radius - 2} color="#00000022" />
      <Circle cx={cx} cy={cy} r={radius - 2} color={pieceColor} />

      {piece.kind === "stripedH" && (
        <RoundedRect
          x={col * size + TILE_PAD}
          y={row * size + size / 2 - 3}
          width={size - TILE_PAD * 2}
          height={6}
          r={3}
          color="#FFFFFF"
          opacity={0.9}
        />
      )}
      {piece.kind === "stripedV" && (
        <RoundedRect
          x={col * size + size / 2 - 3}
          y={row * size + TILE_PAD}
          width={6}
          height={size - TILE_PAD * 2}
          r={3}
          color="#FFFFFF"
          opacity={0.9}
        />
      )}
      {piece.kind === "wrapped" && (
        <Circle cx={cx} cy={cy} r={radius - 8} color="#FFFFFF" opacity={0.45} />
      )}
      {piece.kind === "rainbow" && (
        <Group>
          <Circle cx={cx} cy={cy} r={radius - 4} color="#FFFFFF" opacity={0.85} />
          <Circle cx={cx} cy={cy} r={radius - 10} color={pieceColor} opacity={0.6} />
        </Group>
      )}
      {selected && (
        <Circle cx={cx} cy={cy} r={radius + 2} style="stroke" strokeWidth={3} color={colors.accent} />
      )}
    </Group>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bgDeep,
    borderRadius: 18,
    overflow: "hidden",
  },
});
