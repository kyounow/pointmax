# 📋 週次マスタ同期: 要レビュー項目

(自動生成 2026-06-08。merge 前に項目を確認してください。)

## サマリ
- 要レビュー: 173 件
- ソース別: orico-card-member-point=1, ponta=25, smbc-vpoint-up=40, v-point=107
- 主な理由: idCollision=12, lowConfidence=48, missingProgramBody=37, userBlocked=9, storeAdditionsDisabled=57, excludedCategory=10

## 項目 (理由別)

### 🟠 missingProgramBody (program 本体なし membership) (37 件)
理由: membership 提案だが、参照先 program 本体が seed 未存在 + 同 run の auto 候補にも無い (proposePrograms は新規 program に必ず idCollision を付けるため、program 本体は同 run では auto に上がらず needsReview に行く)。そのまま membership だけ auto-merge すると BenefitProgram が無く還元計算できない孤児が seed に残るため降格。program 本体側の needsReview を先に承認 → 手動で seed に program 追加 → 次回 cron で membership 側も自動的に通る運用。

<details><summary>展開</summary>

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-restaurant-addon-7.5", storeId="seicomart"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗 全国での以下の店舗での、店頭でのご利用が対象となります。 セイコーマート"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-restaurant-addon-7.5", storeId="conv-7eleven"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗 全国での以下の店舗での、店頭でのご利用が対象となります。 セブン‐イレブン"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-restaurant-addon-7.5", storeId="poplar"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗 全国での以下の店舗での、店頭でのご利用が対象となります。 ポプラ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-restaurant-addon-7.5", storeId="conv-ministop"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗 全国での以下の店舗での、店頭でのご利用が対象となります。 ミニストップ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-restaurant-addon-7.5", storeId="conv-lawson"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗 全国での以下の店舗での、店頭でのご利用が対象となります。 ローソン"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-restaurant-addon-7.5", storeId="mcdonalds"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗 全国での以下の店舗での、店頭でのご利用が対象となります。 マクドナルド"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-restaurant-addon-7.5", storeId="mos-burger"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗 全国での以下の店舗での、店頭でのご利用が対象となります。 モスバーガー"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-restaurant-addon-7.5", storeId="kfc"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗 全国での以下の店舗での、店頭でのご利用が対象となります。 ケンタッキーフライドチキン"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-restaurant-addon-7.5", storeId="yoshinoya"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗 全国での以下の店舗での、店頭でのご利用が対象となります。 吉野家"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-restaurant-addon-7.5", storeId="saizeriya"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗 全国での以下の店舗での、店頭でのご利用が対象となります。 サイゼリヤ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-restaurant-addon-7.5", storeId="gusto"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗 全国での以下の店舗での、店頭でのご利用が対象となります。 ガスト"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-restaurant-addon-7.5", storeId="bamiyan"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗 全国での以下の店舗での、店頭でのご利用が対象となります。 バーミヤン"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-restaurant-addon-7.5", storeId="shabuyo"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗 全国での以下の店舗での、店頭でのご利用が対象となります。 しゃぶ葉"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-restaurant-addon-7.5", storeId="jonathan"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗 全国での以下の店舗での、店頭でのご利用が対象となります。 ジョナサン"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-restaurant-addon-7.5", storeId="yumetoan"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗 全国での以下の店舗での、店頭でのご利用が対象となります。 夢庵"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-restaurant-addon-7.5", storeId="sukiya"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗 全国での以下の店舗での、店頭でのご利用が対象となります。 すき家"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-restaurant-addon-7.5", storeId="hamazushi"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗 全国での以下の店舗での、店頭でのご利用が対象となります。 はま寿司"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-restaurant-addon-7.5", storeId="cocos"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗 全国での以下の店舗での、店頭でのご利用が対象となります。 ココス"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-restaurant-addon-7.5", storeId="starbucks"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗 全国での以下の店舗での、店頭でのご利用が対象となります。 スターバックス"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-restaurant-addon-7.5", storeId="doutor"`
- confidence: 0.90
- 評価: `evidenceQuote="Vポイント加算対象店舗 全国での以下の店舗での、店頭でのご利用が対象となります。 ドトールコーヒーショップ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

_他 17 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### ⏸ storeAdditionsDisabled (store 追加は手動キュレ運用) (57 件)
理由: 新規 store の追加は cron では行わない方針 (キャンペーン情報の獲得に注力するため)。ここに列挙された店舗は cron が検知した「seed に未追加の店舗候補」で、必要な場合は手動で seed-data-stores.ts に追加 → 次回 cron で関連 membership が自動取り込まれる。全件無視も OK (リストとしての参照のみ)。

