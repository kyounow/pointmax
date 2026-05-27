# 📋 週次マスタ同期: 要レビュー項目

(自動生成 2026-05-28。merge 前に項目を確認してください。)

## サマリ
- 要レビュー: 262 件
- ソース別: d-pay-campaigns=34, jre-point-campaigns=33, orico-card-member-point=1, ponta=60, rakuten-point=26, smbc-vpoint-up=40, v-point=67, jal-card-tokuyaku-list=1
- 主な理由: idCollision=62, lowConfidence=121, missingStoreBody=19, excludedCategory=6, userBlocked=6, safetyFailed=48

## 項目 (理由別)

### 🛡 safetyFailed (auto-merge 件数オーバー降格) (48 件)
理由: auto-merge 候補だが、件数が maxAutoChangesPerRun を超えたため安全弁で review に降格。内容は健全な auto 候補なので、個別精査の上 maxAutoChangesPerRun を一時 bump して再実行 or 手動で取り込み判断。

<details><summary>展開</summary>

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="tokyu-hotel"`
- confidence: 0.90
- 評価: `evidenceQuote="ホテル京阪チェーン: 200円につき1P"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="relux"`
- confidence: 0.90
- 評価: `evidenceQuote="Relux: 200円につき1P"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="samsonite"`
- confidence: 0.90
- 評価: `evidenceQuote="サムソナイト: 200円につき1P"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="morecos-plus"`
- confidence: 0.90
- 評価: `evidenceQuote="morecos+ (モアコス): 200円につき1P"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="smari"`
- confidence: 0.90
- 評価: `evidenceQuote="スマリ SMARI: 200円につき1P"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="hmv-books-online"`
- confidence: 0.90
- 評価: `evidenceQuote="HMV&BOOKS online: 200円につき1P"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="geo-takuhai-rental"`
- confidence: 0.90
- 評価: `evidenceQuote="ゲオ宅配レンタル: 200円につき1P"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="au-denki"`
- confidence: 0.90
- 評価: `evidenceQuote="auでんき: 200円につき1P"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="art-hikkoshi-center"`
- confidence: 0.90
- 評価: `evidenceQuote="アート引越センター: 200円につき1P"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="sakai-hikkoshi"`
- confidence: 0.90
- 評価: `evidenceQuote="サカイ引越センター: 200円につき1P"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="heart-hikkoshi"`
- confidence: 0.90
- 評価: `evidenceQuote="ハート引越センター: 200円につき1P"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="gaba"`
- confidence: 0.90
- 評価: `evidenceQuote="Gabaマンツーマン英会話: 200円につき1P"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="seicomart"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート、セブン‐イレブン、ポプラ、ミニストップ、ローソン、マクドナルド、モスバーガー、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーくグループ飲食店、すき家、はま寿司"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="conv-7eleven"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート、セブン‐イレブン、ポプラ、ミニストップ、ローソン、マクドナルド、モスバーガー、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーくグループ飲食店、すき家、はま寿司"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="poplar"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート、セブン‐イレブン、ポプラ、ミニストップ、ローソン、マクドナルド、モスバーガー、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーくグループ飲食店、すき家、はま寿司"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="conv-ministop"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート、セブン‐イレブン、ポプラ、ミニストップ、ローソン、マクドナルド、モスバーガー、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーくグループ飲食店、すき家、はま寿司"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="conv-lawson"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート、セブン‐イレブン、ポプラ、ミニストップ、ローソン、マクドナルド、モスバーガー、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーくグループ飲食店、すき家、はま寿司"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="mcdonalds"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート、セブン‐イレブン、ポプラ、ミニストップ、ローソン、マクドナルド、モスバーガー、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーくグループ飲食店、すき家、はま寿司"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="mos-burger"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート、セブン‐イレブン、ポプラ、ミニストップ、ローソン、マクドナルド、モスバーガー、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーくグループ飲食店、すき家、はま寿司"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="kfc"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート、セブン‐イレブン、ポプラ、ミニストップ、ローソン、マクドナルド、モスバーガー、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーくグループ飲食店、すき家、はま寿司"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

