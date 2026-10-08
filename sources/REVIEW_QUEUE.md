# 📋 週次マスタ同期: 要レビュー項目

(自動生成 2026-10-08。merge 前に項目を確認してください。)

## サマリ
- 要レビュー: 279 件
- ソース別: epos-tamaru-market=103, jcb-jpoint=133, paypay-campaigns=2, smbc-vpoint-up=41
- 主な理由: idCollision=28, missingStoreBody=127, lowConfidence=30, missingProgramBody=30, campaignRateCeiling=1, storeAdditionsDisabled=63

## 項目 (理由別)

### 🔴 campaignRateCeiling (還元率 10% 以上、または 5% 超で上限なし) (1 件)
理由: キャンペーンの還元率が 10% 以上 (境界を含む)、または 5% を超えるのに月上限 (monthlyCapAmountYen) が無い。高率キャンペーンは上限・対象商品付きがほとんどで、record のまま取り込むと全額に高率が乗る過大表示になる。campaign 由来の membership の率上書き (overrideRate) が 5% を超える場合もここ。**承認すると record がそのまま全額に乗る** (上限・対象商品・店舗・帰属を record では表現できない)。原則は見送る。取り込むなら手書き seed で上限・限定・帰属を表現する。`npm run sync:approve` で承認するには `--accept-risk` が必要。

<details><summary>展開</summary>

#### `pro-f54192def2` — `addRecord/programs` from `paypay-campaigns`
- 内容: `id="prog-paypay-conv-7eleven-pasco-2026-10", name="セブンーイレブン限定！Pasco超熟をセブンーイレブンアプリのPayPayで支払うとPayPayポイント最大20％戻ってくる！キャンペーン", scope="member-stores", rate=0.2, currencyId="paypay", paymentAppId="pa-paypay", bonusType="primary", validFrom="2026-10-06", validTo="2026-10-26"`
- confidence: 0.95
- 評価: `evidenceQuote="セブンーイレブン限定！Pasco超熟をセブンーイレブンアプリのPayPayで支払うとPayPayポイント最大20％戻ってくる！キャンペーン 2026/10/6 〜 10/26"`
- 判定詳細: rate 20% ≥ 10%
- 対応案: 原則見送り (承認すると record がそのまま全額に乗る)。取り込むなら手書き seed で上限・限定・帰属を表現する。どうしても record のまま取り込むなら `npm run sync:approve -- pro-f54192def2 --accept-risk`

</details>

### 🟠 missingStoreBody (store 本体なし membership) (127 件)
理由: membership 提案だが、参照先 store 本体が seed 未存在 + 同 run の auto 候補にも無い (例: category cap で deferred された場合)。そのまま auto-merge すると孤児 membership (店名解決できない、UI で店舗未表示) が seed に残るため降格。store 本体を手動キュレートで追加するか、次回 cron で store 側が auto 化されるのを待つ。

<details><summary>展開</summary>

#### `mem-89f78be4ff` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="qoo10"`
- confidence: 0.90
- 評価: `evidenceQuote="Qoo10 エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-89f78be4ff`、不要なら無視

#### `mem-18f714002d` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-5x", storeId="shein"`
- confidence: 0.90
- 評価: `evidenceQuote="SHEIN エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-18f714002d`、不要なら無視

#### `mem-cd2ee1e2bb` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-7x", storeId="adidas-online-shop"`
- confidence: 0.90
- 評価: `evidenceQuote="adidas ONLINE SH... エポスポイント 7 倍 ゴールド プラチナ 9 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-cd2ee1e2bb`、不要なら無視

#### `mem-bd9cc575ba` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-4x", storeId="pal-closet"`
- confidence: 0.90
- 評価: `evidenceQuote="PAL CLOSET エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-bd9cc575ba`、不要なら無視

#### `mem-dd32902f86` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-7x", storeId="agoda"`
- confidence: 0.90
- 評価: `evidenceQuote="Agoda エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-dd32902f86`、不要なら無視

#### `mem-bda67a2b2c` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-10x", storeId="expedia-hotels"`
- confidence: 0.90
- 評価: `evidenceQuote="【海外・国内ホテル】旅行予約のエ... エポスポイント 10 倍 ゴールド プラチナ 14 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-bda67a2b2c`、不要なら無視

