# 📋 週次マスタ同期: 要レビュー項目

(自動生成 2026-11-12。merge 前に項目を確認してください。)

## サマリ
- 要レビュー: 252 件
- ソース別: d-pay-campaigns=13, epos-tamaru-market=96, jcb-jpoint=137, paypay-campaigns=3, smbc-vpoint-up=3
- 主な理由: idCollision=19, unsupportedRateClaim=3, campaignRateCeiling=2, missingStoreBody=148, missingProgramBody=11, storeAdditionsDisabled=65, unknownCategory=4

## 項目 (理由別)

### 🔴 unsupportedRateClaim (rate 根拠なし、hallucination 疑い) (3 件)
理由: rate が抽出されたが evidenceQuote に数値根拠 (% / 倍 / 円→pt 等) が見当たらない。「最大◯◯ポイントプレゼント」のような曖昧な文言から Gemini が rate を hallucinate した疑い。元 URL を直接確認の上採否を判断。

<details><summary>展開</summary>

#### `pro-7178261d83` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-d-pay-joyfulhonda-5x-2026-11", name="ジョイフル本田ｄ払い５倍キャンペーン", scope="member-stores", rate=0.05, currencyId="d-pt", paymentAppId="pa-d-pay", bonusType="addOn", validFrom="2026-11-01", validTo="2026-11-30", requiresEntry=true`
- confidence: 0.95
- 評価: `evidenceQuote="店舗限定 ジョイフル本田ｄ払い５倍キャンペーン 2026/11/01～2026/11/30"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-7178261d83`、不要なら無視

#### `pro-f3a2ca0375` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-d-pointcard-welpark-weekly-2026-11", name="毎週木・土・日はウェルパークがおトク！", scope="member-stores", rate=0.05, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2026-11-01", validTo="2026-11-30", recurringWeekdays=[0,4,6], requiresEntry=true`
- confidence: 0.95
- 評価: `evidenceQuote="dポイントカード 毎週木・土・日はウェルパークがおトク！ 2026/11/01～2026/11/30"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-f3a2ca0375`、不要なら無視

#### `pro-031a4dd14c` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-d-pointcard-matsukiyo-cocokara-kaoh-10percent-2026-11", name="マツキヨ・ココカラで花王商品購入がおトク", scope="member-stores", rate=0.1, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2026-11-01", validTo="2026-11-30"`
- confidence: 0.95
- 評価: `evidenceQuote="dポイントカード マツキヨ・ココカラで花王商品購入がおトク 2026/11/01～2026/11/30"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-031a4dd14c`、不要なら無視

</details>

### 🔴 campaignRateCeiling (還元率 10% 以上、または 5% 超で上限なし) (2 件)
理由: キャンペーンの還元率が 10% 以上 (境界を含む)、または 5% を超えるのに月上限 (monthlyCapAmountYen) が無い。高率キャンペーンは上限・対象商品付きがほとんどで、record のまま取り込むと全額に高率が乗る過大表示になる。campaign 由来の membership の率上書き (overrideRate) が 5% を超える場合もここ。**承認すると record がそのまま全額に乗る** (上限・対象商品・店舗・帰属を record では表現できない)。原則は見送る。取り込むなら手書き seed で上限・限定・帰属を表現する。`npm run sync:approve` で承認するには `--accept-risk` が必要。

<details><summary>展開</summary>

#### `pro-cc817955fd` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-d-pointcard-matsukiyo-cocokara-10percent-2026-11", name="マツキヨ・ココカラ｜もれなく＋10％還元中", scope="member-stores", rate=0.1, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2026-11-01", validTo="2026-11-30"`
- confidence: 0.95
- 評価: `evidenceQuote="dポイントカード マツキヨ・ココカラ｜もれなく＋10％還元中 2026/11/01～2026/11/30"`
- 判定詳細: rate 10% ≥ 10%
- 対応案: 原則見送り (承認すると record がそのまま全額に乗る)。取り込むなら手書き seed で上限・限定・帰属を表現する。どうしても record のまま取り込むなら `npm run sync:approve -- pro-cc817955fd --accept-risk`

