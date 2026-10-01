# 📋 週次マスタ同期: 要レビュー項目

(自動生成 2026-10-01。merge 前に項目を確認してください。)

## サマリ
- 要レビュー: 281 件
- ソース別: epos-tamaru-market=93, jcb-jpoint=148, smbc-vpoint-up=40
- 主な理由: idCollision=23, missingStoreBody=125, lowConfidence=53, missingProgramBody=40, excludedCategory=8, storeAdditionsDisabled=32

## 項目 (理由別)

### 🟠 missingStoreBody (store 本体なし membership) (125 件)
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

_他 105 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 missingProgramBody (program 本体なし membership) (40 件)
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

#### `mem-ef27914a6d` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="gusto"`
- confidence: 0.90
- 評価: `evidenceQuote="ガスト"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-ef27914a6d`、不要なら無視

#### `mem-7d9069b0cc` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="bamiyan"`
- confidence: 0.90
- 評価: `evidenceQuote="バーミヤン"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-7d9069b0cc`、不要なら無視

#### `mem-c3eb20121b` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="shabuyo"`
- confidence: 0.90
- 評価: `evidenceQuote="しゃぶ葉"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-c3eb20121b`、不要なら無視

#### `mem-de9b25f141` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="jonathan"`
- confidence: 0.90
- 評価: `evidenceQuote="ジョナサン"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-de9b25f141`、不要なら無視

#### `mem-0ee6235cc2` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="yumetoan"`
- confidence: 0.90
- 評価: `evidenceQuote="夢庵"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-0ee6235cc2`、不要なら無視

#### `mem-88645ac65c` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="sukiya"`
- confidence: 0.90
- 評価: `evidenceQuote="すき家"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-88645ac65c`、不要なら無視

_他 20 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### ⏸ storeAdditionsDisabled (store 追加は手動キュレ運用) (32 件)
理由: 新規 store の追加は cron では行わない方針 (キャンペーン情報の獲得に注力するため)。ここに列挙された店舗は cron が検知した「seed に未追加の店舗候補」で、必要な場合は手動で seed-data-stores.ts に追加 → 次回 cron で関連 membership が自動取り込まれる。全件無視も OK (リストとしての参照のみ)。

<details><summary>展開</summary>

#### `sto-18286acb97` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="alex", name="アレックス", category="買取"`
- confidence: 0.90
- 評価: `evidenceQuote="アレックス ポイント 5 倍 登録不要"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-18286acb97`、不要なら無視

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

#### `sto-ba55ee9889` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="daimaru-fujii-central", name="大丸藤井セントラル", category="書店"`
- confidence: 0.90
- 評価: `evidenceQuote="大丸藤井セントラル ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-ba55ee9889`、不要なら無視

#### `sto-aedc829b06` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="daishin", name="ダイシン", category="ホームセンター"`
- confidence: 0.90
- 評価: `evidenceQuote="ダイシン ポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-aedc829b06`、不要なら無視

#### `sto-7a21cc2744` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="domino-pizza", name="ドミノ・ピザ", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="ドミノ・ピザ ポイント 20 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-7a21cc2744`、不要なら無視

#### `sto-006cca853e` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="dux", name="ダックス", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="ダックス ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-006cca853e`、不要なら無視

#### `sto-d416fe2292` — `addRecord/stores` from `smbc-vpoint-up`
- 内容: `id="freshness-burger", name="フレッシュネスバーガー", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="フレッシュネスバーガー"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-d416fe2292`、不要なら無視

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

#### `sto-9ac2818383` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="hakone-kowakien-yunessun", name="箱根小涌園ユネッサン", category="エンタメ・チケット"`
- confidence: 0.90
- 評価: `evidenceQuote="箱根小涌園ユネッサン ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-9ac2818383`、不要なら無視

#### `sto-c80439cc94` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="happy-drug", name="ハッピー・ドラッグ", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="ハッピー・ドラッグ ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c80439cc94`、不要なら無視

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

#### `sto-84eb806569` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="kisoji-group", name="木曽路グループ", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="木曽路グループ ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-84eb806569`、不要なら無視

#### `sto-e07f20b3d7` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="nagashima-resort", name="ナガシマリゾート", category="エンタメ・チケット"`
- confidence: 0.90
- 評価: `evidenceQuote="ナガシマリゾート ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-e07f20b3d7`、不要なら無視

_他 12 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟡 lowConfidence (53 件)
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

_他 33 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 idCollision (23 件)
理由: 新規追加だが既存 ID またはストア名と衝突。重複の可能性あり。

<details><summary>展開</summary>