#### `mem-fe63c5068b` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="rakuten-travel"`
- confidence: 0.90
- 評価: `evidenceQuote="楽天トラベル【楽天市場】 エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-fe63c5068b`、不要なら無視

#### `mem-ab599772ec` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="trip-com"`
- confidence: 0.90
- 評価: `evidenceQuote="Trip.com（航空券） エポスポイント 2 倍 ゴールド プラチナ 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-ab599772ec`、不要なら無視

#### `mem-af6ba348ff` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="ticket-pia"`
- confidence: 0.90
- 評価: `evidenceQuote="チケットぴあ エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-af6ba348ff`、不要なら無視

#### `mem-261a92efc4` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-13x", storeId="shiseido-online-store"`
- confidence: 0.90
- 評価: `evidenceQuote="資生堂オンラインストア エポスポイント 13 倍 ゴールド プラチナ 14 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-261a92efc4`、不要なら無視

#### `mem-bfa126c454` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-4x", storeId="at-cosme-shopping"`
- confidence: 0.90
- 評価: `evidenceQuote="@cosme SHOPPING エポスポイント 4 倍 ゴールド プラチナ 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-bfa126c454`、不要なら無視

#### `mem-0fd77c1ea4` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-18x", storeId="yamada-youhoujou-online-shop"`
- confidence: 0.90
- 評価: `evidenceQuote="山田養蜂場オンラインショップ エポスポイント 18 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-0fd77c1ea4`、不要なら無視

#### `mem-a8b62e8e2a` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-5x", storeId="loccitane-online-shop"`
- confidence: 0.90
- 評価: `evidenceQuote="ロクシタンオンラインショップ エポスポイント 5 倍 ゴールド プラチナ 9 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-a8b62e8e2a`、不要なら無視

#### `mem-815fc52ae7` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="orbis"`
- confidence: 0.90
- 評価: `evidenceQuote="オルビス エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-815fc52ae7`、不要なら無視

#### `mem-23eee49a66` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="nitori"`
- confidence: 0.90
- 評価: `evidenceQuote="ニトリ 家具・インテリアの通販サ... エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-23eee49a66`、不要なら無視

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

#### `mem-c7c7be9e14` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-9x", storeId="moma-design-store"`
- confidence: 0.90
- 評価: `evidenceQuote="MoMA Design Stor... エポスポイント 9 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-c7c7be9e14`、不要なら無視

#### `mem-58d2b6a740` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-14x", storeId="aesop-online-store"`
- confidence: 0.90
- 評価: `evidenceQuote="イソップオンラインストア エポスポイント 14 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-58d2b6a740`、不要なら無視

_他 107 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 missingProgramBody (program 本体なし membership) (30 件)
理由: membership 提案だが、参照先 program 本体が seed 未存在 + 同 run の auto 候補にも無い (proposePrograms は新規 program に必ず idCollision を付けるため、program 本体は同 run では auto に上がらず needsReview に行く)。そのまま membership だけ auto-merge すると BenefitProgram が無く還元計算できない孤児が seed に残るため降格。program 本体側の needsReview を先に承認 → 手動で seed に program 追加 → 次回 cron で membership 側も自動的に通る運用。

<details><summary>展開</summary>

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

#### `mem-2a570211b4` — `addRecord/memberships` from `paypay-campaigns`
- 内容: `programId="prog-paypay-conv-7eleven-pasco-2026-10", storeId="conv-7eleven"`
- confidence: 0.95
- 評価: `evidenceQuote="セブンーイレブン限定"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-2a570211b4`、不要なら無視

#### `mem-650917c0da` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="seicomart"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗: セイコーマート"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-650917c0da`、不要なら無視

#### `mem-3a8935449a` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="conv-7eleven"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗: セブン‐イレブン"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-3a8935449a`、不要なら無視

#### `mem-91e17377bb` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="poplar"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗: ポプラ"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-91e17377bb`、不要なら無視

#### `mem-843cab8b35` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="conv-ministop"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗: ミニストップ"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-843cab8b35`、不要なら無視

#### `mem-e5cf7a9170` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="conv-lawson"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗: ローソン"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-e5cf7a9170`、不要なら無視

