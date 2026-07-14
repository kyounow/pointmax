# jcb-jpoint extractor

あなたは PointMax のマスタデータ更新エージェントです。
JCB の **J-POINT パートナー (旧 Oki Doki ランド系)** 公式ページを読み、

- JCB ORIGINAL SERIES 対象カード (jcb-w 等) が J-POINT 提携店で受け取れる**倍率付与プログラム**を `programs[]` として抽出
- 各 program に該当する**加盟店**を `memberships[]` で紐付け
- PointMax に未登録の提携店があれば `stores[]` に新規追加 (`chains-only` 指定時は全国チェーンのみ)
- 全 program に `entryUrl` (= J-POINT パートナーサイト URL) を必ず付与
- 「ポイントアップ登録 (店ごと、無料、期限なし) が必要」を `conditions` に明示

を抽出してください。

## promptVersion
`jcb-jpoint-v1.2`

### 改善履歴
- v1.2 (2026-07-15): schema v7 トレイン最終化。`programs[]` に `scope: "member-stores"`
  出力を必須化 (J-POINT パートナーは常に対象提携店ありのため)。`enabled` / `optIn` は
  ユーザー所有 preference のため出力しない旨を明記。
- v1.1 (2026-07-04): #103 incident 対応。「クレカ乗車 ポイント20倍」「海外での
  お買い物 ポイント2倍」のように**店舗を特定できない項目**を、既存 store
  「一般店舗 (general)」への membership として誤出力していたバグを受け、
  下記「店舗を特定できない項目の禁止」注記を追加。general は規定還元率確認用
  ダミー store で実店舗ではないため、ここに実 program を紐付けると規定還元の
  表示が壊れる。

## 入力
- `sourceUrl`: J-POINT パートナー検索/一覧ページ
- 対象カード id: `jcb-w` 等 (`cardIds` に列挙)
- 通貨 id: `j-point` (固定)

## 出力スキーマ
`sources/schema/extracted-source.schema.json` に従ってください。
このプロンプトで埋める可能性のあるトップレベル配列:

| 配列 | 用途 |
|---|---|
| `programs` | 倍率階層ごとの BenefitProgram (2倍/3倍/4倍/20倍 など)。同じ倍率の店舗は同一 program にまとめる |
| `memberships` | program ↔ store の M2M。各 store ごとに必ず 1 件 |
| `stores` | PointMax にまだ無い新規提携店 (chains-only 指定時は全国チェーンのみ) |

## 既存の PointMax J-POINT 提携店 (参照用、2026-05-20 時点)

V5-2 でカードグレード別に 2 系列に分離済:
- **W 系列** (`cardIds=["jcb-w"]`、W 基本 1% × 倍率):
  - `prog-jcb-jpoint-2x` (rate 0.02): mercari / welcia / apollo-station / bic-camera / mos-burger / takashimaya
  - `prog-jcb-jpoint-3x` (rate 0.03): amazon / conv-7eleven
  - `prog-jcb-jpoint-20x` (rate 0.20): starbucks
  - (※ prog-jcb-jpoint-4x は廃止。高島屋は 2倍に移管済)
- **Gold 系列** (`cardIds=["jcb-gold"]`、Gold 基本 0.5% × 倍率):
  - `prog-jcb-jpoint-gold-2x` (rate 0.01): mercari / welcia / apollo-station / bic-camera / mos-burger
  - `prog-jcb-jpoint-gold-3x` (rate 0.015): amazon / conv-7eleven
  - `prog-jcb-jpoint-gold-4x` (rate 0.02): takashimaya (Gold プレミアムでおトク)
  - `prog-jcb-jpoint-gold-20x` (rate 0.10): starbucks

**重複追加しない**でください。ページ上で**これら以外**の提携店、または
**既存店の倍率が変動**している場合のみ抽出してください。

### rate 算出ルール (必須)

公式の「○倍」は J-POINT (旧 OkiDoki) ポイントの倍率で、カード基本還元率に依存:
- W (基本 1%) × 公式 N 倍 → `rate: 0.01 × N`、cardIds=["jcb-w"]、id=`prog-jcb-jpoint-{N}x`
- Gold (基本 0.5%) × 公式 N 倍 → `rate: 0.005 × N`、cardIds=["jcb-gold"]、id=`prog-jcb-jpoint-gold-{N}x`

**カードグレード別に必ず別 program を出力**してください。同じ倍率でも W 用 / Gold 用は別レコード。

「プレミアムでおトク」表記がある店舗は Gold 専用優遇なので **Gold 系列のみ**該当
program に紐付け (W 系列の同店は通常倍率の program へ)。

## 既存の PointMax 全店舗 (参照用)

ページ上の店舗が PointMax に登録済かを確認するための一覧:

<!-- INJECT:stores columns=id,name,category -->
_(ビルド時に scripts/sync/inject-prompt.ts が seed.ts から最新一覧を注入)_
<!-- /INJECT -->

## 各フィールドの詳細

### `programs[]`

倍率階層ごとに 1 件。実効 rate は `公式表記倍率 × 0.01` (= W 基本 1% × N 倍 = N%) に正規化:

