# 📋 週次マスタ同期: 要レビュー項目

(自動生成 2026-07-02。merge 前に項目を確認してください。)

## サマリ
- 要レビュー: 462 件
- ソース別: d-pay-campaigns=16, jcb-jpoint=139, mufg-card-global-point=1, rakuten-point=165, v-point=140, jal-card-tokuyaku-list=1
- 主な理由: idCollision=21, missingProgramBody=11, missingStoreBody=109, lowConfidence=139, storeAdditionsDisabled=157, selfReportedExclusion=1, excludedCategory=21, userBlocked=3

## 項目 (理由別)

### 🟠 missingStoreBody (store 本体なし membership) (109 件)
理由: membership 提案だが、参照先 store 本体が seed 未存在 + 同 run の auto 候補にも無い (例: category cap で deferred された場合)。そのまま auto-merge すると孤児 membership (店名解決できない、UI で店舗未表示) が seed に残るため降格。store 本体を手動キュレートで追加するか、次回 cron で store 側が auto 化されるのを待つ。

<details><summary>展開</summary>

#### `mem-7d1ee0e6c0` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-d-pay-ja-zennoh-a-coop-05", storeId="joyful-honda"`
- confidence: 0.95
- 評価: `evidenceQuote="ジョイフル本田"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-7d1ee0e6c0`、不要なら無視

#### `mem-dc9ca51dae` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-d-pointcard-welpark-05-thu-sat-sun", storeId="welpark"`
- confidence: 0.95
- 評価: `evidenceQuote="ウェルパーク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-dc9ca51dae`、不要なら無視

#### `mem-c2a13a0389` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-d-pay-welpark-05", storeId="welpark"`
- confidence: 0.95
- 評価: `evidenceQuote="ウェルパーク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-c2a13a0389`、不要なら無視

#### `mem-47c784df51` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-d-pointcard-jalannet-rentacar-10", storeId="jalan-rentacar"`
- confidence: 0.95
- 評価: `evidenceQuote="じゃらんレンタカー"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-47c784df51`、不要なら無視

#### `mem-8842cc438b` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x-max", storeId="app-store"`
- confidence: 0.90
- 評価: `evidenceQuote="App Store ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-8842cc438b`、不要なら無視

#### `mem-b920d52359` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x-max", storeId="app-store"`
- confidence: 0.90
- 評価: `evidenceQuote="App Store ポイント 最大 5 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-b920d52359`、不要なら無視

#### `mem-a80fb6ab59` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-3x", storeId="qoo10"`
- confidence: 0.90
- 評価: `evidenceQuote="Qoo10 ポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-a80fb6ab59`、不要なら無視

#### `mem-b05881811a` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-3x", storeId="qoo10"`
- confidence: 0.90
- 評価: `evidenceQuote="Qoo10 ポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-b05881811a`、不要なら無視

#### `mem-b248c8c3b3` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x-max", storeId="google-play"`
- confidence: 0.90
- 評価: `evidenceQuote="Google Play ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-b248c8c3b3`、不要なら無視

#### `mem-562e4c3c22` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x-max", storeId="google-play"`
- confidence: 0.90
- 評価: `evidenceQuote="Google Play ポイント 最大 5 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-562e4c3c22`、不要なら無視

#### `mem-d9ee8483e6` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-20x", storeId="domino-pizza"`
- confidence: 0.90
- 評価: `evidenceQuote="ドミノ・ピザ ポイント 20 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-d9ee8483e6`、不要なら無視

#### `mem-19998f3c86` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-20x", storeId="domino-pizza"`
- confidence: 0.90
- 評価: `evidenceQuote="ドミノ・ピザ ポイント 20 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-19998f3c86`、不要なら無視

#### `mem-f99b52d31f` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-20x", storeId="disney-plus"`
- confidence: 0.90
- 評価: `evidenceQuote="ディズニープラス ポイント 20 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-f99b52d31f`、不要なら無視

#### `mem-44c28106fc` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-20x", storeId="disney-plus"`
- confidence: 0.90
- 評価: `evidenceQuote="ディズニープラス ポイント 20 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-44c28106fc`、不要なら無視

#### `mem-d6239c051e` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-3x", storeId="uber-eats"`
- confidence: 0.90
- 評価: `evidenceQuote="Uber Eats ポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-d6239c051e`、不要なら無視

#### `mem-79b760b92a` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-3x", storeId="uber-eats"`
- confidence: 0.90
- 評価: `evidenceQuote="Uber Eats ポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-79b760b92a`、不要なら無視