#### `mem-9bd4684150` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="mcdonalds"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗: マクドナルド"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-9bd4684150`、不要なら無視

#### `mem-61856cad45` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="mos-burger"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗: モスバーガー"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-61856cad45`、不要なら無視

#### `mem-905d4d2986` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="kfc"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗: ケンタッキーフライドチキン"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-905d4d2986`、不要なら無視

#### `mem-3c0be52c15` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="yoshinoya"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗: 吉野家"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-3c0be52c15`、不要なら無視

#### `mem-8d9aea54d1` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="saizeriya"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗: サイゼリヤ"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-8d9aea54d1`、不要なら無視

#### `mem-ef27914a6d` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="gusto"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗: ガスト"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-ef27914a6d`、不要なら無視

#### `mem-7d9069b0cc` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="bamiyan"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗: バーミヤン"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-7d9069b0cc`、不要なら無視

#### `mem-c3eb20121b` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="shabuyo"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗: しゃぶ葉"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-c3eb20121b`、不要なら無視

_他 10 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### ⏸ storeAdditionsDisabled (store 追加は手動キュレ運用) (63 件)
理由: 新規 store の追加は cron では行わない方針 (キャンペーン情報の獲得に注力するため)。ここに列挙された店舗は cron が検知した「seed に未追加の店舗候補」で、必要な場合は手動で seed-data-stores.ts に追加 → 次回 cron で関連 membership が自動取り込まれる。全件無視も OK (リストとしての参照のみ)。

<details><summary>展開</summary>

#### `sto-5371c31061` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="adidas-online-shop", name="adidas ONLINE SHOP", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="adidas ONLINE SH... エポスポイント 7 倍 ゴールド プラチナ 9 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-5371c31061`、不要なら無視

#### `sto-ece433e7c3` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="adobe-creative-cloud", name="Adobe Creative Cloud", category="ビジネス・教育"`
- confidence: 0.90
- 評価: `evidenceQuote="Adobe Creative Cloud エポスポイント 30 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-ece433e7c3`、不要なら無視

#### `sto-423912a2fb` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="aesop-online-store", name="イソップオンラインストア", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="イソップオンラインストア エポスポイント 14 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-423912a2fb`、不要なら無視

#### `sto-69312df957` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="agoda", name="Agoda", category="旅行代理店"`
- confidence: 0.90
- 評価: `evidenceQuote="Agoda エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-69312df957`、不要なら無視

#### `sto-19c8265b94` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="alex", name="アレックス", category="車・バイク"`
- confidence: 0.90
- 評価: `evidenceQuote="アレックス ポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-19c8265b94`、不要なら無視

#### `sto-5218963845` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="ana-domestic-international-tours", name="ANAの国内・海外ツアー", category="旅行代理店"`
- confidence: 0.90
- 評価: `evidenceQuote="ANAの国内・海外ツアー【ANA... エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-5218963845`、不要なら無視

#### `sto-884966b366` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="at-cosme-shopping", name="@cosme SHOPPING", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="@cosme SHOPPING エポスポイント 4 倍 ゴールド プラチナ 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-884966b366`、不要なら無視

#### `sto-e0cc310029` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="atidimu-official-store", name="ATIDIMU公式ストア", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="ATIDIMU公式ストア エポスポイント 30 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-e0cc310029`、不要なら無視

#### `sto-ea7788ee79` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="belluna", name="ベルーナ", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="カタログ通販ベルーナ（Bellu... エポスポイント 10 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-ea7788ee79`、不要なら無視

#### `sto-ed1ed94df4` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="blue-bottle-coffee-online-store", name="ブルーボトルコーヒー公式オンラインストア", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="ブルーボトルコーヒー公式オンラインストア エポスポイント 6 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-ed1ed94df4`、不要なら無視

#### `sto-c3245340fa` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="bonaventura", name="BONAVENTURA", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="BONAVENTURA エポスポイント 17 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c3245340fa`、不要なら無視

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

#### `sto-e29e556323` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="charles-keith", name="CHARLES & KEITH", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="CHARLES & KEITH ... エポスポイント 13 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-e29e556323`、不要なら無視

#### `sto-c28f9d935a` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="daiso-net-store", name="ダイソーネットストア", category="雑貨"`
- confidence: 0.90
- 評価: `evidenceQuote="ダイソーネットストア エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c28f9d935a`、不要なら無視

