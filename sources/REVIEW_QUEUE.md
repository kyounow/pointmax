# 📋 週次マスタ同期: 要レビュー項目

(自動生成 2026-11-05。merge 前に項目を確認してください。)

## サマリ
- 要レビュー: 246 件
- ソース別: d-pay-campaigns=3, epos-tamaru-market=109, jcb-jpoint=121, smbc-vpoint-up=13
- 主な理由: campaignRateCeiling=1, missingProgramBody=9, idCollision=23, missingStoreBody=129, tierMove=4, lowConfidence=9, storeAdditionsDisabled=65, unknownCategory=6

## 項目 (理由別)

### 🔴 campaignRateCeiling (還元率 10% 以上、または 5% 超で上限なし) (1 件)
理由: キャンペーンの還元率が 10% 以上 (境界を含む)、または 5% を超えるのに月上限 (monthlyCapAmountYen) が無い。高率キャンペーンは上限・対象商品付きがほとんどで、record のまま取り込むと全額に高率が乗る過大表示になる。campaign 由来の membership の率上書き (overrideRate) が 5% を超える場合もここ。**承認すると record がそのまま全額に乗る** (上限・対象商品・店舗・帰属を record では表現できない)。原則は見送る。取り込むなら手書き seed で上限・限定・帰属を表現する。`npm run sync:approve` で承認するには `--accept-risk` が必要。

<details><summary>展開</summary>

#### `pro-1d707f5739` — `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-d-pointcard-matsukiyo-cocokara-10-percent-2026-11", name="マツキヨ・ココカラ｜もれなく＋10％還元中", scope="member-stores", rate=0.1, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2026-11-01", validTo="2026-11-30", requiresEntry=true`
- confidence: 0.95
- 評価: `evidenceQuote="dポイントカード マツキヨ・ココカラ｜もれなく＋10％還元中 2026/11/01～2026/11/30 エントリー受付中"`
- 判定詳細: rate 10% ≥ 10%
- 対応案: 原則見送り (承認すると record がそのまま全額に乗る)。取り込むなら手書き seed で上限・限定・帰属を表現する。どうしても record のまま取り込むなら `npm run sync:approve -- pro-1d707f5739 --accept-risk`

</details>

### 🟠 missingStoreBody (store 本体なし membership) (129 件)
理由: membership 提案だが、参照先 store 本体が seed 未存在 + 同 run の auto 候補にも無い (例: category cap で deferred された場合)。そのまま auto-merge すると孤児 membership (店名解決できない、UI で店舗未表示) が seed に残るため降格。store 本体を手動キュレートで追加するか、次回 cron で store 側が auto 化されるのを待つ。

<details><summary>展開</summary>

#### `mem-7327e30f39` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="gu"`
- confidence: 0.90
- 評価: `evidenceQuote="ジーユー オンラインストア エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-7327e30f39`、不要なら無視

#### `mem-ab599772ec` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="trip-com"`
- confidence: 0.90
- 評価: `evidenceQuote="Trip.com（航空券） エポスポイント 2 倍 ゴールド プラチナ 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-ab599772ec`、不要なら無視

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

#### `mem-23eee49a66` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="nitori"`
- confidence: 0.90
- 評価: `evidenceQuote="ニトリ 家具・インテリアの通販サイト【楽天市場】 エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-23eee49a66`、不要なら無視

#### `mem-89f78be4ff` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="qoo10"`
- confidence: 0.90
- 評価: `evidenceQuote="Qoo10 エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-89f78be4ff`、不要なら無視

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

#### `mem-584afaf2a1` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="jalpack-domestic-tour"`
- confidence: 0.90
- 評価: `evidenceQuote="ジャルパック 国内ツアー エポスポイント 3 倍 ゴールド プラチナ 6 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-584afaf2a1`、不要なら無視

#### `mem-baeeea5e6e` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="world-online-store"`
- confidence: 0.90
- 評価: `evidenceQuote="WORLD ONLINE STORE エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-baeeea5e6e`、不要なら無視

