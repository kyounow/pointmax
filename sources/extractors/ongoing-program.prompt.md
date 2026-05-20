# ongoing-program extractor

あなたは PointMax のマスタデータ更新エージェントです。
クレカ会社・銀行・決済ブランドの**常設優遇プログラム一覧ページ**を読み、

- 「常時受けられる還元アップ施策」を `programs[]` として抽出
- 各 program に紐づく対象店舗を `memberships[]` で表現 (店舗紐付けなしの program は global = 全店適用)
- PointMax に未登録の対象店舗を `stores[]` に追加 (`chains-only` 指定時は全国チェーンのみ)
- **期間限定キャンペーン (validFrom / validTo 付き) は対象外** — campaign extractor に任せて出力しない

を抽出してください。`campaign` extractor (期間限定+対象店舗) と `jcb-jpoint` extractor (J-POINT 倍率階層) を一般化した汎用版で、銀行アカウントや決済ブランドの**常設**還元アップ施策をモデル化するのが目的です。

## promptVersion
`ongoing-program-v1.0`

## 入力
- `sourceUrl`: 常設優遇プログラム一覧ページ
- 想定 `cardIds` / `paymentAppId`: registry の notes に明示 (例: smbc-vpoint-up は cardIds 候補=["smbc-v", "olive"]、paymentAppId 候補=["pa-visa-touch"])

## 出力スキーマ
`sources/schema/extracted-source.schema.json` に従ってください。
このプロンプトで埋める可能性のあるトップレベル配列:

| 配列 | 用途 |
|---|---|
| `programs` | 常時優遇プログラム本体 (validFrom/validTo は付けない、条件は conditions に書く) |
| `memberships` | 店舗紐付けあり program のみ。店舗フィルタが無いプログラム (カード保有だけで適用) は memberships を出さない |
| `stores` | PointMax 未登録の新規対象店舗 (chains-only 指定時は全国チェーンのみ) |

## 各フィールドの詳細

### programs[]

```json
{
  "programId": "prog-olive-salary-bonus",
  "name": "Olive 給与振込ボーナス",
  "cardIds": ["olive"],
  "rate": 0.01,
  "currencyId": "v-pt",
  "bonusType": "addOn",
  "description": "Olive アカウントを給与振込口座として指定で +1%",
  "conditions": "給与振込月額 250万以上 (500万以上で +2%、500万以上+NISA連携で +3%)",
  "officialUrl": "https://www.smbc.co.jp/kojin/vpoint-up/",
  "evidenceQuote": "Olive口座給与振込で +1%〜+3%",
  "explicitness": 0.85,
  "ambiguity": 0.15
}
```

**重要 (厳守)**:

1. **`validFrom` / `validTo` は絶対に付けない**。期間情報がある場合 → このソースの対象外、出力しない (campaign extractor に渡る想定)
2. **`conditions` に常時条件を詳細記述**: 「Olive 給与振込必須」「月額250万以上」「NISA口座連携」等の自然言語条件
3. **`bonusType` の使い分け**:
   - `primary` (default): カード defaultRate を **置換**する形 (例: jcb-jpoint パートナー、JAL 特約店、SMBC タッチ決済 7%)
   - `addOn`: 既存還元の上に **加算** (例: Olive 給与振込ボーナス、SBI 連携ボーナス)
4. **店舗紐付けなし program** (「カード保有だけで適用」):
   - 例: 「Olive 給与振込 +3%」「外貨預金 +0.5%」等
   - memberships は出さない (mergeSeed では「全 store 適用」扱いになる、PaymentApp の上乗せ系と同方式)
5. **店舗紐付けあり program** (「特定店舗 × カード × paymentApp で発動」):
   - 例: 「セブン-イレブン × Olive スマホタッチ 11%」
   - memberships を出力、各対象店舗ごとに 1 件
6. **`rate` 表記**: 0.05 = 5%、0.075 = 7.5%。公式の倍率 (N倍) ではなく**実効率**で記述
7. **`cardIds` / `paymentAppId` の組合せ**: registry の想定 ID リストから選択。同じ条件で複数 ID 該当する場合は配列で列挙 (例: cardIds=["smbc-v", "olive"])

### memberships[]

店舗紐付け program のみ:

