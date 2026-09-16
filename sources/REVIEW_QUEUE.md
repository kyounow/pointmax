# 📋 週次マスタ同期: 要レビュー項目

(自動生成 2026-09-17。merge 前に項目を確認してください。)

## サマリ
- 要レビュー: 328 件
- ソース別: epos-tamaru-market=92, jcb-jpoint=139, smbc-vpoint-up=11, ponta=42, rakuten-point=9, v-point=32, d-point=2, jal-card-tokuyaku-list=1
- 主な理由: idCollision=38, missingStoreBody=125, lowConfidence=71, missingProgramBody=12, userBlocked=9, storeAdditionsDisabled=49, excludedCategory=24

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

### 🟠 missingProgramBody (program 本体なし membership) (12 件)
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

#### `mem-30b8aae434` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-vpoint-up-touch-conveni", storeId="conv-7eleven"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店でのご利用時に最大＋7％のVポイントを還元"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-30b8aae434`、不要なら無視

#### `mem-40fe6bfe82` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-vpoint-up-touch-conveni", storeId="conv-lawson"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店でのご利用時に最大＋7％のVポイントを還元"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-40fe6bfe82`、不要なら無視

#### `mem-c25fa736e9` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-vpoint-up-touch-conveni", storeId="conv-familymart"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店でのご利用時に最大＋7％のVポイントを還元"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-c25fa736e9`、不要なら無視

#### `mem-725c6b3f57` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-vpoint-up-touch-conveni", storeId="mcdonalds"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店でのご利用時に最大＋7％のVポイントを還元"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-725c6b3f57`、不要なら無視

#### `mem-dc096bd46e` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-vpoint-up-sushiro", storeId="sushiro"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店でのご利用時に最大＋7％のVポイントを還元"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-dc096bd46e`、不要なら無視

#### `mem-16531aef83` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-vpoint-up-doutor", storeId="doutor"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店でのご利用時に最大＋7％のVポイントを還元"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-16531aef83`、不要なら無視

#### `mem-b09d4b99d9` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-vpoint-up-starbucks", storeId="starbucks"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店でのご利用時に最大＋7％のVポイントを還元"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-b09d4b99d9`、不要なら無視

#### `mem-ab69101f18` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-vpoint-up-7eleven-bonus", storeId="conv-7eleven"`
- confidence: 0.90
- 評価: `evidenceQuote="条件達成のうえで、セブン-イレブンで、スマホのVisaのタッチ決済・Mastercardタッチ決済で支払うと、最大11％ポイント還元！"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-ab69101f18`、不要なら無視

</details>

### ⏸ storeAdditionsDisabled (store 追加は手動キュレ運用) (49 件)
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

#### `sto-22ee72a65e` — `addRecord/stores` from `v-point-partners`
- 内容: `id="autobacs-dot-com", name="オートバックス・ドットコム", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="オートバックス・ドットコム"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-22ee72a65e`、不要なら無視

#### `sto-54e3f697e1` — `addRecord/stores` from `v-point-partners`
- 内容: `id="b-b-on", name="B.B.ON", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="B.B.ON"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-54e3f697e1`、不要なら無視

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

#### `sto-9c6c6e6988` — `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="buffet-and-cafe-la-maree", name="ブッフェ アンド カフェ ラ マレーア", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="ブッフェ アンド カフェ ラ マレーア：三井ガーデンホテル汐留内に併設されたくつろぎのブッフェレストラン"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-9c6c6e6988`、不要なら無視

#### `sto-0339834d71` — `addRecord/stores` from `v-point-partners`
- 内容: `id="central-park", name="セントラルパーク", category="ショッピングモール"`
- confidence: 0.90
- 評価: `evidenceQuote="セントラルパーク"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-0339834d71`、不要なら無視

#### `sto-9cc5938459` — `addRecord/stores` from `v-point-partners`
- 内容: `id="color-studio-masaya", name="COLOR STUDIO・MASAYA", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="COLOR STUDIO・MASAYA"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-9cc5938459`、不要なら無視

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

#### `sto-689eee2002` — `addRecord/stores` from `v-point-partners`
- 内容: `id="eneos-denki", name="ＥＮＥＯＳでんき", category="電気・ガス"`
- confidence: 0.90
- 評価: `evidenceQuote="ＥＮＥＯＳでんき"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-689eee2002`、不要なら無視

