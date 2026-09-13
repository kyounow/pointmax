# 📋 週次マスタ同期: 要レビュー項目

(自動生成 2026-09-14。merge 前に項目を確認してください。)

## サマリ
- 要レビュー: 332 件
- ソース別: epos-tamaru-market=90, jcb-jpoint=139, paypay-campaigns=1, smbc-vpoint-up=38, rakuten-point=8, v-point=41, ponta=12, d-point=2, jal-card-tokuyaku-list=1
- 主な理由: idCollision=33, missingStoreBody=126, lowConfidence=88, missingProgramBody=39, orphanedProgram=1, storeAdditionsDisabled=34, excludedCategory=7, userBlocked=4

## 項目 (理由別)

### 🟠 missingStoreBody (store 本体なし membership) (126 件)
理由: membership 提案だが、参照先 store 本体が seed 未存在 + 同 run の auto 候補にも無い (例: category cap で deferred された場合)。そのまま auto-merge すると孤児 membership (店名解決できない、UI で店舗未表示) が seed に残るため降格。store 本体を手動キュレートで追加するか、次回 cron で store 側が auto 化されるのを待つ。

<details><summary>展開</summary>

#### `mem-57b21ddc94` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="trip.com"`
- confidence: 0.90
- 評価: `evidenceQuote="Trip.com（航空券） エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-57b21ddc94`、不要なら無視

#### `mem-fe63c5068b` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="rakuten-travel"`
- confidence: 0.90
- 評価: `evidenceQuote="楽天トラベル【楽天市場】 エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-fe63c5068b`、不要なら無視

#### `mem-af6ba348ff` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="ticket-pia"`
- confidence: 0.90
- 評価: `evidenceQuote="チケットぴあ エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-af6ba348ff`、不要なら無視

#### `mem-23eee49a66` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="nitori"`
- confidence: 0.90
- 評価: `evidenceQuote="ニトリ 家具・インテリアの通販サイト【楽天市場】 エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-23eee49a66`、不要なら無視

#### `mem-dc0d5e5766` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="bellne"`
- confidence: 0.90
- 評価: `evidenceQuote="ベルメゾン エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-dc0d5e5766`、不要なら無視

#### `mem-6eeafb9ec3` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="etonag"`
- confidence: 0.90
- 評価: `evidenceQuote="「えとはなっ！～干支っ娘・花札バトル～」アプリペイストア エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-6eeafb9ec3`、不要なら無視

#### `mem-adc63dff96` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="grand-summoners"`
- confidence: 0.90
- 評価: `evidenceQuote="「グランドサマナーズ」アプリペイストア エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-adc63dff96`、不要なら無視

#### `mem-89f78be4ff` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="qoo10"`
- confidence: 0.90
- 評価: `evidenceQuote="Qoo10 エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-89f78be4ff`、不要なら無視

#### `mem-b0222e9b7e` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="pal-closet"`
- confidence: 0.90
- 評価: `evidenceQuote="PAL CLOSET エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-b0222e9b7e`、不要なら無視

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

#### `mem-91a607135d` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="apple-store"`
- confidence: 0.90
- 評価: `evidenceQuote="Apple公式サイト エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-91a607135d`、不要なら無視

#### `mem-7ca3bc0903` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="expedia"`
- confidence: 0.90
- 評価: `evidenceQuote="【航空券＋宿泊の同時予約】旅行予約のエクスペディア エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-7ca3bc0903`、不要なら無視

#### `mem-08df7b4039` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="lenovo"`
- confidence: 0.90
- 評価: `evidenceQuote="レノボ・ショッピング エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-08df7b4039`、不要なら無視

#### `mem-834ed88643` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="apa-hotels-resorts"`
- confidence: 0.90
- 評価: `evidenceQuote="アパホテルズ＆リゾーツ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-834ed88643`、不要なら無視

#### `mem-d608cacfa2` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="his"`
- confidence: 0.90
- 評価: `evidenceQuote="HIS（エイチアイエス） エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-d608cacfa2`、不要なら無視