_他 28 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 missingStoreBody (store 本体なし membership) (19 件)
理由: membership 提案だが、参照先 store 本体が seed 未存在 + 同 run の auto 候補にも無い (例: category cap で deferred された場合)。そのまま auto-merge すると孤児 membership (店名解決できない、UI で店舗未表示) が seed に残るため降格。store 本体を手動キュレートで追加するか、次回 cron で store 側が auto 化されるのを待つ。

<details><summary>展開</summary>

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="geo"`
- confidence: 0.90
- 評価: `evidenceQuote="ゲオ: 200円につき1P"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="sunlive"`
- confidence: 0.90
- 評価: `evidenceQuote="サンリブ: 200円につき1P"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="seijoishii"`
- confidence: 0.90
- 評価: `evidenceQuote="成城石井: 200円につき1P"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="minedrug"`
- confidence: 0.90
- 評価: `evidenceQuote="ミネドラッグ: 200円につき1P"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="yakuyodo"`
- confidence: 0.90
- 評価: `evidenceQuote="薬王堂: 200円につき1P"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="pan-no-tajima"`
- confidence: 0.90
- 評価: `evidenceQuote="パンの田島: 200円につき1P"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="hon-to-coffee-fukuroshosabo"`
- confidence: 0.90
- 評価: `evidenceQuote="本と珈琲 梟書茶房: 200円につき1P"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.294pc", storeId="sannext-tsutsuji-no-sato-ss"`
- notes: 2Lあたり1ポイント。1Lあたり170円換算の場合の還元率（変動する可能性あり）
- confidence: 0.90
- 評価: `evidenceQuote="株式会社サンネクスト セルフつつじの里SS：給油２L＝１ポイント貯まる！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.294pc", storeId="mandaiya-mukouhigashi-kyuyujo"`
- notes: 2Lあたり1ポイント。1Lあたり170円換算の場合の還元率（変動する可能性あり）
- confidence: 0.90
- 評価: `evidenceQuote="株式会社万代屋 向東給油所：給油２L＝１ポイント貯まる！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.294pc", storeId="kanaseki-watada-ss"`
- notes: 2Lあたり1ポイント。1Lあたり170円換算の場合の還元率（変動する可能性あり）
- confidence: 0.90
- 評価: `evidenceQuote="株式会社かなせき 渡田SS：給油２L＝１ポイント貯まる！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.294pc", storeId="kanaseki-katakura-ss"`
- notes: 2Lあたり1ポイント。1Lあたり170円換算の場合の還元率（変動する可能性あり）
- confidence: 0.90
- 評価: `evidenceQuote="株式会社かなせき 片倉SS：給油２L＝１ポイント貯まる！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.294pc", storeId="kanaseki-minamikase-ss"`
- notes: 2Lあたり1ポイント。1Lあたり170円換算の場合の還元率（変動する可能性あり）
- confidence: 0.90
- 評価: `evidenceQuote="株式会社かなせき 南加瀬SS：給油２L＝１ポイント貯まる！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.294pc", storeId="tamaya-sekiyu-mikuni-ekimae"`
- notes: 2Lあたり1ポイント。1Lあたり170円換算の場合の還元率（変動する可能性あり）
- confidence: 0.90
- 評価: `evidenceQuote="株式会社玉谷石油店 三国駅前給油所：給油２L＝１ポイント貯まる！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.294pc", storeId="tomobe-shoten-ogawacho-kyuyujo"`
- notes: 2Lあたり1ポイント。1Lあたり170円換算の場合の還元率（変動する可能性あり）
- confidence: 0.90
- 評価: `evidenceQuote="友部商店 小川町給油所：給油２L＝１ポイント貯まる！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.294pc", storeId="ueno-yugyo-self-yakage-kyuyujo"`
- notes: 2Lあたり1ポイント。1Lあたり170円換算の場合の還元率（変動する可能性あり）
- confidence: 0.90
- 評価: `evidenceQuote="上野油業株式会社 セルフ矢掛給油所：給油２L＝１ポイント貯まる！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.294pc", storeId="ueno-yugyo-self-mabi-kyuyujo"`
- notes: 2Lあたり1ポイント。1Lあたり170円換算の場合の還元率（変動する可能性あり）
- confidence: 0.90
- 評価: `evidenceQuote="上野油業株式会社 セルフ真備給油所：給油２L＝１ポイント貯まる！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.294pc", storeId="heiwa-auto-living-lapitpro-kasugai"`
- notes: 2Lあたり1ポイント。1Lあたり170円換算の場合の還元率（変動する可能性あり）
- confidence: 0.90
- 評価: `evidenceQuote="平和オートリビング株式会社 LaPitPro春日井SS：給油２L＝１ポイント貯まる！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.294pc", storeId="ito-chukan-sakai-ichijo-kyuyujo"`
- notes: 2Lあたり1ポイント。1Lあたり170円換算の場合の還元率（変動する可能性あり）
- confidence: 0.90
- 評価: `evidenceQuote="株式会社イトー 中環堺一条給油所：給油２L＝１ポイント貯まる！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.294pc", storeId="toyokosan-carland-self-takao"`
- notes: 2Lあたり1ポイント。1Lあたり170円換算の場合の還元率（変動する可能性あり）
- confidence: 0.90
- 評価: `evidenceQuote="東洋興産株式会社 カーランドセルフ鷹尾店：給油２L＝１ポイント貯まる！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

</details>

### 🟡 lowConfidence (121 件)
理由: Gemini の評価で confidence < 0.9。エビデンス不明瞭・推測混入の疑い。

<details><summary>展開</summary>

#### `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpointcard-lawson-max777x-2026-05", storeId="conv-lawson"`
- confidence: 0.81
- 評価: `evidenceQuote="ローソン"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpointcard-matsukiyo-cocokara-kao-2026-05", storeId="matsukiyo"`
- confidence: 0.81
- 評価: `evidenceQuote="マツキヨ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpointcard-matsukiyo-cocokara-kao-2026-05", storeId="cocokara"`
- confidence: 0.81
- 評価: `evidenceQuote="ココカラ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpointcard-lawson-products-2026-03", storeId="conv-lawson"`
- confidence: 0.81
- 評価: `evidenceQuote="ローソン"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpointcard-doutor-100k-share-2026-05", storeId="doutor"`
- confidence: 0.81
- 評価: `evidenceQuote="ドトール"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpay-hotto-motto-10k-daily-2026-04", storeId="hotto-motto"`
- confidence: 0.81
- 評価: `evidenceQuote="ほっともっと"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpointcard-edion-max30k-2026-05", storeId="edion"`
- confidence: 0.81
- 評価: `evidenceQuote="エディオン"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpay-yayoi-ken-10k-daily-2026-04", storeId="yayoi-ken"`
- confidence: 0.81
- 評価: `evidenceQuote="やよい軒"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpay-biccamera-plus5pct-2026-05", storeId="bic-camera"`
- confidence: 0.81
- 評価: `evidenceQuote="ビックカメラ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpay-joyfulhonda-5x-2026-05", storeId="joyful-honda"`
- confidence: 0.81
- 評価: `evidenceQuote="ジョイフル本田"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpointcard-wellpark-thu-sat-sun-2026-05", storeId="wellpark"`
- confidence: 0.81
- 評価: `evidenceQuote="ウェルパーク"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpointcard-forl-500k-share-2026-05", storeId="forl"`
- confidence: 0.81
- 評価: `evidenceQuote="フォーエル"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpointcard-jalannet-10pct-2025-05", storeId="jalannet"`
- confidence: 0.81
- 評価: `evidenceQuote="じゃらんnet"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpointcard-jalannet-5x-2025-05", storeId="jalannet"`
- confidence: 0.81
- 評価: `evidenceQuote="じゃらんnet"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpointcard-jalanrentacar-10pct-2025-05", storeId="jalan-rentacar"`
- confidence: 0.81
- 評価: `evidenceQuote="じゃらんレンタカー"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `d-pay-campaigns`
- 内容: `programId="prog-dpay-samplehyakkaten-plus30pct-2026-05", storeId="sample-hyakkaten"`
- confidence: 0.81
- 評価: `evidenceQuote="サンプル百貨店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `jre-point-campaigns`
- 内容: `programId="prog-jre-campaign-ars-topico-2x-2026-05", storeId="ars-topico"`
- confidence: 0.81
- 評価: `evidenceQuote="【アルス・トピコ】ポイント２倍キャンペーン！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `jre-point-campaigns`
- 内容: `programId="prog-jre-campaign-chapeau-funabashi-fashion-2x-2026-05", storeId="chapeau-funabashi"`
- confidence: 0.81
- 評価: `evidenceQuote="シャポー船橋 ファッション・グッズ・サービス限定2倍デー"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `jre-point-campaigns`
- 内容: `programId="prog-jre-campaign-cereo-kofu-2x-2026-05", storeId="cereo-kofu"`
- confidence: 0.81
- 評価: `evidenceQuote="【セレオ甲府】2026年5月｜JRE POINT２倍"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `jre-point-campaigns`
- 内容: `programId="prog-jre-campaign-cereo-kokubunji-2x-2026-05", storeId="cereo-kokubunji"`
- confidence: 0.81
- 評価: `evidenceQuote="【セレオ国分寺】５月２９日（金）・３０日（土）・３１日（日）は２倍ポイント！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

