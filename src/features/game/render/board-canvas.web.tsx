/**
 * Web-specific board renderer — NO Skia imports.
 *
 * react-native-skia evaluates `Skia = JsiSkApi(global.CanvasKit)` at module
 * load time. On web, CanvasKit WASM hasn't loaded yet so CanvasKit is captured
 * as `undefined`. Any later call to Skia.PictureRecorder() then throws
 * "Cannot read properties of undefined (reading 'PictureRecorder')".
 *
 * Metro's platform resolution picks this file (.web.tsx) on web, so the
 * native board-canvas.tsx (which imports Skia) is never bundled for web.
 * Pieces are rendered as RN View circles with Reanimated opacity/scale/translateY.
 */
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/core/theme/colors";
import type { Board, Cell, Piece, PieceColor } from "@/features/game/domain";
import type { PieceAnimations } from "./use-piece-animations";

const PAD = 3;

interface BoardCanvasProps {
  board: Board;
  size: number;
  selected: { row: number; col: number } | null;
  anims: PieceAnimations;
}

export function BoardCanvas({ board, size, selected, anims }: BoardCanvasProps) {
  const cellSize = Math.floor(size / Math.max(board.width, board.height));
  const w = cellSize * board.width;
  const h = cellSize * board.height;

  return (
    <View style={[styles.wrap, { width: w, height: h }]}>
      {board.grid.map((row) =>
        row.map((cell) => <CellBg key={`bg-${cell.row}-${cell.col}`} cell={cell} cs={cellSize} />),
      )}
      {board.grid.map((row) =>
        row.map((cell) =>
          cell.piece ? (
            <WebPiece
              key={`p-${cell.row}-${cell.col}`}
              piece={cell.piece}
              row={cell.row}
              col={cell.col}
              cs={cellSize}
              selected={selected?.row === cell.row && selected?.col === cell.col}
              anims={anims}
            />
          ) : null,
        ),
      )}
    </View>
  );
}

function CellBg({ cell, cs }: { cell: Cell; cs: number }) {
  if (cell.tile === "wall" || cell.tile === "hole") return null;
  const bg =
    cell.tile === "ice1" || cell.tile === "ice2"
      ? "#D5EBFF"
      : cell.tile === "chain"
        ? "#E0D0E5"
        : "#FFFFFF";
  return (
    <View
      style={{
        position: "absolute",
        left: cell.col * cs + PAD / 2,
        top: cell.row * cs + PAD / 2,
        width: cs - PAD,
        height: cs - PAD,
        borderRadius: (cs - PAD) * 0.18,
        backgroundColor: bg,
        opacity: 0.6,
      }}
    />
  );
}

function WebPiece({
  piece,
  row,
  col,
  cs,
  selected,
  anims,
}: {
  piece: Piece;
  row: number;
  col: number;
  cs: number;
  selected: boolean;
  anims: PieceAnimations;
}) {
  const cellKey = `${row}:${col}`;
  const radius = (cs - PAD * 2) / 2;
  const pieceColor = piece.color ? colors.pieces[piece.color as PieceColor] : "#FFFFFF";
  const bgColor = piece.kind === "blocker" ? "#8C7B89" : pieceColor;

  const animStyle = useAnimatedStyle(() => {
    "worklet";
    const isErased = anims.erasedKeys.value.includes(cellKey);
    const isRefill = anims.refillKeys.value.includes(cellKey);

    let opacity = 1;
    let scale = 1;
    let translateY = 0;

    if (isErased) {
      const p = anims.eraseProgress.value;
      opacity = Math.max(0, 1 - p);
      scale = p < 0.25 ? 1 + 0.18 * (p / 0.25) : Math.max(0, 1.18 * (1 - (p - 0.25) / 0.75));
    } else if (isRefill) {
      const p = anims.refillProgress.value;
      opacity = Math.min(1, p);
      scale = p < 0.8 ? p * 1.1 : 1.1 - (p - 0.8) * 0.5;
      translateY = -cs * 1.5 * (1 - p);
    }

    return { opacity, transform: [{ translateY }, { scale }] };
  });

  return (
    <Animated.View
      style={[
        animStyle,
        {
          position: "absolute",
          left: col * cs + PAD,
          top: row * cs + PAD,
          width: cs - PAD * 2,
          height: cs - PAD * 2,
          borderRadius: radius,
          backgroundColor: bgColor,
          borderWidth: selected ? 3 : 0,
          borderColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#00000033",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 1,
          shadowRadius: 3,
        },
      ]}
    >
      {piece.kind !== "normal" && piece.kind !== "blocker" && (
        <Text style={styles.specialMark}>
          {piece.kind === "stripedH" ? "↔"
           : piece.kind === "stripedV" ? "↕"
           : piece.kind === "wrapped" ? "💥"
           : "🌈"}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bgDeep,
    borderRadius: 18,
    overflow: "hidden",
  },
  specialMark: {
    fontSize: 12,
    lineHeight: 14,
    color: "white",
    fontWeight: "800",
  },
});
