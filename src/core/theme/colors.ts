export const colors = {
  bg: "#FFE9F0",
  bgDeep: "#FFD3E1",
  ink: "#3D2A39",
  inkSoft: "#7C6479",
  accent: "#FF7AB6",
  accentSoft: "#FFB0CF",
  pieces: {
    berry: "#FF8FBA",
    mint: "#9FE6C4",
    lemon: "#FFE38C",
    sky: "#9DD3FF",
    peach: "#FFB89E",
    plum: "#C8A7E7",
  },
} as const;

export type ColorToken = keyof typeof colors;
export type PieceColor = keyof typeof colors.pieces;