#### `mem-20e6797857` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-10x", storeId="taxi-app-go"`
- confidence: 0.90
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-20e6797857`、不要なら無視

#### `mem-54485af8b7` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-10x", storeId="taxi-app-go"`
- confidence: 0.90
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-54485af8b7`、不要なら無視

#### `mem-ef4b7ec13e` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x-max", storeId="u-next"`
- confidence: 0.90
- 評価: `evidenceQuote="U-NEXT ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-ef4b7ec13e`、不要なら無視

#### `mem-80f1b8a0c0` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x-max", storeId="u-next"`
- confidence: 0.90
- 評価: `evidenceQuote="U-NEXT ポイント 最大 5 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-80f1b8a0c0`、不要なら無視

_他 89 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 missingProgramBody (program 本体なし membership) (11 件)
理由: membership 提案だが、参照先 program 本体が seed 未存在 + 同 run の auto 候補にも無い (proposePrograms は新規 program に必ず idCollision を付けるため、program 本体は同 run では auto に上がらず needsReview に行く)。そのまま membership だけ auto-merge すると BenefitProgram が無く還元計算できない孤児が seed に残るため降格。program 本体側の needsReview を先に承認 → 手動で seed に program 追加 → 次回 cron で membership 側も自動的に通る運用。

<details><summary>展開</summary>

#### `mem-5c9096b42a` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-d-pointcard-matsukiyo-cocokara-04", storeId="matsukiyo"`
- confidence: 0.95
- 評価: `evidenceQuote="マツモトキヨシ・ココカラファイン"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-5c9096b42a`、不要なら無視

#### `mem-dd21b15815` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-d-pointcard-matsukiyo-cocokara-04", storeId="cocokara"`
- confidence: 0.95
- 評価: `evidenceQuote="マツモトキヨシ・ココカラファイン"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-dd21b15815`、不要なら無視

#### `mem-0bd1f193c2` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-d-pointcard-doutor-07", storeId="doutor"`
- confidence: 0.95
- 評価: `evidenceQuote="ドトール"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-0bd1f193c2`、不要なら無視

#### `mem-66859dab09` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-d-pointcard-aeon-hikkoshi-10", storeId="jalannet"`
- confidence: 0.95
- 評価: `evidenceQuote="じゃらんnet"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-66859dab09`、不要なら無視

#### `mem-e03bc7749f` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-4x-max", storeId="takashimaya"`
- confidence: 0.90
- 評価: `evidenceQuote="高島屋 ポイント 最大 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-e03bc7749f`、不要なら無視

#### `mem-41f36cda16` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x", storeId="aoki"`
- confidence: 0.90
- 評価: `evidenceQuote="AOKI ポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-41f36cda16`、不要なら無視

#### `mem-124ff47776` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x", storeId="aoki"`
- confidence: 0.90
- 評価: `evidenceQuote="AOKI ポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-124ff47776`、不要なら無視

#### `mem-1131bb4f19` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x", storeId="poplar"`
- confidence: 0.90
- 評価: `evidenceQuote="ポプラグループ ポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-1131bb4f19`、不要なら無視

#### `mem-de6f00fb0f` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x", storeId="poplar"`
- confidence: 0.90
- 評価: `evidenceQuote="ポプラグループ ポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-de6f00fb0f`、不要なら無視

#### `mem-894003e4df` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x", storeId="megane-salon-look"`
- confidence: 0.90
- 評価: `evidenceQuote="メガネサロンルック・ルックコンタクト ポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-894003e4df`、不要なら無視

#### `mem-1f2c7f5052` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x", storeId="megane-salon-look"`
- confidence: 0.90
- 評価: `evidenceQuote="メガネサロンルック・ルックコンタクト ポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-1f2c7f5052`、不要なら無視

</details>

### ⏸ storeAdditionsDisabled (store 追加は手動キュレ運用) (157 件)
理由: 新規 store の追加は cron では行わない方針 (キャンペーン情報の獲得に注力するため)。ここに列挙された店舗は cron が検知した「seed に未追加の店舗候補」で、必要な場合は手動で seed-data-stores.ts に追加 → 次回 cron で関連 membership が自動取り込まれる。全件無視も OK (リストとしての参照のみ)。

<details><summary>展開</summary>

#### `sto-808c504e75` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="adam-et-rope-wild-life-tailor", name="ADAM ET ROPÉ WILD LIFE TAILOR", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="ADAM ET ROPÉ WILD LIFE TAILOR ワイルドでありながらも伝統的なテーラードも備えた、洋品店のスタイルのコンセプトショップ 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-808c504e75`、不要なら無視

#### `sto-826356a8ea` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="aibook", name="アイブック", category="書店"`
- confidence: 0.90
- 評価: `evidenceQuote="アイブック 札幌市／福住店にてご利用いただけます 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-826356a8ea`、不要なら無視

