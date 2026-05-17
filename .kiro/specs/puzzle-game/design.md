# 設計書 — もちポップ (MochiPop / Expo 版)

## 1. アーキテクチャ概観

```
┌────────────────────────────────────────────────────────────┐
│  Presentation (React Native screens + Skia <Canvas>)       │
│   MainMenu / WorldMap / StageHUD / Shop / Codex            │
├────────────────────────────────────────────────────────────┤
│  Application (Zustand stores + custom hooks)               │
│   useGameSession / useStageRunner / useHearts              │
├────────────────────────────────────────────────────────────┤
│  Domain (Pure TypeScript — no RN imports)                  │
│   MatchEngine / Board / Piece / Stage / Skill              │
├────────────────────────────────────────────────────────────┤
│  Data                                                      │
│   MMKV (save) / JSON Asset (stage) / expo-audio (sound)    │
└────────────────────────────────────────────────────────────┘
```

### 1.1 採用ライブラリ

| 領域 | ライブラリ | 理由 |
|---|---|---|
| ランタイム | **Expo SDK 51+** | iOS/Android/Web を1コードベース |
| 言語 | **TypeScript 5.x** (strict) | 型安全、巨大ステージJSONの恩恵大 |
| 描画 (盤面) | **@shopify/react-native-skia** | 60fps描画、Web対応 (CanvasKit WASM) |
| 状態管理 | **zustand** ^4.5 | 軽量、ゲームループに最適 |
| アニメ/物理 | **react-native-reanimated** ^3 | Worklet で UI スレッド実行 |
| ジェスチャ | **react-native-gesture-handler** ^2 | スワイプ判定 |
| ナビゲーション | **expo-router** ^3 (file-based) | Web URLとも統合 |
| 永続化 | **react-native-mmkv** ^2 | 高速、同期API |
| 音声 | **expo-audio** | 新世代APIで安定 |
| ローカライズ | **i18next** + **expo-localization** | ja/en切替 |
| テスト | **jest** + **@testing-library/react-native** | 標準 |
| Lint/Format | **eslint** (`@expo/eslint-config`) + **prettier** | Expo推奨設定 |
| ビルド | **EAS Build** (native) / `expo export --platform web` | 公式パイプライン |

### 1.2 ディレクトリ構成 (expo-router/Monorepo無し)

```
puzzle/
├── app/                          # expo-router (画面のみ薄く)
│   ├── _layout.tsx
│   ├── index.tsx                 # スプラッシュ → /menu
│   ├── menu.tsx
│   ├── map/
│   │   ├── index.tsx
│   │   └── [world].tsx
│   ├── stage/
│   │   └── [id]/
│   │       ├── prepare.tsx
│   │       ├── play.tsx
│   │       └── result.tsx
│   ├── codex.tsx
│   └── settings.tsx
├── src/
│   ├── features/
│   │   ├── game/                 # コアゲーム
│   │   │   ├── domain/           # 純粋TS (Board/Piece/Stage/MatchEngine)
│   │   │   ├── render/           # Skia コンポーネント
│   │   │   └── state/            # zustand stores + hooks
│   │   ├── map/
│   │   ├── codex/
│   │   └── settings/
│   ├── core/
│   │   ├── audio/                # expo-audio ラッパ
│   │   ├── persistence/          # MMKV ラッパ (+ Web fallback)
│   │   ├── i18n/
│   │   └── theme/
│   └── shared/                   # 共通UI
├── assets/
│   ├── images/   (キャラ・UI sprite atlas)
│   ├── audio/    (BGM/SE)
│   ├── stages/   (stage_0001.json …)
│   └── i18n/     (ja.json, en.json)
├── __tests__/
│   ├── domain/                   # MatchEngine 等
│   └── integration/
├── .kiro/specs/puzzle-game/      # SDD
├── .claude/                      # Claude Code ハーネス
├── app.json                      # Expo 設定
├── eas.json                      # EAS Build/Submit 設定
├── babel.config.js               # reanimated plugin 必須
├── metro.config.js
├── tsconfig.json                 # strict, paths: "@/*"
├── eslint.config.js
├── package.json
└── CLAUDE.md
```

