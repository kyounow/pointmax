# 📋 週次マスタ同期: 要レビュー項目

(自動生成 2026-11-26。merge 前に項目を確認してください。)

## サマリ
- 要レビュー: 275 件
- ソース別: d-pay-campaigns=18, epos-tamaru-market=89, jcb-jpoint=127, smbc-vpoint-up=41
- 主な理由: campaignConditional=1, campaignRateCeiling=2, unsupportedRateClaim=3, idCollision=25, missingProgramBody=46, lowConfidence=7, missingStoreBody=129, storeAdditionsDisabled=57, unknownCategory=5

## 項目 (理由別)

### 🔴 unsupportedRateClaim (rate 根拠なし、hallucination 疑い) (3 件)
理由: rate が抽出されたが evidenceQuote に数値根拠 (% / 倍 / 円→pt 等) が見当たらない。「最大◯◯ポイントプレゼント」のような曖昧な文言から Gemini が rate を hallucinate した疑い。元 URL を直接確認の上採否を判断。

<details><summary>展開</summary>

#### `pro-8e1d65e86c` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-dpay-joyfulhonda-x5-2026-11", name="ジョイフル本田ｄ払い５倍キャンペーン", scope="member-stores", rate=0.05, currencyId="d-pt", paymentAppId="pa-d-pay", bonusType="primary", validFrom="2026-11-01", validTo="2026-11-30"`
- confidence: 0.95
- 評価: `evidenceQuote="店舗限定 ジョイフル本田ｄ払い５倍キャンペーン 2026/11/01～2026/11/30 エントリー不要"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-8e1d65e86c`、不要なら無視

#### `pro-dc2cf0d8ce` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-dpointcard-welpark-x-weekdays-2026-11", name="ウェルパーク 毎週木・土・日はおトク", scope="member-stores", rate=0.01, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2026-11-01", validTo="2026-11-30", recurringWeekdays=[0,4,6]`
- confidence: 0.85
- 評価: `evidenceQuote="dポイントカード 毎週木・土・日はウェルパークがおトク！ 2026/11/01～2026/11/30 エントリー不要"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-dc2cf0d8ce`、不要なら無視

#### `pro-a83aac691f` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-dpay-karaoketakahashi-2026-11", name="カラオケタカハシ d払い還元キャンペーン", scope="member-stores", rate=0.01, currencyId="d-pt", paymentAppId="pa-d-pay", bonusType="addOn", validFrom="2026-11-01", validTo="2026-11-30", requiresEntry=true`
- confidence: 0.77
- 評価: `evidenceQuote="店舗限定 カラオケタカハシd払い還元キャンペーン！ 2026/11/01～2026/11/30 エントリー受付中"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-a83aac691f`、不要なら無視

</details>

### 🔴 campaignRateCeiling (還元率 10% 以上、または 5% 超で上限なし) (2 件)
理由: キャンペーンの還元率が 10% 以上 (境界を含む)、または 5% を超えるのに月上限 (monthlyCapAmountYen) が無い。高率キャンペーンは上限・対象商品付きがほとんどで、record のまま取り込むと全額に高率が乗る過大表示になる。campaign 由来の membership の率上書き (overrideRate) が 5% を超える場合もここ。**承認すると record がそのまま全額に乗る** (上限・対象商品・店舗・帰属を record では表現できない)。原則は見送る。取り込むなら手書き seed で上限・限定・帰属を表現する。`npm run sync:approve` で承認するには `--accept-risk` が必要。

<details><summary>展開</summary>

#### `pro-382d5eceea` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-dpointcard-matsukiyo-cocokarafine-x10-2026-11", name="マツキヨ・ココカラ もれなく＋10％還元", scope="member-stores", rate=0.1, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2026-11-01", validTo="2026-11-30", requiresEntry=true`
- confidence: 0.95
- 評価: `evidenceQuote="dポイントカード マツキヨ・ココカラ｜もれなく＋10％還元中 2026/11/01～2026/11/30 終了間近エントリー受付中"`
- 判定詳細: rate 10% ≥ 10%
- 対応案: 原則見送り (承認すると record がそのまま全額に乗る)。取り込むなら手書き seed で上限・限定・帰属を表現する。どうしても record のまま取り込むなら `npm run sync:approve -- pro-382d5eceea --accept-risk`

