# extractors/

Gemini に渡す抽出プロンプト集。
1 種類 = 1 ファイル (`<name>.prompt.md`)。

## 種類一覧

| ファイル | 対象 | 主な出力 |
|---|---|---|
| `card.prompt.md` | クレジットカード公式ページ | `cards[]`, `storeRules[]`, `categoryRules[]` |
| `jal-tokuyaku.prompt.md` | JAL特約店リストページ | `categoryRules[]`, `stores[]`, `storeRules[]` |
| `point-partner.prompt.md` | ポイントカード加盟店一覧 | `stores[]`, `loyaltyRules[]` |
| `payment-app.prompt.md` | 決済アプリの公式ガイド | `paymentApps[]` |

## 各プロンプトの構成

統一フォーマット:
1. **役割定義** (PointMax のマスタ更新エージェント)
2. **promptVersion** (例: `card-v1.0`) — 出力 JSON に必ず含める識別子
3. **入力** (sourceUrl + 任意の paramater)
4. **出力スキーマ** (`sources/schema/extracted-source.schema.json` 参照)
5. **既存エンティティ ID 一覧** — 名前衝突/参照のため
6. **各フィールドの詳細** — 値の単位、変換ガイド、選択肢
7. **エビデンス・確信度** — `evidenceQuote / explicitness / ambiguity` の付け方
8. **出力例** — 正しい JSON サンプル
9. **注意** — 抽出してはいけないもの、誤抽出回避

## promptVersion の上げ方

プロンプトを書き換えた時は **必ず `promptVersion` も上げる**こと。
例: `card-v1.0` → `card-v1.1`

理由:
- どの抽出がどのプロンプトで作られたかを後追いするため
- プロンプト変更によって抽出傾向が変わった場合の遡及調査に必要

`promptVersion` は出力 JSON にも記録され、`scripts/sync/diff-and-propose.ts` がレビュー判定に使うこともある（将来）。

## 追加時の規約

新しい extractor を追加する場合:

1. 既存ファイルを参考に `<name>.prompt.md` を作成
2. `scripts/sync/types.ts` の `ExtractorKind` に enum 値を追加
3. `sources/schema/extracted-source.schema.json` の `extractor.enum` にも追加
4. `sources/registry.yaml` に対応する `extractor: <name>` を指定したエントリを追加
5. このファイルの「種類一覧」テーブルを更新

## デバッグ手順

抽出結果が期待通りでない時:
1. `sources/extracted/<sourceId>.json` を直接見て JSON の中身を確認
2. `evidenceQuote` が引用として妥当か（短すぎ・要約は要修正）
3. `explicitness × (1-ambiguity)` の confidence を計算し、低い場合はプロンプトを補強
4. プロンプトを書き換えたら `promptVersion` を上げて再実行

## 良いプロンプトの原則

- **具体例を見せる** — 良い抽出/悪い抽出の JSON を両方記載
- **既存 ID リストを inline で見せる** — Gemini は seed.ts を直接読まないため
- **過信を抑える表現** — 「自信のない時は低めに評価」「虚偽より空が望ましい」
- **やってはいけないことを明示** — 抽出してはいけないもの（キャンペーン値、推測値）
- **冗長性を恐れない** — 一度書いたルールも、混乱しそうな箇所では再掲する