### 1.3 プラットフォーム差分の扱い

| 機能 | iOS/Android | Web | 切替手段 |
|---|---|---|---|
| 永続化 | MMKV | localStorage | `core/persistence/index.ts` で抽象化 + `.native.ts` / `.web.ts` |
| 音声 | expo-audio | expo-audio (web fallback OK) | 同一API |
| 描画 | Skia (Native GPU) | Skia (CanvasKit WASM) | 同一API |
| ハプティクス | expo-haptics | no-op | プラットフォーム分岐 |

## 2. ドメインモデル (TypeScript)

### 2.1 主要型

```ts
export type PieceColor = "berry" | "mint" | "lemon" | "sky" | "peach" | "plum";

export type PieceKind =
  | "normal"
  | "stripedH"
  | "stripedV"
  | "wrapped"
  | "rainbow"
  | "blocker";

export interface Piece {
  id: string;
  color: PieceColor | null;     // rainbow/blocker は null
  kind: PieceKind;
}

export type TileType = "normal" | "ice1" | "ice2" | "chain" | "hole" | "wall";

export interface Cell {
  row: number;
  col: number;
  piece: Piece | null;
  tile: TileType;
}

export interface Board {
  width: number;
  height: number;
  grid: Cell[][];
}

export type GoalType =
  | "score"
  | "collect"
  | "clear_obstacle"
  | "bring_down"
  | "rescue";

export interface StageGoal {
  type: GoalType;
  targets: Record<string, number>;   // 例: { berry: 30, mint: 20 }
}

export interface Stage {
  id: number;
  world: number;
  size: { w: number; h: number };
  moveLimit: number;
  timeLimit?: number;
  goal: StageGoal;
  starThresholds: [number, number, number];
  layout: string[];                  // ASCII (後述スキーマ)
  spawnWeights: Record<PieceColor, number>;
}
```

### 2.2 ステージJSONスキーマ (assets/stages/stage_NNNN.json)

```json
{
  "id": 42,
  "world": 5,
  "size": { "w": 8, "h": 8 },
  "moveLimit": 25,
  "goal": {
    "type": "collect",
    "targets": { "berry": 30, "mint": 20 }
  },
  "starThresholds": [10000, 25000, 50000],
  "layout": [
    "........",
    "..####..",
    "..#ii#..",
    ".######.",
    ".######.",
    "..#  #..",
    "..####..",
    "........"
  ],
  "spawnWeights": { "berry": 1, "mint": 1, "lemon": 1, "sky": 1, "peach": 1 }
}
```

`.` = 通常マス / `#` = 壁 / `i` = 氷 (1HP) / 空白 = 穴 (落下する)

スキーマは `zod` で実行時バリデーション (TS型と二重化を避けるため `z.infer` を活用)。

## 3. マッチエンジン

### 3.1 ターン処理 (擬似コード)

```ts
function applyTurn(board: Board, swap: Swap): TurnResult {
  // 1. 仮スワップ
  // 2. マッチ走査 (行/列 3+連)
  // 3. マッチ無し→巻き戻して空振り
  // 4. 特殊ピース生成 (4連=striped, L/T=wrapped, 5連=rainbow)
  // 5. 消去 + スコア + 目標カウント更新
  // 6. 重力フェーズ
  // 7. 補充 (spawnWeights)
  // 8. 連鎖再検出 → 2へ
  // 9. 手詰まり→shuffle
}
```

すべて純粋関数で実装し、入力 (Board, Swap, RNGシード) → 出力 (Board, Events[]) として **完全再現可能**。アニメ層は `Events[]` を時系列に消化する。

### 3.2 計算量

- 盤面最大 9×9 = 81 セル → 1フレーム余裕
- 連鎖の演出は `requestAnimationFrame` 系列で 150〜250ms ずつのフェーズに分割
- ロジックはJSスレッドで処理し、UI/アニメは Skia + Reanimated worklet で UIスレッド側

### 3.3 RNG

- `seedrandom` を導入し、ステージID + プレイ回数で再現可能 (デバッグ・自動テスト用)
- リリースは時刻シード