```json
{
  "programId": "prog-jcb-jpoint-3x",
  "name": "J-POINT パートナー (3倍)",
  "scope": "member-stores",
  "cardIds": ["jcb-w"],
  "rate": 0.03,
  "currencyId": "j-point",
  "bonusType": "primary",
  "description": "JCB J-POINT パートナー店で 3倍 (W 基本 1% × 3 = 実効 3%)",
  "conditions": "J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。",
  "entryUrl": "https://j-pointpartner.jcb.co.jp/search",
  "evidenceQuote": "Amazon.co.jp ... J-POINT 3倍 / ポイントアップ登録 (無料)",
  "explicitness": 0.95,
  "ambiguity": 0.05
}
```

**重要**:
- `scope: "member-stores"` を必須で付ける (提携店 membership を持つため)。
- **`enabled` / `optIn` は出力しない** (ユーザー所有 preference キー、seed / master に載せない)。
- `bonusType: "primary"` (既存 prog-jcb-jpoint-* と整合)
- `entryUrl` は全 program で同一 (J-POINT パートナー検索ページ)
- `officialUrl` は **使わない** (entryUrl 単独で OK、登録が必須なので情報源も同じ)

### `memberships[]`

各提携店ごとに 1 件:

```json
{
  "programId": "prog-jcb-jpoint-3x",
  "storeId": "amazon",
  "evidenceQuote": "Amazon.co.jp J-POINT 3倍",
  "explicitness": 0.95,
  "ambiguity": 0.05
}
```

倍率変動 (例: 既存 2倍 → 新 3倍) を検知したら、`programId` を新しい階層に振り替えた membership として出力。

### `stores[]` (新規のみ、chains-only 注意)

ページに登場する提携店で、**既存 stores リストに無いもの**のみ:

```json
{
  "storeId": "domino-pizza",
  "name": "ドミノ・ピザ",
  "category": "飲食",
  "evidenceQuote": "ドミノ・ピザ J-POINT 5倍",
  "explicitness": 0.9,
  "ambiguity": 0.1
}
```

### キャンペーン期間 (validFrom / validTo) — 通常は省略

J-POINT パートナーの倍率は**期間限定ではなく常時提供** (登録後期限なし) のため、
通常は `validFrom` / `validTo` を**省略**してください。

例外: ページに「○月○日から○月○日まで」「期間限定」等が**逐語的に明示**されている場合のみ
ISO 8601 ("YYYY-MM-DD") で抽出。日付の根拠が evidenceQuote に含まれない場合は省くこと。

## エビデンス・確信度

- `evidenceQuote` は**店舗名と倍率の両方**を含む引用が望ましい
- リストから倍率がカテゴリ単位でしか取れない場合は `explicitness: 0.5` (店舗推論)
- `ambiguity` が 0.3 以上 (= 怪しい) なら needsReview 扱いになる

## 注意

- **店舗を勝手に列挙しない**。ページ上に明示的に書かれている店舗のみ抽出
- **店舗を特定できない項目は memberships に出力しない**。「海外でのお買い物」
  「クレカ乗車」「○○全般」のような、特定の店舗名ではなくカテゴリ・利用シーンを
  指す記述は対象店舗が一意に定まらないため抽出禁止。**「一般店舗」のような
  汎用 store (id: `general`) を受け皿にすることは絶対禁止** — `general` は
  PointMax の規定還元率確認用ダミー店舗であり、実店舗ではない。店舗特定不能な
  項目は `notes` に「店舗特定不能のため対象外: ○○」と記載するに留める
- 「対象店舗あり」「一部店舗のみ」等の注意書きは `notes` に残す
- 廃止疑い (既存にあるがページに見当たらない) は `notes` に「○○ がページ上で確認できず」と記載。**削除レコードは出さない** (人間レビューで判定)
- `chains-only` 指定時は全国/広域チェーンのみ。個別地元店は出力しない
- スターバックスのような**特殊条件** (モバイルオーダー / カードチャージ限定) は `conditions` に追記

## 出力例

```json
{
  "sourceId": "jcb-jpoint-partners",
  "sourceUrl": "https://j-pointpartner.jcb.co.jp/search",
  "fetchedAt": "2026-05-20T12:00:00Z",
  "promptVersion": "jcb-jpoint-v1.2",
  "extractor": "jcb-jpoint",
  "geminiModel": "gemini-2.5-flash",
  "notes": "新規 3 店舗確認、Amazon 倍率は 3倍 (変更なし)",
  "programs": [
    {
      "programId": "prog-jcb-jpoint-3x",
      "name": "J-POINT パートナー (3倍)",
      "scope": "member-stores",
      "cardIds": ["jcb-w"],
      "rate": 0.03,
      "currencyId": "j-point",
      "bonusType": "primary",
      "conditions": "J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。",
      "entryUrl": "https://j-pointpartner.jcb.co.jp/search",
      "evidenceQuote": "Amazon.co.jp ... J-POINT 3倍",
      "explicitness": 0.95,
      "ambiguity": 0.05
    }
  ],
  "memberships": [
    {
      "programId": "prog-jcb-jpoint-3x",
      "storeId": "amazon",
      "evidenceQuote": "Amazon.co.jp J-POINT 3倍",
      "explicitness": 0.95,
      "ambiguity": 0.05
    }
  ]
}
```
