# sources/ - マスタ自動同期パイプライン

PointMax の seed データを各カード/ポイント/決済アプリの公式情報から自動更新する仕組みです。
v1.0 で導入される予定の機能。週次 GitHub Actions cron で Gemini CLI が公式ページを読み取り、
差分を Pull Request または Issue として自動提案します。

## ディレクトリ構成

```
sources/
  registry.yaml              # Layer 0: 取得元URLのレジストリ (人間が手で編集)
  schema/
    extracted-source.schema.json   # Gemini に強制する JSON Schema
  extractors/                # 各 extractor 種別ごとの Gemini プロンプト
    card.prompt.md           # 単一カードのスペック抽出
    jal-tokuyaku.prompt.md   # JAL特約店リスト抽出
    point-partner.prompt.md  # ポイント加盟店リスト抽出
    payment-app.prompt.md    # 決済アプリ仕様抽出
  extracted/                 # Layer 1: Gemini 出力 (週次で上書き、git 管理)
    <sourceId>.json
  history/                   # 過去スナップショット (4週分保持、ロールバック用)
    YYYY-MM-DD/
      <sourceId>.json
  proposed-migrations.json   # Layer 2: 差分計算結果 (auto vs review に分類)
```

## パイプライン

```
registry.yaml
   │
   ▼
scripts/sync/fetch-all.ts     ─ Gemini CLI 呼び出し ─▶ extracted/<sourceId>.json
   │
   ▼
scripts/sync/diff-and-propose.ts ─ 現在の seed と比較 ─▶ proposed-migrations.json
   │
   ├─▶ autoApplicable: seed.ts + MIGRATIONS を更新する PR を自動作成 → CI green → 自動マージ
   └─▶ needsReview:    GitHub Issue を1件ずつ作成 → 人間が判断
```

## 自動マージ判定基準

`proposed-migrations.json` で各提案は次のルールで `autoApplicable` / `needsReview` に分類されます。

### autoApplicable (PR 自動マージ対象)
- confidence ≥ 0.9
- かつ 以下の **いずれか**:
  - 新規追加 (既存ID と衝突しない)
  - rate の更新で **絶対変動 ≤ 10pp AND 相対倍率 0.5x〜2x**
  - メタ情報の追加 (category 未設定→設定、notes 追加 など)

### needsReview (Issue 化)
- confidence < 0.9
- または 削除 / 通貨参照変更 / ID 衝突
- または rate の **絶対変動 > 10pp** または **倍率が 0.5x 未満 / 2x 超**
- 大キャンペーン (50%還元等) はここに落ちる。ニュース等の追加エビデンスで人間が承認

## confidence の合成

各抽出項目に Gemini が付ける `evidenceQuote / explicitness / ambiguity` から
スクリプト側で機械的に計算 (`scripts/sync/types.ts` の `computeConfidence`):

```
confidence = evidenceQuote ? explicitness * (1 - ambiguity) : 0.3
```

`evidenceQuote` (元ページからの逐語引用) が空なら強制的に 0.3 = 要レビュー扱い。

## 開発者向けセットアップ

1. Google AI Studio で API Key を発行 (https://aistudio.google.com/apikey)
2. リポジトリルートに `.env.local` を作り、`.env.example` を参考に値を設定
3. `npm run sync` (実装後) でローカルから 1 ソースをテスト実行可能

CI 上では GitHub Secrets `GEMINI_API_KEY` を別の Key として登録します
(ローカル用と本番用を分離)。

## セキュリティ

- API Key は `.env.local` / GitHub Secrets のみで管理。リポジトリには絶対 commit しない
- pre-commit hook (`.githooks/pre-commit`) で `AIza...` パターンを検出 → ブロック
- 自動マージ PR は CI green が gate (テスト破壊する変更は弾かれる)
- main は branch protection で保護、自動 PR も必ず PR 経由