#### `pro-0e4cc1bdac` — `addRecord/programs` from `paypay-campaigns`
- 内容: `id="prog-paypay-fancl-supplement-2026-11", name="ファンケル サプリメント対象商品 最大10%還元キャンペーン", scope="member-stores", rate=0.1, currencyId="paypay", paymentAppId="pa-paypay", bonusType="addOn", validFrom="2026-11-01", validTo="2026-11-30"`
- confidence: 0.95
- 評価: `evidenceQuote="ファンケルサプリメント対象商品の購入でPayPayポイントが最大10％戻ってくるキャンペーン 2026/11/1 〜 11/30"`
- 判定詳細: rate 10% ≥ 10%
- 対応案: 原則見送り (承認すると record がそのまま全額に乗る)。取り込むなら手書き seed で上限・限定・帰属を表現する。どうしても record のまま取り込むなら `npm run sync:approve -- pro-0e4cc1bdac --accept-risk`

</details>

### 🟠 missingStoreBody (store 本体なし membership) (148 件)
理由: membership 提案だが、参照先 store 本体が seed 未存在 + 同 run の auto 候補にも無い (例: category cap で deferred された場合)。そのまま auto-merge すると孤児 membership (店名解決できない、UI で店舗未表示) が seed に残るため降格。store 本体を手動キュレートで追加するか、次回 cron で store 側が auto 化されるのを待つ。

<details><summary>展開</summary>

#### `mem-5209161970` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-d-pay-welpark-5percent-2026-11", storeId="welpark"`
- confidence: 0.95
- 評価: `evidenceQuote="店舗限定 ウェルパーク｜もれなく5％還元キャンペーン"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-5209161970`、不要なら無視

#### `mem-5650ea1593` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-d-pay-joyfulhonda-5x-2026-11", storeId="joyfulhonda"`
- confidence: 0.95
- 評価: `evidenceQuote="店舗限定 ジョイフル本田ｄ払い５倍キャンペーン"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-5650ea1593`、不要なら無視

#### `mem-bebf78f6bc` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-d-pointcard-welpark-weekly-2026-11", storeId="welpark"`
- confidence: 0.95
- 評価: `evidenceQuote="dポイントカード 毎週木・土・日はウェルパークがおトク！"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-bebf78f6bc`、不要なら無視

#### `mem-ab599772ec` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="trip-com"`
- confidence: 0.90
- 評価: `evidenceQuote="Trip.com（航空券） エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-ab599772ec`、不要なら無視

#### `mem-fe63c5068b` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="rakuten-travel"`
- confidence: 0.90
- 評価: `evidenceQuote="楽天トラベル【楽天市場】 エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-fe63c5068b`、不要なら無視

#### `mem-23eee49a66` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="nitori"`
- confidence: 0.90
- 評価: `evidenceQuote="ニトリ 家具・インテリアの通販サ... エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-23eee49a66`、不要なら無視

#### `mem-89f78be4ff` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="qoo10"`
- confidence: 0.90
- 評価: `evidenceQuote="Qoo10 エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-89f78be4ff`、不要なら無視

#### `mem-d9e0ea4bd9` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="jalan-net"`
- confidence: 0.90
- 評価: `evidenceQuote="じゃらんnet エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-d9e0ea4bd9`、不要なら無視

#### `mem-815fc52ae7` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="orbis"`
- confidence: 0.90
- 評価: `evidenceQuote="オルビス エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-815fc52ae7`、不要なら無視

#### `mem-37af6dc4ba` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="cainz"`
- confidence: 0.90
- 評価: `evidenceQuote="カインズ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-37af6dc4ba`、不要なら無視

#### `mem-69f80f01ea` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="new-balance-outlet"`
- confidence: 0.90
- 評価: `evidenceQuote="ニューバランス公式オンラインアウトレット エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-69f80f01ea`、不要なら無視

#### `mem-d84000d667` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="jre-mall"`
- confidence: 0.90
- 評価: `evidenceQuote="JRE MALL ショッピング エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-d84000d667`、不要なら無視

#### `mem-6c94b6b32f` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="oisix"`
- confidence: 0.90
- 評価: `evidenceQuote="Oisix（おいしっくす） エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-6c94b6b32f`、不要なら無視

#### `mem-e9c3f7f782` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="jal-pak-domestic"`
- confidence: 0.90
- 評価: `evidenceQuote="ジャルパック 国内ツアー エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-e9c3f7f782`、不要なら無視

#### `mem-9499285ad1` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="hotel-air-package"`
- confidence: 0.90
- 評価: `evidenceQuote="【航空券＋宿泊の同時予約】旅行予... エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-9499285ad1`、不要なら無視

