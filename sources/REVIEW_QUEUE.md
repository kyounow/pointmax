# 📋 週次マスタ同期: 要レビュー項目

(自動生成 2026-10-29。merge 前に項目を確認してください。)

## サマリ
- 要レビュー: 218 件
- ソース別: d-pay-campaigns=13, epos-tamaru-market=94, jcb-jpoint=101, smbc-vpoint-up=10
- 主な理由: idCollision=22, campaignRateCeiling=3, unsupportedRateClaim=2, missingStoreBody=108, missingProgramBody=12, tierMove=2, lowConfidence=7, storeAdditionsDisabled=59, unknownCategory=3

## 項目 (理由別)

### 🔴 unsupportedRateClaim (rate 根拠なし、hallucination 疑い) (2 件)
理由: rate が抽出されたが evidenceQuote に数値根拠 (% / 倍 / 円→pt 等) が見当たらない。「最大◯◯ポイントプレゼント」のような曖昧な文言から Gemini が rate を hallucinate した疑い。元 URL を直接確認の上採否を判断。

<details><summary>展開</summary>

#### `pro-1e7e921194` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-d-pay-joyfulhonda-5x-2026-10", name="ジョイフル本田ｄ払い５倍キャンペーン", scope="member-stores", rate=0.05, currencyId="d-pt", paymentAppId="pa-d-pay", bonusType="addOn", validFrom="2026-10-01", validTo="2026-10-31", requiresEntry=true`
- confidence: 0.95
- 評価: `evidenceQuote="ジョイフル本田ｄ払い５倍キャンペーン 2026/10/01～2026/10/31"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-1e7e921194`、不要なら無視

#### `pro-19272b4efa` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-d-pointcard-matsukiyo-cocokara-kao-2026-10", name="マツキヨ・ココカラで花王商品購入がおトク", scope="member-stores", rate=0.2, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2026-10-01", validTo="2026-10-31"`
- confidence: 0.95
- 評価: `evidenceQuote="マツキヨ・ココカラで花王商品購入がおトク 2026/10/01～2026/10/31"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-19272b4efa`、不要なら無視

</details>

### 🔴 campaignRateCeiling (還元率 10% 以上、または 5% 超で上限なし) (3 件)
理由: キャンペーンの還元率が 10% 以上 (境界を含む)、または 5% を超えるのに月上限 (monthlyCapAmountYen) が無い。高率キャンペーンは上限・対象商品付きがほとんどで、record のまま取り込むと全額に高率が乗る過大表示になる。campaign 由来の membership の率上書き (overrideRate) が 5% を超える場合もここ。**承認すると record がそのまま全額に乗る** (上限・対象商品・店舗・帰属を record では表現できない)。原則は見送る。取り込むなら手書き seed で上限・限定・帰属を表現する。`npm run sync:approve` で承認するには `--accept-risk` が必要。

<details><summary>展開</summary>

#### `pro-3c1bcf025d` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-d-pointcard-coke-on-50-pct-2026-09", name="Coke ON（R）｜＋50％ポイント還元", scope="member-stores", rate=0.5, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2026-09-01", validTo="2026-11-30", requiresEntry=true`
- confidence: 0.95
- 評価: `evidenceQuote="Coke ON（R）｜＋50％ポイント還元 2026/09/01～2026/11/30"`
- 判定詳細: rate 50% ≥ 10%
- 対応案: 原則見送り (承認すると record がそのまま全額に乗る)。取り込むなら手書き seed で上限・限定・帰属を表現する。どうしても record のまま取り込むなら `npm run sync:approve -- pro-3c1bcf025d --accept-risk`

#### `pro-302dd46a4d` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-d-pay-store-support-30pct-2026-09", name="店舗限定 最大＋30％還元★今こそまとめ買い！", scope="member-stores", rate=0.3, currencyId="d-pt", paymentAppId="pa-d-pay", bonusType="addOn", validFrom="2026-09-01", validTo="2026-10-31"`
- confidence: 0.95
- 評価: `evidenceQuote="最大＋30％還元★今こそまとめ買い！ 2026/09/01～2026/10/31"`
- 判定詳細: rate 30% ≥ 10%
- 対応案: 原則見送り (承認すると record がそのまま全額に乗る)。取り込むなら手書き seed で上限・限定・帰属を表現する。どうしても record のまま取り込むなら `npm run sync:approve -- pro-302dd46a4d --accept-risk`