### 3.4 特殊ピース・コンボは [[skills]] に集約

## 4. ステージ制御フロー

```
[/menu] → [/map] → [/map/:world] → [/stage/:id/prepare]
                                          ↓ ブースター選択
                                   [/stage/:id/play]
                                          ↓
                                   [/stage/:id/result]
```

- `useGameSession` (zustand) が **現在のステージ・残手数・スコア・目標進捗** を保持
- ステージ失敗時はハート1消費 + リトライ確認
- クリア時は欠片/コイン/★を演出付きで付与

## 5. データ永続化 (MMKV)

`core/persistence/store.ts` で1つの MMKV インスタンスを共有。Web では `localStorage` 互換ラッパを使用。

| キー | 型 | 用途 |
|---|---|---|
| `progress.cleared` | `number[]` | クリア済みステージID |
| `progress.stars` | `Record<number, 1\|2\|3>` | ★数 |
| `wallet.coins` | `number` | コイン |
| `wallet.hearts` | `number` | 残ハート |
| `wallet.heartRechargeAt` | `number` (epoch ms) | 次回回復時刻 |
| `codex.fragments` | `Record<string, number>` | キャラ欠片 |
| `codex.unlocked` | `string[]` | 解放キャラID |
| `settings.bgmVolume` | `number` | …他 |
| `schemaVersion` | `number` | マイグレーション用 |

書込はイベント発生ごと即時 + 5秒スロットリング (zustand persist middleware を自前実装)。

## 6. ナビゲーション (expo-router)

- ファイルベースで `app/` 配下が URL に対応 (Web では `/menu` 等そのまま)
- DeepLink: `mochipop://stage/42/play` 対応 (`app.json` の `scheme`)
- 画面遷移は `router.push("/stage/42/play")`

## 7. 描画・演出方針

- ボードは **1枚の `<Canvas>`** に Skia で直接描画 (RN コンポーネントを大量に並べない)
- キャラはアトラス (1枚PNG + JSON) を `useImage` で読み、`<Image>` で領域指定
- アニメは Reanimated `SharedValue` + Skia の `useDerivedValue` を併用
- マッチ消去: scale 1.0 → 1.15 → 0 + パーティクル
- 連鎖: 連鎖数に応じて軽い camera shake + SE ピッチ上昇
- 大コンボ時は画面端から「★Excellent」演出
- スコアテキストはマッチ位置から HUD に吸い込み (Reanimated)

## 8. 音響 (expo-audio)

- BGM はワールド単位でループ。`expo-audio` の `useAudioPlayer` 1個を切替
- SE は短いものを事前ロード、Pool でインスタンス再利用
- ボイス: キャラごとに ja/en (図鑑から再生可能)
- 3チャンネル独立音量

## 9. パフォーマンス指針

- Skia描画 1キャンバス、ドローコール最小化 (アトラス利用)
- JSスレッドのフリーズ防止: マッチエンジンは1ターン分を **同期** で計算しイベント列を返す。アニメ消化が次の入力をブロック
- Hermes 有効化 (Expo デフォルト)
- Web: 初回ロードは menu + 1ワールド分のみ。ステージJSONはワールド単位で動的 import
- 画像は `expo-image` でディスクキャッシュ
- リスト系は `@shopify/flash-list`

## 10. テスト戦略

| レイヤ | 種別 | カバレッジ目標 |
|---|---|---|
| domain (純TS) | jest unit | 90% |
| state (zustand) | jest unit | 70% |
| screens | RTL widget | 主要画面 |
| 黄金経路 | maestro / Detox いずれか | 起動→プレイ→クリア |

- `MatchEngine` は **ゴールデンテスト** で固定盤面+シード → 期待 Events[] を保証

## 11. ビルド・配布

| 環境 | コマンド | 備考 |
|---|---|---|
| 開発 | `npx expo start` | Expo Go / dev client |
| Web | `npx expo export --platform web` | 静的書き出し → 任意ホスティング |
| iOS | `eas build --platform ios` | EAS Build |
| Android | `eas build --platform android` | EAS Build |
| OTA | `eas update` | JSバンドルの差し替え (ネイティブ変更を含まない場合のみ) |