#### `mem-c4ed0367ae` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="apahotels"`
- confidence: 0.90
- 評価: `evidenceQuote="アパホテルズ＆リゾーツ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-c4ed0367ae`、不要なら無視

#### `mem-d608cacfa2` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="his"`
- confidence: 0.90
- 評価: `evidenceQuote="HIS（エイチアイエス） エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-d608cacfa2`、不要なら無視

#### `mem-bfa126c454` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-4x", storeId="at-cosme-shopping"`
- confidence: 0.90
- 評価: `evidenceQuote="@cosme SHOPPING エポスポイント 4 倍 ゴールド プラチナ 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-bfa126c454`、不要なら無視

#### `mem-a4def878db` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-4x", storeId="daiso-netstore"`
- confidence: 0.90
- 評価: `evidenceQuote="ダイソーネットストア エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-a4def878db`、不要なら無視

#### `mem-46f2c8ab65` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-4x", storeId="jalpack-overseas-tour"`
- confidence: 0.90
- 評価: `evidenceQuote="ジャルパック 海外ツアー エポスポイント 4 倍 ゴールド プラチナ 6 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-46f2c8ab65`、不要なら無視

#### `mem-e800e35bcd` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-5x", storeId="keyuca-online-shop"`
- confidence: 0.90
- 評価: `evidenceQuote="KEYUCA オンラインショップ エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-e800e35bcd`、不要なら無視

#### `mem-d0ba52f3f5` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-5x", storeId="loccitane"`
- confidence: 0.90
- 評価: `evidenceQuote="ロクシタンオンラインショップ エポスポイント 5 倍 ゴールド プラチナ 9 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-d0ba52f3f5`、不要なら無視

#### `mem-c3cb74c72c` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-5x", storeId="house-of-rose"`
- confidence: 0.90
- 評価: `evidenceQuote="ハウスオブローゼ オンラインショップ本店／化粧品 エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-c3cb74c72c`、不要なら無視

_他 109 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 missingProgramBody (program 本体なし membership) (9 件)
理由: membership 提案だが、参照先 program 本体が seed 未存在 + 同 run の auto 候補にも無い (proposePrograms は新規 program に必ず idCollision を付けるため、program 本体は同 run では auto に上がらず needsReview に行く)。そのまま membership だけ auto-merge すると BenefitProgram が無く還元計算できない孤児が seed に残るため降格。program 本体側の needsReview を先に承認 → 手動で seed に program 追加 → 次回 cron で membership 側も自動的に通る運用。

<details><summary>展開</summary>

#### `mem-4d75f99f23` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-d-pointcard-matsukiyo-cocokara-10-percent-2026-11", storeId="matsukiyo"`
- confidence: 0.95
- 評価: `evidenceQuote="マツキヨ"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-4d75f99f23`、不要なら無視

#### `mem-941e038111` — `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-d-pointcard-matsukiyo-cocokara-10-percent-2026-11", storeId="cocokara"`
- confidence: 0.95
- 評価: `evidenceQuote="ココカラ"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-941e038111`、不要なら無視

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

#### `mem-3a8935449a` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="conv-7eleven"`
- confidence: 0.90
- 評価: `evidenceQuote="条件達成でセブン-イレブン最大11%還元"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-3a8935449a`、不要なら無視

</details>

### 🪜 tierMove (同じ店 × 同じ倍率系列の別倍率) (4 件)
理由: membership 提案が、同じ店舗 × 同じ倍率系列 (J-POINT W / J-POINT Gold / たまるマーケット) の**別倍率**と重なる (seed に既にある、または同じ run で別倍率も提案されている)。倍率の改定か、受け皿 (例: 高島屋の SC・レストラン街 2 倍を百貨店本体に) の誤りの疑い。承認すると計算は最大値が勝つため、旧 tier が残ると過大表示や死にデータになり、seed の tier 契約テスト (1 店 × 1 系列 × 1 チャネルに membership 1 件) も落ちる。**承認するなら、旧 tier の membership を `src/state/seed-blocklist.ts` の `REMOVED_MEMBERSHIP_IDS` に入れる PR と同時に**。誤抽出なら無視 (次の run でも同じ理由で review に留まる)。