#### `pro-35a06ebd22` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-d-pointcard-matsukiyo-cocokara-20pct-2026-10", name="マツキヨ・ココカラ｜もれなく＋20％還元中", scope="member-stores", rate=0.2, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2026-10-01", validTo="2026-10-31", requiresEntry=true`
- confidence: 0.95
- 評価: `evidenceQuote="マツキヨ・ココカラ｜もれなく＋20％還元中 2026/10/01～2026/10/31"`
- 判定詳細: rate 20% ≥ 10%
- 対応案: 原則見送り (承認すると record がそのまま全額に乗る)。取り込むなら手書き seed で上限・限定・帰属を表現する。どうしても record のまま取り込むなら `npm run sync:approve -- pro-35a06ebd22 --accept-risk`

</details>

### 🟠 missingStoreBody (store 本体なし membership) (108 件)
理由: membership 提案だが、参照先 store 本体が seed 未存在 + 同 run の auto 候補にも無い (例: category cap で deferred された場合)。そのまま auto-merge すると孤児 membership (店名解決できない、UI で店舗未表示) が seed に残るため降格。store 本体を手動キュレートで追加するか、次回 cron で store 側が auto 化されるのを待つ。

<details><summary>展開</summary>

#### `mem-30ddb1e23d` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-d-pay-joyfulhonda-5x-2026-10", storeId="joyful-honda"`
- confidence: 0.95
- 評価: `evidenceQuote="ジョイフル本田ｄ払い５倍キャンペーン"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-30ddb1e23d`、不要なら無視

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

#### `mem-bd9cc575ba` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-4x", storeId="pal-closet"`
- confidence: 0.90
- 評価: `evidenceQuote="PAL CLOSET エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-bd9cc575ba`、不要なら無視

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

#### `mem-287a8c36d3` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="ana-travelers"`
- confidence: 0.90
- 評価: `evidenceQuote="ANAの国内・海外ツアー【ANAトラベラーズ】 エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-287a8c36d3`、不要なら無視

#### `mem-815fc52ae7` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="orbis"`
- confidence: 0.90
- 評価: `evidenceQuote="オルビス エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-815fc52ae7`、不要なら無視

#### `mem-f3a10ae17b` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-5x", storeId="dhc"`
- confidence: 0.90
- 評価: `evidenceQuote="DHCオンラインショップ エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-f3a10ae17b`、不要なら無視

#### `mem-23eee49a66` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="nitori"`
- confidence: 0.90
- 評価: `evidenceQuote="ニトリ 家具・インテリアの通販サイト【楽天市場】 エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-23eee49a66`、不要なら無視

#### `mem-a4def878db` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-4x", storeId="daiso-netstore"`
- confidence: 0.90
- 評価: `evidenceQuote="ダイソーネットストア エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-a4def878db`、不要なら無視

#### `mem-c7c7be9e14` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-9x", storeId="moma-design-store"`
- confidence: 0.90
- 評価: `evidenceQuote="MoMA Design Store エポスポイント 9 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-c7c7be9e14`、不要なら無視

#### `mem-37af6dc4ba` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="cainz"`
- confidence: 0.90
- 評価: `evidenceQuote="カインズ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-37af6dc4ba`、不要なら無視

#### `mem-68aed33600` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-5x", storeId="keyuca"`
- confidence: 0.90
- 評価: `evidenceQuote="KEYUCA オンラインショップ エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-68aed33600`、不要なら無視

#### `mem-eab4cddfa1` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-17x", storeId="shu-uemura"`
- confidence: 0.90
- 評価: `evidenceQuote="シュウ ウエムラ公式オンラインショップ エポスポイント 17 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-eab4cddfa1`、不要なら無視

#### `mem-57978739c0` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-9x", storeId="takami-online"`
- confidence: 0.90
- 評価: `evidenceQuote="タカミ公式オンラインショップ エポスポイント 9 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-57978739c0`、不要なら無視