#### `pro-b56caffe61` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-dpointcard-kao-x10-2026-11", name="花王対象商品購入でもれなく＋10％還元", scope="member-stores", rate=0.1, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2026-11-01", validTo="2026-11-30", requiresEntry=true`
- confidence: 0.95
- 評価: `evidenceQuote="dポイントカード 花王対象商品購入でもれなく＋10％還元！ 2026/11/01～2026/11/30 エントリー受付中"`
- 判定詳細: rate 10% ≥ 10%
- 対応案: 原則見送り (承認すると record がそのまま全額に乗る)。取り込むなら手書き seed で上限・限定・帰属を表現する。どうしても record のまま取り込むなら `npm run sync:approve -- pro-b56caffe61 --accept-risk`

</details>

### 🔴 campaignConditional (条件付きキャンペーン: 最大 / 対象商品 / 店舗限定 等) (1 件)
理由: キャンペーンの名前・説明・条件・notes・evidence に条件文言 (最大 / 対象商品 / 一部 / 店舗限定 / 割引・クーポン / 新規・初回 / 年齢・学生 / 抽選・先着 / ネット・アプリ経由 等) か、ライフスタイル条件 (給与振込 / 住宅ローン / 投資 等) がある。membership の場合は evidence / notes に「一部」「最大」「オンライン」「モバイルオーダー」「○○限定」等がある。判定詳細の行に一致した語とフィールドを出している。**承認すると record がそのまま全額に乗る** (上限・対象商品・店舗・帰属を record では表現できない)。原則は見送る。取り込むなら手書き seed で上限・限定・帰属を表現する。`npm run sync:approve` で承認するには `--accept-risk` が必要。

<details><summary>展開</summary>

#### `pro-c603c29052` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-dpointcard-mosburger-x3-2026-11", name="モスバーガー 対象商品 dポイント3倍", scope="member-stores", rate=0.03, currencyId="d-pt", pointCardId="d-pointcard", bonusType="primary", validFrom="2026-11-11", validTo="2026-12-10", requiresEntry=true`
- confidence: 0.95
- 評価: `evidenceQuote="【モスバーガー】対象商品はdポイント3倍！ 2026/11/11～2026/12/10 エントリー受付中"`
- 判定詳細: 対象限定:「対象商品」@name
- 対応案: 原則見送り (承認すると record がそのまま全額に乗る)。取り込むなら手書き seed で上限・限定・帰属を表現する。どうしても record のまま取り込むなら `npm run sync:approve -- pro-c603c29052 --accept-risk`

</details>

### 🟠 missingStoreBody (store 本体なし membership) (129 件)
理由: membership 提案だが、参照先 store 本体が seed 未存在 + 同 run の auto 候補にも無い (例: category cap で deferred された場合)。そのまま auto-merge すると孤児 membership (店名解決できない、UI で店舗未表示) が seed に残るため降格。store 本体を手動キュレートで追加するか、次回 cron で store 側が auto 化されるのを待つ。

<details><summary>展開</summary>

#### `mem-dfef5c1825` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpay-joyfulhonda-x5-2026-11", storeId="joyful-honda"`
- confidence: 0.95
- 評価: `evidenceQuote="ジョイフル本田ｄ払い５倍キャンペーン"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-dfef5c1825`、不要なら無視

#### `mem-ab523ae6db` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpointcard-welpark-x-weekdays-2026-11", storeId="welpark"`
- confidence: 0.95
- 評価: `evidenceQuote="ウェルパークがおトク！"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-ab523ae6db`、不要なら無視

#### `mem-a3a658a2a1` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpay-karaoketakahashi-2026-11", storeId="karaoke-takahashi"`
- confidence: 0.95
- 評価: `evidenceQuote="カラオケタカハシd払い還元キャンペーン！"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-a3a658a2a1`、不要なら無視

#### `mem-89f78be4ff` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="qoo10"`
- confidence: 0.90
- 評価: `evidenceQuote="Qoo10 エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-89f78be4ff`、不要なら無視

#### `mem-43ff49eebe` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-7x", storeId="shein"`
- confidence: 0.90
- 評価: `evidenceQuote="SHEIN エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-43ff49eebe`、不要なら無視

#### `mem-7327e30f39` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="gu"`
- confidence: 0.90
- 評価: `evidenceQuote="ジーユー オンラインストア エポsポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-7327e30f39`、不要なら無視