#### `mem-0b983e2061` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-4x", storeId="iherb"`
- confidence: 0.90
- 評価: `evidenceQuote="iHerb（アイハーブ） エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-0b983e2061`、不要なら無視

#### `mem-abf4c4362b` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-4x", storeId="cosme-shopping"`
- confidence: 0.90
- 評価: `evidenceQuote="@cosme SHOPPING エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-abf4c4362b`、不要なら無視

_他 106 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 missingProgramBody (program 本体なし membership) (39 件)
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

#### `mem-3a8935449a` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="conv-7eleven"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート※2、セブン‐イレブン、ポプラ※3、ミニストップ、ローソン※4、マクドナルド、モスバーガー※5、ケンタッキーフライドチキン、フレッシュネスバーガー、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すか"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-3a8935449a`、不要なら無視

#### `mem-650917c0da` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="seicomart"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート※2、セブン‐イレブン、ポプラ※3、ミニストップ、ローソン※4、マクドナルド、モスバーガー※5、ケンタッキーフライドチキン、フレッシュネスバーガー、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すか"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-650917c0da`、不要なら無視

#### `mem-91e17377bb` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="poplar"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート※2、セブン‐イレブン、ポプラ※3、ミニストップ、ローソン※4、マクドナルド、モスバーガー※5、ケンタッキーフライドチキン、フレッシュネスバーガー、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すか"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-91e17377bb`、不要なら無視

#### `mem-843cab8b35` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="conv-ministop"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート※2、セブン‐イレブン、ポプラ※3、ミニストップ、ローソン※4、マクドナルド、モスバーガー※5、ケンタッキーフライドチキン、フレッシュネスバーガー、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すか"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-843cab8b35`、不要なら無視

#### `mem-e5cf7a9170` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="conv-lawson"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート※2、セブン‐イレブン、ポプラ※3、ミニストップ、ローソン※4、マクドナルド、モスバーガー※5、ケンタッキーフライドチキン、フレッシュネスバーガー、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すか"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-e5cf7a9170`、不要なら無視

#### `mem-9bd4684150` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="mcdonalds"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート※2、セブン‐イレブン、ポプラ※3、ミニストップ、ローソン※4、マクドナルド、モスバーガー※5、ケンタッキーフライドチキン、フレッシュネスバーガー、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すか"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-9bd4684150`、不要なら無視

#### `mem-61856cad45` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="mos-burger"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート※2、セブン‐イレブン、ポプラ※3、ミニストップ、ローソン※4、マクドナルド、モスバーガー※5、ケンタッキーフライドチキン、フレッシュネスバーガー、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すか"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-61856cad45`、不要なら無視

#### `mem-905d4d2986` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="kfc"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート※2、セブン‐イレブン、ポプラ※3、ミニストップ、ローソン※4、マクドナルド、モスバーガー※5、ケンタッキーフライドチキン、フレッシュネスバーガー、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すか"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-905d4d2986`、不要なら無視

#### `mem-3c0be52c15` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="yoshinoya"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート※2、セブン‐イレブン、ポプラ※3、ミニストップ、ローソン※4、マクドナルド、モスバーガー※5、ケンタッキーフライドチキン、フレッシュネスバーガー、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すか"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-3c0be52c15`、不要なら無視

#### `mem-8d9aea54d1` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="saizeriya"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート※2、セブン‐イレブン、ポプラ※3、ミニストップ、ローソン※4、マクドナルド、モスバーガー※5、ケンタッキーフライドチキン、フレッシュネスバーガー、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すか"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-8d9aea54d1`、不要なら無視

#### `mem-ef27914a6d` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="gusto"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート※2、セブン‐イレブン、ポプラ※3、ミニストップ、ローソン※4、マクドナルド、モスバーガー※5、ケンタッキーフライドチキン、フレッシュネスバーガー、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すか"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-ef27914a6d`、不要なら無視