#### `sto-45576713a9` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="dhc-online-shop", name="DHCオンラインショップ", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="DHCオンラインショップ エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-45576713a9`、不要なら無視

#### `sto-f2017b410f` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="disney-plus", name="ディズニープラス", category="音楽・映像"`
- confidence: 0.90
- 評価: `evidenceQuote="ディズニープラス ポイント 20 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-f2017b410f`、不要なら無視

#### `sto-7a21cc2744` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="domino-pizza", name="ドミノ・ピザ", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="ドミノ・ピザ ポイント 20 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-7a21cc2744`、不要なら無視

#### `sto-b82db9cc8c` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="dr-ci-labo-online-shop", name="ドクターシーラボ公式オンラインショップ", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="ドクターシーラボ公式オンラインシ... エポスポイント 25 倍 ゴールド プラチナ 26 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-b82db9cc8c`、不要なら無視

_他 43 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟡 lowConfidence (30 件)
理由: Gemini の評価で confidence < 0.9。エビデンス不明瞭・推測混入の疑い。

<details><summary>展開</summary>

#### `mem-e7946f620e` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-max5x", storeId="app-store"`
- confidence: 0.81
- 評価: `evidenceQuote="App Store ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-e7946f620e`、不要なら無視

#### `mem-76b5246e9e` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-max5x", storeId="app-store"`
- confidence: 0.81
- 評価: `evidenceQuote="App Store ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-76b5246e9e`、不要なら無視

#### `mem-088375b9f1` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-max5x", storeId="google-play"`
- confidence: 0.81
- 評価: `evidenceQuote="Google Play ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-088375b9f1`、不要なら無視

#### `mem-be865ebcba` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-max5x", storeId="google-play"`
- confidence: 0.81
- 評価: `evidenceQuote="Google Play ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-be865ebcba`、不要なら無視

#### `mem-6c7042a897` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-max4x", storeId="takashimaya"`
- confidence: 0.81
- 評価: `evidenceQuote="高島屋 ポイント 最大 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-6c7042a897`、不要なら無視

#### `mem-eaab6e6352` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-max4x", storeId="takashimaya"`
- confidence: 0.81
- 評価: `evidenceQuote="高島屋 ポイント 最大 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-eaab6e6352`、不要なら無視

#### `mem-db859e9856` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-max5x", storeId="u-next"`
- confidence: 0.81
- 評価: `evidenceQuote="U-NEXT ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-db859e9856`、不要なら無視

#### `mem-71dae438b8` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-max5x", storeId="u-next"`
- confidence: 0.81
- 評価: `evidenceQuote="U-NEXT ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-71dae438b8`、不要なら無視

#### `mem-63f4f14f38` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-max5x", storeId="hulu"`
- confidence: 0.81
- 評価: `evidenceQuote="Hulu ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-63f4f14f38`、不要なら無視

#### `mem-24edc74ad7` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-max5x", storeId="hulu"`
- confidence: 0.81
- 評価: `evidenceQuote="Hulu ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-24edc74ad7`、不要なら無視

#### `mem-d0426170e8` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-max5x", storeId="comic-cmoa"`
- confidence: 0.81
- 評価: `evidenceQuote="コミックシーモア ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-d0426170e8`、不要なら無視

#### `mem-4cbbf7719b` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-max5x", storeId="comic-cmoa"`
- confidence: 0.81
- 評価: `evidenceQuote="コミックシーモア ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-4cbbf7719b`、不要なら無視

#### `mem-ea5c97d3e1` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="steak-gusto"`
- confidence: 0.81
- 評価: `evidenceQuote="その他すかいらーくグループ飲食店: ステーキガスト"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-ea5c97d3e1`、不要なら無視

#### `mem-97dc1546c5` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="karaage-karayoshi"`
- confidence: 0.81
- 評価: `evidenceQuote="その他すかいらーくグループ飲食店: から好し"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-97dc1546c5`、不要なら無視

#### `mem-1cb4e0beef` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="musashino-mori-coffee"`
- confidence: 0.81
- 評価: `evidenceQuote="その他すかいらーくグループ飲食店: むさしの森珈琲"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-1cb4e0beef`、不要なら無視

