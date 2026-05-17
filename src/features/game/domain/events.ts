import type { Piece, PieceKind, Position, Swap, TileType } from "./types";

export interface SwapAttemptEvent {
  type: "swap-attempt";
  swap: Swap;
  accepted: boolean;
}

export interface ChainStepEvent {
  type: "chain-step";
  index: number;
}

export interface MatchEvent {
  type: "match";
  positions: Position[];
  color: NonNullable<Piece["color"]>;
  shape: "line" | "L" | "T";
  length: number;
}

export interface SpecialCreatedEvent {
  type: "special-created";
  position: Position;
  kind: Exclude<PieceKind, "normal" | "blocker">;
  color: Piece["color"];
}

export interface SpecialActivatedEvent {
  type: "special-activated";
  position: Position;
  kind: Exclude<PieceKind, "normal" | "blocker">;
  affected: Position[];
}

export interface EraseEvent {
  type: "erase";
  positions: Position[];
}

export interface TileDamageEvent {
  type: "tile-damage";
  position: Position;
  from: TileType;
  to: TileType;
}

export interface GravityEvent {
  type: "gravity";
  moves: { from: Position; to: Position }[];
}

export interface RefillEvent {
  type: "refill";
  positions: Position[];
}

export interface ScoreEvent {
  type: "score";
  delta: number;
  multiplier: number;
  total: number;
}

export interface DeadlockEvent {
  type: "deadlock";
  shuffled: boolean;
}

export type TurnEvent =
  | SwapAttemptEvent
  | ChainStepEvent
  | MatchEvent
  | SpecialCreatedEvent
  | SpecialActivatedEvent
  | EraseEvent
  | TileDamageEvent
  | GravityEvent
  | RefillEvent
  | ScoreEvent
  | DeadlockEvent;