#### `mem-69f80f01ea` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="new-balance-outlet"`
- confidence: 0.90
- 評価: `evidenceQuote="ニューバランス公式オンラインアウトレット エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-69f80f01ea`、不要なら無視

#### `mem-95f0e9d07e` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-6x", storeId="blue-bottle-coffee"`
- confidence: 0.90
- 評価: `evidenceQuote="ブルーボトルコーヒー公式オンラインストア エポスポイント 6 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-95f0e9d07e`、不要なら無視

#### `mem-9778441a56` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-17x", storeId="maison-margiela-fragrance"`
- confidence: 0.90
- 評価: `evidenceQuote="メゾン マルジェラ フレグランス公式オンラインストア エポスポイント 17 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-9778441a56`、不要なら無視

#### `mem-84ed5273b9` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-30x", storeId="adobe-creative-cloud"`
- confidence: 0.90
- 評価: `evidenceQuote="Adobe Creative Cloud エポスポイント 30 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-84ed5273b9`、不要なら無視

_他 88 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 missingProgramBody (program 本体なし membership) (12 件)
理由: membership 提案だが、参照先 program 本体が seed 未存在 + 同 run の auto 候補にも無い (proposePrograms は新規 program に必ず idCollision を付けるため、program 本体は同 run では auto に上がらず needsReview に行く)。そのまま membership だけ auto-merge すると BenefitProgram が無く還元計算できない孤児が seed に残るため降格。program 本体側の needsReview を先に承認 → 手動で seed に program 追加 → 次回 cron で membership 側も自動的に通る運用。

<details><summary>展開</summary>

#### `mem-85c8c237db` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-d-pointcard-matsukiyo-cocokara-20pct-2026-10", storeId="matsukiyo"`
- confidence: 0.95
- 評価: `evidenceQuote="マツキヨ・ココカラ｜もれなく＋20％還元中"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-85c8c237db`、不要なら無視

#### `mem-ebba129444` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-d-pointcard-matsukiyo-cocokara-20pct-2026-10", storeId="cocokara"`
- confidence: 0.95
- 評価: `evidenceQuote="マツキヨ・ココカラ｜もれなく＋20％還元中"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-ebba129444`、不要なら無視

#### `mem-122c945b05` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-d-pointcard-matsukiyo-cocokara-kao-2026-10", storeId="matsukiyo"`
- confidence: 0.95
- 評価: `evidenceQuote="マツキヨ・ココカラで花王商品購入がおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-122c945b05`、不要なら無視

#### `mem-74cdbea4e8` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-d-pointcard-matsukiyo-cocokara-kao-2026-10", storeId="cocokara"`
- confidence: 0.95
- 評価: `evidenceQuote="マツキヨ・ココカラで花王商品購入がおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-74cdbea4e8`、不要なら無視

#### `mem-f9678d6b6f` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-7x", storeId="aeon"`
- confidence: 0.90
- 評価: `evidenceQuote="おうちでイオン イオンショップ エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-f9678d6b6f`、不要なら無視

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

#### `mem-a00ada2535` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-75", storeId="conv-7eleven"`
- confidence: 0.90
- 評価: `evidenceQuote="条件達成でセブン-イレブン最大11%還元 (「対象のコンビニ・飲食店で最大8％還元」に加えて、3％が付与された合計還元率)"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-a00ada2535`、不要なら無視

</details>

### 🪜 tierMove (同じ店 × 同じ倍率系列の別倍率) (2 件)
理由: membership 提案が、同じ店舗 × 同じ倍率系列 (J-POINT W / J-POINT Gold / たまるマーケット) の**別倍率**と重なる (seed に既にある、または同じ run で別倍率も提案されている)。倍率の改定か、受け皿 (例: 高島屋の SC・レストラン街 2 倍を百貨店本体に) の誤りの疑い。承認すると計算は最大値が勝つため、旧 tier が残ると過大表示や死にデータになり、seed の tier 契約テスト (1 店 × 1 系列 × 1 チャネルに membership 1 件) も落ちる。**承認するなら、旧 tier の membership を `src/state/seed-blocklist.ts` の `REMOVED_MEMBERSHIP_IDS` に入れる PR と同時に**。誤抽出なら無視 (次の run でも同じ理由で review に留まる)。