#### `mem-bb56b9a682` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="aiya"`
- confidence: 0.81
- 評価: `evidenceQuote="その他すかいらーくグループ飲食店: 藍屋"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-bb56b9a682`、不要なら無視

#### `mem-920d28a207` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="grazie-gardens"`
- confidence: 0.81
- 評価: `evidenceQuote="その他すかいらーくグループ飲食店: グラッチェガーデンズ"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-920d28a207`、不要なら無視

#### `mem-0f95a6457b` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="uoya-michi"`
- confidence: 0.81
- 評価: `evidenceQuote="その他すかいらーくグループ飲食店: 魚屋路"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-0f95a6457b`、不要なら無視

#### `mem-1980d0ccc8` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="chawan"`
- confidence: 0.81
- 評価: `evidenceQuote="その他すかいらーくグループ飲食店: chawan"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-1980d0ccc8`、不要なら無視

#### `mem-49b2ed2f9b` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="la-ohana"`
- confidence: 0.81
- 評価: `evidenceQuote="その他すかいらーくグループ飲食店: La Ohana"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-49b2ed2f9b`、不要なら無視

_他 10 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 idCollision (28 件)
理由: 新規追加だが既存 ID またはストア名と衝突。重複の可能性あり。

<details><summary>展開</summary>

#### `pro-78cecc4ae7` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-5x", name="たまるマーケット (5倍)", scope="member-stores", rate=0.025, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="SHEIN エポスポイント 5 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-78cecc4ae7`、不要なら無視

#### `pro-6db0c0673d` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-7x", name="たまるマーケット (7倍)", scope="member-stores", rate=0.035, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。adidas ONLINE SHOP、Agoda、VAIOストア、グンゼストアはゴールド/プラチナ会員は +2倍 (9倍/10倍)。"`
- confidence: 0.90
- 評価: `evidenceQuote="adidas ONLINE SH... エポスポイント 7 倍 ゴールド プラチナ 9 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-6db0c0673d`、不要なら無視

#### `pro-4372a1a4ba` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-10x", name="たまるマーケット (10倍)", scope="member-stores", rate=0.05, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。海外・国内ホテル旅行予約のエクスペディア、Gapオンラインストアはゴールド/プラチナ会員は +4倍/1倍 (14倍/11倍)。"`
- confidence: 0.90
- 評価: `evidenceQuote="【海外・国内ホテル】旅行予約のエ... エポスポイント 10 倍 ゴールド プラチナ 14 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-4372a1a4ba`、不要なら無視

#### `pro-1691ea2604` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-13x", name="たまるマーケット (13倍)", scope="member-stores", rate=0.065, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。資生堂オンラインストア、メゾン マルジェラ フレグランス公式オンラインストア、ソースネクスト、HP Directplusはゴールド/プラチナ会員は +1倍 (14倍)。"`
- confidence: 0.90
- 評価: `evidenceQuote="資生堂オンラインストア エポスポイント 13 倍 ゴールド プラチナ 14 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-1691ea2604`、不要なら無視

#### `pro-4b931ef479` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-14x", name="たまるマーケット (14倍)", scope="member-stores", rate=0.07, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="イソップオンラインストア エポスポイント 14 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-4b931ef479`、不要なら無視

#### `pro-e7a76be029` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-17x", name="たまるマーケット (17倍)", scope="member-stores", rate=0.085, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="BONAVENTURA エポスポイント 17 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-e7a76be029`、不要なら無視

#### `pro-3f1adf8f20` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-18x", name="たまるマーケット (18倍)", scope="member-stores", rate=0.09, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="山田養蜂場オンラインショップ エポスポイント 18 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-3f1adf8f20`、不要なら無視

#### `pro-e2be8d5153` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-19x", name="たまるマーケット (19倍)", scope="member-stores", rate=0.095, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="IPSA 公式サイト エポスポイント 19 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-e2be8d5153`、不要なら無視

#### `pro-44018974df` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-25x", name="たまるマーケット (25倍)", scope="member-stores", rate=0.125, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。ドクターシーラボ公式オンラインショップはゴールド/プラチナ会員は +1倍 (26倍)。"`
- confidence: 0.90
- 評価: `evidenceQuote="ドクターシーラボ公式オンラインシ... エポスポイント 25 倍 ゴールド プラチナ 26 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-44018974df`、不要なら無視