#### `mem-baeeea5e6e` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="world-online-store"`
- confidence: 0.90
- 評価: `evidenceQuote="WORLD ONLINE STO... エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-baeeea5e6e`、不要なら無視

#### `mem-dcc93c43d5` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-4x", storeId="daiso-net-store"`
- confidence: 0.90
- 評価: `evidenceQuote="ダイソーネットストア エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-dcc93c43d5`、不要なら無視

#### `mem-bfa126c454` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-4x", storeId="at-cosme-shopping"`
- confidence: 0.90
- 評価: `evidenceQuote="@cosme SHOPPING エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-bfa126c454`、不要なら無視

#### `mem-e845207726` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-4x", storeId="jal-pak-overseas"`
- confidence: 0.90
- 評価: `evidenceQuote="ジャルパック 海外ツアー エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-e845207726`、不要なら無視

#### `mem-c3cb74c72c` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-5x", storeId="house-of-rose"`
- confidence: 0.90
- 評価: `evidenceQuote="ハウスオブローゼ オンラインショップ本店／化粧品 エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-c3cb74c72c`、不要なら無視

_他 128 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 missingProgramBody (program 本体なし membership) (11 件)
理由: membership 提案だが、参照先 program 本体が seed 未存在 + 同 run の auto 候補にも無い (proposePrograms は新規 program に必ず idCollision を付けるため、program 本体は同 run では auto に上がらず needsReview に行く)。そのまま membership だけ auto-merge すると BenefitProgram が無く還元計算できない孤児が seed に残るため降格。program 本体側の needsReview を先に承認 → 手動で seed に program 追加 → 次回 cron で membership 側も自動的に通る運用。

<details><summary>展開</summary>

#### `mem-52c8fac356` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-d-pointcard-matsukiyo-cocokara-kaoh-10percent-2026-11", storeId="matsukiyo"`
- confidence: 0.95
- 評価: `evidenceQuote="dポイントカード マツキヨ・ココカラで花王商品購入がおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-52c8fac356`、不要なら無視

#### `mem-dd5bb4b5d7` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-d-pointcard-matsukiyo-cocokara-kaoh-10percent-2026-11", storeId="cocokara"`
- confidence: 0.95
- 評価: `evidenceQuote="dポイントカード マツキヨ・ココカラで花王商品購入がおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-dd5bb4b5d7`、不要なら無視

#### `mem-7c3d1ebdbe` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-d-pointcard-matsukiyo-cocokara-10percent-2026-11", storeId="matsukiyo"`
- confidence: 0.95
- 評価: `evidenceQuote="dポイントカード マツキヨ・ココカラ｜もれなく＋10％還元中"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-7c3d1ebdbe`、不要なら無視

#### `mem-305071f65b` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-d-pointcard-matsukiyo-cocokara-10percent-2026-11", storeId="cocokara"`
- confidence: 0.95
- 評価: `evidenceQuote="dポイントカード マツキヨ・ココカラ｜もれなく＋10％還元中"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-305071f65b`、不要なら無視

#### `mem-41f36cda16` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x", storeId="aoki"`
- confidence: 0.90
- 評価: `evidenceQuote="AOKI 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-41f36cda16`、不要なら無視

#### `mem-124ff47776` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x", storeId="aoki"`
- confidence: 0.90
- 評価: `evidenceQuote="AOKI 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-124ff47776`、不要なら無視

#### `mem-1131bb4f19` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x", storeId="poplar"`
- confidence: 0.90
- 評価: `evidenceQuote="ポプラグループ 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-1131bb4f19`、不要なら無視

#### `mem-de6f00fb0f` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x", storeId="poplar"`
- confidence: 0.90
- 評価: `evidenceQuote="ポプラグループ 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-de6f00fb0f`、不要なら無視

#### `mem-894003e4df` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x", storeId="megane-salon-look"`
- confidence: 0.90
- 評価: `evidenceQuote="メガネサロンルック 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-894003e4df`、不要なら無視

#### `mem-1f2c7f5052` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x", storeId="megane-salon-look"`
- confidence: 0.90
- 評価: `evidenceQuote="メガネサロンルック 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-1f2c7f5052`、不要なら無視

#### `mem-1b795abe39` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-restaurant", storeId="conv-7eleven"`
- confidence: 0.90
- 評価: `evidenceQuote="条件達成でセブン-イレブン最大11%還元"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-1b795abe39`、不要なら無視