#### `mem-dd32902f86` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-7x", storeId="agoda"`
- confidence: 0.90
- 評価: `evidenceQuote="国内・海外のホテル予約ならアゴダ エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-dd32902f86`、不要なら無視

#### `mem-fe63c5068b` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="rakuten-travel"`
- confidence: 0.90
- 評価: `evidenceQuote="楽天トラベル【楽天市場】 エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-fe63c5068b`、不要なら無視

#### `mem-815fc52ae7` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="orbis"`
- confidence: 0.90
- 評価: `evidenceQuote="オルビス エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-815fc52ae7`、不要なら無視

#### `mem-c3e2d896c9` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-9x", storeId="dhc-online-shop"`
- confidence: 0.90
- 評価: `evidenceQuote="DHCオンラインショップ エポスポイント 9 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-c3e2d896c9`、不要なら無視

#### `mem-7a3685ffc6` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-4x", storeId="loccitane-online-shop"`
- confidence: 0.90
- 評価: `evidenceQuote="ロクシタンオンラインショップ エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-7a3685ffc6`、不要なら無視

#### `mem-e621c69b39` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="nitori-online-store"`
- confidence: 0.90
- 評価: `evidenceQuote="ニトリ 家具・インテリアの通販サイト【楽天市場】 エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-e621c69b39`、不要なら無視

#### `mem-dcc93c43d5` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-4x", storeId="daiso-net-store"`
- confidence: 0.90
- 評価: `evidenceQuote="ダイソーネットストア エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-dcc93c43d5`、不要なら無視

#### `mem-37af6dc4ba` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="cainz"`
- confidence: 0.90
- 評価: `evidenceQuote="カインズ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-37af6dc4ba`、不要なら無視

#### `mem-e800e35bcd` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-5x", storeId="keyuca-online-shop"`
- confidence: 0.90
- 評価: `evidenceQuote="KEYUCA オンラインショップ エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-e800e35bcd`、不要なら無視

#### `mem-036304b6f2` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-6x", storeId="agoda-activities"`
- confidence: 0.90
- 評価: `evidenceQuote="国内・海外の遊び・体験予約ならアゴダ エポスポイント 6 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-036304b6f2`、不要なら無視

#### `mem-f8c63425ab` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="agoda-flights"`
- confidence: 0.90
- 評価: `evidenceQuote="国内・海外の格安航空券予約ならアゴダ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-f8c63425ab`、不要なら無視

#### `mem-c17997df54` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="bcl-company-online"`
- confidence: 0.90
- 評価: `evidenceQuote="BCLカンパニー公式オンラインサイト エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-c17997df54`、不要なら無視

#### `mem-1293fe5fc2` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-9x", storeId="takami-official-online-shop"`
- confidence: 0.90
- 評価: `evidenceQuote="タカミ公式オンラインショップ エポスポイント 9 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-1293fe5fc2`、不要なら無視

#### `mem-69f80f01ea` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="new-balance-outlet"`
- confidence: 0.90
- 評価: `evidenceQuote="ニューバランス公式オンラインアウトレット エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-69f80f01ea`、不要なら無視

_他 109 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 missingProgramBody (program 本体なし membership) (46 件)
理由: membership 提案だが、参照先 program 本体が seed 未存在 + 同 run の auto 候補にも無い (proposePrograms は新規 program に必ず idCollision を付けるため、program 本体は同 run では auto に上がらず needsReview に行く)。そのまま membership だけ auto-merge すると BenefitProgram が無く還元計算できない孤児が seed に残るため降格。program 本体側の needsReview を先に承認 → 手動で seed に program 追加 → 次回 cron で membership 側も自動的に通る運用。

<details><summary>展開</summary>

#### `mem-e0a142b1a8` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpointcard-mosburger-x3-2026-11", storeId="mos-burger"`
- confidence: 0.95
- 評価: `evidenceQuote="【モスバーガー】"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-e0a142b1a8`、不要なら無視

#### `mem-326e28bd9c` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpointcard-matsukiyo-cocokarafine-x10-2026-11", storeId="matsukiyo"`
- confidence: 0.95
- 評価: `evidenceQuote="マツキヨ・ココカラ"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-326e28bd9c`、不要なら無視