#### `mem-7d9069b0cc` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="bamiyan"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート※2、セブン‐イレブン、ポプラ※3、ミニストップ、ローソン※4、マクドナルド、モスバーガー※5、ケンタッキーフライドチキン、フレッシュネスバーガー、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すか"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-7d9069b0cc`、不要なら無視

#### `mem-c3eb20121b` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="shabuyo"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート※2、セブン‐イレブン、ポプラ※3、ミニストップ、ローソン※4、マクドナルド、モスバーガー※5、ケンタッキーフライドチキン、フレッシュネスバーガー、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すか"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-c3eb20121b`、不要なら無視

#### `mem-de9b25f141` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="jonathan"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート※2、セブン‐イレブン、ポプラ※3、ミニストップ、ローソン※4、マクドナルド、モスバーガー※5、ケンタッキーフライドチキン、フレッシュネスバーガー、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すか"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-de9b25f141`、不要なら無視

#### `mem-0ee6235cc2` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="yumetoan"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート※2、セブン‐イレブン、ポプラ※3、ミニストップ、ローソン※4、マクドナルド、モスバーガー※5、ケンタッキーフライドチキン、フレッシュネスバーガー、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すか"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-0ee6235cc2`、不要なら無視

#### `mem-88645ac65c` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="sukiya"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート※2、セブン‐イレブン、ポプラ※3、ミニストップ、ローソン※4、マクドナルド、モスバーガー※5、ケンタッキーフライドチキン、フレッシュネスバーガー、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すか"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-88645ac65c`、不要なら無視

_他 19 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 orphanedProgram (対象店 membership 0 の member-stores program) (1 件)
理由: 新規 member-stores program だが、対象店舗の membership が全て review 降格された (例: store が storeAdditionsDisabled で降格 → membership が missingStoreBody になった)。そのまま program 単独を auto-merge すると、対象店ゼロで一度も発火しない死にデータが seed に残り、member-stores は membership ≥1 の契約テストを apply 後の safety gate で壊す (無関係な auto 変更まで巻き添えで review 降格)。対象店 membership 側の承認と**同時に** `npm run sync:approve` で approve するか、次回 cron で store/membership 側が auto 化されるのを待つこと。

<details><summary>展開</summary>

#### `pro-2d1b0d4372` — `addRecord/programs` from `paypay-campaigns`
- 内容: `id="prog-paypay-u18-2-2026-03", name="＜12〜18歳の方＞PayPay残高へのチャージ＆お支払いでPayPayポイントが最大2％上乗せでもらえるキャンペーン", scope="member-stores", rate=0.02, currencyId="paypay", paymentAppId="pa-paypay", bonusType="addOn", validFrom="2026-03-03", validTo="2026-09-30"`
- notes: 対象者限定キャンペーンですが、対象者が明確であり、特定の店舗での利用が前提となるため抽出しました。
- confidence: 0.95
- 評価: `evidenceQuote="＜12〜18歳の方＞PayPay残高へのチャージ＆お支払いでPayPayポイントが最大2％上乗せでもらえるキャンペーン 2026/3/3 〜 9/30"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-2d1b0d4372`、不要なら無視

</details>

### ⏸ storeAdditionsDisabled (store 追加は手動キュレ運用) (34 件)
理由: 新規 store の追加は cron では行わない方針 (キャンペーン情報の獲得に注力するため)。ここに列挙された店舗は cron が検知した「seed に未追加の店舗候補」で、必要な場合は手動で seed-data-stores.ts に追加 → 次回 cron で関連 membership が自動取り込まれる。全件無視も OK (リストとしての参照のみ)。

<details><summary>展開</summary>

#### `sto-110571e1eb` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="a-puru-gurimu", name="あっぷるぐりむ", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="あっぷるぐりむ：【富山エリア限定】自家製ハンバーグが人気のファミリーレストラン。創業以来変わらぬ味を"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-110571e1eb`、不要なら無視

#### `sto-18286acb97` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="alex", name="アレックス", category="買取"`
- confidence: 0.90
- 評価: `evidenceQuote="アレックス ポイント 5 倍 登録不要"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-18286acb97`、不要なら無視

