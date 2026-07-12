# 📋 週次マスタ同期: 要レビュー項目

(自動生成 2026-07-13。merge 前に項目を確認してください。)

## サマリ
- 要レビュー: 93 件
- ソース別: orico-card-member-point=1, rakuten-point=24, ponta=35, v-point=32, jal-card-tokuyaku-list=1
- 主な理由: idCollision=7, missingStoreBody=9, excludedCategory=22, userBlocked=6, lowConfidence=28, storeAdditionsDisabled=21

## 項目 (理由別)

### 🟠 missingStoreBody (store 本体なし membership) (9 件)
理由: membership 提案だが、参照先 store 本体が seed 未存在 + 同 run の auto 候補にも無い (例: category cap で deferred された場合)。そのまま auto-merge すると孤児 membership (店名解決できない、UI で店舗未表示) が seed に残るため降格。store 本体を手動キュレートで追加するか、次回 cron で store 側が auto 化されるのを待つ。

<details><summary>展開</summary>

#### `mem-91efdb6ae4` — `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="self-tsutsuji-no-sato-ss"`
- notes: 給油2Lにつき1ポイント
- confidence: 0.90
- 評価: `evidenceQuote="株式会社サンネクスト セルフつつじの里SS：給油２L＝１ポイント貯まる！"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-91efdb6ae4`、不要なら無視

#### `mem-4cc1510988` — `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="mandaiya-mukou-higashi-ss"`
- notes: 給油2Lにつき1ポイント
- confidence: 0.90
- 評価: `evidenceQuote="株式会社万代屋 向東給油所：給油２L＝１ポイント貯まる！"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-4cc1510988`、不要なら無視

#### `mem-455d881e18` — `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="tamaya-sekiyu-mikuni-ekimae-ss"`
- notes: 給油2Lにつき1ポイント
- confidence: 0.90
- 評価: `evidenceQuote="株式会社玉谷石油店 三国駅前給油所：給油２L＝１ポイント貯まる！"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-455d881e18`、不要なら無視

#### `mem-162c3d9f9a` — `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="tomobe-shouten-ogawa-ss"`
- notes: 給油2Lにつき1ポイント
- confidence: 0.90
- 評価: `evidenceQuote="友部商店 小川町給油所：給油２L＝１ポイント貯まる！"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-162c3d9f9a`、不要なら無視

#### `mem-8e3ffc3dab` — `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="ueno-yugyo-self-yakage-ss"`
- notes: 給油2Lにつき1ポイント
- confidence: 0.90
- 評価: `evidenceQuote="上野油業株式会社 セルフ矢掛給油所：給油２L＝１ポイント貯まる！"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-8e3ffc3dab`、不要なら無視

#### `mem-d00714e9e7` — `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="ueno-yugyo-self-mabi-ss"`
- notes: 給油2Lにつき1ポイント
- confidence: 0.90
- 評価: `evidenceQuote="上野油業株式会社 セルフ真備給油所：給油２L＝１ポイント貯まる！"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-d00714e9e7`、不要なら無視

#### `mem-0fe6a6b415` — `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="heiwa-auto-living-lapitpro-kasugai-ss"`
- notes: 給油2Lにつき1ポイント
- confidence: 0.90
- 評価: `evidenceQuote="平和オートリビング株式会社 LaPitPro春日井SS：給油２L＝１ポイント貯まる！"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-0fe6a6b415`、不要なら無視

#### `mem-856f11b2d5` — `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="ito-chukan-sakai-ichijo-ss"`
- notes: 給油2Lにつき1ポイント
- confidence: 0.90
- 評価: `evidenceQuote="株式会社イトー 中環堺一条給油所：給油２L＝１ポイント貯まる！"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-856f11b2d5`、不要なら無視

#### `mem-3ab1b07f0d` — `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="toyo-kusan-carland-self-takao-ss"`
- notes: 給油2Lにつき1ポイント
- confidence: 0.90
- 評価: `evidenceQuote="東洋興産株式会社 カーランドセルフ鷹尾店：給油２L＝１ポイント貯まる！"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-3ab1b07f0d`、不要なら無視