#### `mem-5e98b9a26c` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpointcard-matsukiyo-cocokarafine-x10-2026-11", storeId="cocokara"`
- confidence: 0.95
- 評価: `evidenceQuote="マツキヨ・ココカラ"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-5e98b9a26c`、不要なら無視

#### `mem-25fb9dc34d` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpointcard-towerrecords-x10-2026-11", storeId="tower-records"`
- confidence: 0.95
- 評価: `evidenceQuote="【タワーレコード】"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-25fb9dc34d`、不要なら無視

#### `mem-41f36cda16` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x", storeId="aoki"`
- confidence: 0.90
- 評価: `evidenceQuote="AOKI ポイント 5倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-41f36cda16`、不要なら無視

#### `mem-124ff47776` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x", storeId="aoki"`
- confidence: 0.90
- 評価: `evidenceQuote="AOKI ポイント 5倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-124ff47776`、不要なら無視

#### `mem-1131bb4f19` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x", storeId="poplar"`
- confidence: 0.90
- 評価: `evidenceQuote="ポプラグループ ポイント 5倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-1131bb4f19`、不要なら無視

#### `mem-de6f00fb0f` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x", storeId="poplar"`
- confidence: 0.90
- 評価: `evidenceQuote="ポプラグループ ポイント 5倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-de6f00fb0f`、不要なら無視

#### `mem-894003e4df` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x", storeId="megane-salon-look"`
- confidence: 0.90
- 評価: `evidenceQuote="メガネサロンルック ポイント 5倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-894003e4df`、不要なら無視

#### `mem-1f2c7f5052` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x", storeId="megane-salon-look"`
- confidence: 0.90
- 評価: `evidenceQuote="メガネサロンルック ポイント 5倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-1f2c7f5052`、不要なら無視

#### `mem-650917c0da` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="seicomart"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-650917c0da`、不要なら無視

#### `mem-3a8935449a` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="conv-7eleven"`
- confidence: 0.90
- 評価: `evidenceQuote="セブン‐イレブン"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-3a8935449a`、不要なら無視

#### `mem-91e17377bb` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="poplar"`
- confidence: 0.90
- 評価: `evidenceQuote="ポプラ"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-91e17377bb`、不要なら無視

#### `mem-843cab8b35` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="conv-ministop"`
- confidence: 0.90
- 評価: `evidenceQuote="ミニストップ"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-843cab8b35`、不要なら無視

#### `mem-e5cf7a9170` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="conv-lawson"`
- confidence: 0.90
- 評価: `evidenceQuote="ローソン"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-e5cf7a9170`、不要なら無視

#### `mem-9bd4684150` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="mcdonalds"`
- confidence: 0.90
- 評価: `evidenceQuote="マクドナルド"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-9bd4684150`、不要なら無視

#### `mem-61856cad45` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="mos-burger"`
- confidence: 0.90
- 評価: `evidenceQuote="モスバーガー"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-61856cad45`、不要なら無視

#### `mem-905d4d2986` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="kfc"`
- confidence: 0.90
- 評価: `evidenceQuote="ケンタッキーフライドチキン"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-905d4d2986`、不要なら無視

#### `mem-3c0be52c15` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="yoshinoya"`
- confidence: 0.90
- 評価: `evidenceQuote="吉野家"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-3c0be52c15`、不要なら無視

#### `mem-8d9aea54d1` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="saizeriya"`
- confidence: 0.90
- 評価: `evidenceQuote="サイゼリヤ"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-8d9aea54d1`、不要なら無視

_他 26 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### ⏸ storeAdditionsDisabled (store 追加は手動キュレ運用) (57 件)
理由: 新規 store の追加は cron では行わない方針 (キャンペーン情報の獲得に注力するため)。ここに列挙された店舗は cron が検知した「seed に未追加の店舗候補」で、必要な場合は手動で seed-data-stores.ts に追加 → 次回 cron で関連 membership が自動取り込まれる。全件無視も OK (リストとしての参照のみ)。

<details><summary>展開</summary>

#### `sto-5371c31061` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="adidas-online-shop", name="adidas ONLINE SHOP", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="adidas ONLINE SHOP エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-5371c31061`、不要なら無視