#### `sto-d0178a9e69` — `addRecord/stores` from `ponta-partners`
- 内容: `id="apanmanshop", name="アパマンショップ", category="引越し・住まい"`
- confidence: 0.90
- 評価: `evidenceQuote="アパマンショップ たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-d0178a9e69`、不要なら無視

#### `sto-c798831ded` — `addRecord/stores` from `ponta-partners`
- 内容: `id="book-coffee-fukuro-shosabo", name="本と珈琲 梟書茶房", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="本と珈琲 梟書茶房 たまる つかえる アプリ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c798831ded`、不要なら無視

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

#### `sto-56d3c247e2` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="daimaru-fujii-central", name="大丸藤井セントラル", category="書籍・文房具"`
- confidence: 0.90
- 評価: `evidenceQuote="大丸藤井セントラル ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-56d3c247e2`、不要なら無視

#### `sto-aedc829b06` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="daishin", name="ダイシン", category="ホームセンター"`
- confidence: 0.90
- 評価: `evidenceQuote="ダイシン ポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-aedc829b06`、不要なら無視

#### `sto-eea54f7c0d` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="disneyplus", name="ディズニープラス", category="サブスクリプション"`
- confidence: 0.90
- 評価: `evidenceQuote="ディズニープラス ポイント 20 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-eea54f7c0d`、不要なら無視

#### `sto-006cca853e` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="dux", name="ダックス", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="ダックス ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-006cca853e`、不要なら無視

#### `sto-68b26f49ef` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="famima", name="ファミマ!!", category="コンビニ"`
- confidence: 0.90
- 評価: `evidenceQuote="ファミマ!!：“Every Life ,Every Fun”をコンセプトにオフィスビルなどで展開するコンビニ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-68b26f49ef`、不要なら無視

#### `sto-c1e323766e` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="fuji-corporation", name="フジ・コーポレーション", category="車・バイク"`
- confidence: 0.90
- 評価: `evidenceQuote="フジ・コーポレーション ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c1e323766e`、不要なら無視

#### `sto-9c1abaa6d9` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="fuku-yakuhin", name="ふく薬品", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="ふく薬品 ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-9c1abaa6d9`、不要なら無視

#### `sto-0370a7d4d1` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="fukudaya-dept", name="福田屋百貨店", category="百貨店"`
- confidence: 0.90
- 評価: `evidenceQuote="福田屋百貨店 ポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-0370a7d4d1`、不要なら無視

#### `sto-d1f7961c49` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="go-taxi", name="タクシーアプリ『GO』", category="交通"`
- confidence: 0.90
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-d1f7961c49`、不要なら無視

#### `sto-75db52f250` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="hakone-kowakien-tenyu", name="箱根小涌園 天悠", category="ホテル"`
- confidence: 0.90
- 評価: `evidenceQuote="箱根小涌園 天悠・伊東 緑涌・伊東小涌園 ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-75db52f250`、不要なら無視

#### `sto-798ef2e6f7` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="hakone-kowakien-yunessun", name="箱根小涌園ユネッサン", category="レジャー・エンタメ"`
- confidence: 0.90
- 評価: `evidenceQuote="箱根小涌園ユネッサン ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-798ef2e6f7`、不要なら無視

#### `sto-f4417b2b29` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="hotel-chinzanso-tokyo", name="ホテル椿山荘東京", category="ホテル"`
- confidence: 0.90
- 評価: `evidenceQuote="ホテル椿山荘東京 ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-f4417b2b29`、不要なら無視

#### `sto-dccd698a30` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="james", name="ジェームス", category="車・バイク"`
- confidence: 0.90
- 評価: `evidenceQuote="ジェームス ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-dccd698a30`、不要なら無視

#### `sto-176ecf4323` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="keio-dept", name="京王百貨店", category="百貨店"`
- confidence: 0.90
- 評価: `evidenceQuote="京王百貨店 ポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-176ecf4323`、不要なら無視

