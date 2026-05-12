# PointMax

クレジットカード・ポイントカード・決済アプリの還元と、ポイント交換ルートを横断して
**「この店でいくら使うなら、どの組み合わせが一番お得か」** を即座に答えるローカル動作のPWAです。

[**▶ ブラウザで開く（GitHub Pages）**](https://kyounow.github.io/pointmax/)

スマホでアクセス → ホーム画面に追加すると、ネイティブアプリのように使えます。
データは端末の `localStorage` に保存され、サーバには送信されません。

---

## 主な機能

### 計算（メイン画面）
- **店舗・金額・目標通貨（例: JALマイル）** を選ぶだけ。
- 保有カードごとに最終取得量を比較表示。**支払方法はユーザーが選ばずに自動で最良が選ばれます**
  （楽天Pay／d払い／PayPay／Visaタッチ／QUICPay／iD／通常クレカ決済を内部で全部評価）。
- 支払アプリは紐付けカード別の還元率を持てる（例: d払い × dカード = 1%、d払い × 楽天カード = 0%）。
- カードからのチャージ式アプリ（楽天Pay/d払い/PayPay 等）と直接決済（Visaタッチ/iD等）は
  主従関係をUIで切り替え表示。例：「**[d払い] の残高にカードからチャージ、dカード**」
- 店舗別の **ポイントカード二重取り／三重取り** にも対応（紀伊國屋など複数提示可能な店舗）。
- カテゴリルール（例: JAL特約店 = 2%）を1個のルールで全店舗一括設定。
- 店舗 select は **文字列検索 + カテゴリ絞り込み** で多数の店舗から素早く選択可能。

### キャンペーン（期間限定ルール）
- 開始日・終了日付きのルールを「クレカ還元」「ポイント提示」両方で登録可能。
- 通常ルールと共存し、期間中は **最高 rate を採用**。期間外は通常 rate に戻る。
- 計算結果に **「🎯 キャンペーン中 (〜2026/06/30)」** バッジ表示。
- 専用タブで「有効中／期限切れ／未来開始」のステータス確認。
- **複数店舗をまとめて選択**して 1 回の登録で N 件のルール一括追加。

### 交換ルート（グラフ表示）
- 通貨ノード間のレートを **@xyflow/react** で図示。
- 特定ノードを選択するとそのノードを中心に **入力↑/出力↓** で再配置。
- クロスするエッジでもラベル位置を ID ハッシュで分散して見やすく。

### マスタデータ管理
- 起動時に GitHub Pages 上の公式マスタ JSON (`master.json`) と差分マージ可能。
- ユーザー独自のカード／ルール／店舗を保持したまま「新しいマスタの追加分だけ取り込み」できる
  **add-only マージ**。
- 既存ユーザーの編集と公式マスタの値が衝突したら、項目単位で **採用するかをダイアログで個別確認**。
- 「サンプル投入」「ローカルデータ初期化」「JSONエクスポート/インポート」は設定画面から。

### マスタ自動アップデート（Phase A〜D 完了）
- `sources/registry.yaml` に各カード・ポイント・決済アプリの公式 URL を登録。
- `npm run sync:fetch <id>` で Gemini に渡し、構造化 JSON を `sources/extracted/<id>.json` に出力。
- `npm run sync:propose` で現在 seed と diff、`autoApplicable`/`needsReview` に分類:
  - confidence ≥ 0.9 / rate 変動 ±10pp 以内 / 倍率 0.5x〜2x / 既存と衝突なし → auto
  - それ以外 (excludedCategory / lowConfidence / referenceChange 等) → review
- `npm run sync:apply` で autoApplicable を `src/state/seed-additions.ts` に書き出し。
- 楽天/d/Vポイント/Ponta から **計 148 加盟店** が seed にマージ済み (v1.0 時点)。

### モバイルUX
- レスポンシブテーブル（PC=表 / モバイル=カード）と編集モード分離（誤操作防止）。
- ハンバーガーメニューでドロワー、Esc/背景タップで閉じる。
- 計算結果は折り畳み式。

---

## アーキテクチャ

| レイヤ | スタック |
|---|---|
| UI | React 19 + TypeScript + Vite + @xyflow/react |
| 状態管理 | Zustand + persist (`localStorage`) |
| ドメインロジック | `src/domain/` 配下に純関数で集約（テスト容易） |
| グラフ最適化 | Bellman-Ford 派生の **最大積パス** (`bestPath.ts`) |
| 自動同期 | `scripts/sync/*` ＋ Gemini API (`@google/genai`) |
| テスト | Vitest（165ケース） |
| PWA | vite-plugin-pwa（precache + service worker） |
| デプロイ | GitHub Actions → GitHub Pages（main push で自動） |

### ドメインの構造

```
src/domain/
  types.ts          # 全エンティティの型 (Card, Currency, Store, StoreRule, ...)
  resolveRate.ts    # カード×店舗 → 還元率/通貨 を決定する汎用関数
  paymentApp.ts     # PaymentApp ごとに評価し最良を返す (cardSpecific 対応)
  loyalty.ts        # ポイントカード提示分（重取り）の最良を返す
  rankCards.ts      # 上記を統合してカード別ランキングを生成
  bestPath.ts       # 通貨間の最大積交換ルートを探索
  mergeSeed.ts      # add-only マージ（ユーザー編集保護）
  migrations.ts     # 既存レコードへの宣言型マイグレーション基盤
  ruleActiveAt.ts   # キャンペーン期間 (validFrom/validTo) のアクティブ判定
  formatNum.ts      # 数値フォーマッタ
```

### Seed データの構造 (v1.0 で分割整理)

```
src/state/
  seed.ts                       # SEED_VERSION / SEED_CHANGELOG / seed() 関数
  seed-data-currencies.ts       # 通貨マスタ
  seed-data-cards.ts            # Card / PointCard / PaymentApp
  seed-data-stores.ts           # Store / StoreRule / LoyaltyRule
  seed-data-edges.ts            # 通貨間交換レート
  seed-additions.ts             # 自動同期で追加されたデータ (auto-generated)
  seed-blocklist.ts             # 自動同期で除外したい storeId
  seed-category-aliases.ts      # カテゴリ統合マップ (旧名 → 新名)
```

### 自動同期パイプライン

```
scripts/sync/
  fetch-source.ts      # 1 ソース取得 (Gemini URL Context Tool 経由)
  diff-and-propose.ts  # seed vs extracted の差分 → ProposalReport
  propose-helpers.ts   # propose<Entity> 個別関数群
  apply-proposals.ts   # autoApplicable を seed-additions.ts に書き出し
  inject-prompt.ts     # extractor プロンプトに seed 内容を動的注入
  types.ts             # 共通型 + 閾値定数 + scope ディレクティブ
```

## ローカル開発

```bash
npm install
npm run dev          # http://localhost:5173 （prebuild で master.json も再生成される）
npm run test         # Vitest
npm run build        # 本番ビルド
npm run sync:fetch -- <sourceId>   # 1 ソースを Gemini で抽出
npm run sync:propose               # 全 extracted vs seed の差分提案
npm run sync:apply                 # autoApplicable を seed-additions.ts へ
```

`scripts/generate-master.ts` がビルド時に走り、`src/state/seed.ts` の内容を
`public/master.json` として出力します。これが GitHub Pages から
`https://kyounow.github.io/pointmax/master.json` として配信されます。

## デプロイ

`main` ブランチに push すると GitHub Actions が自動でビルド & GitHub Pages にデプロイされます。

---

## 自動アップデート (cron)

- 毎週月曜 06:00 JST に GitHub Actions が自動で同期パイプラインを実行 (`workflow_dispatch` でも手動実行可)
- 高信頼項目 (autoApplicable) は main に自動 push → GitHub Pages が再デプロイ。要レビュー項目は `chore/sync-review-queue` ブランチの長寿命 PR に集約
- `sync.config.json` の `autoMergeEnabled` フラグで自動 push の ON/OFF を制御。`maxAutoChangesPerRun` が安全弁 (超過時は全件 review 降格)
- 初期値は `autoMergeEnabled: false` (慣らし運用)。数回の cron を `chore/sync-review-queue` PR で確認してから `true` に切り替える想定
- ローカル PC は完全に無関係 — GitHub のサーバー上で実行される

---

## バージョニング方針

### v1.0（現行・安定運用）
2 つの大きなフィーチャー + マスタ自動アップデートが揃いました。
**この v1.0 から後方互換ポリシーが発効** します（既存ユーザの localStorage を保護）。

達成済みフィーチャー:
1. **キャンペーン期間限定ルール** ✓ — 期間付きの還元率上振れ／下振れ。専用タブ + バッジ表示。
2. **マスタ自動アップデート** ✓ — Gemini で公式ページから抽出 → 構造化 JSON → seed-additions に append。
   楽天/d/V/Ponta の 148 加盟店を取り込み済み。
3. **支払アプリのカード別還元** ✓ — d払い × dカード = 1.0% / d払い × 他社 = 0% を正しく表現。

### v0.8（v1.0 までの開発フェーズ・終了）
- 後方互換性なしの「テスター」フェーズ。
- v1.0 リリースで pointmax-v08-store キーは継続使用 (互換維持)。

### v2.0 ロードマップ
1. **カード情報の有効化機能** — マスター由来のカードプール（dカード/PayPayカード等）を持ち、
   ユーザーが「使う/使わない」をトグルで選択。現状は手動 add/remove のみ。
2. **GitHub Actions cron** — 週次自動同期 + 自動 PR/Issue 化。
3. **更なる加盟店ソース拡張** — JAL特約店（要新 URL）/ 三井住友カード対象店舗等。
4. **Gemini 抽出のロバスト化** — pre-fetch + URL Context Tool ハイブリッド、リトライ強化。

---

## データの取り扱い

- **個人情報は一切扱いません**。カード名・利用店舗・金額入力は全て端末ローカル。
- 還元率・交換レートは公式情報に基づく**概算値**です。会員ステータスや期間限定キャンペーンは
  反映していないため、**実利用前には必ず各社の公式条件をご確認ください**。
- `localStorage` は端末／ブラウザごとに別。複数端末で共有したい場合は
  「エクスポート」→ GitHub Gist などに保存 → 別端末で「同期URL」設定、が想定フロー。

## ライセンス

MIT License（予定）