<details><summary>展開</summary>

#### `mem-7ca3bc0903` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="expedia"`
- confidence: 0.90
- 評価: `evidenceQuote="【航空券＋宿泊の同時予約】旅行予約のエクスペディア エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-7ca3bc0903`、不要なら無視

#### `mem-e38fa1af24` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-5x", storeId="muji"`
- confidence: 0.90
- 評価: `evidenceQuote="無印良品ネットストア エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-e38fa1af24`、不要なら無視

#### `mem-9ad4afae83` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-10x", storeId="expedia"`
- confidence: 0.90
- 評価: `evidenceQuote="【海外・国内ホテル】旅行予約のエクスペディア エポスポイント 10 倍 ゴールド プラチナ 14 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-9ad4afae83`、不要なら無視

#### `mem-97c49a3cf0` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-4x", storeId="takashimaya"`
- confidence: 0.90
- 評価: `evidenceQuote="高島屋 ポイント 最大 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-97c49a3cf0`、不要なら無視

</details>

### ⏸ storeAdditionsDisabled (store 追加は手動キュレ運用) (65 件)
理由: 新規 store の追加は cron では行わない方針 (キャンペーン情報の獲得に注力するため)。ここに列挙された店舗は cron が検知した「seed に未追加の店舗候補」で、必要な場合は手動で seed-data-stores.ts に追加 → 次回 cron で関連 membership が自動取り込まれる。全件無視も OK (リストとしての参照のみ)。

<details><summary>展開</summary>

#### `sto-57de028620` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="adidas-online-shop", name="adidas ONLINE SHOP", category="スポーツ"`
- confidence: 0.90
- 評価: `evidenceQuote="adidas ONLINE SHOP エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-57de028620`、不要なら無視

#### `sto-c833ce18d7` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="aeon-shop", name="おうちでイオン イオンショップ", category="スーパー"`
- confidence: 0.90
- 評価: `evidenceQuote="おうちでイオン イオンショップ エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c833ce18d7`、不要なら無視

#### `sto-8bf65fad74` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="agoda", name="アゴダ", category="ホテル"`
- confidence: 0.90
- 評価: `evidenceQuote="国内・海外のホテル予約ならアゴダ エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-8bf65fad74`、不要なら無視

#### `sto-7c1da97b2f` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="ana-travelers", name="ANAトラベラーズ", category="旅行代理店"`
- confidence: 0.90
- 評価: `evidenceQuote="ANAの国内・海外ツアー【ANAトラベラーズ】 エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-7c1da97b2f`、不要なら無視

#### `sto-17fb5f768b` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="apahotels", name="アパホテルズ＆リゾーツ", category="ホテル"`
- confidence: 0.90
- 評価: `evidenceQuote="アパホテルズ＆リゾーツ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-17fb5f768b`、不要なら無視

#### `sto-884966b366` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="at-cosme-shopping", name="@cosme SHOPPING", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="@cosme SHOPPING エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-884966b366`、不要なら無視

#### `sto-df378d26c7` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="belluna", name="カタログ通販ベルーナ（Belluna）", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="カタログ通販ベルーナ（Belluna） エポスポイント 10 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-df378d26c7`、不要なら無視

#### `sto-df63d972c2` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="blue-bottle-coffee", name="ブルーボトルコーヒー公式オンラインストア", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="ブルーボトルコーヒー公式オンラインストア エポスポイント 6 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-df63d972c2`、不要なら無視

#### `sto-c3245340fa` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="bonaventura", name="BONAVENTURA", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="BONAVENTURA エポスポイント 17 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c3245340fa`、不要なら無視