_他 14 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟡 lowConfidence (88 件)
理由: Gemini の評価で confidence < 0.9。エビデンス不明瞭・推測混入の疑い。

<details><summary>展開</summary>

#### `mem-01bb616219` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x", storeId="app-store"`
- confidence: 0.81
- 評価: `evidenceQuote="App Store ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-01bb616219`、不要なら無視

#### `mem-5e77ffdd87` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x", storeId="app-store"`
- confidence: 0.81
- 評価: `evidenceQuote="App Store ポイント 最大 5 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-5e77ffdd87`、不要なら無視

#### `mem-d228d673fb` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x", storeId="google-play"`
- confidence: 0.81
- 評価: `evidenceQuote="Google Play ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-d228d673fb`、不要なら無視

#### `mem-a9a667ea8b` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x", storeId="google-play"`
- confidence: 0.81
- 評価: `evidenceQuote="Google Play ポイント 最大 5 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-a9a667ea8b`、不要なら無視

#### `mem-97c49a3cf0` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-4x", storeId="takashimaya"`
- confidence: 0.81
- 評価: `evidenceQuote="高島屋 ポイント 最大 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-97c49a3cf0`、不要なら無視

#### `mem-aba40adc1b` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-20x", storeId="usj"`
- confidence: 0.81
- 評価: `evidenceQuote="ユニバーサル・スタジオ・ジャパン ポイント 最大 20 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-aba40adc1b`、不要なら無視

#### `mem-cdc669ad51` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-20x", storeId="usj"`
- confidence: 0.81
- 評価: `evidenceQuote="ユニバーサル・スタジオ・ジャパン ポイント 最大 20 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-cdc669ad51`、不要なら無視

#### `mem-a4a75f0b44` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x", storeId="u-next"`
- confidence: 0.81
- 評価: `evidenceQuote="U-NEXT ポイント 最大 5 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-a4a75f0b44`、不要なら無視

#### `mem-27b6d28b88` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x", storeId="u-next"`
- confidence: 0.81
- 評価: `evidenceQuote="U-NEXT ポイント 最大 5 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-27b6d28b88`、不要なら無視

#### `mem-4bacaad273` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-2x", storeId="seijo-ishii"`
- confidence: 0.81
- 評価: `evidenceQuote="成城石井・成城石井.com（オンラインショップ）・Le Bar a Vin ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-4bacaad273`、不要なら無視

#### `mem-008598973a` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-2x", storeId="seijo-ishii"`
- confidence: 0.81
- 評価: `evidenceQuote="成城石井・成城石井.com（オンラインショップ）・Le Bar a Vin ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-008598973a`、不要なら無視

#### `mem-ffa6ea8103` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x", storeId="comic-cmoa"`
- confidence: 0.81
- 評価: `evidenceQuote="コミックシーモア ポイント 最大 5 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-ffa6ea8103`、不要なら無視

#### `mem-ff5c70dc38` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x", storeId="comic-cmoa"`
- confidence: 0.81
- 評価: `evidenceQuote="コミックシーモア ポイント 最大 5 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-ff5c70dc38`、不要なら無視

#### `mem-ffd874d474` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x", storeId="hulu"`
- confidence: 0.81
- 評価: `evidenceQuote="Hulu ポイント 最大 5 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-ffd874d474`、不要なら無視

#### `mem-f7125c4fbe` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x", storeId="hulu"`
- confidence: 0.81
- 評価: `evidenceQuote="Hulu ポイント 最大 5 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-f7125c4fbe`、不要なら無視

#### `mem-6ee3281336` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x", storeId="jcb-travel"`
- confidence: 0.81
- 評価: `evidenceQuote="「JCBトラベル」 JTBや近畿日本ツーリストなど ポイント 最大 5 倍 登録不要"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-6ee3281336`、不要なら無視

#### `mem-d644a378bb` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x", storeId="jcb-travel"`
- confidence: 0.81
- 評価: `evidenceQuote="「JCBトラベル」 JTBや近畿日本ツーリストなど ポイント 最大 5 倍 登録不要"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-d644a378bb`、不要なら無視