#### `sto-2f783994c3` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="aland", name="ALAND", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="ALAND and STポイント・楽天ポイントが両方使える！貯まる！ 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-2f783994c3`、不要なら無視

#### `sto-e4a47431d1` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="alex", name="アレックス", category="アミューズメント施設"`
- confidence: 0.90
- 評価: `evidenceQuote="アレックス ポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-e4a47431d1`、不要なら無視

#### `sto-63d1693ec8` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="amano", name="(株)アマノ", category="書店"`
- confidence: 0.90
- 評価: `evidenceQuote="(株)アマノ 浜松市[三方原・有玉・アクト北・入野・高丘] 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-63d1693ec8`、不要なら無視

#### `sto-64c4c8ce48` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="american-square-matsuya", name="アメリカンスクエア マツヤ", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="アメリカンスクエア マツヤ メンズ、レディス、キッズのジーンズ、カジュアル衣料及び服飾雑貨、小物の販売 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-64c4c8ce48`、不要なら無視

#### `sto-32b88d8502` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="amica", name="アミカ", category="業務用スーパー"`
- confidence: 0.90
- 評価: `evidenceQuote="アミカ 業務用食品スーパーアミカは「プロの選択をすべてのひとに」お届けします。 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-32b88d8502`、不要なら無視

#### `sto-784c52eaab` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="and-st", name="and ST", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="and ST and STポイント・楽天ポイントが両方使える！貯まる！ 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-784c52eaab`、不要なら無視

#### `sto-6c67ac06f4` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="andemiu", name="Andemiu", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="Andemiu and STポイント・楽天ポイントが両方使える！貯まる！ 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-6c67ac06f4`、不要なら無視

#### `sto-5f5bbf9bd8` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="app-store", name="App Store", category="ネットサービスのみ"`
- confidence: 0.90
- 評価: `evidenceQuote="App Store ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-5f5bbf9bd8`、不要なら無視

#### `sto-31dc0492a6` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="apple-glim", name="あっぷるぐりむ", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="あっぷるぐりむ 【富山エリア限定】自家製ハンバーグが人気のファミリーレストラン。創業以来変わらぬ味を 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-31dc0492a6`、不要なら無視

#### `sto-bd5ea383c4` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="arc-master", name="アークマスター", category="ホームセンター"`
- confidence: 0.90
- 評価: `evidenceQuote="アークマスター ⼯具、作業⾐料、住宅設備機器、建築資材を提供する建築現場のプロが必要とする専門店 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-bd5ea383c4`、不要なら無視

#### `sto-41884f3fcb` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="attack-5", name="アタック5", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="アタック5 ヤックスポイントと楽天ポイントが両方使える！貯まる！ 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-41884f3fcb`、不要なら無視

#### `sto-678848b786` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="avanty-book-center", name="アバンティブックセンター", category="書店"`
- confidence: 0.90
- 評価: `evidenceQuote="アバンティブックセンター 大阪府泉佐野市／南海泉佐野店でご利用いただけます 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-678848b786`、不要なら無視

#### `sto-126e5de19a` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="banda-record", name="バンダレコード", category="音楽・映像"`
- confidence: 0.90
- 評価: `evidenceQuote="バンダレコード 音楽と映像の総合ショップ。ポイントや割引などお得なサービス実施中！ 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-126e5de19a`、不要なら無視

#### `sto-df9cbb4949` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="beauty-art-respect", name="-Beauty&Art- Respect", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="-Beauty&Art- Respect 山口県下関市／卓越した高度な技術と高い知識力でお悩み改善致します 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-df9cbb4949`、不要なら無視

#### `sto-b8bcf0b8dc` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="beaver-pro", name="ビーバープロ", category="ホームセンター"`
- confidence: 0.90
- 評価: `evidenceQuote="ビーバープロ 職人さんの店 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-b8bcf0b8dc`、不要なら無視

#### `sto-fd3db9a358` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="beavertozan", name="ビーバートザン", category="ホームセンター"`
- confidence: 0.90
- 評価: `evidenceQuote="ビーバートザン オールラウンドな品揃えのホームセンター 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-fd3db9a358`、不要なら無視

#### `sto-f4366f3456` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="bigmom", name="BIGMOM", category="スーパー"`
- confidence: 0.90
- 評価: `evidenceQuote="BIGMOM 「よい物を毎日、どこよりも安く。」買い物かごいっぱいの安さをお届けします！ 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-f4366f3456`、不要なら無視