</details>

### ⏸ storeAdditionsDisabled (store 追加は手動キュレ運用) (21 件)
理由: 新規 store の追加は cron では行わない方針 (キャンペーン情報の獲得に注力するため)。ここに列挙された店舗は cron が検知した「seed に未追加の店舗候補」で、必要な場合は手動で seed-data-stores.ts に追加 → 次回 cron で関連 membership が自動取り込まれる。全件無視も OK (リストとしての参照のみ)。

<details><summary>展開</summary>

#### `sto-e44d4e4655` — `addRecord/stores` from `v-point-partners`
- 内容: `id="autobacs-dot-com", name="オートバックス・ドットコム", category="車・バイク"`
- confidence: 0.90
- 評価: `evidenceQuote="オートバックス・ドットコム"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-e44d4e4655`、不要なら無視

#### `sto-85b41fa656` — `addRecord/stores` from `v-point-partners`
- 内容: `id="bb-on", name="B.B.ON", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="B.B.ON"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-85b41fa656`、不要なら無視

#### `sto-9cc5938459` — `addRecord/stores` from `v-point-partners`
- 内容: `id="color-studio-masaya", name="COLOR STUDIO・MASAYA", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="COLOR STUDIO・MASAYA"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-9cc5938459`、不要なら無視

#### `sto-689eee2002` — `addRecord/stores` from `v-point-partners`
- 内容: `id="eneos-denki", name="ＥＮＥＯＳでんき", category="電気・ガス"`
- confidence: 0.90
- 評価: `evidenceQuote="ＥＮＥＯＳでんき"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-689eee2002`、不要なら無視

#### `sto-de83cafdd8` — `addRecord/stores` from `v-point-partners`
- 内容: `id="eneos-gas", name="ＥＮＥＯＳ都市ガス", category="電気・ガス"`
- confidence: 0.90
- 評価: `evidenceQuote="ＥＮＥＯＳ都市ガス"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-de83cafdd8`、不要なら無視

#### `sto-2dcfca26ce` — `addRecord/stores` from `v-point-partners`
- 内容: `id="fuku-yakuhin", name="ふく薬品", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="ふく薬品"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-2dcfca26ce`、不要なら無視

#### `sto-ff1cedb307` — `addRecord/stores` from `v-point-partners`
- 内容: `id="hac-drug", name="ハックドラッグ", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="ハックドラッグ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-ff1cedb307`、不要なら無視

#### `sto-377f1f788c` — `addRecord/stores` from `v-point-partners`
- 内容: `id="happy-drug", name="ハッピー・ドラッグ", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="ハッピー・ドラッグ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-377f1f788c`、不要なら無視

#### `sto-b659b1fbfa` — `addRecord/stores` from `v-point-partners`
- 内容: `id="kagoshima-takamaki-country-club", name="鹿児島高牧カントリークラブ", category="スポーツ"`
- confidence: 0.90
- 評価: `evidenceQuote="鹿児島高牧カントリークラブ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-b659b1fbfa`、不要なら無視

#### `sto-688775e4cf` — `addRecord/stores` from `v-point-partners`
- 内容: `id="kagu-no-taishodo", name="家具の大正堂", category="家具・インテリア"`
- confidence: 0.90
- 評価: `evidenceQuote="家具の大正堂"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-688775e4cf`、不要なら無視

#### `sto-41b2269259` — `addRecord/stores` from `v-point-partners`
- 内容: `id="kitamura-shashinki", name="北村写真機店", category="カメラ・写真"`
- confidence: 0.90
- 評価: `evidenceQuote="北村写真機店"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-41b2269259`、不要なら無視

#### `sto-a45b2bf403` — `addRecord/stores` from `v-point-partners`
- 内容: `id="kokumin", name="コクミン", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="コクミン"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-a45b2bf403`、不要なら無視