_他 101 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 idCollision (62 件)
理由: 新規追加だが既存 ID またはストア名と衝突。重複の可能性あり。

<details><summary>展開</summary>

#### `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-dpointcard-matsukiyo-cocokara-kao-2026-05", name="マツキヨ・ココカラで花王商品購入がおトク", rate=0.01, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2026-05-01", validTo="2026-05-31"`
- confidence: 0.36
- 評価: `evidenceQuote="マツキヨ・ココカラで花王商品購入がおトク 2026/05/01～2026/05/31"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-dpointcard-lawson-products-2026-03", name="【ローソン】対象商品購入でdポイント進呈！", rate=0.01, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2026-03-01", validTo="2026-08-31"`
- confidence: 0.36
- 評価: `evidenceQuote="【ローソン】対象商品購入でdポイント進呈！ 2026/03/01～2026/08/31"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-dpointcard-doutor-100k-share-2026-05", name="【ドトール】毎月10万ポイント山分け！", rate=0.01, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2026-05-01", validTo="2026-07-31"`
- confidence: 0.36
- 評価: `evidenceQuote="【ドトール】毎月10万ポイント山分け！ 2026/05/01～2026/07/31"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-dpay-hotto-motto-10k-daily-2026-04", name="ほっともっとd払いで毎日1名に1万ポイント", rate=0.01, currencyId="d-pt", paymentAppId="pa-d-pay", bonusType="addOn", validFrom="2026-04-01", validTo="2026-09-30"`
- confidence: 0.49
- 評価: `evidenceQuote="ほっともっとd払いで毎日1名に1万ポイント 2026/04/01～2026/09/30"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-dpointcard-edion-max30k-2026-05", name="エディオンで最大3万ポイント当たる！", rate=0.01, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2026-05-15", validTo="2026-06-14"`
- confidence: 0.36
- 評価: `evidenceQuote="エディオンで最大3万ポイント当たる！ 2026/05/15～2026/06/14"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-dpay-yayoi-ken-10k-daily-2026-04", name="やよい軒d払いで毎日1名に1万ポイント", rate=0.01, currencyId="d-pt", paymentAppId="pa-d-pay", bonusType="addOn", validFrom="2026-04-01", validTo="2026-09-30"`
- confidence: 0.49
- 評価: `evidenceQuote="やよい軒d払いで毎日1名に1万ポイント 2026/04/01～2026/09/30"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-dpay-biccamera-plus5pct-2026-05", name="【ビックカメラ】もれなく＋5％還元！", rate=0.05, currencyId="d-pt", paymentAppId="pa-d-pay", bonusType="addOn", validFrom="2026-05-07", validTo="2026-05-31"`
- confidence: 0.81
- 評価: `evidenceQuote="【ビックカメラ】もれなく＋5％還元！ 2026/05/07～2026/05/31"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-dpay-joyfulhonda-5x-2026-05", name="ジョイフル本田ｄ払い５倍キャンペーン", rate=0.05, currencyId="d-pt", paymentAppId="pa-d-pay", bonusType="primary", validFrom="2026-05-01", validTo="2026-05-31"`
- confidence: 0.81
- 評価: `evidenceQuote="ジョイフル本田ｄ払い５倍キャンペーン 2026/05/01～2026/05/31"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-dpointcard-wellpark-thu-sat-sun-2026-05", name="毎週木・土・日はウェルパークがおトク！", rate=0.01, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2026-05-01", validTo="2026-05-31"`
- confidence: 0.36
- 評価: `evidenceQuote="毎週木・土・日はウェルパークがおトク！ 2026/05/01～2026/05/31"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-dpointcard-forl-500k-share-2026-05", name="フォーエル｜50万ポイント山分け！", rate=0.01, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2026-05-01", validTo="2026-07-31"`
- confidence: 0.36
- 評価: `evidenceQuote="フォーエル｜50万ポイント山分け！ 2026/05/01～2026/07/31"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-dpointcard-jalannet-10pct-2025-05", name="【じゃらんnet】もれなく10％還元！", rate=0.1, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2025-05-01", validTo="2026-05-31"`
- confidence: 0.81
- 評価: `evidenceQuote="【じゃらんnet】もれなく10％還元！ 2025/05/01～2026/05/31"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-dpointcard-jalannet-5x-2025-05", name="【じゃらんnet】もれなく5倍還元！", rate=0.05, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2025-05-01", validTo="2026-05-31"`
- confidence: 0.81
- 評価: `evidenceQuote="【じゃらんnet】もれなく5倍還元！ 2025/05/01～2026/05/31"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-dpointcard-jalanrentacar-10pct-2025-05", name="【じゃらんレンタカー】もれなく10％還元！", rate=0.1, currencyId="d-pt", pointCardId="d-pointcard", bonusType="addOn", validFrom="2025-05-01", validTo="2026-05-31"`
- confidence: 0.81
- 評価: `evidenceQuote="【じゃらんレンタカー】もれなく10％還元！ 2025/05/01～2026/05/31"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `d-pay-campaigns`
- 内容: `id="prog-dpay-samplehyakkaten-plus30pct-2026-05", name="ｄ払い│サンプル百貨店＋30%還元", rate=0.3, currencyId="d-pt", paymentAppId="pa-d-pay", bonusType="addOn", validFrom="2026-05-27", validTo="2026-06-10"`
- confidence: 0.81
- 評価: `evidenceQuote="ｄ払い│サンプル百貨店＋30%還元 2026/05/27～2026/06/10"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `jre-point-campaigns`
- 内容: `id="prog-jre-campaign-fukushima-suica-2026-04", name="ふくしまSuicaで福を呼ぼう！ JRE POINTプレゼントキャンペーン", rate=0.01, currencyId="jre", pointCardId="jre-pointcard", bonusType="primary", validFrom="2026-04-01", validTo="2026-06-30"`
- confidence: 0.64
- 評価: `evidenceQuote="04月01日～06月30日 ふくしまSuicaで福を呼ぼう！ JRE POINTプレゼントキャンペーン エントリー形式"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `jre-point-campaigns`
- 内容: `id="prog-jre-campaign-suica-wednesday-2026-04", name="JRE POINT WEBサイトに登録したSuicaを使って、毎週水曜日はJRE POINTをおトクに貯めよう！", rate=0.01, currencyId="jre", pointCardId="jre-pointcard", bonusType="primary", validFrom="2026-04-01", validTo="2026-09-30"`
- confidence: 0.64
- 評価: `evidenceQuote="04月01日～09月30日 JRE POINT WEBサイトに登録したSuicaを使って、毎週水曜日はJRE POINTをおトクに貯めよう！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `jre-point-campaigns`
- 内容: `id="prog-jre-campaign-entry-ticket-pointback-2026-04", name="タッチでエキナカ 入場券ポイントバック！", rate=0.01, currencyId="jre", pointCardId="jre-pointcard", bonusType="primary", validFrom="2026-04-24", validTo="2027-03-31"`
- confidence: 0.64
- 評価: `evidenceQuote="04月24日～03月31日 タッチでエキナカ 入場券ポイントバック！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `jre-point-campaigns`
- 内容: `id="prog-jre-campaign-monthend-2026-05", name="2026年5月月末ごほうびキャンペーン", rate=0.01, currencyId="jre", pointCardId="jre-pointcard", bonusType="primary", validFrom="2026-05-29", validTo="2026-05-31"`
- confidence: 0.64
- 評価: `evidenceQuote="05月29日～05月31日 2026年5月月末ごほうびキャンペーン エントリー形式"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `jre-point-campaigns`
- 内容: `id="prog-jre-campaign-ars-topico-2x-2026-05", name="【アルス・トピコ】ポイント２倍キャンペーン！", rate=0.02, currencyId="jre", pointCardId="jre-pointcard", bonusType="primary", validFrom="2026-05-29", validTo="2026-05-31"`
- confidence: 0.81
- 評価: `evidenceQuote="05月29日～05月31日 【アルス・トピコ】ポイント２倍キャンペーン！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `jre-point-campaigns`
- 内容: `id="prog-jre-campaign-chapeau-funabashi-fashion-2x-2026-05", name="シャポー船橋 ファッション・グッズ・サービス限定2倍デー", rate=0.02, currencyId="jre", pointCardId="jre-pointcard", bonusType="primary", validFrom="2026-05-29", validTo="2026-05-29"`
- confidence: 0.81
- 評価: `evidenceQuote="05月29日～05月29日 シャポー船橋 ファッション・グッズ・サービス限定2倍デー"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