<details><summary>展開</summary>

#### `mem-e38fa1af24` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-5x", storeId="muji"`
- confidence: 0.90
- 評価: `evidenceQuote="無印良品ネットストア エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-e38fa1af24`、不要なら無視

#### `mem-97c49a3cf0` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-4x", storeId="takashimaya"`
- confidence: 0.90
- 評価: `evidenceQuote="高島屋 ポイント 最大 4 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-97c49a3cf0`、不要なら無視

</details>

### ⏸ storeAdditionsDisabled (store 追加は手動キュレ運用) (59 件)
理由: 新規 store の追加は cron では行わない方針 (キャンペーン情報の獲得に注力するため)。ここに列挙された店舗は cron が検知した「seed に未追加の店舗候補」で、必要な場合は手動で seed-data-stores.ts に追加 → 次回 cron で関連 membership が自動取り込まれる。全件無視も OK (リストとしての参照のみ)。

<details><summary>展開</summary>

#### `sto-70be5721b2` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="adidas", name="adidas ONLINE SHOP", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="adidas ONLINE SHOP エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-70be5721b2`、不要なら無視

#### `sto-6dc2b476fc` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="agoda", name="国内・海外のホテル予約ならアゴダ", category="ホテル"`
- confidence: 0.90
- 評価: `evidenceQuote="国内・海外のホテル予約ならアゴダ エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-6dc2b476fc`、不要なら無視

#### `sto-7c1da97b2f` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="ana-travelers", name="ANAトラベラーズ", category="旅行代理店"`
- confidence: 0.90
- 評価: `evidenceQuote="ANAの国内・海外ツアー【ANAトラベラーズ】 エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-7c1da97b2f`、不要なら無視

#### `sto-25038ebb91` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="apa-hotels", name="アパホテルズ＆リゾーツ", category="ホテル"`
- confidence: 0.90
- 評価: `evidenceQuote="アパホテルズ＆リゾーツ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-25038ebb91`、不要なら無視

#### `sto-e018c92385` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="belluna", name="カタログ通販ベルーナ", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="カタログ通販ベルーナ（Belluna） エポスポイント 10 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-e018c92385`、不要なら無視

#### `sto-df63d972c2` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="blue-bottle-coffee", name="ブルーボトルコーヒー公式オンラインストア", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="ブルーボトルコーヒー公式オンラインストア エポスポイント 6 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-df63d972c2`、不要なら無視

#### `sto-b58c5b080f` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="bridgestone-sports-online-store", name="ブリヂストンスポーツオンラインストア", category="スポーツ"`
- confidence: 0.90
- 評価: `evidenceQuote="ブリヂストンスポーツオンラインストア ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-b58c5b080f`、不要なら無視

#### `sto-3d69e6e7af` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="budget-rent-a-car", name="バジェット・レンタカー", category="レンタカー"`
- confidence: 0.90
- 評価: `evidenceQuote="バジェット・レンタカー ポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-3d69e6e7af`、不要なら無視

#### `sto-cb74ee08cc` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="cainz", name="カインズ", category="ホームセンター"`
- confidence: 0.90
- 評価: `evidenceQuote="カインズ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-cb74ee08cc`、不要なら無視

#### `sto-a4c93c8432` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="charles-keith", name="CHARLES & KEITH 公式オンラインストア", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="CHARLES & KEITH 公式オンラインストア エポスポイント 13 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-a4c93c8432`、不要なら無視

#### `sto-fb0570a142` — `addRecord/stores` from `d-pay-campaigns`
- 内容: `id="coke-on", name="Coke ON", category="飲食"`
- confidence: 0.95
- 評価: `evidenceQuote="Coke ON（R）｜＋50％ポイント還元"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-fb0570a142`、不要なら無視

#### `sto-c43e265f22` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="cosme-shopping", name="@cosme SHOPPING", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="@cosme SHOPPING エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c43e265f22`、不要なら無視

#### `sto-80e6f38b75` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="dacss", name="ダックス", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="ダックス ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-80e6f38b75`、不要なら無視