#### `sto-ad54f8d4c4` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="biople", name="Biople", category="化粧品"`
- confidence: 0.90
- 評価: `evidenceQuote="Biople GGMポイント、楽天ポイントカードのどちらもポイントが使える！貯まる！ 貯まる アプリ利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-ad54f8d4c4`、不要なら無視

_他 137 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟡 lowConfidence (139 件)
理由: Gemini の評価で confidence < 0.9。エビデンス不明瞭・推測混入の疑い。

<details><summary>展開</summary>

#### `car-0cfb9b6f75` — `updateField/cards` `mufg-card` from `mufg-card-global-point`
- フィールド: `defaultRate`
- 変更: `0.100%` → `0.500%`
- confidence: 0.25
- 評価: `evidenceQuote="1千円につき1ポイントを約定支払日に本会員に付与します。"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視 (この type/field は sync:approve 未対応)

#### `mem-7e986fd57e` — `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="drug-eleven"`
- notes: ページに還元率の記載がないため、一般的な200円につき1ポイントを仮定。
- confidence: 0.00
- 評価: `evidenceQuote="ハックドラッグ"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-7e986fd57e`、不要なら無視

#### `mem-f0e816ff9f` — `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="kinyaku-yakkyoku"`
- notes: ページに還元率の記載がないため、一般的な200円につき1ポイントを仮定。
- confidence: 0.00
- 評価: `evidenceQuote="金光薬品"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-f0e816ff9f`、不要なら無視

#### `mem-64d99e5521` — `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="towashiya-yakkyoku"`
- notes: ページに還元率の記載がないため、一般的な200円につき1ポイントを仮定。
- confidence: 0.00
- 評価: `evidenceQuote="とをしや薬局"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-64d99e5521`、不要なら無視

#### `mem-ad82af313b` — `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="marue-drug"`
- notes: ページに還元率の記載がないため、一般的な200円につき1ポイントを仮定。
- confidence: 0.00
- 評価: `evidenceQuote="マルエドラッグ"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-ad82af313b`、不要なら無視

#### `mem-5af2ef339a` — `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="yodoya-drug"`
- notes: ページに還元率の記載がないため、一般的な200円につき1ポイントを仮定。
- confidence: 0.00
- 評価: `evidenceQuote="よどやドラッグ"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-5af2ef339a`、不要なら無視

#### `mem-0117ae60c8` — `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="kokumin"`
- notes: ページに還元率の記載がないため、一般的な200円につき1ポイントを仮定。
- confidence: 0.00
- 評価: `evidenceQuote="コクミン"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-0117ae60c8`、不要なら無視

#### `mem-54aed22d55` — `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="fuku-yakuhin"`
- notes: ページに還元率の記載がないため、一般的な200円につき1ポイントを仮定。
- confidence: 0.00
- 評価: `evidenceQuote="ふく薬品"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-54aed22d55`、不要なら無視

#### `mem-5b1e8fcf3e` — `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="super-drug-himawari"`
- notes: ページに還元率の記載がないため、一般的な200円につき1ポイントを仮定。
- confidence: 0.00
- 評価: `evidenceQuote="スーパードラッグひまわり"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-5b1e8fcf3e`、不要なら無視

#### `mem-953a87d317` — `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="bbon"`
- notes: ページに還元率の記載がないため、一般的な200円につき1ポイントを仮定。
- confidence: 0.00
- 評価: `evidenceQuote="B.B.ON"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-953a87d317`、不要なら無視

#### `mem-04dce996df` — `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="narcis"`
- notes: ページに還元率の記載がないため、一般的な200円につき1ポイントを仮定。
- confidence: 0.00
- 評価: `evidenceQuote="NARCIS"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-04dce996df`、不要なら無視

#### `mem-944c2d72f2` — `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="color-studio-masaya"`
- notes: ページに還元率の記載がないため、一般的な200円につき1ポイントを仮定。
- confidence: 0.00
- 評価: `evidenceQuote="COLOR STUDIO・MASAYA"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-944c2d72f2`、不要なら無視

#### `mem-b173931a4a` — `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="zoomore"`
- notes: ページに還元率の記載がないため、一般的な200円につき1ポイントを仮定。
- confidence: 0.00
- 評価: `evidenceQuote="Zoomore"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-b173931a4a`、不要なら無視

#### `mem-d05334a98b` — `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="autobacs"`
- notes: ページに還元率の記載がないため、一般的な200円につき1ポイントを仮定。
- confidence: 0.00
- 評価: `evidenceQuote="オートバックス"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-d05334a98b`、不要なら無視

#### `mem-87b102af73` — `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="steak-gusto"`
- notes: ページに還元率の記載がないため、一般的な200円につき1ポイントを仮定。
- confidence: 0.00
- 評価: `evidenceQuote="ステーキガスト"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-87b102af73`、不要なら無視

#### `mem-b7adf412d8` — `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="karaage-karayoshi"`
- notes: ページに還元率の記載がないため、一般的な200円につき1ポイントを仮定。
- confidence: 0.00
- 評価: `evidenceQuote="から好し"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-b7adf412d8`、不要なら無視

#### `mem-72840d52e0` — `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="musashino-mori-coffee"`
- notes: ページに還元率の記載がないため、一般的な200円につき1ポイントを仮定。
- confidence: 0.00
- 評価: `evidenceQuote="むさしの森珈琲"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-72840d52e0`、不要なら無視

#### `mem-5f76073a93` — `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="uoya-michi"`
- notes: ページに還元率の記載がないため、一般的な200円につき1ポイントを仮定。
- confidence: 0.00
- 評価: `evidenceQuote="魚屋路"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-5f76073a93`、不要なら無視

#### `mem-33f8f7e7c9` — `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="grazie-gardens"`
- notes: ページに還元率の記載がないため、一般的な200円につき1ポイントを仮定。
- confidence: 0.00
- 評価: `evidenceQuote="グラッチェガーデンズ"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-33f8f7e7c9`、不要なら無視

#### `mem-063df99491` — `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="la-ohana"`
- notes: ページに還元率の記載がないため、一般的な200円につき1ポイントを仮定。
- confidence: 0.00
- 評価: `evidenceQuote="ラ・オハナ"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-063df99491`、不要なら無視

_他 119 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 idCollision (21 件)
理由: 新規追加だが既存 ID またはストア名と衝突。重複の可能性あり。

<details><summary>展開</summary>

#### `pro-5675f3083c` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-d-pointcard-matsukiyo-cocokara-04", name="dポイントカード マツモトキヨシ・ココカラファインでおトクに", rate=0.04, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2026-06-01", validTo="2026-06-30"`
- confidence: 0.95
- 評価: `evidenceQuote="dポイントカード マツモトキヨシ・ココカラファインでおトクに 2026/06/01～2026/06/30"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-5675f3083c`、不要なら無視