#### `sto-ee15f50778` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="bridgestone-sports-online", name="ブリヂストンスポーツオンラインストア", category="スポーツ"`
- confidence: 0.90
- 評価: `evidenceQuote="ブリヂストンスポーツオンラインストア ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-ee15f50778`、不要なら無視

#### `sto-0ee28e8291` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="budget-rentacar", name="バジェット・レンタカー", category="レンタカー"`
- confidence: 0.90
- 評価: `evidenceQuote="バジェット・レンタカー ポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-0ee28e8291`、不要なら無視

#### `sto-cb74ee08cc` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="cainz", name="カインズ", category="ホームセンター"`
- confidence: 0.90
- 評価: `evidenceQuote="カインズ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-cb74ee08cc`、不要なら無視

#### `sto-c39b959611` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="comic-cmoa", name="コミックシーモア", category="書店"`
- confidence: 0.90
- 評価: `evidenceQuote="コミックシーモア ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c39b959611`、不要なら無視

#### `sto-aedc829b06` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="daishin", name="ダイシン", category="ホームセンター"`
- confidence: 0.90
- 評価: `evidenceQuote="ダイシン ポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-aedc829b06`、不要なら無視

#### `sto-dba0a33159` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="daiso-netstore", name="ダイソーネットストア", category="雑貨"`
- confidence: 0.90
- 評価: `evidenceQuote="ダイソーネットストア エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-dba0a33159`、不要なら無視

#### `sto-a90d5329ae` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="dax", name="ダックス", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="ダックス ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-a90d5329ae`、不要なら無視

#### `sto-45576713a9` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="dhc-online-shop", name="DHCオンラインショップ", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="DHCオンラインショップ エポスポイント 9 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-45576713a9`、不要なら無視

#### `sto-3c5d5a05f5` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="disney-plus", name="ディズニープラス", category="エンタメ・チケット"`
- confidence: 0.90
- 評価: `evidenceQuote="ディズニープラス ポイント 20 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-3c5d5a05f5`、不要なら無視

#### `sto-7a21cc2744` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="domino-pizza", name="ドミノ・ピザ", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="ドミノ・ピザ ポイント 20 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-7a21cc2744`、不要なら無視

#### `sto-8f9a3db23d` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="dr-ci-labo", name="ドクターシーラボ公式オンラインショップ", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="ドクターシーラボ公式オンラインショップ エポスポイント 30 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-8f9a3db23d`、不要なら無視

_他 45 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟡 lowConfidence (9 件)
理由: Gemini の評価で confidence < 0.9。エビデンス不明瞭・推測混入の疑い。

<details><summary>展開</summary>