#### `sto-2c49431722` — `addRecord/stores` from `v-point-partners`
- 内容: `id="eneos-toshigas", name="ＥＮＥＯＳ都市ガス", category="電気・ガス"`
- confidence: 0.90
- 評価: `evidenceQuote="ＥＮＥＯＳ都市ガス"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-2c49431722`、不要なら無視

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

#### `sto-a5c1494a42` — `addRecord/stores` from `v-point-partners`
- 内容: `id="fujimaru-park", name="藤丸パーク", category="ショッピングモール"`
- confidence: 0.90
- 評価: `evidenceQuote="藤丸パーク"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-a5c1494a42`、不要なら無視

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

_他 29 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟡 lowConfidence (71 件)
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

_他 51 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 idCollision (38 件)
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

#### `pro-d5bb627fff` — `addRecord/programs` from `smbc-vpoint-up`
- 内容: `id="prog-smbc-vpoint-up-touch-conveni", name="Vポイントアッププログラム 対象コンビニ・飲食店 タッチ決済", scope="member-stores", rate=0.075, currencyId="v-pt", cardIds=["smbc-v","olive"], paymentAppId="pa-visa-touch", bonusType="primary", description="対象のコンビニ・飲食店でスマホのVisa/Mastercardタッチ決済を利用するとポイントアップ", officialUrl="https://www.smbc.co.jp/kojin/vpoint-up/", conditions="スマホのVisa/Mastercardタッチ決済またはモバイルオーダー利用時のみ。一部対象とならない店舗・利用方法あり。"`
- confidence: 0.81
- 評価: `evidenceQuote="対象店舗でスマホのVisaのタッチ決済・Mastercard®タッチ決済またはモバイルオーダーを利用＋7.5％還元"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-d5bb627fff`、不要なら無視

#### `pro-e0e046d0e2` — `addRecord/programs` from `smbc-vpoint-up`
- 内容: `id="prog-smbc-vpoint-up-7eleven-bonus", name="Vポイントアッププログラム セブン-イレブン スマホタッチ決済", scope="member-stores", rate=0.03, currencyId="v-pt", cardIds=["smbc-v","olive"], paymentAppId="pa-visa-touch", bonusType="addOn", description="セブン-イレブンでスマホのVisa/Mastercardタッチ決済を利用すると追加でポイントアップ", officialUrl="https://www.smbc.co.jp/kojin/vpoint-up/", conditions="セブン-イレブンアプリの会員コード提示で付与されるセブンマイル0.5%を含む。カード現物タッチ決済、iD、差し込み、磁気取引は対象外。他サービスとの合算で20%が上限。"`
- confidence: 0.81
- 評価: `evidenceQuote="条件達成のうえで、セブン-イレブンで、スマホのVisaのタッチ決済・Mastercardタッチ決済で支払うと、最大11％ポイント還元！「3％」のうち0.5％は、お支払い時のセブン-イレブンアプリの会員コード提示によって付与されたセブンマイル"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-e0e046d0e2`、不要なら無視

_他 18 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 excludedCategory (24 件)
理由: Policy B: 対象外カテゴリ (金融/保険/医療/ギャンブル等)。自動追加しない。

<details><summary>展開</summary>

#### `sto-3d9414fb45` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="adobe-creative-cloud", name="Adobe Creative Cloud", category="ネットサービス"`
- confidence: 0.81
- 評価: `evidenceQuote="Adobe Creative Cloud エポスポイント 30 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-3d9414fb45`、不要なら無視

#### `sto-fcde9f457a` — `addRecord/stores` from `ponta-partners`
- 内容: `id="aflac", name="アフラック", category="保険"`
- confidence: 0.81
- 評価: `evidenceQuote="アフラック たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-fcde9f457a`、不要なら無視

#### `sto-211218286e` — `addRecord/stores` from `ponta-partners`
- 内容: `id="air-card", name="Airカード", category="金融"`
- confidence: 0.81
- 評価: `evidenceQuote="Airカード たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-211218286e`、不要なら無視

#### `sto-74d449e922` — `addRecord/stores` from `ponta-partners`
- 内容: `id="apaman-shop", name="アパマンショップ", category="不動産・住宅"`
- confidence: 0.81
- 評価: `evidenceQuote="アパマンショップ たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-74d449e922`、不要なら無視