_他 42 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 excludedCategory (6 件)
理由: Policy B: 対象外カテゴリ (金融/保険/医療/ギャンブル等)。自動追加しない。

<details><summary>展開</summary>

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="apaman-shop", name="アパマンショップ", category="不動産・住宅"`
- confidence: 0.81
- 評価: `evidenceQuote="アパマンショップ たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="dental-ponta", name="Dental Ponta", category="医療"`
- confidence: 0.81
- 評価: `evidenceQuote="Dental Ponta たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="ponta-kantan-hoken", name="Pontaかんたん保険", category="保険"`
- confidence: 0.81
- 評価: `evidenceQuote="Pontaかんたん保険 たまる つかえる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="sokuyaku", name="SOKUYAKU", category="医療"`
- confidence: 0.81
- 評価: `evidenceQuote="SOKUYAKU たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="ur-rent-housing", name="UR賃貸住宅", category="不動産・住宅"`
- confidence: 0.81
- 評価: `evidenceQuote="UR賃貸住宅 たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="winticket", name="WINTICKET(ウィンチケット)", category="ギャンブル"`
- confidence: 0.81
- 評価: `evidenceQuote="WINTICKET(ウィンチケット) たまる つかえる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

</details>

### ⚫ userBlocked (6 件)
理由: seed-blocklist.ts でユーザが除外指定済み。意図した除外であれば無視してよい。

<details><summary>展開</summary>

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="auto-info", name="オート・インフォ", category="車・バイク"`
- confidence: 0.81
- 評価: `evidenceQuote="オート・インフォ たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="diamond-sha", name="ダイヤモンド社", category="書店"`
- confidence: 0.81
- 評価: `evidenceQuote="ダイヤモンド社 たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="enewan", name="エネワン（株式会社サイサン）", category="電気・ガス"`
- confidence: 0.81
- 評価: `evidenceQuote="エネワン（株式会社サイサン） たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="jal-mileage-bank", name="日本航空(JALマイレージバンク)", category="JAL特約店"`
- confidence: 0.81
- 評価: `evidenceQuote="日本航空(JALマイレージバンク) たまる つかえる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="sbinft-market", name="SBINFT Market", category="ネット通販"`
- confidence: 0.81
- 評価: `evidenceQuote="SBINFT Market たまる つかえる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="telasa", name="TELASA（テラサ）", category="エンタメ・チケット"`
- confidence: 0.81
- 評価: `evidenceQuote="TELASA（テラサ） たまる つかえる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

</details>

## 操作
- このまま **merge** すると、要レビュー項目を読み込んだ証拠として記録されるだけ (実体 seed 変更はなし)
- 手動キュレートしたい場合は、このブランチに追加 commit してから merge
- 不要なら **close** で次週まで保留