#### `mem-894003e4df` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x", storeId="megane-salon-look"`
- confidence: 0.81
- 評価: `evidenceQuote="メガネサロンルック・ルックコンタクト ポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-894003e4df`、不要なら無視

#### `mem-1f2c7f5052` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x", storeId="megane-salon-look"`
- confidence: 0.81
- 評価: `evidenceQuote="メガネサロンルック・ルックコンタクト ポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-1f2c7f5052`、不要なら無視

#### `sto-5371c31061` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="adidas-online-shop", name="adidas ONLINE SHOP", category="ファッション"`
- confidence: 0.81
- 評価: `evidenceQuote="adidas ONLINE SHOP エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-5371c31061`、不要なら無視

_他 68 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 idCollision (33 件)
理由: 新規追加だが既存 ID またはストア名と衝突。重複の可能性あり。

<details><summary>展開</summary>

#### `pro-2a8bfb0d9c` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-5x", name="たまるマーケット (5倍)", scope="member-stores", rate=0.025, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 5倍 (総倍率、EPOS 基本 0.5% × 5 = 実効 2.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="SHEIN エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-2a8bfb0d9c`、不要なら無視

#### `pro-401cce4e15` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-6x", name="たまるマーケット (6倍)", scope="member-stores", rate=0.03, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 6倍 (総倍率、EPOS 基本 0.5% × 6 = 実効 3.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="ロクシタンオンラインショップ エポスポイント 6 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-401cce4e15`、不要なら無視

#### `pro-856899b7a3` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-7x", name="たまるマーケット (7倍)", scope="member-stores", rate=0.035, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 7倍 (総倍率、EPOS 基本 0.5% × 7 = 実効 3.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="adidas ONLINE SHOP エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-856899b7a3`、不要なら無視

#### `pro-1529eb7ba4` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-9x", name="たまるマーケット (9倍)", scope="member-stores", rate=0.045, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 9倍 (総倍率、EPOS 基本 0.5% × 9 = 実効 4.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="ホテルズドットコム エポスポイント 9 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-1529eb7ba4`、不要なら無視

#### `pro-1ee7f714cb` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-10x", name="たまるマーケット (10倍)", scope="member-stores", rate=0.05, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 10倍 (総倍率、EPOS 基本 0.5% × 10 = 実効 5.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="【海外・国内ホテル】旅行予約のエクスペディア エポスポイント 10 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-1ee7f714cb`、不要なら無視

#### `pro-9fe842de66` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-13x", name="たまるマーケット (13倍)", scope="member-stores", rate=0.065, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 13倍 (総倍率、EPOS 基本 0.5% × 13 = 実効 6.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="日比谷花壇 エポスポイント 13 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-9fe842de66`、不要なら無視

#### `pro-a55b012024` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-14x", name="たまるマーケット (14倍)", scope="member-stores", rate=0.07, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 14倍 (総倍率、EPOS 基本 0.5% × 14 = 実効 7.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="資生堂オンラインストア エポスポイント 14 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-a55b012024`、不要なら無視

#### `pro-1a78d239aa` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-17x", name="たまるマーケット (17倍)", scope="member-stores", rate=0.085, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 17倍 (総倍率、EPOS 基本 0.5% × 17 = 実効 8.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="BONAVENTURA エポスポイント 17 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-1a78d239aa`、不要なら無視

#### `pro-0deec3174e` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-18x", name="たまるマーケット (18倍)", scope="member-stores", rate=0.09, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 18倍 (総倍率、EPOS 基本 0.5% × 18 = 実効 9.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="山田養蜂場オンラインショップ エポスポイント 18 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-0deec3174e`、不要なら無視

#### `pro-1ed6d37661` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-28x", name="たまるマーケット (28倍)", scope="member-stores", rate=0.14, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 28倍 (総倍率、EPOS 基本 0.5% × 28 = 実効 14.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="トレンドマイクロ・オンラインショップ エポスポイント 28 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-1ed6d37661`、不要なら無視