#### `sto-1d0cf4c10d` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="app-store", name="App Store", category="ネットサービス"`
- confidence: 0.81
- 評価: `evidenceQuote="App Store ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-1d0cf4c10d`、不要なら無視

#### `sto-9bb64136c6` — `addRecord/stores` from `ponta-partners`
- 内容: `id="au-pay-card", name="au PAY カード", category="金融"`
- confidence: 0.81
- 評価: `evidenceQuote="au PAY カード たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-9bb64136c6`、不要なら無視

#### `sto-2ef63d767d` — `addRecord/stores` from `ponta-partners`
- 内容: `id="au-seimei-hoken", name="auの生命ほけん", category="保険"`
- confidence: 0.81
- 評価: `evidenceQuote="auの生命ほけん たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-2ef63d767d`、不要なら無視

#### `sto-b21876ea45` — `addRecord/stores` from `ponta-partners`
- 内容: `id="daiwa-connect-shoken", name="大和コネクト証券", category="金融"`
- confidence: 0.81
- 評価: `evidenceQuote="大和コネクト証券 たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-b21876ea45`、不要なら無視

#### `sto-32136384d0` — `addRecord/stores` from `ponta-partners`
- 内容: `id="dental-ponta", name="Dental Ponta", category="医療"`
- confidence: 0.81
- 評価: `evidenceQuote="Dental Ponta たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-32136384d0`、不要なら無視

#### `sto-5f344fbfa8` — `addRecord/stores` from `ponta-partners`
- 内容: `id="dmm-keirin", name="DMM競輪", category="ギャンブル"`
- confidence: 0.81
- 評価: `evidenceQuote="DMM競輪 たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-5f344fbfa8`、不要なら無視

#### `sto-ecd17144df` — `addRecord/stores` from `v-point-partners`
- 内容: `id="epark-kusuri-no-madoguchi", name="EPARK くすりの窓口", category="医療"`
- confidence: 0.90
- 評価: `evidenceQuote="EPARK くすりの窓口"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-ecd17144df`、不要なら無視

#### `sto-8949b8f43a` — `addRecord/stores` from `ponta-partners`
- 内容: `id="exchangers", name="Exchangers", category="金融"`
- confidence: 0.81
- 評価: `evidenceQuote="Exchangers たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-8949b8f43a`、不要なら無視

#### `sto-9934284927` — `addRecord/stores` from `ponta-partners`
- 内容: `id="gmo-aozora-net-bank", name="GMOあおぞらネット銀行", category="金融"`
- confidence: 0.81
- 評価: `evidenceQuote="GMOあおぞらネット銀行 たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-9934284927`、不要なら無視

#### `sto-bbf1431215` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="google-play", name="Google Play", category="ネットサービス"`
- confidence: 0.81
- 評価: `evidenceQuote="Google Play ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-bbf1431215`、不要なら無視

#### `sto-d0aba15940` — `addRecord/stores` from `ponta-partners`
- 内容: `id="hoken-de-ponta", name="保険 de Ponta", category="保険"`
- confidence: 0.81
- 評価: `evidenceQuote="保険 de Ponta たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-d0aba15940`、不要なら無視

#### `sto-c626ab7f90` — `addRecord/stores` from `ponta-partners`
- 内容: `id="life-net", name="Life Net", category="保険"`
- confidence: 0.81
- 評価: `evidenceQuote="Life Net たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c626ab7f90`、不要なら無視

#### `sto-0e0cfa614a` — `addRecord/stores` from `v-point-partners`
- 内容: `id="okinawa-meeti-by-ryubostore", name="OKINAWA meeti by RYUBOSTORE", category="その他"`
- confidence: 0.90
- 評価: `evidenceQuote="OKINAWA meeti by RYUBOSTORE"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-0e0cfa614a`、不要なら無視

#### `sto-8299921f3c` — `addRecord/stores` from `ponta-partners`
- 内容: `id="ponta-bitcoin-farm", name="Pontaビットコin牧場", category="その他"`
- confidence: 0.81
- 評価: `evidenceQuote="Pontaビットコin牧場 たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-8299921f3c`、不要なら無視