#### `pro-8eac7559ad` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-d-pointcard-doutor-07", name="dポイントカード ドトール dポイント7周年キャンペーン", rate=0.07, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2026-06-01", validTo="2026-06-30"`
- confidence: 0.95
- 評価: `evidenceQuote="dポイントカード 【ドトール】dポイント7周年キャンペーン 2026/06/01～2026/06/30"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-8eac7559ad`、不要なら無視

#### `pro-bb452087c9` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-d-pay-ja-zennoh-a-coop-05", name="ジョイフル本田ｄ払い５倍キャンペーン", rate=0.05, currencyId="d-pt", paymentAppId="pa-d-pay", bonusType="addOn", validFrom="2026-06-01", validTo="2026-06-30"`
- confidence: 0.95
- 評価: `evidenceQuote="店舗限定 ジョイフル本田ｄ払い５倍キャンペーン 2026/06/01～2026/06/30"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-bb452087c9`、不要なら無視

#### `pro-70d42ad51b` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-d-pointcard-welpark-05-thu-sat-sun", name="dポイントカード 毎週木・土・日はウェルパークがおトク！", rate=0.05, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2026-06-01", validTo="2026-06-30", recurringWeekdays=[0,4,6]`
- confidence: 0.95
- 評価: `evidenceQuote="dポイントカード 毎週木・土・日はウェルパークがおトク！ 2026/06/01～2026/06/30"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-70d42ad51b`、不要なら無視

#### `pro-469581b4ee` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-d-pay-welpark-05", name="ウェルパーク｜もれなく5％還元キャンペーン", rate=0.05, currencyId="d-pt", paymentAppId="pa-d-pay", bonusType="addOn", validFrom="2026-06-08", validTo="2026-06-14"`
- confidence: 0.95
- 評価: `evidenceQuote="店舗限定 ウェルパーク｜もれなく5％還元キャンペーン 2026/06/08～2026/06/14"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-469581b4ee`、不要なら無視

#### `pro-d924fd8532` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-d-pointcard-aeon-hikkoshi-10", name="【じゃらんnet】もれなく10％還元！", rate=0.1, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2026-06-01"`
- confidence: 0.95
- 評価: `evidenceQuote="dポイントカード 【じゃらんnet】もれなく10％還元！ 2026/06/01～"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-d924fd8532`、不要なら無視