#### `pro-a949ec16bf` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-30x", name="たまるマーケット (30倍)", scope="member-stores", rate=0.15, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 30倍 (総倍率、EPOS 基本 0.5% × 30 = 実効 15.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="Adobe Creative Cloud エポスポイント 30 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-a949ec16bf`、不要なら無視

#### `pro-3e40282d1f` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-5x", name="J-POINT パートナー (5倍)", scope="member-stores", rate=0.03, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.81
- 評価: `evidenceQuote="App Store ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-3e40282d1f`、不要なら無視

#### `pro-6b3990a94f` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-5x", name="J-POINT パートナー Gold (5倍)", scope="member-stores", rate=0.025, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.81
- 評価: `evidenceQuote="App Store ポイント 最大 5 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-6b3990a94f`、不要なら無視

#### `pro-5cc8d96a51` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-4x", name="J-POINT パートナー (4倍)", scope="member-stores", rate=0.025, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.81
- 評価: `evidenceQuote="高島屋 ポイント 最大 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-5cc8d96a51`、不要なら無視

#### `pro-157596bab6` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-10x", name="J-POINT パートナー (10倍)", scope="member-stores", rate=0.055, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.81
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-157596bab6`、不要なら無視

#### `pro-a2bfee06a4` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-10x", name="J-POINT パートナー Gold (10倍)", scope="member-stores", rate=0.05, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.81
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-a2bfee06a4`、不要なら無視

#### `pro-2b5ee711ad` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-6x", name="J-POINT パートナー (6倍)", scope="member-stores", rate=0.035, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="オリックスレンタカー ポイント 6 倍 登録不要"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-2b5ee711ad`、不要なら無視

#### `pro-607e69cb99` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-6x", name="J-POINT パートナー Gold (6倍)", scope="member-stores", rate=0.03, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="オリックスレンタカー ポイント 6 倍 登録不要"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-607e69cb99`、不要なら無視

#### `pro-985d5c119e` — `addRecord/programs` from `smbc-vpoint-up`
- 内容: `id="prog-smbc-touch-conveni", name="対象コンビニ・飲食店でスマホのタッチ決済", scope="member-stores", rate=0.075, currencyId="v-pt", cardIds=["smbc-v","olive"], paymentAppId="pa-visa-touch", bonusType="primary", description="対象のコンビニ・飲食店にてOliveでのスマホのタッチ決済が最大+7.5%還元。", officialUrl="https://www.smbc.co.jp/kojin/vpoint-up/", conditions="Visa/Mastercardのタッチ決済利用時のみ。一部対象外店舗・取引あり。"`
- confidence: 0.81
- 評価: `evidenceQuote="対象のコンビニ・飲食店でスマホのタッチ決済 最大＋7.5％還元"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-985d5c119e`、不要なら無視

#### `pro-45b75eeb0a` — `addRecord/programs` from `smbc-vpoint-up`
- 内容: `id="prog-smbc-olive-eraberu", name="Oliveアカウントの選べる特典", scope="all-stores", rate=0.01, currencyId="v-pt", cardIds=["olive"], bonusType="addOn", description="Oliveアカウントの選べる特典で「Vポイントアッププログラム＋1％」を選択すると、対象店舗で+1%還元。", officialUrl="https://www.smbc.co.jp/kojin/vpoint-up/", conditions="Oliveアカウントの選べる特典で「Vポイントアッププログラム＋1％」を選択時。Olive プラチナプリファードは2つ選択で+2%還元。"`
- confidence: 0.08
- 評価: `evidenceQuote="Oliveアカウントの選べる特典 ＋1％ Oliveアカウントの選べる特典※で「Vポイントアッププログラム＋1％」をご選択"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-45b75eeb0a`、不要なら無視

_他 13 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 excludedCategory (7 件)
理由: Policy B: 対象外カテゴリ (金融/保険/医療/ギャンブル等)。自動追加しない。

<details><summary>展開</summary>