#### `sto-dba0a33159` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="daiso-netstore", name="ダイソーネットストア", category="雑貨"`
- confidence: 0.90
- 評価: `evidenceQuote="ダイソーネットストア エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-dba0a33159`、不要なら無視

#### `sto-53302e1873` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="dhc", name="DHCオンラインショップ", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="DHCオンラインショップ エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-53302e1873`、不要なら無視

#### `sto-b529f294bf` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="dynabook-direct", name="Dynabook Direct", category="家電量販店"`
- confidence: 0.90
- 評価: `evidenceQuote="Dynabook Direct エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-b529f294bf`、不要なら無視

#### `sto-5916b69833` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="e87-com", name="e87.com（千趣会 イイハナ）", category="雑貨"`
- confidence: 0.90
- 評価: `evidenceQuote="e87.com（千趣会 イイハナ） エポスポイント 19 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-5916b69833`、不要なら無視

#### `sto-38b588efaf` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="expedia", name="エクスペディア", category="旅行代理店"`
- confidence: 0.90
- 評価: `evidenceQuote="【海外・国内ホテル】旅行予約のエクスペディア エポスポイント 10 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-38b588efaf`、不要なら無視

#### `sto-b81bd29d83` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="expedia-flight-hotel", name="エクスペディア (航空券＋宿泊)", category="旅行代理店"`
- confidence: 0.90
- 評価: `evidenceQuote="【航空券＋宿泊の同時予約】旅行予約のエクスペディア エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-b81bd29d83`、不要なら無視

#### `sto-e012733189` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="fmv-store", name="FMV Store", category="家電量販店"`
- confidence: 0.90
- 評価: `evidenceQuote="FMV Store エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-e012733189`、不要なら無視

_他 39 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟡 lowConfidence (7 件)
理由: Gemini の評価で confidence < 0.9。エビデンス不明瞭・推測混入の疑い。

<details><summary>展開</summary>

#### `mem-3cec7c4f90` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-75", storeId="conv-lawson"`
- confidence: 0.64
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン‐イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤ、ドトールコーヒーショップ、エクセルシオール カフェ、かっぱ寿司など）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-3cec7c4f90`、不要なら無視

#### `mem-9f809c28ac` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-75", storeId="conv-familymart"`
- confidence: 0.64
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン‐イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤ、ドトールコーヒーショップ、エクセルシオール カフェ、かっぱ寿司など）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-9f809c28ac`、不要なら無視

#### `mem-4a21111719` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-75", storeId="mcdonalds"`
- confidence: 0.64
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン‐イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤ、ドトールコーヒーショップ、エクセルシオール カフェ、かっぱ寿司など）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-4a21111719`、不要なら無視

#### `mem-7d3ee97fa0` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-75", storeId="saizeriya"`
- confidence: 0.64
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン‐イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤ、ドトールコーヒーショップ、エクセルシオール カフェ、かっぱ寿司など）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-7d3ee97fa0`、不要なら無視

#### `mem-561da3e530` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-75", storeId="doutor"`
- confidence: 0.64
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン‐イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤ、ドトールコーヒーショップ、エクセルシオール カフェ、かっぱ寿司など）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-561da3e530`、不要なら無視

#### `mem-04889ee653` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-75", storeId="excelsior-cafe"`
- confidence: 0.64
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン‐イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤ、ドトールコーヒーショップ、エクセルシオール カフェ、かっぱ寿司など）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-04889ee653`、不要なら無視

#### `mem-526d8bd616` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-75", storeId="kappa-sushi"`
- confidence: 0.64
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン‐イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤ、ドトールコーヒーショップ、エクセルシオール カフェ、かっぱ寿司など）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-526d8bd616`、不要なら無視

</details>

### 🟠 idCollision (22 件)
理由: 新規追加だが既存 ID またはストア名と衝突。重複の可能性あり。

<details><summary>展開</summary>

#### `pro-0326453f5a` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-d-pay-dpoint-coupon-30x-2026-06", name="d払いクーポン利用でdポイント最大30倍！", scope="member-stores", rate=0.3, currencyId="d-pt", paymentAppId="pa-d-pay", bonusType="addOn", validFrom="2026-06-16", requiresEntry=true`
- confidence: 0.95
- 評価: `evidenceQuote="d払いクーポン利用でdポイント最大30倍！ 2026/06/16～"`
- 判定詳細: validTo が無い / 解析できない
- 対応案: 取り込むなら `npm run sync:approve -- pro-0326453f5a`、不要なら無視