#### `pro-8eafea6d4b` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-d-pointcard-jalannet-rentacar-10", name="【じゃらんレンタカー】もれなく10％還元！", rate=0.1, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2026-06-01"`
- confidence: 0.95
- 評価: `evidenceQuote="dポイントカード 【じゃらんレンタカー】もれなく10％還元！ 2026/06/01～"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-8eafea6d4b`、不要なら無視

#### `pro-783838abb4` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-10x", name="J-POINT パートナー (10倍)", rate=0.1, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10 倍 / Uber ポイント 10 倍 / S.RIDE ポイント 10 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-783838abb4`、不要なら無視

#### `pro-45f1ea857b` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-10x", name="J-POINT パートナー (Gold 10倍)", rate=0.05, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10 倍 プレミアムでおトク / Uber ポイント 10 倍 プレミアムでおトク / S.RIDE ポイント 10 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-45f1ea857b`、不要なら無視

#### `pro-322e8e38aa` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-6x", name="J-POINT パートナー (6倍)", rate=0.06, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="オリックスレンタカー ポイント 6 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-322e8e38aa`、不要なら無視

#### `pro-756458810a` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-6x", name="J-POINT パートナー (Gold 6倍)", rate=0.03, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="オリックスレンタカー ポイント 6 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-756458810a`、不要なら無視

#### `pro-29cac7042d` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-5x", name="J-POINT パートナー (5倍)", rate=0.05, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="洋服の青山 ポイント 5 倍 / AOKI ポイント 5 倍 / ポプラグループ ポイント 5 倍 / はるやまチェーン ポイント 5 倍 / メガネサロンルック・ルックコンタクト ポイント 5 倍 / アレックス ポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-29cac7042d`、不要なら無視

#### `pro-3fc4a124fc` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-5x", name="J-POINT パートナー (Gold 5倍)", rate=0.025, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="洋服の青山 ポイント 5 倍 / AOKI ポイント 5 倍 / ポプラグループ ポイント 5 倍 / はるやまチェーン ポイント 5 倍 / メガネサロンルック・ルックコンタクト ポイント 5 倍 / アレックス ポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-3fc4a124fc`、不要なら無視

#### `pro-a9a15ecbd0` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-5x-max", name="J-POINT パートナー (最大5倍)", rate=0.05, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。国内宿泊オンライン予約、JCBトラベルは登録不要。"`
- confidence: 0.90
- 評価: `evidenceQuote="App Store ポイント 最大 5 倍 / Google Play ポイント 最大 5 倍 / U-NEXT ポイント 最大 5 倍 / コミックシーモア ポイント 最大 5 倍 / Hulu ポイント 最大 5 倍 / 国内宿泊オンラ"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-a9a15ecbd0`、不要なら無視

#### `pro-45bdd2bc05` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-5x-max", name="J-POINT パートナー (Gold 最大5倍)", rate=0.025, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。国内宿泊オンライン予約、JCBトラベルは登録不要。"`
- confidence: 0.90
- 評価: `evidenceQuote="App Store ポイント 最大 5 倍 プレミアムでおトク / Google Play ポイント 最大 5 倍 プレミアムでおトク / U-NEXT ポイント 最大 5 倍 プレミアムでおトク / コミックシーモア ポイント 最大 5 "`
- 対応案: 取り込むなら `npm run sync:approve -- pro-45bdd2bc05`、不要なら無視

#### `pro-2b46ed8256` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-4x-max", name="J-POINT パートナー (最大4倍)", rate=0.04, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="高島屋 ポイント 最大 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-2b46ed8256`、不要なら無視

#### `sto-2042d0f9bc` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="alpen", name="アルペン", category="スポーツ用品"`
- confidence: 0.90
- 評価: `evidenceQuote="アルペン 野球・サッカー・フィットネスなどのスポーツ用品、カジュアル用品を提供 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-2042d0f9bc`、不要なら無視

#### `sto-c84bf6de64` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="american-drug-fuji", name="アメリカンドラッグ", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="アメリカンドラッグ 富士薬品ドラッグストアグループのセイムスポイント・楽天ポイントが両方貯まる！ 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c84bf6de64`、不要なら無視

#### `sto-17424dba3b` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="ari-san-mark-no-hikkoshi-sha", name="アリさんマークの引越社", category="引越し"`
- confidence: 0.90
- 評価: `evidenceQuote="アリさんマークの引越社 「お客様本位」のサービスで、確かな満足をご提供します 貯まる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-17424dba3b`、不要なら無視

#### `sto-34bd70133b` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="james", name="ジェームス", category="車・バイク"`
- confidence: 0.90
- 評価: `evidenceQuote="ジェームス 楽天ポイントとジェームスポイントがダブルで貯まる 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-34bd70133b`、不要なら無視