#### `sto-3d9414fb45` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="adobe-creative-cloud", name="Adobe Creative Cloud", category="ネットサービス"`
- confidence: 0.81
- 評価: `evidenceQuote="Adobe Creative Cloud エポスポイント 30 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-3d9414fb45`、不要なら無視

#### `sto-1d0cf4c10d` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="app-store", name="App Store", category="ネットサービス"`
- confidence: 0.81
- 評価: `evidenceQuote="App Store ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-1d0cf4c10d`、不要なら無視

#### `sto-5f344fbfa8` — `addRecord/stores` from `ponta-partners`
- 内容: `id="dmm-keirin", name="DMM競輪", category="ギャンブル"`
- confidence: 0.90
- 評価: `evidenceQuote="DMM競輪 たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-5f344fbfa8`、不要なら無視

#### `sto-ecd17144df` — `addRecord/stores` from `v-point-partners`
- 内容: `id="epark-kusuri-no-madoguchi", name="EPARK くすりの窓口", category="医療"`
- confidence: 0.81
- 評価: `evidenceQuote="EPARK くすりの窓口"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-ecd17144df`、不要なら無視

#### `sto-bbf1431215` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="google-play", name="Google Play", category="ネットサービス"`
- confidence: 0.81
- 評価: `evidenceQuote="Google Play ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-bbf1431215`、不要なら無視

#### `sto-b64d43f660` — `addRecord/stores` from `v-point-partners`
- 内容: `id="sokuyaku", name="SOKUYAKU", category="医療"`
- confidence: 0.81
- 評価: `evidenceQuote="SOKUYAKU"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-b64d43f660`、不要なら無視

#### `sto-8e2f229327` — `addRecord/stores` from `ponta-partners`
- 内容: `id="winticket", name="WINTICKET", category="ギャンブル"`
- confidence: 0.90
- 評価: `evidenceQuote="WINTICKET(ウィンチケット) たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-8e2f229327`、不要なら無視

</details>

### ⚫ userBlocked (4 件)
理由: seed-blocklist.ts でユーザが除外指定済み。意図した除外であれば無視してよい。

<details><summary>展開</summary>

#### `sto-0835d85432` — `addRecord/stores` from `v-point-partners`
- 内容: `id="ana", name="ANA", category="交通"`
- confidence: 0.81
- 評価: `evidenceQuote="ANA"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-0835d85432`、不要なら無視

#### `sto-2b599ab741` — `addRecord/stores` from `ponta-partners`
- 内容: `id="au-bookpass", name="auブックパス", category="書店"`
- confidence: 0.90
- 評価: `evidenceQuote="auブックパス たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-2b599ab741`、不要なら無視

#### `sto-47a9824577` — `addRecord/stores` from `v-point-partners`
- 内容: `id="hyundai-mobility-japan", name="Hyundai Mobility Japan", category="車・バイク"`
- confidence: 0.81
- 評価: `evidenceQuote="Hyundai Mobility Japan"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-47a9824577`、不要なら無視

#### `sto-ec2a8575ea` — `addRecord/stores` from `v-point-partners`
- 内容: `id="mercedes-benz", name="メルセデス・ベンツ", category="車・バイク"`
- confidence: 0.81
- 評価: `evidenceQuote="メルセデス・ベンツ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-ec2a8575ea`、不要なら無視

</details>

## 操作
- **取り込みたい項目がある場合 (半自動)**: ローカルでこのブランチを checkout し、`npm run sync:approve -- <ID> [<ID> ...]` を実行 (ID は各項目見出しの先頭)。seed-additions.ts への反映・queue からの除去・REVIEW_QUEUE.md の再生成まで自動。`npm run sync:approve -- --list` で一覧表示。実行後 `npm test && npm run build` を確認して commit
- このまま **merge** すると、要レビュー項目を読み込んだ証拠として記録されるだけ (実体 seed 変更はなし)
- 手動キュレートしたい場合は、このブランチに追加 commit してから merge
- 不要なら **close** で次週まで保留