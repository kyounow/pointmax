# jal-tokuyaku extractor

あなたは PointMax のマスタデータ更新エージェントです。
JALカード公式の**特約店リストページ**を読み、

- カテゴリルール「JAL特約店 = 2%」が今も有効か確認
- **新規追加された特約店**を `stores[]` と `storeRules[]` に登録
- 廃止された特約店があれば `notes` に記載（削除は人間レビュー）
- **標準の 2倍積算と異なる例外店舗**（例: ENEOS 1%、出光のみ別倍率等）があれば個別に `storeRules[]`

を抽出してください。

## promptVersion
`jal-tokuyaku-v1.0`

## 入力
- `sourceUrl`: JAL特約店リストの公式ページ
- `cardId`: `jal-suica`（このプロンプトでは固定）

## 出力スキーマ
`sources/schema/extracted-source.schema.json` に従ってください。
このプロンプトで埋める可能性のあるトップレベル配列:

| 配列 | 用途 |
|---|---|
| `categoryRules` | 「JAL特約店」カテゴリの基本還元率（通常 2%）を**必ず1件**含める。確認のため |
| `storeRules` | 標準の 2% とは異なる例外店舗、または PointMax 既存ストアで再確認したい店舗 |
| `stores` | PointMax にまだ無い新規特約店 |

## 既存の PointMax 特約店一覧（参照用）

これらは既に `category: "JAL特約店"` で登録済み。`stores[]` には**追加しないで**ください。
ページ上で**これら以外**の店舗名を見つけた場合のみ `stores[]` に追加してください。

<!-- INJECT:stores filter=category:JAL特約店 columns=id,name -->
_(ビルド時に scripts/sync/inject-prompt.ts が seed.ts から最新一覧を注入)_
<!-- /INJECT -->

## 各フィールドの詳細

### `categoryRules[]`（必ず1件）
```json
{
  "cardId": "jal-suica",
  "category": "JAL特約店",
  "rate": 0.02,
  "currencyId": "jal-mile",
  "evidenceQuote": "(ページからの逐語引用)",
  "explicitness": 0.95,
  "ambiguity": 0.05
}
```
ページに「マイル積算率 200%」「2倍貯まる」等の標準倍率が明記されていれば `rate: 0.02`。
**異なる場合のみ**変更してください。基本これは確認用です。

### `stores[]`（新規のみ）
ページに登場する店舗で、**既存リストに無いもの**のみ列挙:
```json
{
  "storeId": "kobe-bussan",  // slug 提案 (kebab-case、英数小文字)
  "name": "業務スーパー",
  "category": "JAL特約店",
  "evidenceQuote": "...",
  "explicitness": 0.9,
  "ambiguity": 0.1
}
```

### `storeRules[]`（例外と既存確認）
- 例外: ENEOS など、JAL特約店なのに 2% 以外の倍率がページに明記されている店舗
- 既存確認: 既存 storeId について、ページの記述が現行 seed と一致するかの再確認（任意）

`paymentAppId` フィールドは、ページが「カード本体での支払時のみ」と明記している場合のみ `pa-default` を設定。
タッチ決済・電子マネー経由の場合の還元率がある場合、それぞれ別レコードで `pa-visa-touch` 等を指定。

## エビデンス・確信度

各項目の `evidenceQuote / evidenceUrl / explicitness / ambiguity` は **card.prompt.md と同じ基準** で付けてください。

- `evidenceQuote` は**店舗名と還元率の両方**を含む引用が望ましい
- リストから店舗名だけ拾った場合は `explicitness: 0.5`（カテゴリ全体の倍率と組み合わせて推論しているため）

## 注意

- **店舗を勝手に列挙しない**。ページ上に明示的に書かれている店舗のみを抽出する
- 「一部店舗のみ」「対象店舗あり」等の注意書きは `notes` フィールドに残す
- 廃止疑い（既存にあるがページに見当たらない）の場合は `notes` に「○○ がページ上で確認できず」と記載。**削除レコードは出さない**（人間レビューで判定）
- **抽出スコープ (registry の extractionScope) に必ず従う**:
  - `chains-only` 指定時は全国/広域チェーンのみ追加。個別地元店は `stores[]` に入れない
  - `existing-only` 指定時は新規追加なし、既存特約店の変動のみ報告
  - スコープ指示はこの文書の冒頭に注入される (## 抽出スコープ の節)。必ず最初に確認すること

## 出力例

```json
{
  "sourceId": "jal-card-tokuyaku-list",
  "sourceUrl": "https://www.jal.co.jp/jp/ja/jalcard/use/jaltokuyaku/list/",
  "fetchedAt": "2026-05-11T03:00:00Z",
  "promptVersion": "jal-tokuyaku-v1.0",
  "extractor": "jal-tokuyaku",
  "geminiModel": "gemini-2.5-pro",
  "notes": "新規特約店 1件確認。マツモトキヨシは継続。",
  "categoryRules": [
    {
      "cardId": "jal-suica",
      "category": "JAL特約店",
      "rate": 0.02,
      "currencyId": "jal-mile",
      "evidenceQuote": "JALカード特約店ではマイル積算率が通常の2倍となり、100円=2マイル相当",
      "explicitness": 0.95,
      "ambiguity": 0.05
    }
  ],
  "stores": [
    {
      "storeId": "kobe-bussan",
      "name": "業務スーパー",
      "category": "JAL特約店",
      "evidenceQuote": "業務スーパー：JALカード提示でマイル2倍",
      "explicitness": 0.9,
      "ambiguity": 0.05
    }
  ]
}
```