_他 1 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 excludedCategory (21 件)
理由: Policy B: 対象外カテゴリ (金融/保険/医療/ギャンブル等)。自動追加しない。

<details><summary>展開</summary>

#### `sto-f99fef9eee` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="century21-housegate", name="センチュリー21ハウスゲート株式会社", category="不動産"`
- confidence: 0.90
- 評価: `evidenceQuote="センチュリー21ハウスゲート株式会社 【不動産売買・賃貸】仲介手数料のお支払いでお得にポイ活♪ 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-f99fef9eee`、不要なら無視

#### `sto-54a9653a22` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="fudosan-no-big", name="不動産のビッグ", category="不動産"`
- confidence: 0.90
- 評価: `evidenceQuote="不動産のビッグ 仲介手数料に対してポイント付与致します。※旭川中央店、旭川大町店でご利用頂けます。 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-54a9653a22`、不要なら無視

#### `sto-a016a76623` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="fudosan-ryutsu-center", name="株式会社不動産流通センター", category="不動産"`
- confidence: 0.90
- 評価: `evidenceQuote="株式会社不動産流通センター 賃貸 Century21加盟店 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-a016a76623`、不要なら無視

#### `sto-a505d7dfb9` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="k-dreams", name="Kドリームス", category="ギャンブル"`
- confidence: 0.90
- 評価: `evidenceQuote="Kドリームス 全国の競輪場の車券がネットで買える。ライブ映像者・競輪記者の予想も無料で配信 貯まる 使える"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-a505d7dfb9`、不要なら無視

#### `sto-a057d27d59` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="kobe-fudosan-realty", name="神戸不動産リアルティ", category="不動産"`
- confidence: 0.90
- 評価: `evidenceQuote="神戸不動産リアルティ 神戸・明石の新築・中古戸建・マンション・土地・収益物件の購入・売却は気軽にご相談下さい 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-a057d27d59`、不要なら無視

#### `sto-50b57f91b9` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="nagoya-keirin", name="名古屋けいりん", category="ギャンブル"`
- confidence: 0.90
- 評価: `evidenceQuote="名古屋けいりん 特別観覧席、ロイヤルルーム入場で使える！貯まる！ 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-50b57f91b9`、不要なら無視

#### `sto-b8542a7778` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="rakuten-bank", name="楽天銀行", category="金融"`
- confidence: 0.90
- 評価: `evidenceQuote="楽天銀行 楽天銀行(旧イーバンク銀行)は日本最大級のインターネット銀行です 貯まる ネット限定"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-b8542a7778`、不要なら無視

#### `sto-951e0a84df` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="rakuten-beauty", name="楽天ビューティ", category="ネットサービス"`
- confidence: 0.90
- 評価: `evidenceQuote="楽天ビューティ 美容室・美容院・ヘアサロン検索なら楽天ビューティ 貯まる 使える ネット限定"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-951e0a84df`、不要なら無視

#### `sto-80c461deb3` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="rakuten-card", name="楽天カード", category="金融"`
- confidence: 0.90
- 評価: `evidenceQuote="楽天カード 年会費無料の楽天カードは顧客満足度12年連続No.1 貯まる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-80c461deb3`、不要なら無視

#### `sto-cb39bd3c23` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="rakuten-fudosan", name="楽天不動産", category="ネットサービス"`
- confidence: 0.90
- 評価: `evidenceQuote="楽天不動産 不動産や住宅購入の情報、賃貸をお探しなら楽天不動産におまかせ！ 貯まる ネット限定"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-cb39bd3c23`、不要なら無視

#### `sto-c151612650` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="rakuten-insight", name="楽天インサイト", category="ネットサービス"`
- confidence: 0.90
- 評価: `evidenceQuote="楽天インサイト 登録して アンケートに答えると、楽天ポイントがたまります 貯まる ネット限定"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c151612650`、不要なら無視

#### `sto-639eede80f` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="rakuten-keiba", name="楽天競馬", category="ギャンブル"`
- confidence: 0.90
- 評価: `evidenceQuote="楽天競馬 地方競馬全場のオッズ・予想・投票・レース映像を提供 貯まる ネット限定"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-639eede80f`、不要なら無視

#### `sto-41a6363f95` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="rakuten-life", name="楽天生命", category="金融"`
- confidence: 0.90
- 評価: `evidenceQuote="楽天生命 お申し込みはネット、通販、対面で！ご相談はお電話でも受け付けています 貯まる ネット限定"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-41a6363f95`、不要なら無視

#### `sto-d23dea5690` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="rakuten-magazine", name="楽天マガジン", category="ネットサービス"`
- confidence: 0.90
- 評価: `evidenceQuote="楽天マガジン 約200誌いろいろなジャンルの雑誌が読み放題！ 貯まる 使える ネット限定"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-d23dea5690`、不要なら無視