#### `pro-159fc7f359` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-5x", name="たまるマーケット (5倍)", scope="member-stores", rate=0.025, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 5倍 (総倍率、EPOS 基本 0.5% × 5 = 実効 2.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="無印良品ネットストア エポスポイント 5 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-159fc7f359`、不要なら無視

#### `pro-7f13efa08f` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-6x", name="たまるマーケット (6倍)", scope="member-stores", rate=0.03, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 6倍 (総倍率、EPOS 基本 0.5% × 6 = 実効 3.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="ブルーボトルコーヒー公式オンラインストア エポスポイント 6 倍"`
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
- 評価: `evidenceQuote="MoMA Design Store エポスポイント 9 倍"`
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
- 評価: `evidenceQuote="ランコム エポスポイント 14 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-3db70efd78`、不要なら無視

#### `pro-5648ef596b` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-17x", name="たまるマーケット (17倍)", scope="member-stores", rate=0.085, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 17倍 (総倍率、EPOS 基本 0.5% × 17 = 実効 8.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="シュウ ウエムラ公式オンラインショップ エポスポイント 17 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-5648ef596b`、不要なら無視

#### `pro-d7bbaebfa1` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-18x", name="たまるマーケット (18倍)", scope="member-stores", rate=0.09, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 18倍 (総倍率、EPOS 基本 0.5% × 18 = 実効 9.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="ピザハットオンライン エポスポイント 18 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-d7bbaebfa1`、不要なら無視

#### `pro-9e57013460` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-19x", name="たまるマーケット (19倍)", scope="member-stores", rate=0.095, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 19倍 (総倍率、EPOS 基本 0.5% × 19 = 実効 9.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="IPSA 公式サイト エポスポイント 19 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-9e57013460`、不要なら無視

#### `pro-95dfd4ebfb` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-25x", name="たまるマーケット (25倍)", scope="member-stores", rate=0.125, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 25倍 (総倍率、EPOS 基本 0.5% × 25 = 実効 12.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="山田養蜂場オンラインショップ エポスポイント 25 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-95dfd4ebfb`、不要なら無視

#### `pro-d25ca5de81` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-30x", name="たまるマーケット (30倍)", scope="member-stores", rate=0.15, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 30倍 (総倍率、EPOS 基本 0.5% × 30 = 実効 15.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="Adobe Creative Cloud エポスポイント 30 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-d25ca5de81`、不要なら無視

#### `pro-157596bab6` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-10x", name="J-POINT パートナー (10倍)", scope="member-stores", rate=0.055, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10 倍 プレミアムでおトク"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-157596bab6`、不要なら無視

#### `pro-814aa3b129` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-10x", name="J-POINT パートナー (10倍)", scope="member-stores", rate=0.05, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。プレミアムカードでおトクの表記あり。"`
- confidence: 0.90
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10 倍 プレミアムでおトク"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-814aa3b129`、不要なら無視

#### `pro-2b5ee711ad` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-6x", name="J-POINT パートナー (6倍)", scope="member-stores", rate=0.035, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="オリックスレンタカー ポイント 6 倍 登録不要"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-2b5ee711ad`、不要なら無視

#### `pro-fc6babcbfc` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-6x", name="J-POINT パートナー (6倍)", scope="member-stores", rate=0.03, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="オリックスレンタカー ポイント 6 倍 登録不要"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-fc6babcbfc`、不要なら無視

#### `pro-8d0cacb201` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-5x", name="J-POINT パートナー (5倍)", scope="member-stores", rate=0.03, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。App Store, Google Play, U-NEXT, コミックシーモア, Huluは「最大5倍」表記。"`
- confidence: 0.90
- 評価: `evidenceQuote="App Store ポイント 最大 5 倍 プレミアムでおトク"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-8d0cacb201`、不要なら無視