#### `sto-c833ce18d7` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="aeon-shop", name="おうちでイオン イオンショップ", category="スーパー"`
- confidence: 0.90
- 評価: `evidenceQuote="おうちでイオン イオンショップ エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c833ce18d7`、不要なら無視

#### `sto-82ec3e5e7e` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="agoda", name="アゴダ", category="旅行代理店"`
- confidence: 0.90
- 評価: `evidenceQuote="国内・海外のホテル予約ならアゴダ エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-82ec3e5e7e`、不要なら無視

#### `sto-7956edf18a` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="agoda-activities", name="Agoda（遊び・体験予約）", category="旅行代理店"`
- confidence: 0.90
- 評価: `evidenceQuote="国内・海外の遊び・体験予約ならアゴダ エポスポイント 6 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-7956edf18a`、不要なら無視

#### `sto-80aaf86e6d` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="agoda-flights", name="Agoda（格安航空券予約）", category="旅行代理店"`
- confidence: 0.90
- 評価: `evidenceQuote="国内・海外の格安航空券予約ならアゴダ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-80aaf86e6d`、不要なら無視

#### `sto-7c1da97b2f` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="ana-travelers", name="ANAトラベラーズ", category="旅行代理店"`
- confidence: 0.90
- 評価: `evidenceQuote="ANAの国内・海外ツアー【ANAトラベラーズ】 エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-7c1da97b2f`、不要なら無視

#### `sto-25038ebb91` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="apa-hotels", name="アパホテルズ＆リゾーツ", category="ホテル"`
- confidence: 0.90
- 評価: `evidenceQuote="アパホテルズ＆リゾーツ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-25038ebb91`、不要なら無視

#### `sto-884966b366` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="at-cosme-shopping", name="@cosme SHOPPING", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="@cosme SHOPPING エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-884966b366`、不要なら無視

#### `sto-76c21c2254` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="bcl-company-online", name="BCLカンパニー公式オンラインサイト", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="BCLカンパニー公式オンラインサイト エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-76c21c2254`、不要なら無視

#### `sto-e018c92385` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="belluna", name="カタログ通販ベルーナ", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="カタログ通販ベルーナ（Belluna） エポスポイント 10 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-e018c92385`、不要なら無視

#### `sto-0f61959fea` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="belluna-gourmet", name="ベルーナグルメ", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="ベルーナグルメ エポスポイント 13 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-0f61959fea`、不要なら無視

#### `sto-1451201cfb` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="big-holiday-ski-snowboard", name="ビッグホリデースキーツアー＆スノボツアー予約サイト", category="旅行代理店"`
- confidence: 0.90
- 評価: `evidenceQuote="ビッグホリデースキーツアー＆スノボツアー予約サイト エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-1451201cfb`、不要なら無視

#### `sto-f0905c14be` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="blue-bottle-coffee-online", name="ブルーボトルコーヒー公式オンラインストア", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="ブルーボトルコーヒー公式オンラインストア エポスポイント 6 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-f0905c14be`、不要なら無視

#### `sto-ee15f50778` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="bridgestone-sports-online", name="ブリヂストンスポーツオンラインストア", category="スポーツ"`
- confidence: 0.90
- 評価: `evidenceQuote="ブリヂストンスポーツオンラインストア ポイント 2倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-ee15f50778`、不要なら無視

#### `sto-3d69e6e7af` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="budget-rent-a-car", name="バジェット・レンタカー", category="レンタカー"`
- confidence: 0.90
- 評価: `evidenceQuote="バジェット・レンタカー ポイント 3倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-3d69e6e7af`、不要なら無視

#### `sto-cb74ee08cc` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="cainz", name="カインズ", category="ホームセンター"`
- confidence: 0.90
- 評価: `evidenceQuote="カインズ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-cb74ee08cc`、不要なら無視

#### `sto-a50402e36f` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="cefien-online-shop", name="セフィーヌ 公式オンラインショップ", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="セフィーヌ 公式オンラインショップ エポスポイント 13 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-a50402e36f`、不要なら無視

#### `sto-8fc9f62e57` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="charles-keith-online-store", name="CHARLES & KEITH 公式オンラインストア", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="CHARLES & KEITH 公式オンラインストア エポスポイント 13 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-8fc9f62e57`、不要なら無視