#### `sto-8738c11d03` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="rakuten-music", name="楽天ミュージック", category="ネットサービス"`
- confidence: 0.90
- 評価: `evidenceQuote="楽天ミュージック 最新のJ-POPや人気の洋楽など数千万曲が聴き放題の音楽アプリ 貯まる 使える ネット限定"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-8738c11d03`、不要なら無視

#### `sto-8e43b8a100` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="rakuten-securities", name="楽天証券", category="金融"`
- confidence: 0.90
- 評価: `evidenceQuote="楽天証券 ネット証券・オンライン証券なら楽天証券！ 貯まる ネット限定"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-8e43b8a100`、不要なら無視

#### `sto-d45a09e09c` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="sogikai-kan-tia", name="葬儀会館ティア", category="葬儀"`
- confidence: 0.90
- 評価: `evidenceQuote="葬儀会館ティア 日本で一番「ありがとう」と言われる葬儀社を目指しております 貯まる アプリ利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-d45a09e09c`、不要なら無視

#### `sto-e3923f7ad7` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="tachikawa-keirin", name="たちかわ競輪", category="ギャンブル"`
- confidence: 0.90
- 評価: `evidenceQuote="たちかわ競輪 来場でポイントが貯まります！その他イベントも多数実施中 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-e3923f7ad7`、不要なら無視

#### `sto-45164d5cd8` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="taisei-zoen", name="大成造園", category="サービス"`
- confidence: 0.90
- 評価: `evidenceQuote="大成造園 企業理念【すべてを笑顔に】安心安全な庭空間を造り、笑顔あふれる暮らしを提供します。 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-45164d5cd8`、不要なら無視

#### `sto-d0b715e124` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="tokyo-oval-keio-kaku", name="東京オーバル京王閣", category="ギャンブル"`
- confidence: 0.90
- 評価: `evidenceQuote="東京オーバル京王閣 来場でポイントが貯まります！その他イベントも多数実施中 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-d0b715e124`、不要なら無視

_他 1 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 selfReportedExclusion (1 件)
理由: Gemini 自身が evidenceQuote で「対象外」「見送り」「記載なし」等と表明。Gemini の良心 hallucination 抑制が機能した結果。基本は無視で OK。

<details><summary>展開</summary>

#### `sto-8ac957c110` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="aoyagi-shoten", name="青柳書店", category="書店"`
- confidence: 0.90
- 評価: `evidenceQuote="青柳書店 熊本県／本店(小国町)・阿蘇店(阿蘇市) ※一部対象外の商品・サービスもございます。 貯まる 使える アプリ利用可 楽天ペイ残高利用可"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-8ac957c110`、不要なら無視

</details>

### ⚫ userBlocked (3 件)
理由: seed-blocklist.ts でユーザが除外指定済み。意図した除外であれば無視してよい。

<details><summary>展開</summary>

#### `sto-f8ca4a520e` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="princess-cruises", name="プリンセスクルーズ", category="旅行"`
- confidence: 0.90
- 評価: `evidenceQuote="プリンセスクルーズ 充実の施設、世界の美食、きめ細やかなサービスで、夢のようなクルーズ旅行をご提供します。 貯まる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-f8ca4a520e`、不要なら無視

#### `sto-838693edea` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="rakuten-gora", name="楽天GORA", category="ゴルフ"`
- confidence: 0.90
- 評価: `evidenceQuote="楽天GORA 日本最大級のゴルフ場予約サービスです 貯まる 使える"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-838693edea`、不要なら無視

#### `sto-ded8618d60` — `addRecord/stores` from `v-point-partners`
- 内容: `id="vip-liner", name="VIPライナー（高速バス）", category="交通"`
- confidence: 0.81
- 評価: `evidenceQuote="VIPライナー（高速バス） VIPライナー（高速バス）"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-ded8618d60`、不要なら無視

</details>

## 操作
- **取り込みたい項目がある場合 (半自動)**: ローカルでこのブランチを checkout し、`npm run sync:approve -- <ID> [<ID> ...]` を実行 (ID は各項目見出しの先頭)。seed-additions.ts への反映・queue からの除去・REVIEW_QUEUE.md の再生成まで自動。`npm run sync:approve -- --list` で一覧表示。実行後 `npm test && npm run build` を確認して commit
- このまま **merge** すると、要レビュー項目を読み込んだ証拠として記録されるだけ (実体 seed 変更はなし)
- 手動キュレートしたい場合は、このブランチに追加 commit してから merge
- 不要なら **close** で次週まで保留