> `expo-dev-client` を使う前提。Skia/MMKV/Reanimated は Expo Go 単独では足りないので **Custom Dev Client** を初期から構築する。

## 13. 動的難易度調整 (DDA) — US-10

「気づかれない救済」を行う。プレイヤーには見せない。

### 13.1 ステート

```ts
interface DdaState {
  stageId: number;
  consecutiveFailures: number;     // 同一ステージの連続失敗回数
  freePlus5Used: Set<number>;      // ステージIDごとの「+5手 (初回無料)」使用済み
}
```

### 13.2 介入ルール

| 条件 | 介入 |
|---|---|
| `consecutiveFailures >= 3` | 補充ピース色を **目標寄りに +10%偏重**。`spawnWeights` を実行時に書き換え |
| 残手数=0 かつ `freePlus5Used` 未使用 | 「+5手 (無料)」ダイアログを表示 (1ステージ1回まで) |
| クリア成功 | `consecutiveFailures` を0にリセット |

### 13.3 公平性

- 介入は MMKV 永続化し再現可能 (デバッグ用)
- ★3達成は介入対象外 (上級者の最適スコア体験を歪めない)
- analytics に `dda_intervention` イベントを送信 (frequency監視用)

## 14. マスコットシステム — US-11

### 14.1 ステートマシン

```
idle → wave (時々) → idle
idle → sleep (15秒無操作) → wake (タップ) → wave → idle

[stage clear]    → cheer (跳ねる + ボイス) → idle
[stage fail]     → sad (悲しい顔 + 励まし) → idle
[heart_full]     → notice (ぴこっと反応)   → idle
[first_open]     → greet (専用挨拶)        → idle
```

### 14.2 配置

| 画面 | キャラ | 反応 |
|---|---|---|
| ホーム | もちうさ (固定) | 通常モーション |
| マップ | もちうさ + ワールド固定キャラ | ワールドキャラがエリア手前に立つ |
| プレイHUD | (なし) | ゲームに集中 |
| クリア演出 | もちうさ + クリア功労キャラ (`Goal` の主色キャラ) | 一緒に跳ねる |
| 失敗演出 | もちうさ | 悲しい顔 → CTAボタン光る |

### 14.3 セリフ (i18n)

セリフは `assets/i18n/ja.json` / `en.json` の `mascot.*` キーに集約。状況ごとに最大10種からランダム選択。

## 15. オンボーディング — US-12

### 15.1 段階開放

| ステージ | 開放/演出 |
|---|---|
| 1 | 操作チュートリアル (スワイプ) |
| 1〜3 | **失敗不可能難度** (DDAで補助、最低★1保証) |
| 5 | Striped デビュー演出 |
| 8 | Wrapped (爆弾) デビュー演出 |
| 12 | Rainbow デビュー演出 |
| 1〜20 | **ハート消費0** (失敗してもOK) |
| 21〜 | 通常難度・ハート消費開始 |

### 15.2 チュートリアル UI

- スポット表示 (overlay) で必要箇所のみ照らす
- 「タップで進む」「もう表示しない」「スキップ」を初回から提示
- 永続化キー: `onboarding.completedSteps: string[]`

## 16. ライブオプス Lite — US-14, US-15, US-20

### 16.1 デイリーミッション

```ts
type DailyMission =
  | { type: "make_special", subtype: "striped" | "wrapped" | "rainbow", count: number }
  | { type: "reach_score", value: number }
  | { type: "clear_stages", count: number }
  | { type: "collect_color", color: PieceColor, count: number }
  | { type: "no_fail", count: number };

interface DailyMissionState {
  date: string;          // YYYY-MM-DD (端末ローカル)
  missions: { mission: DailyMission; progress: number; claimed: boolean }[];
  loginStreak: number;
  graceUsedYearMonth: string | null;  // グレース消費月
}
```

- 24時00分 (ローカル) でリセット
- 3個提示。1個は **必ず低難度** (確実に1個は取れる)

### 16.2 チェスト報酬テーブル