#### `pro-159fc7f359` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-5x", name="たまるマーケット (5倍)", scope="member-stores", rate=0.025, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 5倍 (総倍率、EPOS 基本 0.5% × 5 = 実効 2.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="SHEIN エポスポイント 5 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-159fc7f359`、不要なら無視

#### `pro-7f13efa08f` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-6x", name="たまるマーケット (6倍)", scope="member-stores", rate=0.03, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 6倍 (総倍率、EPOS 基本 0.5% × 6 = 実効 3.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="ロクシタンオンラインショップ エポスポイント 6 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-7f13efa08f`、不要なら無視

#### `pro-8d11b6f8f7` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-7x", name="たまるマーケット (7倍)", scope="member-stores", rate=0.035, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 7倍 (総倍率、EPOS 基本 0.5% × 7 = 実効 3.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="adidas ONLINE SHOP エポスポイント 7 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-8d11b6f8f7`、不要なら無視

#### `pro-48d84e014f` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-9x", name="たまるマーケット (9倍)", scope="member-stores", rate=0.045, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 9倍 (総倍率、EPOS 基本 0.5% × 9 = 実効 4.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="ホテルズドットコム エポスポイント 9 倍"`
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
- 評価: `evidenceQuote="日比谷花壇 エポスポイント 13 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-b54eb62188`、不要なら無視

#### `pro-3db70efd78` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-14x", name="たまるマーケット (14倍)", scope="member-stores", rate=0.07, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 14倍 (総倍率、EPOS 基本 0.5% × 14 = 実効 7.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="資生堂オンラインストア エポスポイント 14 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-3db70efd78`、不要なら無視

#### `pro-5648ef596b` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-17x", name="たまるマーケット (17倍)", scope="member-stores", rate=0.085, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 17倍 (総倍率、EPOS 基本 0.5% × 17 = 実効 8.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="BONAVENTURA エポスポイント 17 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-5648ef596b`、不要なら無視

#### `pro-d7bbaebfa1` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-18x", name="たまるマーケット (18倍)", scope="member-stores", rate=0.09, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 18倍 (総倍率、EPOS 基本 0.5% × 18 = 実効 9.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="山田養蜂場オンラインショップ エポスポイント 18 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-d7bbaebfa1`、不要なら無視

#### `pro-21b902a535` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-28x", name="たまるマーケット (28倍)", scope="member-stores", rate=0.14, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 28倍 (総倍率、EPOS 基本 0.5% × 28 = 実効 14.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="トレンドマイクロ・オンラインショップ エポスポイント 28 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-21b902a535`、不要なら無視

#### `pro-d25ca5de81` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-30x", name="たまるマーケット (30倍)", scope="member-stores", rate=0.15, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 30倍 (総倍率、EPOS 基本 0.5% × 30 = 実効 15.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="Adobe Creative Cloud エポスポイント 30 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-d25ca5de81`、不要なら無視

#### `pro-3e40282d1f` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-5x", name="J-POINT パートナー (5倍)", scope="member-stores", rate=0.03, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.81
- 評価: `evidenceQuote="App Store ポイント 最大 5 倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-3e40282d1f`、不要なら無視

#### `pro-6b3990a94f` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-5x", name="J-POINT パートナー Gold (5倍)", scope="member-stores", rate=0.025, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.81
- 評価: `evidenceQuote="App Store ポイント 最大 5 倍 プレミアムでおトク"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-6b3990a94f`、不要なら無視

#### `pro-5cc8d96a51` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-4x", name="J-POINT パートナー (4倍)", scope="member-stores", rate=0.025, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.81
- 評価: `evidenceQuote="高島屋 ポイント 最大 4 倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-5cc8d96a51`、不要なら無視

#### `pro-157596bab6` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-10x", name="J-POINT パートナー (10倍)", scope="member-stores", rate=0.055, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.81
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10 倍 プレミアムでおトク"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-157596bab6`、不要なら無視

#### `pro-a2bfee06a4` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-10x", name="J-POINT パートナー Gold (10倍)", scope="member-stores", rate=0.05, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.81
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10 倍 プレミアムでおトク"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-a2bfee06a4`、不要なら無視

#### `pro-2b5ee711ad` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-6x", name="J-POINT パートナー (6倍)", scope="member-stores", rate=0.035, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="オリックスレンタカー ポイント 6 倍 登録不要"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-2b5ee711ad`、不要なら無視

#### `pro-607e69cb99` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-6x", name="J-POINT パートナー Gold (6倍)", scope="member-stores", rate=0.03, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="オリックスレンタカー ポイント 6 倍 登録不要"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-607e69cb99`、不要なら無視