</details>

### ⏸ storeAdditionsDisabled (store 追加は手動キュレ運用) (65 件)
理由: 新規 store の追加は cron では行わない方針 (キャンペーン情報の獲得に注力するため)。ここに列挙された店舗は cron が検知した「seed に未追加の店舗候補」で、必要な場合は手動で seed-data-stores.ts に追加 → 次回 cron で関連 membership が自動取り込まれる。全件無視も OK (リストとしての参照のみ)。

<details><summary>展開</summary>

#### `sto-21796ca39d` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="adidas-online", name="adidas ONLINE STORE", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="adidas ONLINE SH... エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-21796ca39d`、不要なら無視

#### `sto-e084c4f2be` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="aeon-shop", name="おうちでイオン イオンショップ", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="おうちでイオン イオンショップ エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-e084c4f2be`、不要なら無視

#### `sto-8bf65fad74` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="agoda", name="アゴダ", category="ホテル"`
- confidence: 0.90
- 評価: `evidenceQuote="国内・海外のホテル予約ならアゴダ エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-8bf65fad74`、不要なら無視

#### `sto-357dc6a9f3` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="alex", name="アレックス", category="雑貨"`
- confidence: 0.90
- 評価: `evidenceQuote="アレックス 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-357dc6a9f3`、不要なら無視

#### `sto-884966b366` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="at-cosme-shopping", name="@cosme SHOPPING", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="@cosme SHOPPING エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-884966b366`、不要なら無視

#### `sto-f6d01b9bac` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="baribari-aobadori", name="バリバリ青葉通り店", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="バリバリ青葉通り店 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-f6d01b9bac`、不要なら無視

#### `sto-cc9bedb1fe` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="belluna-catalog", name="カタログ通販ベルーナ", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="カタログ通販ベルーナ（Bellu... エポスポイント 10 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-cc9bedb1fe`、不要なら無視

#### `sto-0f61959fea` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="belluna-gourmet", name="ベルーナグルメ", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="ベルーナグルメ エポスポイント 13 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-0f61959fea`、不要なら無視

#### `sto-4082f1ea86` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="blue-bottle-coffee", name="ブルーボトルコーヒー", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="ブルーボトルコーヒー公式オンラインストア エポスポイント 6 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-4082f1ea86`、不要なら無視

#### `sto-c3245340fa` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="bonaventura", name="BONAVENTURA", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="BONAVENTURA エポスポイント 17 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c3245340fa`、不要なら無視

#### `sto-b58c5b080f` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="bridgestone-sports-online-store", name="ブリヂストンスポーツオンラインストア", category="スポーツ"`
- confidence: 0.90
- 評価: `evidenceQuote="ブリヂストンスポーツオンラインストア 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-b58c5b080f`、不要なら無視

#### `sto-3d69e6e7af` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="budget-rent-a-car", name="バジェット・レンタカー", category="レンタカー"`
- confidence: 0.90
- 評価: `evidenceQuote="バジェット・レンタカー 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-3d69e6e7af`、不要なら無視

#### `sto-cb74ee08cc` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="cainz", name="カインズ", category="ホームセンター"`
- confidence: 0.90
- 評価: `evidenceQuote="カインズ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-cb74ee08cc`、不要なら無視

#### `sto-aedc829b06` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="daishin", name="ダイシン", category="ホームセンター"`
- confidence: 0.90
- 評価: `evidenceQuote="ダイシン 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-aedc829b06`、不要なら無視

#### `sto-c28f9d935a` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="daiso-net-store", name="ダイソーネットストア", category="雑貨"`
- confidence: 0.90
- 評価: `evidenceQuote="ダイソーネットストア エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c28f9d935a`、不要なら無視

#### `sto-a90d5329ae` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="dax", name="ダックス", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="ダックス 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-a90d5329ae`、不要なら無視

#### `sto-5a2aa9c008` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="dhc-online", name="DHCオンラインショップ", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="DHCオンラインショップ エポスポイント 9 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-5a2aa9c008`、不要なら無視

#### `sto-7a21cc2744` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="domino-pizza", name="ドミノ・ピザ", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="ドミノ・ピザ 20 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-7a21cc2744`、不要なら無視

#### `sto-ea499fbac8` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="dr-ci-labo", name="ドクターシーラボ", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="ドクターシーラボ公式オンラインシ... エポスポイント 30 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-ea499fbac8`、不要なら無視