#### `mem-e5cf7a9170` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="conv-lawson"`
- confidence: 0.81
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン-イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤ、ドトールコーヒーショップ、エクセルシオールカフェ、すき家、くら寿司、はま寿司 等）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-e5cf7a9170`、不要なら無視

#### `mem-c83692bbe7` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="conv-familymart"`
- confidence: 0.81
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン-イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤ、ドトールコーヒーショップ、エクセルシオールカフェ、すき家、くら寿司、はま寿司 等）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-c83692bbe7`、不要なら無視

#### `mem-9bd4684150` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="mcdonalds"`
- confidence: 0.81
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン-イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤ、ドトールコーヒーショップ、エクセルシオールカフェ、すき家、くら寿司、はま寿司 等）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-9bd4684150`、不要なら無視

#### `mem-8d9aea54d1` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="saizeriya"`
- confidence: 0.81
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン-イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤ、ドトールコーヒーショップ、エクセルシオールカフェ、すき家、くら寿司、はま寿司 等）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-8d9aea54d1`、不要なら無視

#### `mem-3cfc1e3890` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="doutor"`
- confidence: 0.81
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン-イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤ、ドトールコーヒーショップ、エクセルシオールカフェ、すき家、くら寿司、はま寿司 等）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-3cfc1e3890`、不要なら無視

#### `mem-84681a7eb0` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="excelsior-cafe"`
- confidence: 0.81
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン-イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤ、ドトールコーヒーショップ、エクセルシオールカフェ、すき家、くら寿司、はま寿司 等）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-84681a7eb0`、不要なら無視

#### `mem-88645ac65c` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="sukiya"`
- confidence: 0.81
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン-イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤ、ドトールコーヒーショップ、エクセルシオールカフェ、すき家、くら寿司、はま寿司 等）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-88645ac65c`、不要なら無視

#### `mem-5c1009f2d8` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="kura-sushi"`
- confidence: 0.81
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン-イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤ、ドトールコーヒーショップ、エクセルシオールカフェ、すき家、くら寿司、はま寿司 等）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-5c1009f2d8`、不要なら無視

#### `mem-bb8ada1ce3` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="hamazushi"`
- confidence: 0.81
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン-イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤ、ドトールコーヒーショップ、エクセルシオールカフェ、すき家、くら寿司、はま寿司 等）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-bb8ada1ce3`、不要なら無視

</details>

### 🟠 idCollision (23 件)
理由: 新規追加だが既存 ID またはストア名と衝突。重複の可能性あり。

<details><summary>展開</summary>

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

#### `pro-504849b3d6` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-7x", name="たまるマーケット (7倍)", scope="member-stores", rate=0.035, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 7倍 (総倍率、EPOS 基本 0.5% × 7 = 実効 3.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。ゴールド/プラチナ会員は +2倍 (9倍)"`
- confidence: 0.90
- 評価: `evidenceQuote="SHEIN エポスポイント 7 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-504849b3d6`、不要なら無視

#### `pro-d7aa61abf7` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-9x", name="たまるマーケット (9倍)", scope="member-stores", rate=0.045, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 9倍 (総倍率、EPOS 基本 0.5% × 9 = 実効 4.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。ゴールド/プラチナ会員は +1倍 (10倍)または+4倍 (13倍)または+2倍 (11倍)または+2倍 (17倍)"`
- confidence: 0.90
- 評価: `evidenceQuote="DHCオンラインショップ エポスポイント 9 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-d7aa61abf7`、不要なら無視

#### `pro-d199f9327c` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-10x", name="たまるマーケット (10倍)", scope="member-stores", rate=0.05, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 10倍 (総倍率、EPOS 基本 0.5% × 10 = 実効 5.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。ゴールド/プラチナ会員は +4倍 (14倍)"`
- confidence: 0.90
- 評価: `evidenceQuote="【海外・国内ホテル】旅行予約のエクスペディア エポスポイント 10 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-d199f9327c`、不要なら無視

#### `pro-4373816326` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-13x", name="たまるマーケット (13倍)", scope="member-stores", rate=0.065, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 13倍 (総倍率、EPOS 基本 0.5% × 13 = 実効 6.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。ゴールド/プラチナ会員は +1倍 (14倍)"`
- confidence: 0.90
- 評価: `evidenceQuote="資生堂オンラインストア エポスポイント 13 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-4373816326`、不要なら無視

#### `pro-3db70efd78` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-14x", name="たまるマーケット (14倍)", scope="member-stores", rate=0.07, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 14倍 (総倍率、EPOS 基本 0.5% × 14 = 実効 7.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="ランコム エポスポイント 14 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-3db70efd78`、不要なら無視

#### `pro-5648ef596b` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-17x", name="たまるマーケット (17倍)", scope="member-stores", rate=0.085, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 17倍 (総倍率、EPOS 基本 0.5% × 17 = 実効 8.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="イヴ・サンローラン・ボーテ公式オンラインブティック エポスポイント 17 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-5648ef596b`、不要なら無視

#### `pro-d7bbaebfa1` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-18x", name="たまるマーケット (18倍)", scope="member-stores", rate=0.09, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 18倍 (総倍率、EPOS 基本 0.5% × 18 = 実効 9.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="山田養蜂場オンラインショップ エポスポイント 18 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-d7bbaebfa1`、不要なら無視

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
- 評価: `evidenceQuote="Adobe Creative Cloud エポsポイント 30 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-d25ca5de81`、不要なら無視

