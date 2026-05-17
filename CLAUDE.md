# CLAUDE.md — 開発ルール (もちポップ / MochiPop / Expo)

このリポジトリで作業する全員 (人間 / Claude Code) が守る規約。仕様は `.kiro/specs/puzzle-game/` を正とする。

## 1. 仕様駆動開発 (SDD)

- すべての変更はまず `.kiro/specs/puzzle-game/` の該当文書を読むことから始める
  - `requirements.md` — 何を作るか (WHAT/WHY)
  - `design.md` — どう作るか (HOW)
  - `skills.md` — ゲーム要素の正典
  - `tasks.md` — 進行状況
- 仕様外の機能追加は **禁止**。必要なら先に `requirements.md` を更新してレビューを受ける
- 仕様と実装に乖離を見つけたら、必ずどちらかを更新してから次に進む

## 2. 技術スタック

- **Expo SDK 51+** / React Native / **TypeScript 5.x (strict)**
- 描画: `@shopify/react-native-skia` / アニメ: `react-native-reanimated` / ジェスチャ: `react-native-gesture-handler`
- 状態: `zustand` / 永続化: `react-native-mmkv` (Web fallback: localStorage) / 音声: `expo-audio`
- ルーティング: `expo-router`
- バリデーション: `zod`
- パッケージマネージャ: **npm** (lock 統一)

## 3. プロジェクト構造

- ディレクトリ構成は `design.md` § 1.2 に従う
- `src/features/*/domain/` は **純粋 TypeScript** のみ。React / RN / Skia / Expo を import しないこと
- レイヤを跨いだ依存は禁止 (`app/` → `features/*/render` → `features/*/state` → `features/*/domain`)
- パス: `tsconfig.json` の `paths` で `@/*` → `src/*` を使う。相対 `../../..` は避ける

## 4. コーディング規約

- Lint: `@expo/eslint-config` + Prettier (デフォルト設定)
- TypeScript strict, `noUncheckedIndexedAccess: true`
- 命名:
  - ファイル: `kebab-case.ts` / `PascalCase.tsx` (React コンポーネント)
  - 型/コンポーネント: `PascalCase`
  - 関数/変数: `camelCase`
  - 定数: `SCREAMING_SNAKE_CASE` (本当に不変のもののみ)
- `any` 禁止。やむを得ない場合は `// eslint-disable-next-line` + コメントで理由を明記
- `console.log` は禁止。`src/core/logging` のロガーを使う
- マジックナンバーは `src/core/constants/` に集約
- React コンポーネントは関数コンポーネントのみ (class禁止)
- 副作用は `useEffect` ではなく zustand store の action で扱うことを優先

## 5. 状態管理 (Zustand)

- 1機能 = 1 store。`src/features/*/state/*.store.ts`
- `set` を直接呼び出さず、必ず action 関数経由
- ゲームセッションは `useGameSession` に集約 (盤面/手数/スコア/目標)
- selector を使い必要最小限の再レンダリング (`useStore(s => s.score)` のように一発selectで取る)

## 6. テスト

- domain は **jest unit テスト必須** (カバレッジ 90%)
- マッチエンジンは **ゴールデンテスト** — 固定盤面+RNGシード → 期待 Events[]
- state は祖父型テスト (`act` + zustand `getState`) で挙動確認
- 主要画面は `@testing-library/react-native` で widget test
- 黄金経路 (起動→マップ→プレイ→クリア) は **Maestro** で e2e
- CI が緑でないものは **マージ禁止**

## 7. アセット運用

- 画像: PNG (透過) + アトラス化 (`expo-asset` でプリロード)
- 音声: m4a / mp3 (BGM)、wav (短SE)
- ステージ: `assets/stages/stage_NNNN.json`、スキーマは `design.md` § 2.2、`zod` で実行時バリデーション
- 著作権の出所が不明なアセットは持ち込まない

## 8. Git / コミット規約

- ブランチ: `feat/<topic>` / `fix/<topic>` / `chore/<topic>` / `docs/<topic>`
- コミットメッセージ: **Conventional Commits**
  - 例: `feat(match-engine): add wrapped piece detection`
  - 例: `fix(board): correct gravity when column has holes`
- 1コミット = 1論理変更。フォーマットや無関係修正を混ぜない
- main への直接 push 禁止。必ず PR 経由

## 9. PR ルール

- タイトル: Conventional Commits 形式
- 本文に必須セクション:
  - **Summary** — 何を変えたか
  - **Spec ref** — 関連する requirements/design/skills/tasks の項
  - **Test plan** — 確認手順 (iOS / Android / Web の影響範囲を明記)
- PR サイズ: 目安 +500 行以内。超えるなら分割
- 機械的チェック: `npm run lint`, `npm run typecheck`, `npm test` がすべて緑
- セルフレビュー後に他者レビュー依頼

## 10. パフォーマンス

- 60fps 目標 (ローエンド 30fps 許容)
- 盤面は **単一 `<Canvas>` 内に Skia で全描画**。RN View ツリーを並べない
- アニメは Reanimated `SharedValue` + Skia `useDerivedValue` を併用
- 不要な `useEffect` / store 再購読を避ける (selector で絞る)
- Web は CanvasKit (WASM) の初期ロードを **スプラッシュでマスク**
- 大JSONはワールド単位で動的 `import()`

## 11. アクセシビリティ / ローカライズ

- 色だけに頼らない (色 + 形 + 模様で区別)
- 文言は `assets/i18n/ja.json` / `en.json` に集約。コードにハードコード禁止
- 音量は BGM / SE / Voice を個別制御
- すべての主要操作は VoiceOver / TalkBack で読み上げ可能 (`accessibilityLabel`)

## 12. プラットフォーム差分

- iOS/Android/Web で挙動が分かれるモジュールは `*.native.ts` と `*.web.ts` に分ける
- `Platform.OS` 分岐は **同一ファイル内では避ける** (テストしづらい)
- 必ず 3 プラットフォーム全てで起動確認してから PR を出す

## 13. Claude Code 運用ルール

- 作業前に必ず `.kiro/specs/puzzle-game/` を読むこと
- `tasks.md` の該当タスクの **クリア条件** を確認してから着手
- 大きな変更を始める前に **plan を提示** してから実装
- ファイル新規作成は最小限。既存ファイル編集を優先
- 単発の質問でドキュメントを散らかさない (`*.md` の新規作成は仕様か `CLAUDE.md` 追記で済むなら控える)
- コメントはコードで語れない「なぜ」だけに限定

## 14. セキュリティ / プライバシー

- IDFA / 端末ID を扱う場合は同意ダイアログ必須 (`expo-tracking-transparency`)
- 子供向け配慮 (COPPA/PEGI) に従い、初期実装は **オフライン・無広告・無計測**
- API キー等を git にコミットしない (`.env.local` を使い `.gitignore`)
- `eas.json` のシークレットは EAS Secrets で管理

## 15. リリース基準

- クラッシュフリー率 99.5%以上
- 黄金経路 e2e 緑
- `npm run lint && npm run typecheck && npm test` 緑
- iOS / Android / Web 3プラットフォーム動作確認
- ストア素材揃い (アイコン/スクショ/紹介文/プライバシー)

---

> 規約の変更提案は PR で。承認後、本ファイルに反映する。