#### `sto-b529f294bf` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="dynabook-direct", name="Dynabook Direct", category="家電量販店"`
- confidence: 0.90
- 評価: `evidenceQuote="Dynabook Direct エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-b529f294bf`、不要なら無視

_他 45 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 idCollision (19 件)
理由: 新規追加だが既存 ID またはストア名と衝突。重複の可能性あり。

<details><summary>展開</summary>

#### `pro-085e291f4f` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-d-pay-welpark-5percent-2026-11", name="ウェルパーク｜もれなく5％還元キャンペーン", scope="member-stores", rate=0.05, currencyId="d-pt", paymentAppId="pa-d-pay", bonusType="addOn", validFrom="2026-11-02", validTo="2026-11-08", requiresEntry=true`
- confidence: 0.95
- 評価: `evidenceQuote="店舗限定 ウェルパーク｜もれなく5％還元キャンペーン 2026/11/02～2026/11/08"`
- 判定詳細: validTo=2026-11-08 は終了済み
- 対応案: 取り込むなら `npm run sync:approve -- pro-085e291f4f`、不要なら無視

#### `pro-159fc7f359` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-5x", name="たまるマーケット (5倍)", scope="member-stores", rate=0.025, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 5倍 (総倍率、EPOS 基本 0.5% × 5 = 実効 2.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="ハウスオブローゼ オンラインショップ本店／化粧品 エポスポイント 5 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-159fc7f359`、不要なら無視

#### `pro-a59c6d0396` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-6x", name="たまるマーケット (6倍)", scope="member-stores", rate=0.03, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 6倍 (総倍率、EPOS 基本 0.5% × 6 = 実効 3.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。ゴールド/プラチナ会員は+3倍(9倍)となるショップあり。"`
- confidence: 0.90
- 評価: `evidenceQuote="ブルーボトルコーヒー公式オンラインストア エポスポイント 6 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-a59c6d0396`、不要なら無視

#### `pro-efb18a181a` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-7x", name="たまるマーケット (7倍)", scope="member-stores", rate=0.035, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 7倍 (総倍率、EPOS 基本 0.5% × 7 = 実効 3.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。ゴールド/プラチナ会員は+2倍(9倍)となるショップあり。"`
- confidence: 0.90
- 評価: `evidenceQuote="SHEIN エポスポイント 7 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-efb18a181a`、不要なら無視

#### `pro-9ab948b862` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-9x", name="たまるマーケット (9倍)", scope="member-stores", rate=0.045, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 9倍 (総倍率、EPOS 基本 0.5% × 9 = 実効 4.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。ゴールド/プラチナ会員は+1倍(10倍)となるショップあり。"`
- confidence: 0.90
- 評価: `evidenceQuote="DHCオンラインショップ エポスポイント 9 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-9ab948b862`、不要なら無視

#### `pro-fd531bc9ab` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-10x", name="たまるマーケット (10倍)", scope="member-stores", rate=0.05, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 10倍 (総倍率、EPOS 基本 0.5% × 10 = 実効 5.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。ゴールド/プラチナ会員は+4倍(14倍)または+7倍(17倍)となるショップあり。"`
- confidence: 0.90
- 評価: `evidenceQuote="旅行予約のエ... エポスポイント 10 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-fd531bc9ab`、不要なら無視

#### `pro-6e37df42b1` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-13x", name="たまるマーケット (13倍)", scope="member-stores", rate=0.065, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 13倍 (総倍率、EPOS 基本 0.5% × 13 = 実効 6.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。ゴールド/プラチナ会員は+1倍(14倍)となるショップあり。"`
- confidence: 0.90
- 評価: `evidenceQuote="資生堂オンラインストア エポスポイント 13 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-6e37df42b1`、不要なら無視

#### `pro-3db70efd78` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-14x", name="たまるマーケット (14倍)", scope="member-stores", rate=0.07, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 14倍 (総倍率、EPOS 基本 0.5% × 14 = 実効 7.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="ランコム エポスポイント 14 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-3db70efd78`、不要なら無視

#### `pro-1239a57fbf` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-17x", name="たまるマーケット (17倍)", scope="member-stores", rate=0.085, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 17倍 (総倍率、EPOS 基本 0.5% × 17 = 実効 8.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。ゴールド/プラチナ会員は+3倍(20倍)となるショップあり。"`
- confidence: 0.90
- 評価: `evidenceQuote="イヴ・サンローラン・ボーテ公式オ... エポスポイント 17 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-1239a57fbf`、不要なら無視