#### `pro-5cc8d96a51` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-4x", name="J-POINT パートナー (4倍)", scope="member-stores", rate=0.025, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="高島屋 ポイント 最大 4 倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-5cc8d96a51`、不要なら無視

#### `pro-3e40282d1f` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-5x", name="J-POINT パートナー (5倍)", scope="member-stores", rate=0.03, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="洋服の青山 ポイント 5 倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-3e40282d1f`、不要なら無視

#### `pro-6b3990a94f` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-5x", name="J-POINT パートナー Gold (5倍)", scope="member-stores", rate=0.025, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="App Store ポイント 最大 5 倍 プレミアムでおトク"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-6b3990a94f`、不要なら無視

#### `pro-2b5ee711ad` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-6x", name="J-POINT パートナー (6倍)", scope="member-stores", rate=0.035, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="オリックスレンタカー ポイント 6 倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-2b5ee711ad`、不要なら無視

#### `pro-607e69cb99` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-6x", name="J-POINT パートナー Gold (6倍)", scope="member-stores", rate=0.03, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="オリックスレンタカー ポイント 6 倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-607e69cb99`、不要なら無視

#### `pro-157596bab6` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-10x", name="J-POINT パートナー (10倍)", scope="member-stores", rate=0.055, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10 倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-157596bab6`、不要なら無視

#### `pro-a2bfee06a4` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-10x", name="J-POINT パートナー Gold (10倍)", scope="member-stores", rate=0.05, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10 倍 プレミアムでおトク"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-a2bfee06a4`、不要なら無視