#### `sto-c28f9d935a` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="daiso-net-store", name="ダイソーネットストア", category="雑貨"`
- confidence: 0.90
- 評価: `evidenceQuote="ダイソーネットストア エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c28f9d935a`、不要なら無視

#### `sto-45576713a9` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="dhc-online-shop", name="DHCオンラインショップ", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="DHCオンラインショップ エポスポイント 9 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-45576713a9`、不要なら無視

_他 37 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟡 lowConfidence (7 件)
理由: Gemini の評価で confidence < 0.9。エビデンス不明瞭・推測混入の疑い。

<details><summary>展開</summary>

#### `mem-166b15bd62` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpointcard-kao-x10-2026-11", storeId="matsukiyo"`
- confidence: 0.85
- 評価: `evidenceQuote="マツキヨ・ココカラで花王商品購入がおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-166b15bd62`、不要なら無視

#### `mem-398b8707df` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpointcard-kao-x10-2026-11", storeId="cocokara"`
- confidence: 0.85
- 評価: `evidenceQuote="マツキヨ・ココカラで花王商品購入がおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-398b8707df`、不要なら無視

#### `mem-97c49a3cf0` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-4x", storeId="takashimaya"`
- confidence: 0.81
- 評価: `evidenceQuote="高島屋 ポイント 最大 4倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-97c49a3cf0`、不要なら無視

#### `mem-7b6ea17a60` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x", storeId="domestic-hotel-online"`
- confidence: 0.81
- 評価: `evidenceQuote="国内宿泊オンライン予約 ポイント 最大 5倍 登録不要"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-7b6ea17a60`、不要なら無視

#### `mem-d78ca5490c` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x", storeId="domestic-hotel-online"`
- confidence: 0.81
- 評価: `evidenceQuote="国内宿泊オンライン予約 ポイント 最大 5倍 登録不要"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-d78ca5490c`、不要なら無視

#### `sto-d416fe2292` — `addRecord/stores` from `smbc-vpoint-up`
- 内容: `id="freshness-burger", name="フレッシュネスバーガー", category="飲食"`
- confidence: 0.81
- 評価: `evidenceQuote="フレッシュネスバーガー"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-d416fe2292`、不要なら無視

#### `sto-9116addd4d` — `addRecord/stores` from `smbc-vpoint-up`
- 内容: `id="gyoza-no-ohsho", name="餃子の王将", category="飲食"`
- confidence: 0.81
- 評価: `evidenceQuote="餃子の王将"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-9116addd4d`、不要なら無視

</details>

### 🟠 idCollision (25 件)
理由: 新規追加だが既存 ID またはストア名と衝突。重複の可能性あり。

<details><summary>展開</summary>

#### `pro-b99bc75ca4` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-dpointcard-towerrecords-x10-2026-11", name="タワーレコード 全員！dポイント10倍！", scope="member-stores", rate=0.1, currencyId="d-pt", pointCardId="d-pointcard", bonusType="primary", validFrom="2026-11-17", validTo="2026-11-25"`
- confidence: 0.95
- 評価: `evidenceQuote="dポイントカード 【タワーレコード】全員！dポイント10倍！ 2026/11/17～2026/11/25 エントリー不要"`
- 判定詳細: validTo=2026-11-25 は終了済み
- 対応案: 取り込むなら `npm run sync:approve -- pro-b99bc75ca4`、不要なら無視

#### `pro-159fc7f359` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-5x", name="たまるマーケット (5倍)", scope="member-stores", rate=0.025, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 5倍 (総倍率、EPOS 基本 0.5% × 5 = 実効 2.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="KEYUCA オンラインショップ エポスポイント 5 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-159fc7f359`、不要なら無視

#### `pro-7f13efa08f` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-6x", name="たまるマーケット (6倍)", scope="member-stores", rate=0.03, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 6倍 (総倍率、EPOS 基本 0.5% × 6 = 実効 3.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="Trip.com（ホテル） エポスポイント 6 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-7f13efa08f`、不要なら無視

#### `pro-8d11b6f8f7` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-7x", name="たまるマーケット (7倍)", scope="member-stores", rate=0.035, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 7倍 (総倍率、EPOS 基本 0.5% × 7 = 実効 3.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="SHEIN エポスポイント 7 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-8d11b6f8f7`、不要なら無視