#### `pro-9ade14dd95` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-30x", name="たまるマーケット (30倍)", scope="member-stores", rate=0.15, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="Adobe Creative Cloud エポスポイント 30 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-9ade14dd95`、不要なら無視

#### `pro-c225e2651a` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-9x", name="たまるマーケット (9倍)", scope="member-stores", rate=0.045, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。ロクシタンオンラインショップ、MoMA Design Store、HABA ONLINE、ホテルズドットコム、overE 公式オンラインショップはゴールド/プラチナ会員は +4倍/+0倍/+1倍/+4倍/+3倍 (9倍/9倍/10倍/13倍/9倍)。"`
- confidence: 0.90
- 評価: `evidenceQuote="MoMA Design Stor... エポスポイント 9 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-c225e2651a`、不要なら無視

#### `pro-95a4dabb2f` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-6x", name="たまるマーケット (6倍)", scope="member-stores", rate=0.03, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。ブルーボトルコーヒー公式オンラインストア、overE 公式オンラインショップはゴールド/プラチナ会員は +0倍/+3倍 (6倍/9倍)。"`
- confidence: 0.90
- 評価: `evidenceQuote="ブルーボトルコーヒー公式オンラインストア エポスポイント 6 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-95a4dabb2f`、不要なら無視

#### `pro-3e40282d1f` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-5x", name="J-POINT パートナー (5倍)", scope="member-stores", rate=0.03, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="洋服の青山 ポイント 5 倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-3e40282d1f`、不要なら無視

#### `pro-6b3990a94f` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-5x", name="J-POINT パートナー Gold (5倍)", scope="member-stores", rate=0.025, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="洋服の青山 ポイント 5 倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-6b3990a94f`、不要なら無視

#### `pro-157596bab6` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-10x", name="J-POINT パートナー (10倍)", scope="member-stores", rate=0.055, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10 倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-157596bab6`、不要なら無視

#### `pro-a2bfee06a4` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-10x", name="J-POINT パートナー Gold (10倍)", scope="member-stores", rate=0.05, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10 倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-a2bfee06a4`、不要なら無視

#### `pro-895201f759` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-max5x", name="J-POINT パートナー (最大5倍)", scope="member-stores", rate=0.03, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.81
- 評価: `evidenceQuote="App Store ポイント 最大 5 倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-895201f759`、不要なら無視

#### `pro-47539ee2b9` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-max5x", name="J-POINT パートナー Gold (最大5倍)", scope="member-stores", rate=0.025, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.81
- 評価: `evidenceQuote="App Store ポイント 最大 5 倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-47539ee2b9`、不要なら無視

#### `pro-7ff2e1d872` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-max4x", name="J-POINT パートナー (最大4倍)", scope="member-stores", rate=0.025, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.81
- 評価: `evidenceQuote="高島屋 ポイント 最大 4 倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-7ff2e1d872`、不要なら無視

#### `pro-1b20a1b1be` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-max4x", name="J-POINT パートナー Gold (最大4倍)", scope="member-stores", rate=0.02, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.81
- 評価: `evidenceQuote="高島屋 ポイント 最大 4 倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-1b20a1b1be`、不要なら無視

_他 8 件は省略 (sources/proposed-migrations.json を参照)_

</details>

## 操作
- **取り込みたい項目がある場合 (半自動)**: ローカルでこのブランチを checkout し、`npm run sync:approve -- <ID> [<ID> ...]` を実行 (ID は各項目見出しの先頭)。seed-additions.ts への反映・queue からの除去・REVIEW_QUEUE.md の再生成まで自動。`npm run sync:approve -- --list` で一覧表示。実行後 `npm test && npm run build` を確認して commit
- 🔴 untargetedProgram / campaignConditional / campaignRateCeiling / targetMismatch / storeNameMismatch は承認すると record がそのまま全額に乗るため原則見送り。承認には `--accept-risk` が必要
- このまま **merge** すると、要レビュー項目を読み込んだ証拠として記録されるだけ (実体 seed 変更はなし)
- 手動キュレートしたい場合は、このブランチに追加 commit してから merge
- 不要なら **close** で次週まで保留