#### `sto-cc9a702df0` — `addRecord/stores` from `v-point-partners`
- 内容: `id="konko-yakuhin", name="金光薬品", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="金光薬品"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-cc9a702df0`、不要なら無視

#### `sto-663ca9d8e3` — `addRecord/stores` from `v-point-partners`
- 内容: `id="maruzen", name="丸善", category="書店"`
- confidence: 0.90
- 評価: `evidenceQuote="丸善"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-663ca9d8e3`、不要なら無視

#### `sto-321fa710e9` — `addRecord/stores` from `v-point-partners`
- 内容: `id="narcis", name="NARCIS", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="NARCIS"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-321fa710e9`、不要なら無視

#### `sto-70db46aac2` — `addRecord/stores` from `v-point-partners`
- 内容: `id="seibunkan-shoten", name="精文館書店", category="書店"`
- confidence: 0.90
- 評価: `evidenceQuote="精文館書店"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-70db46aac2`、不要なら無視

#### `sto-f0726fec17` — `addRecord/stores` from `v-point-partners`
- 内容: `id="studio-mario", name="スタジオマリオ（写真館）", category="カメラ・写真"`
- confidence: 0.90
- 評価: `evidenceQuote="スタジオマリオ（写真館）"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-f0726fec17`、不要なら無視

#### `sto-da05b0610a` — `addRecord/stores` from `v-point-partners`
- 内容: `id="takahashi", name="タカハシ", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="タカハシ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-da05b0610a`、不要なら無視

#### `sto-968bd3a074` — `addRecord/stores` from `v-point-partners`
- 内容: `id="taya", name="TAYA", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="TAYA"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-968bd3a074`、不要なら無視

#### `sto-4fdc46f4f7` — `addRecord/stores` from `v-point-partners`
- 内容: `id="tiktok-lite", name="TikTok Lite", category="ネットサービスのみ"`
- confidence: 0.90
- 評価: `evidenceQuote="TikTok Lite"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-4fdc46f4f7`、不要なら無視

_他 1 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟡 lowConfidence (28 件)
理由: Gemini の評価で confidence < 0.9。エビデンス不明瞭・推測混入の疑い。

<details><summary>展開</summary>

#### `sto-b5d098f6c2` — `addRecord/stores` from `ponta-partners`
- 内容: `id="au", name="au", category="通信"`
- confidence: 0.81
- 評価: `evidenceQuote="au たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-b5d098f6c2`、不要なら無視

#### `sto-b8bcf0b8dc` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="beaver-pro", name="ビーバープロ", category="ホームセンター"`
- confidence: 0.81
- 評価: `evidenceQuote="ビーバープロ：職人さんの店"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-b8bcf0b8dc`、不要なら無視

#### `sto-52d17f3abb` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="beaver-tozan", name="ビーバートザン", category="ホームセンター"`
- confidence: 0.81
- 評価: `evidenceQuote="ビーバートザン：オールラウンドな品揃えのホームセンター"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-52d17f3abb`、不要なら無視

#### `sto-370ca21e71` — `addRecord/stores` from `ponta-partners`
- 内容: `id="book-coffee-fukuroshosabo", name="本と珈琲 梟書茶房", category="飲食"`
- confidence: 0.81
- 評価: `evidenceQuote="本と珈琲 梟書茶房 たまる つかえる アプリ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-370ca21e71`、不要なら無視

#### `sto-dd070a9fb1` — `addRecord/stores` from `ponta-partners`
- 内容: `id="caromama-plus", name="カロママ プラス", category="生活サービス"`
- confidence: 0.81
- 評価: `evidenceQuote="カロママ プラス たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-dd070a9fb1`、不要なら無視

#### `sto-c5b26c0fbe` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="cheese-doria-sweets", name="チーズ＆ドリア.スイーツ", category="飲食"`
- confidence: 0.81
- 評価: `evidenceQuote="チーズ＆ドリア.スイーツ：計50種類以上の料理でチーズを五感でお楽しみいただけます！"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c5b26c0fbe`、不要なら無視