#### `pro-48d84e014f` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-9x", name="たまるマーケット (9倍)", scope="member-stores", rate=0.045, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 9倍 (総倍率、EPOS 基本 0.5% × 9 = 実効 4.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="DHCオンラインショップ エポスポイント 9 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-48d84e014f`、不要なら無視

#### `pro-b93f33f93f` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-10x", name="たまるマーケット (10倍)", scope="member-stores", rate=0.05, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 10倍 (総倍率、EPOS 基本 0.5% × 10 = 実効 5.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="【海外・国内ホテル】旅行予約のエクスペディア エポスポイント 10 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-b93f33f93f`、不要なら無視

#### `pro-b54eb62188` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-13x", name="たまるマーケット (13倍)", scope="member-stores", rate=0.065, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 13倍 (総倍率、EPOS 基本 0.5% × 13 = 実効 6.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="資生堂オンラインストア エポスポイント 13 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-b54eb62188`、不要なら無視

#### `pro-3db70efd78` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-14x", name="たまるマーケット (14倍)", scope="member-stores", rate=0.07, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 14倍 (総倍率、EPOS 基本 0.5% × 14 = 実効 7.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="NARS公式オンラインショップ エポスポイント 14 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-3db70efd78`、不要なら無視

#### `pro-5648ef596b` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-17x", name="たまるマーケット (17倍)", scope="member-stores", rate=0.085, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 17倍 (総倍率、EPOS 基本 0.5% × 17 = 実効 8.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="メゾン マルジェラ フレグランス公式オンラインストア エポスポイント 17 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-5648ef596b`、不要なら無視

#### `pro-9e57013460` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-19x", name="たまるマーケット (19倍)", scope="member-stores", rate=0.095, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 19倍 (総倍率、EPOS 基本 0.5% × 19 = 実効 9.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="IPSA 公式サイト エポスポイント 19 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-9e57013460`、不要なら無視

#### `pro-c201b9833d` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-21x", name="たまるマーケット (21倍)", scope="member-stores", rate=0.105, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 21倍 (総倍率、EPOS 基本 0.5% × 21 = 実効 10.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="e87.com（千趣会 イイハナ） エポスポイント 21 倍"`
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
- 評価: `evidenceQuote="ドクターシーラボ公式オンラインショップ エポスポイント 30 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-d25ca5de81`、不要なら無視

#### `pro-5cc8d96a51` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-4x", name="J-POINT パートナー (4倍)", scope="member-stores", rate=0.025, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.81
- 評価: `evidenceQuote="高島屋 ポイント 最大 4倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-5cc8d96a51`、不要なら無視

#### `pro-3e40282d1f` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-5x", name="J-POINT パートナー (5倍)", scope="member-stores", rate=0.03, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.81
- 評価: `evidenceQuote="App Store ポイント 最大 5倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-3e40282d1f`、不要なら無視

#### `pro-3f124a921e` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-5x", name="J-POINT パートナー ゴールド (5倍)", scope="member-stores", rate=0.025, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。プレミアムカード特典適用。"`
- confidence: 0.90
- 評価: `evidenceQuote="App Store ポイント 最大 5倍 プレミアムでおトク"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-3f124a921e`、不要なら無視

#### `pro-2b5ee711ad` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-6x", name="J-POINT パートナー (6倍)", scope="member-stores", rate=0.035, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="オリックスレンタカー ポイント 6倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-2b5ee711ad`、不要なら無視

#### `pro-98c6177f39` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-6x", name="J-POINT パートナー ゴールド (6倍)", scope="member-stores", rate=0.03, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="オリックスレンタカー ポイント 6倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-98c6177f39`、不要なら無視

#### `pro-157596bab6` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-10x", name="J-POINT パートナー (10倍)", scope="member-stores", rate=0.055, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.81
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10倍 プレミアムでおトク"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-157596bab6`、不要なら無視

#### `pro-18d6e6cf7a` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-10x", name="J-POINT パートナー ゴールド (10倍)", scope="member-stores", rate=0.05, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。プレミアムカード特典適用。"`
- confidence: 0.90
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10倍 プレミアムでおトク"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-18d6e6cf7a`、不要なら無視