#### `pro-d7bbaebfa1` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-18x", name="たまるマーケット (18倍)", scope="member-stores", rate=0.09, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 18倍 (総倍率、EPOS 基本 0.5% × 18 = 実効 9.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="山田養蜂場オンラインショップ エポスポイント 18 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-d7bbaebfa1`、不要なら無視

#### `pro-c201b9833d` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-21x", name="たまるマーケット (21倍)", scope="member-stores", rate=0.105, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 21倍 (総倍率、EPOS 基本 0.5% × 21 = 実効 10.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="e87.com（千趣会 イイハナ... エポスポイント 21 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-c201b9833d`、不要なら無視

#### `pro-95dfd4ebfb` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-25x", name="たまるマーケット (25倍)", scope="member-stores", rate=0.125, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 25倍 (総倍率、EPOS 基本 0.5% × 25 = 実効 12.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="洋服の青山オンラインストア エポスポイント 25 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-95dfd4ebfb`、不要なら無視

#### `pro-d25ca5de81` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-30x", name="たまるマーケット (30倍)", scope="member-stores", rate=0.15, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 30倍 (総倍率、EPOS 基本 0.5% × 30 = 実効 15.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="Adobe Creative Cloud エポスポイント 30 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-d25ca5de81`、不要なら無視

#### `pro-3e40282d1f` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-5x", name="J-POINT パートナー (5倍)", scope="member-stores", rate=0.03, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="AOKI 5 倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-3e40282d1f`、不要なら無視

#### `pro-2ff399b9a9` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-5x", name="J-POINT パートナー (Gold プレミアム 5倍)", scope="member-stores", rate=0.025, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。プレミアムカード対象。"`
- confidence: 0.90
- 評価: `evidenceQuote="AOKI 5 倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-2ff399b9a9`、不要なら無視

#### `pro-157596bab6` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-10x", name="J-POINT パートナー (10倍)", scope="member-stores", rate=0.055, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="Uber 10 倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-157596bab6`、不要なら無視

#### `pro-0f34af0231` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-10x", name="J-POINT パートナー (Gold プレミアム 10倍)", scope="member-stores", rate=0.05, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。プレミアムカード対象。"`
- confidence: 0.90
- 評価: `evidenceQuote="タクシーアプリ『GO』 10 倍 プレミアムでおトク"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-0f34af0231`、不要なら無視