#### `sto-f17ed9e257` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="daishin", name="ダイシン", category="ホームセンター"`
- confidence: 0.81
- 評価: `evidenceQuote="ダイシン：アイリスオーヤマ商品が揃っている家電ホームセンター"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-f17ed9e257`、不要なら無視

#### `sto-2f81d408c1` — `addRecord/stores` from `ponta-partners`
- 内容: `id="denki-no-hikaku-insweb", name="でんきの比較インズウェブ", category="電気・ガス"`
- confidence: 0.81
- 評価: `evidenceQuote="でんきの比較インズウェブ たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-2f81d408c1`、不要なら無視

#### `sto-a8f9ed4cce` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="food-market-mam", name="フードマーケット マム", category="スーパー"`
- confidence: 0.81
- 評価: `evidenceQuote="フードマーケット マム：「よい物を毎日、どこよりも安く。」買い物かごいっぱいの安さをお届けします！"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-a8f9ed4cce`、不要なら無視

#### `sto-bc4224cef4` — `addRecord/stores` from `ponta-partners`
- 内容: `id="gas-one", name="ガスワン（株式会社サイサン）", category="電気・ガス"`
- confidence: 0.81
- 評価: `evidenceQuote="ガスワン（株式会社サイサン） たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-bc4224cef4`、不要なら無視

#### `sto-4b02b532cb` — `addRecord/stores` from `ponta-partners`
- 内容: `id="geo-stores", name="ゲオ", category="音楽・映像"`
- confidence: 0.81
- 評価: `evidenceQuote="ゲオ たまる つかえる アプリ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-4b02b532cb`、不要なら無視

#### `sto-3e9157dffc` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="hard-stock", name="Hard Stock", category="ホームセンター"`
- confidence: 0.81
- 評価: `evidenceQuote="Hard Stock：県下最大級のハードウェア専門店"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-3e9157dffc`、不要なら無視

#### `sto-4e6f72f454` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="hello-day", name="ハローデイ", category="スーパー"`
- confidence: 0.81
- 評価: `evidenceQuote="ハローデイ：笑顔から始まる、楽しい食卓。スーパーマーケット・ハローデイです。"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-4e6f72f454`、不要なら無視

#### `sto-fa0476f962` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="home-assist", name="Home Assist", category="ホームセンター"`
- confidence: 0.81
- 評価: `evidenceQuote="Home Assist：夢をカタチに！創るよろこび！"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-fa0476f962`、不要なら無視

#### `sto-03c370ada4` — `addRecord/stores` from `ponta-partners`
- 内容: `id="japan-airlines", name="日本航空(JALマイレージバンク)", category="交通"`
- confidence: 0.81
- 評価: `evidenceQuote="日本航空(JALマイレージバンク) たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-03c370ada4`、不要なら無視

#### `sto-9072fdf708` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="kanehide-zipmart", name="かねひでジップマート", category="スーパー"`
- confidence: 0.81
- 評価: `evidenceQuote="かねひでジップマート：地元に貢献するNo.1企業を目指してより便利に身近な毎日の暮らしをサポートする生鮮強化の地域密着型スーパー"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-9072fdf708`、不要なら無視

#### `sto-eecd1c093e` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="keio-store", name="京王ストア", category="スーパー"`
- confidence: 0.81
- 評価: `evidenceQuote="京王ストア：ベーシックな食料品を主体とした品揃えで、デイリーユースにお応えする店舗です。"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-eecd1c093e`、不要なら無視

#### `sto-6a9978e878` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="keio-store-express", name="京王ストアエクスプレス", category="スーパー"`
- confidence: 0.81
- 評価: `evidenceQuote="京王ストアエクスプレス：駅ナカ・駅前のスーパーマーケットとして、利便性のニーズにお応えする店舗です。"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-6a9978e878`、不要なら無視