_他 5 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 unknownCategory (語彙外カテゴリ) (5 件)
理由: 新規店舗の category が店舗カテゴリの語彙 (`src/state/seed-categories.ts`) に無い、または未設定。語彙外の店は自動追加されない (chain-promote 等の昇格の対象にもならない)。既存語彙の表記揺れなら seed-categories.ts の `EXTRACTED_CATEGORY_ALIASES` に alias を、新しい業態なら `STORE_CATEGORIES` に語彙を足す PR を出す (次回 cron から再判定される)。この項目を `npm run sync:approve` でそのまま承認すると、seed 契約 (store の category は語彙内) で CI が落ちる。取り込むなら category を語彙内に直して手書き seed へ。

<details><summary>展開</summary>

#### `sto-5f5bbf9bd8` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="app-store", name="App Store", category="ネットサービスのみ"`
- confidence: 0.90
- 評価: `evidenceQuote="App Store ポイント 最大 5倍 プレミアムでおトク"`
- 対応案: 表記揺れなら `src/state/seed-categories.ts` の EXTRACTED_CATEGORY_ALIASES に alias を、新しい業態なら STORE_CATEGORIES に語彙を足す PR を出す (次回 cron で再判定)。この項目を sync:approve でそのまま承認すると seed 契約で CI が落ちる。不要なら無視

#### `sto-59370187d5` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="comic-cmoa", name="コミックシーモア", category="ネットサービスのみ"`
- confidence: 0.90
- 評価: `evidenceQuote="コミックシーモア ポイント 最大 5倍 プレミアムでおトク"`
- 対応案: 表記揺れなら `src/state/seed-categories.ts` の EXTRACTED_CATEGORY_ALIASES に alias を、新しい業態なら STORE_CATEGORIES に語彙を足す PR を出す (次回 cron で再判定)。この項目を sync:approve でそのまま承認すると seed 契約で CI が落ちる。不要なら無視

#### `sto-58b391ef08` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="disney-plus", name="ディズニープラス", category="ネットサービスのみ"`
- confidence: 0.90
- 評価: `evidenceQuote="ディズニープラス ポイント 20倍"`
- 対応案: 表記揺れなら `src/state/seed-categories.ts` の EXTRACTED_CATEGORY_ALIASES に alias を、新しい業態なら STORE_CATEGORIES に語彙を足す PR を出す (次回 cron で再判定)。この項目を sync:approve でそのまま承認すると seed 契約で CI が落ちる。不要なら無視

#### `sto-8ff761d47d` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="google-play", name="Google Play", category="ネットサービスのみ"`
- confidence: 0.90
- 評価: `evidenceQuote="Google Play ポイント 最大 5倍 プレミアムでおトク"`
- 対応案: 表記揺れなら `src/state/seed-categories.ts` の EXTRACTED_CATEGORY_ALIASES に alias を、新しい業態なら STORE_CATEGORIES に語彙を足す PR を出す (次回 cron で再判定)。この項目を sync:approve でそのまま承認すると seed 契約で CI が落ちる。不要なら無視

#### `sto-836173dec4` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="hulu", name="Hulu", category="ネットサービスのみ"`
- confidence: 0.90
- 評価: `evidenceQuote="Hulu ポイント 最大 5倍 プレミアムでおトク"`
- 対応案: 表記揺れなら `src/state/seed-categories.ts` の EXTRACTED_CATEGORY_ALIASES に alias を、新しい業態なら STORE_CATEGORIES に語彙を足す PR を出す (次回 cron で再判定)。この項目を sync:approve でそのまま承認すると seed 契約で CI が落ちる。不要なら無視

</details>

## 操作
- **取り込みたい項目がある場合 (半自動)**: ローカルでこのブランチを checkout し、`npm run sync:approve -- <ID> [<ID> ...]` を実行 (ID は各項目見出しの先頭)。seed-additions.ts への反映・queue からの除去・REVIEW_QUEUE.md の再生成まで自動。`npm run sync:approve -- --list` で一覧表示。実行後 `npm test && npm run build` を確認して commit
- 🔴 untargetedProgram / campaignConditional / campaignRateCeiling / targetMismatch / storeNameMismatch は承認すると record がそのまま全額に乗るため原則見送り。承認には `--accept-risk` が必要
- このまま **merge** すると、要レビュー項目を読み込んだ証拠として記録されるだけ (実体 seed 変更はなし)
- 手動キュレートしたい場合は、このブランチに追加 commit してから merge
- 不要なら **close** で次週まで保留