#### `pro-2067f5d98b` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-5x", name="J-POINT パートナー (5倍)", scope="member-stores", rate=0.025, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。App Store, Google Play, U-NEXT, コミックシーモア, Huluは「最大5倍」表記。プレミアムカードでおトクの表記あり。"`
- confidence: 0.90
- 評価: `evidenceQuote="App Store ポイント 最大 5 倍 プレミアムでおトク"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-2067f5d98b`、不要なら無視

#### `pro-5cc8d96a51` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-4x", name="J-POINT パートナー (4倍)", scope="member-stores", rate=0.025, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="高島屋 ポイント 最大 4 倍 プレミアムでおトク"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-5cc8d96a51`、不要なら無視

_他 2 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 unknownCategory (語彙外カテゴリ) (3 件)
理由: 新規店舗の category が店舗カテゴリの語彙 (`src/state/seed-categories.ts`) に無い、または未設定。語彙外の店は自動追加されない (chain-promote 等の昇格の対象にもならない)。既存語彙の表記揺れなら seed-categories.ts の `EXTRACTED_CATEGORY_ALIASES` に alias を、新しい業態なら `STORE_CATEGORIES` に語彙を足す PR を出す (次回 cron から再判定される)。この項目を `npm run sync:approve` でそのまま承認すると、seed 契約 (store の category は語彙内) で CI が落ちる。取り込むなら category を語彙内に直して手書き seed へ。

<details><summary>展開</summary>

#### `sto-5cefcbd8ec` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="adobe-creative-cloud", name="Adobe Creative Cloud", category="ネットサービスのみ"`
- confidence: 0.90
- 評価: `evidenceQuote="Adobe Creative Cloud エポスポイント 30 倍"`
- 対応案: 表記揺れなら `src/state/seed-categories.ts` の EXTRACTED_CATEGORY_ALIASES に alias を、新しい業態なら STORE_CATEGORIES に語彙を足す PR を出す (次回 cron で再判定)。この項目を sync:approve でそのまま承認すると seed 契約で CI が落ちる。不要なら無視

#### `sto-144d2eb750` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="oisix", name="Oisix", category="食品"`
- confidence: 0.90
- 評価: `evidenceQuote="Oisix（おいしっくす） エポスポイント 3 倍"`
- 対応案: 表記揺れなら `src/state/seed-categories.ts` の EXTRACTED_CATEGORY_ALIASES に alias を、新しい業態なら STORE_CATEGORIES に語彙を足す PR を出す (次回 cron で再判定)。この項目を sync:approve でそのまま承認すると seed 契約で CI が落ちる。不要なら無視

#### `sto-cb6a0a6eea` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="yamada-youhoujo", name="山田養蜂場オンラインショップ", category="食品"`
- confidence: 0.90
- 評価: `evidenceQuote="山田養蜂場オンラインショップ エポスポイント 25 倍"`
- 対応案: 表記揺れなら `src/state/seed-categories.ts` の EXTRACTED_CATEGORY_ALIASES に alias を、新しい業態なら STORE_CATEGORIES に語彙を足す PR を出す (次回 cron で再判定)。この項目を sync:approve でそのまま承認すると seed 契約で CI が落ちる。不要なら無視

</details>

## 操作
- **取り込みたい項目がある場合 (半自動)**: ローカルでこのブランチを checkout し、`npm run sync:approve -- <ID> [<ID> ...]` を実行 (ID は各項目見出しの先頭)。seed-additions.ts への反映・queue からの除去・REVIEW_QUEUE.md の再生成まで自動。`npm run sync:approve -- --list` で一覧表示。実行後 `npm test && npm run build` を確認して commit
- 🔴 untargetedProgram / campaignConditional / campaignRateCeiling / targetMismatch / storeNameMismatch は承認すると record がそのまま全額に乗るため原則見送り。承認には `--accept-risk` が必要
- このまま **merge** すると、要レビュー項目を読み込んだ証拠として記録されるだけ (実体 seed 変更はなし)
- 手動キュレートしたい場合は、このブランチに追加 commit してから merge
- 不要なら **close** で次週まで保留