#### `sto-9f96a18f81` — `addRecord/stores` from `ponta-partners`
- 内容: `id="life-net", name="Life Net", category="生活サービス"`
- confidence: 0.81
- 評価: `evidenceQuote="Life Net たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-9f96a18f81`、不要なら無視

#### `sto-f9245923f6` — `addRecord/stores` from `ponta-partners`
- 内容: `id="nippon-road-service", name="日本ロードサービス（JRS）", category="生活サービス"`
- confidence: 0.81
- 評価: `evidenceQuote="日本ロードサービス（JRS） たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-f9245923f6`、不要なら無視

_他 8 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 idCollision (7 件)
理由: 新規追加だが既存 ID またはストア名と衝突。重複の可能性あり。

<details><summary>展開</summary>

#### `car-f6b1801b27` — `addRecord/cards` from `orico-card-member-point`
- 内容: `id="orico-the-point", name="orico-the-point", defaultRate=0.01, defaultCurrencyId="orico-pt"`
- confidence: 1.00
- 評価: `evidenceQuote="還元率は常に1.0％以上！100円で1オリコポイントがたまる！"`
- 対応案: 取り込むなら `npm run sync:approve -- car-f6b1801b27`、不要なら無視

#### `sto-fa7c33d57d` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="baguette", name="バケット", category="飲食"`
- confidence: 0.81
- 評価: `evidenceQuote="バケット：自慢の料理と13種類の焼き立てパンで皆様をお迎えします。"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-fa7c33d57d`、不要なら無視

#### `sto-fbe2a9127f` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="big-boy", name="ビッグボーイ", category="飲食"`
- confidence: 0.81
- 評価: `evidenceQuote="ビッグボーイ：アツアツの大俵ハンバーグやジューシーなステーキをどうぞ。"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-fbe2a9127f`、不要なら無視

#### `sto-4093d2ce98` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="bistro309", name="BISTRO309", category="飲食"`
- confidence: 0.81
- 評価: `evidenceQuote="BISTRO309：自慢の料理と13種類の焼き立てパンで皆様をお迎えします。"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-4093d2ce98`、不要なら無視

#### `sto-73713eead8` — `addRecord/stores` from `v-point-partners`
- 内容: `id="lens-style", name="レンズスタイル", category="コンタクト"`
- confidence: 0.90
- 評価: `evidenceQuote="レンズスタイル"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-73713eead8`、不要なら無視

#### `sto-76633949f7` — `addRecord/stores` from `v-point-partners`
- 内容: `id="new-balance-store", name="ニューバランス", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="ニューバランス"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-76633949f7`、不要なら無視

#### `sto-bc3c4190d9` — `addRecord/stores` from `jal-card-tokuyaku-list`
- 内容: `id="royal-host", name="ロイヤルホスト", category="JAL特約店"`
- confidence: 0.85
- 評価: `evidenceQuote="ロイヤルホスト JAL CARD 決済でマイルが2倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-bc3c4190d9`、不要なら無視

</details>

### 🟠 excludedCategory (22 件)
理由: Policy B: 対象外カテゴリ (金融/保険/医療/ギャンブル等)。自動追加しない。

<details><summary>展開</summary>

#### `sto-fcde9f457a` — `addRecord/stores` from `ponta-partners`
- 内容: `id="aflac", name="アフラック", category="保険"`
- confidence: 0.81
- 評価: `evidenceQuote="アフラック たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-fcde9f457a`、不要なら無視

#### `sto-211218286e` — `addRecord/stores` from `ponta-partners`
- 内容: `id="air-card", name="Airカード", category="金融"`
- confidence: 0.81
- 評価: `evidenceQuote="Airカード たまる リクルートID"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-211218286e`、不要なら無視

#### `sto-07ca37ce7c` — `addRecord/stores` from `ponta-partners`
- 内容: `id="apamanshop", name="アパマンショップ", category="不動産・住宅"`
- confidence: 0.81
- 評価: `evidenceQuote="アパマンショップ たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-07ca37ce7c`、不要なら無視