<details><summary>展開</summary>

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="allsports-community", name="オールスポーツコミュニティ／スナップスナップ", category="スポーツ"`
- confidence: 0.90
- 評価: `evidenceQuote="オールスポーツコミュニティ／スナップスナップ オールスポーツコミュニティ／スナップスナップ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="autoinfo", name="オート・インフォ", category="車・バイク"`
- confidence: 0.90
- 評価: `evidenceQuote="オート・インフォ: Pontaポイントがたまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="bbon", name="B.B.ON", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="B.B.ON B.B.ON"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="bluechip", name="ブルーチップ", category="生活サービス"`
- confidence: 0.90
- 評価: `evidenceQuote="ブルーチップ ブルーチップ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="camera-no-kitamura-netshop", name="カメラのキタムラネットショップ（カメラ用品）", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="カメラのキタムラネットショップ（カメラ用品） カメラのキタムラネットショップ（カメラ用品）"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="central-park", name="セントラルパーク", category="ショッピングモール"`
- confidence: 0.90
- 評価: `evidenceQuote="セントラルパーク セントラルパーク"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="color-studio-masaya", name="COLOR STUDIO・MASAYA", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="COLOR STUDIO・MASAYA COLOR STUDIO・MASAYA"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="color-studio-masaya-online", name="COLOR STUDIO・MASAYAオンラインショップ", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="COLOR STUDIO・MASAYAオンラインショップ COLOR STUDIO・MASAYAオンラインショップ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="doutor-coffee-shop", name="ドトールコーヒーショップ", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="ドトールコーヒーショップ ドトールコーヒーショップ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="e-best", name="イーベスト", category="家電量販店"`
- confidence: 0.90
- 評価: `evidenceQuote="イーベスト イーベスト"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="ec-current", name="ECカレント", category="家電量販店"`
- confidence: 0.90
- 評価: `evidenceQuote="ECカレント ECカレント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="eneos-denki", name="ＥＮＥＯＳでんき", category="電気・ガス"`
- confidence: 0.90
- 評価: `evidenceQuote="ＥＮＥＯＳでんき ＥＮＥＯＳでんき"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="eneos-toshi-gas", name="ＥＮＥＯＳ都市ガス", category="電気・ガス"`
- confidence: 0.90
- 評価: `evidenceQuote="ＥＮＥＯＳ都市ガス ＥＮＥＯＳ都市ガス"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="festa-garden", name="フェスタガーデン", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="フェスタガーデン フェスタガーデン"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="fujimaru-park", name="藤丸パーク", category="ショッピングモール"`
- confidence: 0.90
- 評価: `evidenceQuote="藤丸パーク 藤丸パーク"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="fuku-yakuhin", name="ふく薬品", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="ふく薬品 ふく薬品"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="geo", name="ゲオ", category="音楽・映像"`
- confidence: 0.90
- 評価: `evidenceQuote="ゲオ: Pontaポイントがたまる・つかえるお店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="grand-buffet", name="グランブッフェ", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="グランブッフェ グランブッフェ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="hakku-drug", name="ハックドラッグ", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="ハックドラッグ ハックドラッグ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="hassen", name="八献", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="八献 八献"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

_他 37 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟡 lowConfidence (48 件)
理由: Gemini の評価で confidence < 0.9。エビデンス不明瞭・推測混入の疑い。

<details><summary>展開</summary>

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="conv-natural-lawson"`
- notes: ローソンは200円(税抜)につき1ポイントが通常。ウェブページに直接記載がないが、他の個別店情報と一致し、Pontaの一般的な還元率であるため、通常ルールとして採用。
- confidence: 0.64
- 評価: `evidenceQuote="ナチュラルローソン: 200円＝1P"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="conv-lawson-store100"`
- notes: ローソンは200円(税抜)につき1ポイントが通常。ウェブページに直接記載がないが、他の個別店情報と一致し、Pontaの一般的な還元率であるため、通常ルールとして採用。
- confidence: 0.64
- 評価: `evidenceQuote="ローソンストア100: 200円＝1P"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="geo"`
- notes: 個別店舗の記述より推測。通常ルールとして採用。
- confidence: 0.64
- 評価: `evidenceQuote="ゲオ: 200円＝1P"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="autobacs"`
- confidence: 0.64
- 評価: `evidenceQuote="オートバックス"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="steak-gusto"`
- confidence: 0.64
- 評価: `evidenceQuote="ステーキガスト"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="karaage-karayoshi"`
- confidence: 0.64
- 評価: `evidenceQuote="から好し"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="musashino-mori-coffee"`
- confidence: 0.64
- 評価: `evidenceQuote="むさしの森珈琲"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="uoya-michi"`
- confidence: 0.64
- 評価: `evidenceQuote="魚屋路"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="grazie-gardens"`
- confidence: 0.64
- 評価: `evidenceQuote="グラッチェガーデンズ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="la-ohana"`
- confidence: 0.64
- 評価: `evidenceQuote="ラ・オハナ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="tonkara-tei"`
- confidence: 0.64
- 評価: `evidenceQuote="とんから亭"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="monana"`
- confidence: 0.64
- 評価: `evidenceQuote="桃菜"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="yumean-shokudo"`
- confidence: 0.64
- 評価: `evidenceQuote="ゆめあん食堂"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="hachiro-soba"`
- confidence: 0.64
- 評価: `evidenceQuote="八郎そば"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="nakau"`
- confidence: 0.64
- 評価: `evidenceQuote="なか卯"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="jolly-pasta"`
- confidence: 0.64
- 評価: `evidenceQuote="ジョリーパスタ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="jukusei-yakiniku-ichiban"`
- confidence: 0.64
- 評価: `evidenceQuote="熟成焼肉いちばん"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="olive-no-oka"`
- confidence: 0.64
- 評価: `evidenceQuote="オリーブの丘"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="katsuan"`
- confidence: 0.64
- 評価: `evidenceQuote="かつ庵"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="kyubeya"`
- confidence: 0.64
- 評価: `evidenceQuote="久兵衛屋"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

_他 28 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 idCollision (12 件)
理由: 新規追加だが既存 ID またはストア名と衝突。重複の可能性あり。

<details><summary>展開</summary>

#### `addRecord/cards` from `orico-card-member-point`
- 内容: `id="orico-the-point", name="orico-the-point", defaultRate=0.01, defaultCurrencyId="orico-pt"`
- confidence: 1.00
- 評価: `evidenceQuote="還元率は常に1.0％以上！100円で1オリコポイントがたまる！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `smbc-vpoint-up`
- 内容: `id="prog-smbc-olive-select-benefit-plus1", name="Olive選べる特典 (+1%)", rate=0.01, currencyId="v-pt", cardIds=["olive"], bonusType="addOn", description="Olive選べる特典で「Vポイントアッププログラム＋1％」を選択で還元率アップ", officialUrl="https://www.smbc.co.jp/kojin/vpoint-up/", conditions="Oliveアカウントの選べる特典で「Vポイントアッププログラム＋1％」をご選択。プラチナプリファードは2つ選択で+2%。"`
- confidence: 0.90
- 評価: `evidenceQuote="Oliveアカウントの選べる特典 ＋1％ Oliveアカウントの選べる特典※で「Vポイントアッププログラム＋1％」をご選択"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `smbc-vpoint-up`
- 内容: `id="prog-smbc-touch-conveni-restaurant-addon-7.5", name="対象コンビニ・飲食店でのスマホタッチ決済・モバイルオーダー利用 (+7.5%)", rate=0.075, currencyId="v-pt", cardIds=["smbc-v","olive"], paymentAppId="pa-visa-touch", bonusType="addOn", description="対象のコンビニ・飲食店でスマホのVisa/Mastercardタッチ決済またはモバイルオーダー利用で+7.5%還元", officialUrl="https://www.smbc.co.jp/kojin/vpoint-up/", conditions="スマホのVisa/Mastercardタッチ決済またはモバイルオーダー利用時のみ。iDも対象。"`
- confidence: 0.90
- 評価: `evidenceQuote="B 対象店舗でスマホのVisaのタッチ決済・Mastercard®タッチ決済またはモバイルオーダーを利用＋7.5％還元"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `smbc-vpoint-up`
- 内容: `id="prog-smbc-family-point-plus-5", name="家族ポイント (+5%)", rate=0.05, currencyId="v-pt", cardIds=["smbc-v","olive"], bonusType="addOn", description="家族ポイントに登録した人数に応じて最大+5%還元", officialUrl="https://www.smbc.co.jp/kojin/vpoint-up/", conditions="家族ポイントに6人以上登録（主会員1人＋従会員5人以上）で+5%。家族ポイントに登録されるご家族は、対象の三井住友カードに入会した本会員さまであり、当サービスに登録することが条件。"`
- confidence: 0.90
- 評価: `evidenceQuote="C 家族ポイントに6人以上登録（主会員1人＋従会員5人以上）＝＋5％還元"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="au-denki", name="auでんき", category="電気・ガス"`
- confidence: 0.90
- 評価: `evidenceQuote="auでんき: Pontaポイントがたまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="au-pay-market", name="au PAY マーケット", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="au PAY マーケット: Pontaポイントがたまる・つかえる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="drug-yutaka", name="ドラッグユタカ", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="ドラッグユタカ ドラッグユタカ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="drugstore-mac", name="ドラッグストアmac", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="ドラッグストアmac ドラッグストアmac"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="new-balance", name="ニューバランス", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="ニューバランス ニューバランス"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="smari", name="スマリ SMARI", category="生活サービス"`
- confidence: 0.90
- 評価: `evidenceQuote="スマリ SMARI: Pontaポイントがたまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="sports-club-renaissance", name="スポーツクラブ ルネサンス", category="スポーツ"`
- confidence: 0.90
- 評価: `evidenceQuote="スポーツクラブ ルネサンス: Pontaポイントがたまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="tsutaya", name="TSUTAYA", category="エンタメ・チケット"`
- confidence: 0.90
- 評価: `evidenceQuote="TSUTAYA TSUTAYA"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

</details>

### 🟠 excludedCategory (10 件)
理由: Policy B: 対象外カテゴリ (金融/保険/医療/ギャンブル等)。自動追加しない。

<details><summary>展開</summary>

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="bitflyer", name="bitFlyer", category="金融"`
- confidence: 0.90
- 評価: `evidenceQuote="bitFlyer bitFlyer"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="creal", name="CREAL", category="金融"`
- confidence: 0.90
- 評価: `evidenceQuote="CREAL CREAL"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="era-lixil-fudosan-shop", name="ERA LIXIL不動産ショップ", category="不動産・住宅"`
- confidence: 0.90
- 評価: `evidenceQuote="ERA LIXIL不動産ショップ ERA LIXIL不動産ショップ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="jihanpi", name="ジハンピ", category="その他"`
- confidence: 0.90
- 評価: `evidenceQuote="ジハンピ ジハンピ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="lixil", name="LIXIL", category="不動産・住宅"`
- confidence: 0.90
- 評価: `evidenceQuote="LIXIL LIXIL"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="mado-shop", name="MADOショップ（YKK AP）", category="不動産・住宅"`
- confidence: 0.90
- 評価: `evidenceQuote="MADOショップ（YKK AP） MADOショップ（YKK AP）"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="oricco", name="オリコ", category="金融"`
- confidence: 0.90
- 評価: `evidenceQuote="オリコ オリコ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="sokuyaku", name="SOKUYAKU", category="医療"`
- confidence: 0.90
- 評価: `evidenceQuote="SOKUYAKU SOKUYAKU"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="tiktok-lite", name="TikTok Lite", category="ネットサービス"`
- confidence: 0.90
- 評価: `evidenceQuote="TikTok Lite TikTok Lite"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="winticket", name="WINTICKET(ウィンチケット)", category="ギャンブル"`
- confidence: 0.90
- 評価: `evidenceQuote="WINTICKET(ウィンチケット): Pontaポイントがたまる・つかえる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

</details>

### ⚫ userBlocked (9 件)
理由: seed-blocklist.ts でユーザが除外指定済み。意図した除外であれば無視してよい。

<details><summary>展開</summary>

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="airbnb", name="Airbnb", category="ホテル"`
- confidence: 0.90
- 評価: `evidenceQuote="Airbnb（エアビーアンドビー） Airbnb（エアビーアンドビー）"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="ana", name="ANA", category="航空"`
- confidence: 0.90
- 評価: `evidenceQuote="ANA ANA"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="au-bookpass", name="auブックパス", category="書店"`
- confidence: 0.90
- 評価: `evidenceQuote="auブックパス: Pontaポイントがたまる・つかえる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="diamond-sha", name="ダイヤモンド社", category="書店"`
- confidence: 0.90
- 評価: `evidenceQuote="ダイヤモンド社: Pontaポイントがたまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="hyundai-mobility-japan", name="Hyundai Mobility Japan", category="車・バイク"`
- confidence: 0.90
- 評価: `evidenceQuote="Hyundai Mobility Japan Hyundai Mobility Japan"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="mercedes-benz", name="メルセデス・ベンツ", category="車・バイク"`
- confidence: 0.90
- 評価: `evidenceQuote="メルセデス・ベンツ メルセデス・ベンツ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="premium-water", name="プレミアムウォーター", category="生活サービス"`
- confidence: 0.90
- 評価: `evidenceQuote="プレミアムウォーター: Pontaポイントがたまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="telasa", name="TELASA（テラサ）", category="音楽・映像"`
- confidence: 0.90
- 評価: `evidenceQuote="TELASA（テラサ）: Pontaポイントがたまる・つかえる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="vip-liner", name="VIPライナー（高速バス）", category="交通"`
- confidence: 0.90
- 評価: `evidenceQuote="VIPライナー（高速バス） VIPライナー（高速バス）"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

</details>

## 操作
- このまま **merge** すると、要レビュー項目を読み込んだ証拠として記録されるだけ (実体 seed 変更はなし)
- 手動キュレートしたい場合は、このブランチに追加 commit してから merge
- 不要なら **close** で次週まで保留