#### `pro-5438f33fb2` — `addRecord/programs` from `smbc-vpoint-up`
- 内容: `id="prog-smbc-touch-conveni", name="対象店舗 スマホタッチ決済・モバイルオーダー", scope="member-stores", rate=0.075, currencyId="v-pt", cardIds=["smbc-v","olive"], paymentAppId="pa-visa-touch", bonusType="addOn", description="対象のコンビニ・飲食店でスマホのVisa/Mastercardタッチ決済またはモバイルオーダー利用で+7.5%還元", officialUrl="https://www.smbc.co.jp/kojin/vpoint-up/", conditions="対象カード（SMBCグループ発行Visa/Mastercard）、スマホのVisa/Mastercardタッチ決済またはモバイルオーダー利用が必須。カード現物のタッチ決済、iD、差し込み、磁気取引は対象外。一部店舗や一定金額以上の利用でタッチ決済にならない場合は対象外。通常ポイント0.5%と合算で合計8%還元。"`
- confidence: 0.81
- 評価: `evidenceQuote="B 対象店舗でスマホのVisaのタッチ決済・Mastercard®タッチ決済またはモバイルオーダーを利用＋7.5％還元"`
- 判定詳細: 新規 program (extractor=ongoing-program は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-5438f33fb2`、不要なら無視

_他 3 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 unknownCategory (語彙外カテゴリ) (6 件)
理由: 新規店舗の category が店舗カテゴリの語彙 (`src/state/seed-categories.ts`) に無い、または未設定。語彙外の店は自動追加されない (chain-promote 等の昇格の対象にもならない)。既存語彙の表記揺れなら seed-categories.ts の `EXTRACTED_CATEGORY_ALIASES` に alias を、新しい業態なら `STORE_CATEGORIES` に語彙を足す PR を出す (次回 cron から再判定される)。この項目を `npm run sync:approve` でそのまま承認すると、seed 契約 (store の category は語彙内) で CI が落ちる。取り込むなら category を語彙内に直して手書き seed へ。

<details><summary>展開</summary>

#### `sto-5cefcbd8ec` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="adobe-creative-cloud", name="Adobe Creative Cloud", category="ネットサービスのみ"`
- confidence: 0.90
- 評価: `evidenceQuote="Adobe Creative Cloud エポスポイント 30 倍"`
- 対応案: 表記揺れなら `src/state/seed-categories.ts` の EXTRACTED_CATEGORY_ALIASES に alias を、新しい業態なら STORE_CATEGORIES に語彙を足す PR を出す (次回 cron で再判定)。この項目を sync:approve でそのまま承認すると seed 契約で CI が落ちる。不要なら無視

#### `sto-5f5bbf9bd8` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="app-store", name="App Store", category="ネットサービスのみ"`
- confidence: 0.90
- 評価: `evidenceQuote="App Store ポイント 最大 5 倍"`
- 対応案: 表記揺れなら `src/state/seed-categories.ts` の EXTRACTED_CATEGORY_ALIASES に alias を、新しい業態なら STORE_CATEGORIES に語彙を足す PR を出す (次回 cron で再判定)。この項目を sync:approve でそのまま承認すると seed 契約で CI が落ちる。不要なら無視

#### `sto-324ba23293` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="belluna-gourmet", name="ベルーナグルメ", category="食品"`
- confidence: 0.90
- 評価: `evidenceQuote="ベルーナグルメ エポスポイント 13 倍"`
- 対応案: 表記揺れなら `src/state/seed-categories.ts` の EXTRACTED_CATEGORY_ALIASES に alias を、新しい業態なら STORE_CATEGORIES に語彙を足す PR を出す (次回 cron で再判定)。この項目を sync:approve でそのまま承認すると seed 契約で CI が落ちる。不要なら無視

#### `sto-8ff761d47d` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="google-play", name="Google Play", category="ネットサービスのみ"`
- confidence: 0.90
- 評価: `evidenceQuote="Google Play ポイント 最大 5 倍"`
- 対応案: 表記揺れなら `src/state/seed-categories.ts` の EXTRACTED_CATEGORY_ALIASES に alias を、新しい業態なら STORE_CATEGORIES に語彙を足す PR を出す (次回 cron で再判定)。この項目を sync:approve でそのまま承認すると seed 契約で CI が落ちる。不要なら無視

#### `sto-aa8801212b` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="nitori", name="ニトリ", category="暮らしと生活"`
- confidence: 0.90
- 評価: `evidenceQuote="ニトリ 家具・インテリアの通販サイト【楽天市場】 エポスポイント 2 倍"`
- 対応案: 表記揺れなら `src/state/seed-categories.ts` の EXTRACTED_CATEGORY_ALIASES に alias を、新しい業態なら STORE_CATEGORIES に語彙を足す PR を出す (次回 cron で再判定)。この項目を sync:approve でそのまま承認すると seed 契約で CI が落ちる。不要なら無視

#### `sto-1d6437444c` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="oisix", name="Oisix（おいしっくす）", category="食品"`
- confidence: 0.90
- 評価: `evidenceQuote="Oisix（おいしっくす） エポスポイント 3 倍"`
- 対応案: 表記揺れなら `src/state/seed-categories.ts` の EXTRACTED_CATEGORY_ALIASES に alias を、新しい業態なら STORE_CATEGORIES に語彙を足す PR を出す (次回 cron で再判定)。この項目を sync:approve でそのまま承認すると seed 契約で CI が落ちる。不要なら無視

</details>

## 操作
- **取り込みたい項目がある場合 (半自動)**: ローカルでこのブランチを checkout し、`npm run sync:approve -- <ID> [<ID> ...]` を実行 (ID は各項目見出しの先頭)。seed-additions.ts への反映・queue からの除去・REVIEW_QUEUE.md の再生成まで自動。`npm run sync:approve -- --list` で一覧表示。実行後 `npm test && npm run build` を確認して commit
- 🔴 untargetedProgram / campaignConditional / campaignRateCeiling / targetMismatch / storeNameMismatch は承認すると record がそのまま全額に乗るため原則見送り。承認には `--accept-risk` が必要
- このまま **merge** すると、要レビュー項目を読み込んだ証拠として記録されるだけ (実体 seed 変更はなし)
- 手動キュレートしたい場合は、このブランチに追加 commit してから merge
- 不要なら **close** で次週まで保留