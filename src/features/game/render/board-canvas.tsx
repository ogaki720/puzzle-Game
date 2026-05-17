import { Canvas, Circle, Group, RoundedRect } from "@shopify/react-native-skia";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { colors } from "@/core/theme/colors";
import type { Board, Cell, Piece, PieceColor } from "@/features/game/domain";

const TILE_PAD = 4;

interface BoardCanvasProps {
  board: Board;
  size: number;
  selected: { row: number; col: number } | null;
}

export function BoardCanvas({ board, size, selected }: BoardCanvasProps) {
  const cellSize = useMemo(() => {
    return Math.floor(size / Math.max(board.width, board.height));
  }, [board.width, board.height, size]);

  const canvasW = cellSize * board.width;
  const canvasH = cellSize * board.height;

  return (
    <View style={[styles.wrap, { width: canvasW, height: canvasH }]}>
      <Canvas style={{ width: canvasW, height: canvasH }}>
        {board.grid.map((row, r) =>
          row.map((cell, c) => (
            <CellLayer key={`bg-${r}-${c}`} cell={cell} size={cellSize} />
          )),
        )}
        {board.grid.map((row, r) =>
          row.map((cell, c) =>
            cell.piece ? (
              <PieceLayer
                key={`p-${r}-${c}`}
                piece={cell.piece}
                row={r}
                col={c}
                size={cellSize}
                selected={selected?.row === r && selected?.col === c}
              />
            ) : null,
          ),
        )}
      </Canvas>
    </View>
  );
}

function CellLayer({ cell, size }: { cell: Cell; size: number }) {
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
      opacity={cell.tile === "ice2" ? 0.85 : 0.6}
    />
  );
}

function PieceLayer({
  piece,
  row,
  col,
  size,
  selected,
}: {
  piece: Piece;
  row: number;
  col: number;
  size: number;
  selected: boolean;
}) {
  if (piece.kind === "blocker") {
    return (
      <RoundedRect
        x={col * size + TILE_PAD}
        y={row * size + TILE_PAD}
        width={size - TILE_PAD * 2}
        height={size - TILE_PAD * 2}
        r={size * 0.15}
        color="#8C7B89"
      />
    );
  }
  const color = piece.color ? colors.pieces[piece.color as PieceColor] : "#FFFFFF";
  const radius = (size - TILE_PAD * 2) / 2;
  const cx = col * size + size / 2;
  const cy = row * size + size / 2;

  return (
    <Group>
      <Circle cx={cx} cy={cy + 2} r={radius - 2} color="#00000022" />
      <Circle cx={cx} cy={cy} r={radius - 2} color={color} />
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
          <Circle cx={cx} cy={cy} r={radius - 10} color={color} opacity={0.6} />
        </Group>
      )}
      {selected && (
        <Circle cx={cx} cy={cy} r={radius + 2} color={colors.accent} style="stroke" strokeWidth={3} />
      )}
    </Group>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bgDeep,
    borderRadius: 18,
    overflow: "hidden",
    padding: 0,
  },
});
