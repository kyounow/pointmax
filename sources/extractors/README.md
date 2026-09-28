# extractors/

Gemini に渡す抽出プロンプト集。
1 種類 = 1 ファイル (`<name>.prompt.md`)。

## 種類一覧

9 ファイル = `ExtractorKind` (`scripts/sync/types.ts`) の 8 種 + crawl 専用の `campaign-index`。
「出力」は registry の `produces` に書く値 (`ProducesKind`: cards / categoryRules / stores /
paymentApps / programs / memberships)。

| ファイル | 対象 | 出力 (ProducesKind) | 備考 |
|---|---|---|---|
| `campaign.prompt.md` | 期間限定キャンペーン (一覧 or crawl の子ページ) | programs, memberships, stores | 新規 program が auto になり得る唯一の extractor (条件はルート README の表) |
| `campaign-index.prompt.md` | 索引ハブ (registry の `crawl: { mode: index }`) | なし (子 URL の列挙のみ) | `ExtractorKind` ではない。1 段目で `urls[]` を返し、2 段目を campaign で抽出 |
| `jcb-jpoint.prompt.md` | JCB J-POINT パートナー | programs, memberships, stores | 倍率階層別 program (W / Gold の 2 系列) |
| `epos-tamaru.prompt.md` | たまるマーケット (EPOS) | programs, memberships, stores | 倍率階層別 program |
| `ongoing-program.prompt.md` | 常設の還元アップ施策一覧 | programs, memberships, stores | validFrom/validTo を付けず conditions に常時条件 |
| `card.prompt.md` | クレジットカード公式ページ | cards, categoryRules | prompt は storeRules も出す。categoryRules / storeRules を propose が使うのは jal-tokuyaku 経路だけで、既存カードの更新 (updateField/cards) は seed に書く経路が無い |
| `jal-tokuyaku.prompt.md` | JAL特約店リスト | stores, categoryRules | categoryRules (基本レート確認) と storeRules (例外店の除外) を JAL 特約店 membership の propose に使う |
| `point-partner.prompt.md` | ポイントカード加盟店一覧 | stores | loyaltyRules は v6 PR-1e 以降 propose が無視する |
| `payment-app.prompt.md` | 決済アプリの公式ガイド | paymentApps | |

使っているソースの有無 (enabled / 停止中) は `sources/registry.yaml` を参照。

## 各プロンプトの構成

統一フォーマット:
1. **役割定義** (PointMax のマスタ更新エージェント)
2. **promptVersion** (例: `card-v1.0`) — 出力 JSON に必ず含める識別子
3. **入力** (sourceUrl + 任意の paramater)
4. **出力スキーマ** (`sources/schema/extracted-source.schema.json` 参照)
5. **既存エンティティ ID 一覧** — 名前衝突/参照のため (INJECT マーカーで動的注入)
6. **各フィールドの詳細** — 値の単位、変換ガイド、選択肢
7. **エビデンス・確信度** — `evidenceQuote / explicitness / ambiguity` の付け方
8. **出力例** — 正しい JSON サンプル
9. **注意** — 抽出してはいけないもの、誤抽出回避

## INJECT マーカー (動的注入)

プロンプト内に直接 ID 一覧を埋め込むと、seed.ts が更新されるたびに陳腐化します。
代わりに **INJECT マーカー** を埋めておき、`scripts/sync/inject-prompt.ts` が
Gemini 呼び出し直前に現在の seed から最新一覧を注入します。

### 構文

```html
<!-- INJECT:<entity> [filter=<field>:<value>] [columns=<col1>,<col2>,...] -->
任意のプレースホルダ文言 (置換される)
<!-- /INJECT -->
```

| 部品 | 必須 | 意味 |
|---|---|---|
| `<entity>` | ✅ | `cards / currencies / stores / pointCards / paymentApps / categories` のいずれか (`categories` は店舗カテゴリ語彙、下記) |
| `filter=field:value` | 任意 | フィールドの完全一致でレコード絞り込み (例: `filter=category:JAL特約店`) |
| `columns=col1,col2` | 任意 | 列指定 (省略時は entity ごとのデフォルト) |

### デフォルト列

| entity | デフォルト列 |
|---|---|
| cards | id, name, defaultRate, defaultCurrencyId |
| currencies | id, name, kind |
| stores | id, name, category |
| pointCards | id, name, currencyId |
| paymentApps | id, name, chargeBased |
| categories | name |

`categories` (PR-4a) は seed() ではなく `src/state/seed-categories.ts` の店舗カテゴリ語彙 (擬似店舗用の「汎用」を
除く 35 名) を 1 列表で出す (`filter` を付けると例外。`columns` も `name` 以外は例外)。stores[] を出す `jcb-jpoint` / `epos-tamaru` /
`ongoing-program` の prompt が「`category` は次の語彙から選ぶ」の直後に置く。語彙外・未設定の category の
新規店は propose の `unknownCategory` で review に回る。`campaign` の固定語彙行は F1p (campaign v3.6) で置換予定、
停止中の `point-partner` / `jal-tokuyaku` は再開する PR で判断する (`scripts/sync/inject-prompt.test.ts` の対象 extractor 契約)。

### 注入結果の例

```markdown
<!-- INJECT:stores filter=category:JAL特約店 columns=id,name -->
| id | name |
|---|---|
| eneos | ENEOS |
| idemitsu | 出光 |
...
<!-- /INJECT -->
```

マーカー自体は出力後も残るため、**何度注入しても結果が同じ (冪等)**。

### 注意

- `<!-- /INJECT -->` の閉じタグを必ず入れる (無いと例外)
- 未知の `<entity>` を指定すると例外
- INJECT を使わない場合 (静的な情報のみ) はマーカー無しの普通の Markdown でOK

## promptVersion の上げ方

プロンプトを書き換えた時は **必ず `promptVersion` も上げる**こと。
例: `card-v1.0` → `card-v1.1`

理由:
- どの抽出がどのプロンプトで作られたかを後追いするため
- プロンプト変更によって抽出傾向が変わった場合の遡及調査に必要

`promptVersion` は出力 JSON にも記録される。上げたら `sources/registry.yaml` の `extractorVersions` も
同じ値に更新する。`scripts/sync/diff-and-propose.ts` の stale-generation ガードが両者の不一致を見て、
旧版 prompt で取った extracted からの rate / 期間の書き戻しを review に降格する。

例外: INJECT マーカー (と、その直前の「次の一覧から選ぶ」程度の導入文) を足すだけの変更は、出力スキーマと
rate / 期間の抽出ルールが変わらないので上げない (PR-4a の `INJECT:categories`)。上げると次回 fetch までの
1 周期、現行の extracted が旧世代扱いになり rate / 期間の書き戻しが `staleExtractGeneration` で止まるだけで得るものが無い。

## 追加時の規約

新しい extractor を追加する場合:

1. 既存ファイルを参考に `<name>.prompt.md` を作成
2. `scripts/sync/types.ts` の `ExtractorKind` に enum 値を追加
3. `sources/schema/extracted-source.schema.json` の `extractor.enum` にも追加
4. `sources/registry.yaml` に対応する `extractor: <name>` を指定したエントリを追加し、`extractorVersions` にも登録
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
- **やってはいけないことを明示** — 抽出してはいけないもの（推測値）。**期間明記キャンペーンは v1.1 で抽出可能**（ページに日付が逐語記載されている場合のみ）。推測値・煽り文言からの日付生成は引き続き禁止
- **冗長性を恐れない** — 一度書いたルールも、混乱しそうな箇所では再掲する