#### `sto-19b4c22e69` — `addRecord/stores` from `v-point-partners`
- 内容: `id="aplus", name="アプラス", category="金融"`
- confidence: 0.90
- 評価: `evidenceQuote="アプラス"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-19b4c22e69`、不要なら無視

#### `sto-b926afc863` — `addRecord/stores` from `ponta-partners`
- 内容: `id="au-no-seimeihoken", name="auの生命ほけん", category="保険"`
- confidence: 0.81
- 評価: `evidenceQuote="auの生命ほけん たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-b926afc863`、不要なら無視

#### `sto-9bb64136c6` — `addRecord/stores` from `ponta-partners`
- 内容: `id="au-pay-card", name="au PAY カード", category="金融"`
- confidence: 0.81
- 評価: `evidenceQuote="au PAY カード たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-9bb64136c6`、不要なら無視

#### `sto-078eef3ebc` — `addRecord/stores` from `v-point-partners`
- 内容: `id="central-park", name="セントラルパーク", category="その他"`
- confidence: 0.90
- 評価: `evidenceQuote="セントラルパーク"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-078eef3ebc`、不要なら無視

#### `sto-d695b2b5f7` — `addRecord/stores` from `v-point-partners`
- 内容: `id="club-netz", name="クラブネッツ", category="その他"`
- confidence: 0.90
- 評価: `evidenceQuote="クラブネッツ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-d695b2b5f7`、不要なら無視

#### `sto-2a933b47f4` — `addRecord/stores` from `ponta-partners`
- 内容: `id="daiwa-connect-securities", name="大和コネクト証券", category="金融"`
- confidence: 0.81
- 評価: `evidenceQuote="大和コネクト証券 たまる つかえる アプリ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-2a933b47f4`、不要なら無視

#### `sto-32136384d0` — `addRecord/stores` from `ponta-partners`
- 内容: `id="dental-ponta", name="Dental Ponta", category="医療"`
- confidence: 0.81
- 評価: `evidenceQuote="Dental Ponta たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-32136384d0`、不要なら無視

#### `sto-8949b8f43a` — `addRecord/stores` from `ponta-partners`
- 内容: `id="exchangers", name="Exchangers", category="金融"`
- confidence: 0.81
- 評価: `evidenceQuote="Exchangers たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-8949b8f43a`、不要なら無視

#### `sto-f39c60bdef` — `addRecord/stores` from `v-point-partners`
- 内容: `id="fujimaru-park", name="藤丸パーク", category="その他"`
- confidence: 0.90
- 評価: `evidenceQuote="藤丸パーク"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-f39c60bdef`、不要なら無視

#### `sto-032f25b7ba` — `addRecord/stores` from `v-point-partners`
- 内容: `id="hitachi-kashiwa-reysol", name="日立柏レイソル", category="その他"`
- confidence: 0.90
- 評価: `evidenceQuote="日立柏レイソル"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-032f25b7ba`、不要なら無視

#### `sto-d0aba15940` — `addRecord/stores` from `ponta-partners`
- 内容: `id="hoken-de-ponta", name="保険 de Ponta", category="保険"`
- confidence: 0.81
- 評価: `evidenceQuote="保険 de Ponta たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-d0aba15940`、不要なら無視

#### `sto-30e7f6602e` — `addRecord/stores` from `v-point-partners`
- 内容: `id="la-cittadella", name="ラ チッタデッラ", category="その他"`
- confidence: 0.90
- 評価: `evidenceQuote="ラ チッタデッラ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-30e7f6602e`、不要なら無視

#### `sto-aa2ccb2481` — `addRecord/stores` from `v-point-partners`
- 内容: `id="medical-system-network", name="メディカルシステムネットワーク", category="医療"`
- confidence: 0.90
- 評価: `evidenceQuote="メディカルシステムネットワーク"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-aa2ccb2481`、不要なら無視