詳細レアリティ・中身は [[skills]] § 13 に集約。

### 16.3 連続ログイン

- 7日サイクル + 30日累計
- 28日 (シーズン) のたびに **シーズン報酬箱**
- グレース: 月1回、1日途切れを許容 (US-20)

### 16.4 プッシュ通知スケジュール

| イベント | タイミング | チャネル |
|---|---|---|
| ハート満タン | 5本フル到達時 (即時) | `hearts` |
| デイリーリセット | ローカル12:00 | `daily` |
| 連続ログイン警告 | 前日同時刻 (24h-1h) | `streak` |
| イベント開始/終了 | 開始時刻 / 終了2時間前 | `event` (Phase 1.5) |

- 実装: `expo-notifications`、ローカル通知をスケジュール
- 通知許可: オプトイン、起動から3セッション後に丁寧に依頼

## 17. ジューシー演出基準 — US-16

| 演出 | 数値基準 |
|---|---|
| マッチ消去開始ラグ | 入力から **60ms 以内** |
| ピース消去アニメ全長 | 200ms (scale up 100 → ホップ 50 → fade 50) |
| パーティクル個数 | マッチ数 × 3 (上限24) |
| スコアテキスト吸い込み | **250ms** で HUD へ |
| カメラシェイク強度 | `min(5, chainIndex)` 段階で線形 |
| 4連鎖+ ズーム演出 | **200ms** zoom 1.0→1.05→1.0 |
| 4連鎖+ Excellent テキスト | 500ms 表示 |
| SE ピッチ上昇 | 連鎖ごとに **半音 (1.0594倍)** |
| BGM 終盤テンション | 残手数3以下で BPM +5% |

CI で「ジューシー Lint」スクリプトを追加し、アニメ長/イージング定数をハードコードから抜き取り `core/juicy.ts` で集約管理。

## 18. メタ進行 — もちもちタウン [Phase 1.5] — US-17

### 18.1 データモデル

```ts
interface Town {
  unlocked: string[];     // エリアID
  decorations: Record<string, Decoration>;  // オブジェクトID → 状態
  starsSpent: number;
}

interface Decoration {
  id: string;
  level: 0 | 1 | 2 | 3;   // 0=未修復, 3=最終形
  cost: number[];         // 各レベル昇格に必要な★数
}
```

### 18.2 ループ

- ステージで★獲得 → タウン画面で★消費 → 装飾レベルアップ演出
- ワールドクリアで新エリア解放 (もちうさハウス → みんとカフェ → …)
- タウン画面でキャラがランダムに歩く (1分ごとに位置/モーション更新)

### 18.3 UI

- 横スクロールの2.5D 風景
- タップで装飾の詳細表示 + 次のレベル必要★
- 完成エリアは **写真撮影ボタン** で SNS シェア可能 (Phase 2)

## 19. ナラティブ [Phase 1.5] — US-18

### 19.1 構成

- 各ワールド (10ステージ単位) に **オープニング + エンディング** の小エピソード
- 静止画コミック形式 (1コマ最大5枚) + テキスト送り
- 1ワールド分の総尺は約1分

### 19.2 データ

```ts
interface Episode {
  worldId: number;
  position: "open" | "close";
  panels: Panel[];          // { imageRef, dialogues[] }
  voiceTrackRef?: string;
}
```

- 図書館 (`/codex/library`) で再生済みエピソードを再閲覧可能

## 20. リスクと対策

| リスク | 影響 | 対策 |
|---|---|---|
| Web版のSkia(WASM)初期ロード重い | TTI悪化 | スプラッシュ表示 + プリロード、ステージJSONは遅延 import |
| 1000ステージ品質維持 | コンテンツ枯渇 | パラメータドリブン生成 + 手動チューニング (M7) |
| RN環境差分 (MMKV/Audio) | クラッシュ | `.native.ts` / `.web.ts` で分離 + プラットフォーム別CI |
| 永続化バージョニング | データ破損 | `schemaVersion` 比較 + マイグレーション関数 |
| Reanimated worklet バグ | 描画停止 | strict mode で開発、Sentry でアラート |
