/**
 * Juicy timing constants — design.md § 17.
 * All animation durations and easing parameters live here.
 * Do NOT hardcode these values anywhere else.
 */

// --- Match / erase ---
export const MATCH_RESPONSE_MS = 60;   // input → first visual reaction (≤60ms)
export const ERASE_BOUNCE_MS = 60;     // scale up before fade
export const ERASE_FADE_MS = 200;      // fade to 0
export const ERASE_TOTAL_MS = ERASE_BOUNCE_MS + ERASE_FADE_MS;

// --- Gravity / refill ---
export const GRAVITY_MS = 180;
export const REFILL_DELAY_MS = 40;     // gap between erase-end and refill-start
export const REFILL_MS = 200;

// --- Score text flyout ---
export const SCORE_FLY_MS = 250;       // position → HUD absorption

// --- Camera shake ---
export const SHAKE_MAX_CHAIN = 5;      // clamp chain index for shake strength
export const SHAKE_BASE_PX = 3;       // px offset at chain=1

// --- Combo zoom ---
export const COMBO_THRESHOLD_CHAIN = 4;  // chains ≥ this → zoom
export const COMBO_ZOOM_MS = 200;
export const COMBO_ZOOM_SCALE = 1.05;

// --- SE pitch shift ---
export const SE_PITCH_SEMITONE = 1.0594; // 2^(1/12) — one semitone per chain

// --- BGM tempo hint ---
export const BGM_TENSION_MOVES = 3;     // remaining moves ≤ this → speed up BGM
export const BGM_TENSION_BPM_DELTA = 5;

// --- Piece selection ---
export const PIECE_SELECT_SCALE = 1.08; // selected piece scale multiplier

// --- Near-miss pulse ---
export const NEAR_MISS_PULSE_PERIOD_MS = 600; // HUD timer pulse period when low moves
export const NEAR_MISS_MOVE_THRESHOLD = 3;   // movesLeft ≤ this triggers pulse

// --- Mascot ---
export const MASCOT_WAVE_INTERVAL_MS = 15_000;
export const MASCOT_WAVE_CHANCE = 0.3;
export const MASCOT_SLEEP_DELAY_MS = 60_000; // idle → sleep after this
export const MASCOT_CHEER_DURATION_MS = 1_500;
export const MASCOT_SAD_DURATION_MS = 2_000;