#### `pro-8ea53de79a` — `addRecord/programs` from `smbc-vpoint-up`
- 内容: `id="prog-smbc-touch-conveni-restaurant", name="SMBC タッチ決済対象コンビニ・飲食店 +7.5%", scope="member-stores", rate=0.075, currencyId="v-pt", cardIds=["smbc-v","olive"], paymentAppId="pa-visa-touch", bonusType="primary", description="対象のコンビニ・飲食店でスマホのVisaのタッチ決済・Mastercardタッチ決済を利用で+7.5%還元。", officialUrl="https://www.smbc.co.jp/kojin/vpoint-up/", conditions="スマホのVisaのタッチ決済・Mastercardタッチ決済またはモバイルオーダー利用時のみ。一部の店舗および指定のポイント還元にならない場合や、一定金額を超えるとタッチ決済ではなく挿入決済となり対象外になる場合あり。"`
- confidence: 0.81
- 評価: `evidenceQuote="B 対象店舗でスマホのVisaのタッチ決済・Mastercard®タッチ決済またはモバイルオーダーを利用＋7.5％還元"`
- 判定詳細: 新規 program (extractor=ongoing-program は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-8ea53de79a`、不要なら無視

#### `pro-964378e4cd` — `addRecord/programs` from `smbc-vpoint-up`
- 内容: `id="prog-olive-eraberu-tokuten", name="Olive 選べる特典 Vポイントアッププログラム +1%", scope="all-stores", rate=0.01, currencyId="v-pt", cardIds=["olive"], bonusType="addOn", description="Oliveアカウントの選べる特典で「Vポイントアッププログラム＋1％」を選択すると適用。", officialUrl="https://www.smbc.co.jp/kojin/vpoint-up/", conditions="Oliveアカウントの選べる特典で「Vポイントアッププログラム＋1％」をご選択。Olive プラチナプリファード会員は2つ選択で＋2％還元。"`
- confidence: 0.81
- 評価: `evidenceQuote="Oliveアカウントの選べる特典 ＋1％ Oliveアカウントの選べる特典 ※ で「Vポイントアッププログラム＋1％」をご選択"`
- 判定詳細: 新規 program (extractor=ongoing-program は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-964378e4cd`、不要なら無視

</details>

### 🟠 unknownCategory (語彙外カテゴリ) (4 件)
理由: 新規店舗の category が店舗カテゴリの語彙 (`src/state/seed-categories.ts`) に無い、または未設定。語彙外の店は自動追加されない (chain-promote 等の昇格の対象にもならない)。既存語彙の表記揺れなら seed-categories.ts の `EXTRACTED_CATEGORY_ALIASES` に alias を、新しい業態なら `STORE_CATEGORIES` に語彙を足す PR を出す (次回 cron から再判定される)。この項目を `npm run sync:approve` でそのまま承認すると、seed 契約 (store の category は語彙内) で CI が落ちる。取り込むなら category を語彙内に直して手書き seed へ。

<details><summary>展開</summary>

#### `sto-5cefcbd8ec` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="adobe-creative-cloud", name="Adobe Creative Cloud", category="ネットサービスのみ"`
- confidence: 0.90
- 評価: `evidenceQuote="Adobe Creative Cloud エポスポイント 30 倍"`
- 対応案: 表記揺れなら `src/state/seed-categories.ts` の EXTRACTED_CATEGORY_ALIASES に alias を、新しい業態なら STORE_CATEGORIES に語彙を足す PR を出す (次回 cron で再判定)。この項目を sync:approve でそのまま承認すると seed 契約で CI が落ちる。不要なら無視

#### `sto-f0cdd46ed1` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="daimaru-fujii-central", name="大丸藤井セントラル", category="文房具・雑貨"`
- confidence: 0.90
- 評価: `evidenceQuote="大丸藤井セントラル 2 倍"`
- 対応案: 表記揺れなら `src/state/seed-categories.ts` の EXTRACTED_CATEGORY_ALIASES に alias を、新しい業態なら STORE_CATEGORIES に語彙を足す PR を出す (次回 cron で再判定)。この項目を sync:approve でそのまま承認すると seed 契約で CI が落ちる。不要なら無視

#### `sto-05c660ec86` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="etsufugo-shopping-center-pal", name="江釣子ショッピングセンター・パル", category="ショッピングモール"`
- confidence: 0.90
- 評価: `evidenceQuote="江釣子ショッピングセンター・パル 3 倍"`
- 対応案: 表記揺れなら `src/state/seed-categories.ts` の EXTRACTED_CATEGORY_ALIASES に alias を、新しい業態なら STORE_CATEGORIES に語彙を足す PR を出す (次回 cron で再判定)。この項目を sync:approve でそのまま承認すると seed 契約で CI が落ちる。不要なら無視

#### `sto-93bac13ebf` — `addRecord/stores` from `paypay-campaigns`
- 内容: `id="fancl", name="ファンケル", category="化粧品・美容"`
- confidence: 0.95
- 評価: `evidenceQuote="ファンケルサプリメント対象商品の購入"`
- 対応案: 表記揺れなら `src/state/seed-categories.ts` の EXTRACTED_CATEGORY_ALIASES に alias を、新しい業態なら STORE_CATEGORIES に語彙を足す PR を出す (次回 cron で再判定)。この項目を sync:approve でそのまま承認すると seed 契約で CI が落ちる。不要なら無視

</details>

## 操作
- **取り込みたい項目がある場合 (半自動)**: ローカルでこのブランチを checkout し、`npm run sync:approve -- <ID> [<ID> ...]` を実行 (ID は各項目見出しの先頭)。seed-additions.ts への反映・queue からの除去・REVIEW_QUEUE.md の再生成まで自動。`npm run sync:approve -- --list` で一覧表示。実行後 `npm test && npm run build` を確認して commit
- 🔴 untargetedProgram / campaignConditional / campaignRateCeiling / targetMismatch / storeNameMismatch は承認すると record がそのまま全額に乗るため原則見送り。承認には `--accept-risk` が必要
- このまま **merge** すると、要レビュー項目を読み込んだ証拠として記録されるだけ (実体 seed 変更はなし)
- 手動キュレートしたい場合は、このブランチに追加 commit してから merge
- 不要なら **close** で次週まで保留