#### `sto-90ca24b19b` — `addRecord/stores` from `ponta-partners`
- 内容: `id="ponta-kantan-hoken", name="Pontaかんたん保険", category="保険"`
- confidence: 0.81
- 評価: `evidenceQuote="Pontaかんたん保険 たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-90ca24b19b`、不要なら無視

#### `sto-e49a77a47b` — `addRecord/stores` from `ponta-partners`
- 内容: `id="ponta-play", name="Ponta PLAY", category="その他"`
- confidence: 0.81
- 評価: `evidenceQuote="Ponta PLAY たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-e49a77a47b`、不要なら無視

_他 4 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### ⚫ userBlocked (9 件)
理由: seed-blocklist.ts でユーザが除外指定済み。意図した除外であれば無視してよい。

<details><summary>展開</summary>

#### `sto-447fd81867` — `addRecord/stores` from `ponta-partners`
- 内容: `id="17live", name="17LIVE", category="エンタメ・チケット"`
- confidence: 0.81
- 評価: `evidenceQuote="17LIVE(ワンセブンライブ) たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-447fd81867`、不要なら無視

#### `sto-2b599ab741` — `addRecord/stores` from `ponta-partners`
- 内容: `id="au-bookpass", name="auブックパス", category="書店"`
- confidence: 0.81
- 評価: `evidenceQuote="auブックパス たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-2b599ab741`、不要なら無視

#### `sto-195e9859e8` — `addRecord/stores` from `ponta-partners`
- 内容: `id="auto-info", name="オート・インフォ", category="車・バイク"`
- confidence: 0.81
- 評価: `evidenceQuote="オート・インフォ たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-195e9859e8`、不要なら無視

#### `sto-eb40ca53d7` — `addRecord/stores` from `ponta-partners`
- 内容: `id="denki-hikaku-insweb", name="でんきの比較インズウェブ", category="電気・ガス"`
- confidence: 0.81
- 評価: `evidenceQuote="でんきの比較インズウェブ たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-eb40ca53d7`、不要なら無視

#### `sto-7fdc41d1ef` — `addRecord/stores` from `ponta-partners`
- 内容: `id="diamond-sha", name="ダイヤモンド社", category="書店"`
- confidence: 0.81
- 評価: `evidenceQuote="ダイヤモンド社 たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-7fdc41d1ef`、不要なら無視

#### `sto-6bc012458c` — `addRecord/stores` from `ponta-partners`
- 内容: `id="enewan", name="エネワン（株式会社サイサン）", category="電気・ガス"`
- confidence: 0.81
- 評価: `evidenceQuote="エネワン（株式会社サイサン） たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-6bc012458c`、不要なら無視

#### `sto-47a9824577` — `addRecord/stores` from `v-point-partners`
- 内容: `id="hyundai-mobility-japan", name="Hyundai Mobility Japan", category="車・バイク"`
- confidence: 0.90
- 評価: `evidenceQuote="Hyundai Mobility Japan"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-47a9824577`、不要なら無視

#### `sto-9cfbfb9793` — `addRecord/stores` from `ponta-partners`
- 内容: `id="president-sha", name="プレジデント社", category="書店"`
- confidence: 0.81
- 評価: `evidenceQuote="プレジデント社 たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-9cfbfb9793`、不要なら無視

#### `sto-40c6c70e26` — `addRecord/stores` from `ponta-partners`
- 内容: `id="telasa", name="TELASA", category="音楽・映像"`
- confidence: 0.81
- 評価: `evidenceQuote="TELASA（テラサ） たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-40c6c70e26`、不要なら無視

</details>

## 操作
- **取り込みたい項目がある場合 (半自動)**: ローカルでこのブランチを checkout し、`npm run sync:approve -- <ID> [<ID> ...]` を実行 (ID は各項目見出しの先頭)。seed-additions.ts への反映・queue からの除去・REVIEW_QUEUE.md の再生成まで自動。`npm run sync:approve -- --list` で一覧表示。実行後 `npm test && npm run build` を確認して commit
- このまま **merge** すると、要レビュー項目を読み込んだ証拠として記録されるだけ (実体 seed 変更はなし)
- 手動キュレートしたい場合は、このブランチに追加 commit してから merge
- 不要なら **close** で次週まで保留