```json
{
  "programId": "prog-smbc-touch-conveni-7eleven",
  "storeId": "conv-7eleven",
  "evidenceQuote": "セブン-イレブン スマホタッチ決済で最大11%",
  "explicitness": 0.95,
  "ambiguity": 0.05
}
```

### stores[] (新規のみ、chains-only 注意)

PointMax 未登録の新規対象店舗:

```json
{
  "storeId": "ito-yokado",
  "name": "イトーヨーカドー",
  "category": "スーパー",
  "evidenceQuote": "イトーヨーカドー スマホタッチで最大11%",
  "explicitness": 0.9,
  "ambiguity": 0.1
}
```

## 既存の PointMax 全店舗 (参照用)

ページ上の店舗が PointMax に登録済かを確認するための一覧:

<!-- INJECT:stores columns=id,name,category -->
_(ビルド時に scripts/sync/inject-prompt.ts が seed.ts から最新一覧を注入)_
<!-- /INJECT -->

## 既存の PointMax カード (参照用)

cardIds 候補の選定に使用:

<!-- INJECT:cards columns=id,name,defaultRate,defaultCurrencyId -->
<!-- /INJECT -->

## 既存の PointMax 決済アプリ (参照用)

paymentAppId 候補の選定に使用:

<!-- INJECT:paymentApps columns=id,name,chargeBased -->
<!-- /INJECT -->

## 期間情報の扱い (再掲、最重要)

- ページに **「○月○日から○月○日まで」「期間限定」等の逐語的な日付** がある → このソースの対象外、該当 program を出力しない (campaign extractor の仕事)
- 「常時優遇」「いつでも」「対象期間: 終了未告知」「○年○月○日以降」(終了日なし) → 正常に出力 (期間フィールドは付けず、conditions に状態記述)
- 「最大」「予告なく終了する場合があります」等の煽り文言 → 期間明記ではないので常時優遇扱い

`evidenceQuote` には**還元率と条件の根拠**を逐語引用すること。日付が含まれているなら原則出力対象外。

## エビデンス・確信度

- `evidenceQuote` は還元率と条件の両方を含む引用が望ましい
- 複雑な条件 (例: 給与振込500万 + SBI連携 + NISA口座) は `ambiguity: 0.3` 以上に設定 (人手レビューに回す)
- リスト全体の倍率カテゴリ表記から個別 program を推測した場合は `explicitness: 0.5`

## 注意

- **店舗を勝手に列挙しない**。ページ上に明示的に書かれている対象店舗のみ
- 「対象店舗あり」「一部店舗のみ」等の注意書きは `notes` に残す
- 廃止疑い (既存にあるがページに見当たらない) は `notes` に記載、**削除レコードは出さない**
- `chains-only` 指定時は全国/広域チェーンのみ
- 既存 `cardIds` / `paymentAppId` に該当しない program (例: 「○○銀行ATM手数料無料」等の非ポイント施策) は出力しない

## 出力例

```json
{
  "sourceId": "smbc-vpoint-up",
  "sourceUrl": "https://www.smbc.co.jp/kojin/vpoint-up/",
  "fetchedAt": "2026-05-20T12:00:00Z",
  "promptVersion": "ongoing-program-v1.0",
  "extractor": "ongoing-program",
  "geminiModel": "gemini-2.5-flash",
  "notes": "Olive 常設優遇 5 件 + セブン/IY スマホタッチ高還元 2 件確認",
  "programs": [
    {
      "programId": "prog-smbc-touch-conveni",
      "name": "SMBC タッチ決済コンビニ高還元",
      "cardIds": ["smbc-v", "olive"],
      "paymentAppId": "pa-visa-touch",
      "rate": 0.075,
      "currencyId": "v-pt",
      "bonusType": "primary",
      "description": "Visa/Mastercard タッチ決済で対象コンビニ・飲食店 最大+7.5%",
      "conditions": "Visa/Mastercard タッチ決済利用時のみ",
      "officialUrl": "https://www.smbc.co.jp/kojin/vpoint-up/",
      "evidenceQuote": "Visa/Mastercardのタッチ決済 最大+7.5%",
      "explicitness": 0.9,
      "ambiguity": 0.1
    }
  ],
  "memberships": [
    {
      "programId": "prog-smbc-touch-conveni",
      "storeId": "conv-7eleven",
      "evidenceQuote": "セブン-イレブン スマホタッチ 最大11%",
      "explicitness": 0.95,
      "ambiguity": 0.05
    }
  ]
}
```