#### `sto-90ca24b19b` — `addRecord/stores` from `ponta-partners`
- 内容: `id="ponta-kantan-hoken", name="Pontaかんたん保険", category="保険"`
- confidence: 0.81
- 評価: `evidenceQuote="Pontaかんたん保険 たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-90ca24b19b`、不要なら無視

#### `sto-5db394c6e0` — `addRecord/stores` from `ponta-partners`
- 内容: `id="sokuyaku", name="SOKUYAKU", category="医療"`
- confidence: 0.81
- 評価: `evidenceQuote="SOKUYAKU たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-5db394c6e0`、不要なら無視

#### `sto-df93d362e1` — `addRecord/stores` from `v-point-partners`
- 内容: `id="sompo-himawari-life", name="ＳＯＭＰＯひまわり生命", category="保険"`
- confidence: 0.90
- 評価: `evidenceQuote="ＳＯＭＰＯひまわり生命"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-df93d362e1`、不要なら無視

#### `sto-dd1a183a31` — `addRecord/stores` from `v-point-partners`
- 内容: `id="toshin-hearing-aid", name="トーシン補聴器センター", category="医療"`
- confidence: 0.90
- 評価: `evidenceQuote="トーシン補聴器センター"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-dd1a183a31`、不要なら無視

_他 2 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### ⚫ userBlocked (6 件)
理由: seed-blocklist.ts でユーザが除外指定済み。意図した除外であれば無視してよい。

<details><summary>展開</summary>

#### `sto-3ece2710cf` — `addRecord/stores` from `ponta-partners`
- 内容: `id="aquaclara", name="アクアクララ", category="生活サービス"`
- confidence: 0.81
- 評価: `evidenceQuote="アクアクララ たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-3ece2710cf`、不要なら無視

#### `sto-6b9a5282b2` — `addRecord/stores` from `ponta-partners`
- 内容: `id="au-bookpass", name="auブックパス", category="書斎"`
- confidence: 0.81
- 評価: `evidenceQuote="auブックパス たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-6b9a5282b2`、不要なら無視

#### `sto-81eec91cec` — `addRecord/stores` from `ponta-partners`
- 内容: `id="diamond-sha", name="ダイヤモンド社", category="書斎"`
- confidence: 0.81
- 評価: `evidenceQuote="ダイヤモンド社 たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-81eec91cec`、不要なら無視

#### `sto-6bc012458c` — `addRecord/stores` from `ponta-partners`
- 内容: `id="enewan", name="エネワン（株式会社サイサン）", category="電気・ガス"`
- confidence: 0.81
- 評価: `evidenceQuote="エネワン（株式会社サイサン） たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-6bc012458c`、不要なら無視

#### `sto-82f0c12946` — `addRecord/stores` from `ponta-partners`
- 内容: `id="president-sha", name="プレジデント社", category="書斎"`
- confidence: 0.81
- 評価: `evidenceQuote="プレジデント社 たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-82f0c12946`、不要なら無視

#### `sto-efaa813404` — `addRecord/stores` from `ponta-partners`
- 内容: `id="telasa", name="TELASA（テラサ）", category="音楽・映像"`
- confidence: 0.81
- 評価: `evidenceQuote="TELASA（テラサ） たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-efaa813404`、不要なら無視

</details>

## 操作
- **取り込みたい項目がある場合 (半自動)**: ローカルでこのブランチを checkout し、`npm run sync:approve -- <ID> [<ID> ...]` を実行 (ID は各項目見出しの先頭)。seed-additions.ts への反映・queue からの除去・REVIEW_QUEUE.md の再生成まで自動。`npm run sync:approve -- --list` で一覧表示。実行後 `npm test && npm run build` を確認して commit
- このまま **merge** すると、要レビュー項目を読み込んだ証拠として記録されるだけ (実体 seed 変更はなし)
- 手動キュレートしたい場合は、このブランチに追加 commit してから merge
- 不要なら **close** で次週まで保留