#### `pro-a4f4b003ab` — `addRecord/programs` from `smbc-vpoint-up`
- 内容: `id="prog-smbc-touch-conveni", name="SMBC タッチ決済コンビニ高還元", scope="member-stores", rate=0.075, currencyId="v-pt", cardIds=["smbc-v","olive"], paymentAppId="pa-visa-touch", bonusType="primary", description="Visa/Mastercard タッチ決済で対象コンビニ・飲食店 最大+7.5%", officialUrl="https://www.smbc.co.jp/kojin/vpoint-up/", conditions="Visa/Mastercard タッチ決済利用時のみ。一部商業施設内店舗など対象外あり。カード現物タッチ決済、iD、カードの差し込み、磁気取引は対象外。"`
- confidence: 0.81
- 評価: `evidenceQuote="対象のコンビニ・飲食店でのご利用時に最大＋7％のVポイントを還元。さらに！既存サービスと組み合わせると最大20％ポイント還元。スマホのVisaのタッチ決済・Mastercard®タッチ決済またはモバイルオーダーを利用＋7.5％還元"`
- 判定詳細: 新規 program (extractor=ongoing-program は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-a4f4b003ab`、不要なら無視

#### `pro-54ba70ec65` — `addRecord/programs` from `smbc-vpoint-up`
- 内容: `id="prog-olive-eraberu-tokuten", name="Olive 選べる特典", scope="all-stores", rate=0.01, currencyId="v-pt", cardIds=["olive"], bonusType="addOn", description="Oliveアカウントの選べる特典で「Vポイントアッププログラム＋1％」を選択すると還元率アップ。", officialUrl="https://www.smbc.co.jp/kojin/vpoint-up/", conditions="Oliveアカウントの選べる特典で「Vポイントアッププログラム＋1％」を選択した場合。Olive プラチナプリファードは2つ選択で＋2％還元。"`
- confidence: 0.81
- 評価: `evidenceQuote="Oliveアカウントの選べる特典 ＋1％ Oliveアカウントの選べる特典※で「Vポイントアッププログラム＋1％」をご選択"`
- 判定詳細: 新規 program (extractor=ongoing-program は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-54ba70ec65`、不要なら無視

_他 3 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 excludedCategory (8 件)
理由: Policy B: 対象外カテゴリ (金融/保険/医療/ギャンブル/サブスクリプション等)。自動追加しない。

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

#### `sto-eea54f7c0d` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="disneyplus", name="ディズニープラス", category="サブスクリプション"`
- confidence: 0.90
- 評価: `evidenceQuote="ディズニープラス ポイント 20 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-eea54f7c0d`、不要なら無視

#### `sto-83cba99444` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="etonag", name="えとはなっ！～干支っ娘・花札バトル～", category="ゲーム"`
- confidence: 0.81
- 評価: `evidenceQuote="「えとはなっ！～干支っ娘・花札バトル～」アプリペイストア エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-83cba99444`、不要なら無視

#### `sto-bbf1431215` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="google-play", name="Google Play", category="ネットサービス"`
- confidence: 0.81
- 評価: `evidenceQuote="Google Play ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-bbf1431215`、不要なら無視

#### `sto-72d06e294c` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="grand-summoners", name="グランドサマナーズ", category="ゲーム"`
- confidence: 0.81
- 評価: `evidenceQuote="「グランドサマナーズ」アプリペイストア エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-72d06e294c`、不要なら無視

#### `sto-06dc8f906a` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="hulu", name="Hulu", category="サブスクリプション"`
- confidence: 0.81
- 評価: `evidenceQuote="Hulu ポイント 最大 5 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-06dc8f906a`、不要なら無視

#### `sto-9dfc1f6c66` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="u-next", name="U-NEXT", category="サブスクリプション"`
- confidence: 0.81
- 評価: `evidenceQuote="U-NEXT ポイント 最大 5 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-9dfc1f6c66`、不要なら無視

</details>

## 操作
- **取り込みたい項目がある場合 (半自動)**: ローカルでこのブランチを checkout し、`npm run sync:approve -- <ID> [<ID> ...]` を実行 (ID は各項目見出しの先頭)。seed-additions.ts への反映・queue からの除去・REVIEW_QUEUE.md の再生成まで自動。`npm run sync:approve -- --list` で一覧表示。実行後 `npm test && npm run build` を確認して commit
- 🔴 untargetedProgram / campaignConditional / campaignRateCeiling / targetMismatch / storeNameMismatch は承認すると record がそのまま全額に乗るため原則見送り。承認には `--accept-risk` が必要
- このまま **merge** すると、要レビュー項目を読み込んだ証拠として記録されるだけ (実体 seed 変更はなし)
- 手動キュレートしたい場合は、このブランチに追加 commit してから merge
- 不要なら **close** で次週まで保留