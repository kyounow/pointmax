# 📋 週次マスタ同期: 要レビュー項目

(自動生成 2026-09-10。merge 前に項目を確認してください。)

## サマリ
- 要レビュー: 326 件
- ソース別: epos-tamaru-market=97, jcb-jpoint=177, smbc-vpoint-up=20, ponta=31, jal-card-tokuyaku-list=1
- 主な理由: idCollision=32, missingStoreBody=166, missingProgramBody=25, userBlocked=9, lowConfidence=43, excludedCategory=11, storeAdditionsDisabled=40

## 項目 (理由別)

### 🟠 missingStoreBody (store 本体なし membership) (166 件)
理由: membership 提案だが、参照先 store 本体が seed 未存在 + 同 run の auto 候補にも無い (例: category cap で deferred された場合)。そのまま auto-merge すると孤児 membership (店名解決できない、UI で店舗未表示) が seed に残るため降格。store 本体を手動キュレートで追加するか、次回 cron で store 側が auto 化されるのを待つ。

<details><summary>展開</summary>

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

#### `mem-b0222e9b7e` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="pal-closet"`
- confidence: 0.90
- 評価: `evidenceQuote="PAL CLOSET エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-b0222e9b7e`、不要なら無視

#### `mem-dd32902f86` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-7x", storeId="agoda"`
- confidence: 0.90
- 評価: `evidenceQuote="Agoda エポsポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-dd32902f86`、不要なら無視

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

#### `mem-815fc52ae7` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="orbis"`
- confidence: 0.90
- 評価: `evidenceQuote="オルビス エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-815fc52ae7`、不要なら無視

#### `mem-0b983e2061` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-4x", storeId="iherb"`
- confidence: 0.90
- 評価: `evidenceQuote="iHerb（アイハーブ） エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-0b983e2061`、不要なら無視

#### `mem-23eee49a66` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="nitori"`
- confidence: 0.90
- 評価: `evidenceQuote="ニトリ 家具・インテリアの通販サイト【楽天市場】 エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-23eee49a66`、不要なら無視

#### `mem-7e8703db39` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-4x", storeId="daiso"`
- confidence: 0.90
- 評価: `evidenceQuote="ダイソーネットストア エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-7e8703db39`、不要なら無視

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

#### `mem-04928bfa27` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-18x", storeId="airalo"`
- confidence: 0.90
- 評価: `evidenceQuote="airalo エポスポイント 18 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-04928bfa27`、不要なら無視

#### `mem-84ed5273b9` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-30x", storeId="adobe-creative-cloud"`
- confidence: 0.90
- 評価: `evidenceQuote="Adobe Creative Cloud エポスポイント 30 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-84ed5273b9`、不要なら無視

#### `mem-d84000d667` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="jre-mall"`
- confidence: 0.90
- 評価: `evidenceQuote="JRE MALL ショッピング エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-d84000d667`、不要なら無視

#### `mem-c3cb74c72c` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-5x", storeId="house-of-rose"`
- confidence: 0.90
- 評価: `evidenceQuote="ハウスオブローゼ オンラインショップ本店／化粧品 エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-c3cb74c72c`、不要なら無視

#### `mem-fbd6b77940` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-30x", storeId="atidimu"`
- confidence: 0.90
- 評価: `evidenceQuote="ATIDIMU公式ストア エポスポイント 30 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-fbd6b77940`、不要なら無視

#### `mem-3b9d2fddc8` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="etohana-app"`
- confidence: 0.90
- 評価: `evidenceQuote="「えとはなっ！～干支っ娘・花札バトル～」アプリペイストア エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-3b9d2fddc8`、不要なら無視

#### `mem-72dc4f70dc` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="grand-summoners-app"`
- confidence: 0.90
- 評価: `evidenceQuote="「グランドサマナーズ」アプリペイストア エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-72dc4f70dc`、不要なら無視

#### `mem-64d9c693fa` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-5x", storeId="jtb-tabimonogatari"`
- confidence: 0.90
- 評価: `evidenceQuote="JTB旅物語公式サイト エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-64d9c693fa`、不要なら無視

_他 146 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 missingProgramBody (program 本体なし membership) (25 件)
理由: membership 提案だが、参照先 program 本体が seed 未存在 + 同 run の auto 候補にも無い (proposePrograms は新規 program に必ず idCollision を付けるため、program 本体は同 run では auto に上がらず needsReview に行く)。そのまま membership だけ auto-merge すると BenefitProgram が無く還元計算できない孤児が seed に残るため降格。program 本体側の needsReview を先に承認 → 手動で seed に program 追加 → 次回 cron で membership 側も自動的に通る運用。

<details><summary>展開</summary>

#### `mem-a387ae5ad8` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-13x", storeId="aeon"`
- confidence: 0.90
- 評価: `evidenceQuote="おうちでイオン イオンショップ エポスポイント 13 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-a387ae5ad8`、不要なら無視

#### `mem-97c49a3cf0` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-4x", storeId="takashimaya"`
- confidence: 0.90
- 評価: `evidenceQuote="高島屋 ポイント 最大 4倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-97c49a3cf0`、不要なら無視

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
- 評価: `evidenceQuote="メガネサロンルック・ルックコンタクト ポイント 5倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-894003e4df`、不要なら無視

#### `mem-1f2c7f5052` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x", storeId="megane-salon-look"`
- confidence: 0.90
- 評価: `evidenceQuote="メガネサロンルック・ルックコンタクト ポイント 5倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-1f2c7f5052`、不要なら無視

#### `mem-4da89665ee` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-rest", storeId="conv-7eleven"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店でのご利用時に 最大＋ 7 ％ のVポイントを還元。"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-4da89665ee`、不要なら無視

#### `mem-f8f00c45b2` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-rest", storeId="conv-lawson"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店でのご利用時に 最大＋ 7 ％ のVポイントを還元。"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-f8f00c45b2`、不要なら無視

#### `mem-b310ebb948` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-rest", storeId="conv-familymart"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店でのご利用時に 最大＋ 7 ％ のVポイントを還元。"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-b310ebb948`、不要なら無視

#### `mem-ec49c67ad7` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-rest", storeId="mcdonalds"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店でのご利用時に 最大＋ 7 ％ のVポイントを還元。"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-ec49c67ad7`、不要なら無視

#### `mem-a5bdddc3a1` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-sukiya", storeId="sukiya"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店でのご利用時に 最大＋ 7 ％ のVポイントを還元。"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-a5bdddc3a1`、不要なら無視

#### `mem-0fca6f389a` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-saizeriya", storeId="saizeriya"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店でのご利用時に 最大＋ 7 ％ のVポイントを還元。"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-0fca6f389a`、不要なら無視

#### `mem-def2e793b7` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-gusto", storeId="gusto"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店でのご利用時に 最大＋ 7 ％ のVポイントを還元。"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-def2e793b7`、不要なら無視

#### `mem-b597a0d623` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-doutor", storeId="doutor"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店でのご利用時に 最大＋ 7 ％ のVポイントを還元。"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-b597a0d623`、不要なら無視

#### `mem-af35331f5d` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-sushiro", storeId="sushiro"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店でのご利用時に 最大＋ 7 ％ のVポイントを還元。"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-af35331f5d`、不要なら無視

#### `mem-2f2ea43400` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-starbucks", storeId="starbucks"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店でのご利用時に 最大＋ 7 ％ のVポイントを還元。"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-2f2ea43400`、不要なら無視

#### `mem-272330eae2` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-mos-burger", storeId="mos-burger"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店でのご利用時に 最大＋ 7 ％ のVポイントを還元。"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-272330eae2`、不要なら無視

#### `mem-e814460c05` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-kfc", storeId="kfc"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店でのご利用時に 最大＋ 7 ％ のVポイントを還元。"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-e814460c05`、不要なら無視

_他 5 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### ⏸ storeAdditionsDisabled (store 追加は手動キュレ運用) (40 件)
理由: 新規 store の追加は cron では行わない方針 (キャンペーン情報の獲得に注力するため)。ここに列挙された店舗は cron が検知した「seed に未追加の店舗候補」で、必要な場合は手動で seed-data-stores.ts に追加 → 次回 cron で関連 membership が自動取り込まれる。全件無視も OK (リストとしての参照のみ)。

<details><summary>展開</summary>

#### `sto-d3d3191f1b` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="alex", name="アレックス", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="アレックス ポイント 5倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-d3d3191f1b`、不要なら無視

#### `sto-aadc16bb75` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="bari-bari-aobadori-ten", name="バリバリ青葉通り店", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="バリバリ青葉通り店 ポイント 2倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-aadc16bb75`、不要なら無視

#### `sto-b58c5b080f` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="bridgestone-sports-online-store", name="ブリヂストンスポーツオンラインストア", category="スポーツ"`
- confidence: 0.90
- 評価: `evidenceQuote="ブリヂストンスポーツオンラインストア ポイント 2倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-b58c5b080f`、不要なら無視

#### `sto-0ee28e8291` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="budget-rentacar", name="バジェット・レンタカー", category="レンタカー"`
- confidence: 0.90
- 評価: `evidenceQuote="バジェット・レンタカー ポイント 3倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-0ee28e8291`、不要なら無視

#### `sto-5394a4c18b` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="comic-cmoa", name="コミックシーモア", category="書籍・文房具"`
- confidence: 0.90
- 評価: `evidenceQuote="コミックシーモア ポイント 最大 5倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-5394a4c18b`、不要なら無視

#### `sto-e2d7702d22` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="daimaru-fujii-central", name="大丸藤井セントラル", category="雑貨"`
- confidence: 0.90
- 評価: `evidenceQuote="大丸藤井セントラル ポイント 2倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-e2d7702d22`、不要なら無視

#### `sto-aedc829b06` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="daishin", name="ダイシン", category="ホームセンター"`
- confidence: 0.90
- 評価: `evidenceQuote="ダイシン ポイント 3倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-aedc829b06`、不要なら無視

#### `sto-7a21cc2744` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="domino-pizza", name="ドミノ・ピザ", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="ドミノ・ピザ ポイント 20倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-7a21cc2744`、不要なら無視

#### `sto-006cca853e` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="dux", name="ダックス", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="ダックス ポイント 2倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-006cca853e`、不要なら無視

#### `sto-0b0fabb75b` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="ezuriko-shopping-center-pal", name="江釣子ショッピングセンター・パル", category="ショッピングセンター"`
- confidence: 0.90
- 評価: `evidenceQuote="江釣子ショッピングセンター・パル ポイント 3倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-0b0fabb75b`、不要なら無視

#### `sto-c1e323766e` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="fuji-corporation", name="フジ・コーポレーション", category="車・バイク"`
- confidence: 0.90
- 評価: `evidenceQuote="フジ・コーポレーション ポイント 2倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c1e323766e`、不要なら無視

#### `sto-b17074f07a` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="fujinokirameki-fuji-gotemba", name="藤乃煌 富士御殿場", category="ホテル"`
- confidence: 0.90
- 評価: `evidenceQuote="藤乃煌 富士御殿場 ポイント 2倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-b17074f07a`、不要なら無視

#### `sto-9c1abaa6d9` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="fuku-yakuhin", name="ふく薬品", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="ふく薬品 ポイント 2倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-9c1abaa6d9`、不要なら無視

#### `sto-0370a7d4d1` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="fukudaya-dept", name="福田屋百貨店", category="百貨店"`
- confidence: 0.90
- 評価: `evidenceQuote="福田屋百貨店 ポイント 3倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-0370a7d4d1`、不要なら無視

#### `sto-cd429ed660` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="go-app", name="タクシーアプリ『GO』", category="交通"`
- confidence: 0.90
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-cd429ed660`、不要なら無視

#### `sto-75db52f250` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="hakone-kowakien-tenyu", name="箱根小涌園 天悠", category="ホテル"`
- confidence: 0.90
- 評価: `evidenceQuote="箱根小涌園 天悠・伊東 緑涌・伊東小涌園 ポイント 2倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-75db52f250`、不要なら無視

#### `sto-798ef2e6f7` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="hakone-kowakien-yunessun", name="箱根小涌園ユネッサン", category="レジャー・エンタメ"`
- confidence: 0.90
- 評価: `evidenceQuote="箱根小涌園ユネッサン ポイント 2倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-798ef2e6f7`、不要なら無視

#### `sto-c80439cc94` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="happy-drug", name="ハッピー・ドラッグ", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="ハッピー・ドラッグ ポイント 2倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c80439cc94`、不要なら無視

#### `sto-54235ef248` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="haruyama", name="はるやまチェーン", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="はるやまチェーン ポイント 5倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-54235ef248`、不要なら無視

#### `sto-0d28b95150` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="hokkai-ichiba", name="北海市場", category="スーパー"`
- confidence: 0.90
- 評価: `evidenceQuote="北海市場 ポイント 2倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-0d28b95150`、不要なら無視

_他 20 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟡 lowConfidence (43 件)
理由: Gemini の評価で confidence < 0.9。エビデンス不明瞭・推測混入の疑い。

<details><summary>展開</summary>

#### `sto-70be5721b2` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="adidas", name="adidas ONLINE SHOP", category="ファッション"`
- confidence: 0.81
- 評価: `evidenceQuote="adidas ONLINE SHOP エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-70be5721b2`、不要なら無視

#### `sto-b4548615bb` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="aesop", name="イソップオンラインストア", category="美容・健康"`
- confidence: 0.81
- 評価: `evidenceQuote="イソップオンラインストア エポスポイント 14 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-b4548615bb`、不要なら無視

#### `sto-69312df957` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="agoda", name="Agoda", category="旅行代理店"`
- confidence: 0.81
- 評価: `evidenceQuote="Agoda エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-69312df957`、不要なら無視

#### `sto-22882e531a` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="airalo", name="airalo", category="通信"`
- confidence: 0.81
- 評価: `evidenceQuote="airalo エポスポイント 18 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-22882e531a`、不要なら無視

#### `sto-8ec3614014` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="apa-hotel", name="アパホテルズ＆リゾーツ", category="ホテル"`
- confidence: 0.81
- 評価: `evidenceQuote="アパホテルズ＆リゾーツ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-8ec3614014`、不要なら無視

#### `sto-833f67c79a` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="at-cosme-shopping", name="@cosme SHOPPING", category="美容・健康"`
- confidence: 0.81
- 評価: `evidenceQuote="@cosme SHOPPING エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-833f67c79a`、不要なら無視

#### `sto-16225e3dcc` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="atidimu", name="ATIDIMU公式ストア", category="美容・健康"`
- confidence: 0.81
- 評価: `evidenceQuote="ATIDIMU公式ストア エポスポイント 30 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-16225e3dcc`、不要なら無視

#### `sto-e018c92385` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="belluna", name="カタログ通販ベルーナ", category="ネット通販"`
- confidence: 0.81
- 評価: `evidenceQuote="カタログ通販ベルーナ（Belluna） エポスポイント 10 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-e018c92385`、不要なら無視

#### `sto-324ba23293` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="belluna-gourmet", name="ベルーナグルメ", category="食品"`
- confidence: 0.81
- 評価: `evidenceQuote="ベルーナグルメ エポスポイント 10 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-324ba23293`、不要なら無視

#### `sto-c3245340fa` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="bonaventura", name="BONAVENTURA", category="ファッション"`
- confidence: 0.81
- 評価: `evidenceQuote="BONAVENTURA エポスポイント 17 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c3245340fa`、不要なら無視

#### `sto-cb74ee08cc` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="cainz", name="カインズ", category="ホームセンター"`
- confidence: 0.81
- 評価: `evidenceQuote="カインズ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-cb74ee08cc`、不要なら無視

#### `sto-a4c93c8432` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="charles-keith", name="CHARLES & KEITH 公式オンラインストア", category="ファッション"`
- confidence: 0.81
- 評価: `evidenceQuote="CHARLES & KEITH 公式オンラインストア エポスポイント 13 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-a4c93c8432`、不要なら無視

#### `sto-1841c8ccb1` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="daiso", name="ダイソーネットストア", category="雑貨"`
- confidence: 0.81
- 評価: `evidenceQuote="ダイソーネットストア エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-1841c8ccb1`、不要なら無視

#### `sto-9c69ffe773` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="dell", name="Dell（個人向け）", category="家電・PC"`
- confidence: 0.81
- 評価: `evidenceQuote="Dell（個人向け） エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-9c69ffe773`、不要なら無視

#### `sto-d9d146754b` — `addRecord/stores` from `ponta-partners`
- 内容: `id="denmaru", name="伝丸", category="飲食"`
- confidence: 0.81
- 評価: `evidenceQuote="伝丸 たまる つかえる アプリ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-d9d146754b`、不要なら無視

#### `sto-798cbcf8c9` — `addRecord/stores` from `ponta-partners`
- 内容: `id="doutor-coffee-farm", name="ドトール珈琲農園・ドトール珈琲店", category="飲食"`
- confidence: 0.81
- 評価: `evidenceQuote="ドトール珈琲農園・ドトール珈琲店 たまる つかえる アプリ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-798cbcf8c9`、不要なら無視

#### `sto-b61edbaba4` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="dr-ci-labo", name="ドクターシーラボ公式オンラインショップ", category="美容・健康"`
- confidence: 0.81
- 評価: `evidenceQuote="ドクターシーラボ公式オンラインショップ エポスポイント 30 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-b61edbaba4`、不要なら無視

#### `sto-3fca2d9575` — `addRecord/stores` from `ponta-partners`
- 内容: `id="e-on", name="エネワン（株式会社サイサン）", category="電気・ガス"`
- confidence: 0.81
- 評価: `evidenceQuote="エネワン（株式会社サイサン） たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-3fca2d9575`、不要なら無視

#### `sto-38b588efaf` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="expedia", name="エクスペディア", category="旅行代理店"`
- confidence: 0.81
- 評価: `evidenceQuote="【海外・国内ホテル】旅行予約のエクスペディア エポスポイント 10 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-38b588efaf`、不要なら無視

#### `sto-6477335c0b` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="expedia-package", name="エクスペディア (航空券＋宿泊)", category="旅行代理店"`
- confidence: 0.81
- 評価: `evidenceQuote="【航空券＋宿泊の同時予約】旅行予約のエクスペディア エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-6477335c0b`、不要なら無視

_他 23 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 idCollision (32 件)
理由: 新規追加だが既存 ID またはストア名と衝突。重複の可能性あり。

<details><summary>展開</summary>

#### `pro-2a8bfb0d9c` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-5x", name="たまるマーケット (5倍)", scope="member-stores", rate=0.025, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 5倍 (総倍率、EPOS 基本 0.5% × 5 = 実効 2.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="KEYUCA オンラインショップ エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-2a8bfb0d9c`、不要なら無視

#### `pro-401cce4e15` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-6x", name="たまるマーケット (6倍)", scope="member-stores", rate=0.03, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 6倍 (総倍率、EPOS 基本 0.5% × 6 = 実効 3.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="ロクシタンオンラインショップ エポスポイント 6 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-401cce4e15`、不要なら無視

#### `pro-856899b7a3` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-7x", name="たまるマーケット (7倍)", scope="member-stores", rate=0.035, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 7倍 (総倍率、EPOS 基本 0.5% × 7 = 実効 3.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="SHEIN エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-856899b7a3`、不要なら無視

#### `pro-1529eb7ba4` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-9x", name="たまるマーケット (9倍)", scope="member-stores", rate=0.045, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 9倍 (総倍率、EPOS 基本 0.5% × 9 = 実効 4.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="MoMA Design Store エポスポイント 9 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-1529eb7ba4`、不要なら無視

#### `pro-1ee7f714cb` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-10x", name="たまるマーケット (10倍)", scope="member-stores", rate=0.05, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 10倍 (総倍率、EPOS 基本 0.5% × 10 = 実効 5.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="エクスペディア エポスポイント 10 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-1ee7f714cb`、不要なら無視

#### `pro-9fe842de66` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-13x", name="たまるマーケット (13倍)", scope="member-stores", rate=0.065, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 13倍 (総倍率、EPOS 基本 0.5% × 13 = 実効 6.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="おうちでイオン イオンショップ エポスポイント 13 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-9fe842de66`、不要なら無視

#### `pro-a55b012024` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-14x", name="たまるマーケット (14倍)", scope="member-stores", rate=0.07, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 14倍 (総倍率、EPOS 基本 0.5% × 14 = 実効 7.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="イソップオンラインストア エポスポイント 14 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-a55b012024`、不要なら無視

#### `pro-c8d2a6ebf0` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-15x", name="たまるマーケット (15倍)", scope="member-stores", rate=0.075, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 15倍 (総倍率、EPOS 基本 0.5% × 15 = 実効 7.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="ショップジャパン エポスポイント 15 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-c8d2a6ebf0`、不要なら無視

#### `pro-1a78d239aa` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-17x", name="たまるマーケット (17倍)", scope="member-stores", rate=0.085, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 17倍 (総倍率、EPOS 基本 0.5% × 17 = 実効 8.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="BONAVENTURA エポスポイント 17 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-1a78d239aa`、不要なら無視

#### `pro-0deec3174e` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-18x", name="たまるマーケット (18倍)", scope="member-stores", rate=0.09, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 18倍 (総倍率、EPOS 基本 0.5% × 18 = 実効 9.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="airalo エポスポイント 18 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-0deec3174e`、不要なら無視

#### `pro-d04d337279` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-19x", name="たまるマーケット (19倍)", scope="member-stores", rate=0.095, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 19倍 (総倍率、EPOS 基本 0.5% × 19 = 実効 9.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="資生堂オンラインストア エポスポイント 19 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-d04d337279`、不要なら無視

#### `pro-5a35c52be5` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-25x", name="たまるマーケット (25倍)", scope="member-stores", rate=0.125, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 25倍 (総倍率、EPOS 基本 0.5% × 25 = 実効 12.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="山田養蜂場オンラインショップ エポスポイント 25 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-5a35c52be5`、不要なら無視

#### `pro-1ed6d37661` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-28x", name="たまるマーケット (28倍)", scope="member-stores", rate=0.14, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 28倍 (総倍率、EPOS 基本 0.5% × 28 = 実効 14.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="マカフィーストア エポスポイント 28 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-1ed6d37661`、不要なら無視

#### `pro-a949ec16bf` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-30x", name="たまるマーケット (30倍)", scope="member-stores", rate=0.15, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 30倍 (総倍率、EPOS 基本 0.5% × 30 = 実効 15.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="Adobe Creative Cloud エポスポイント 30 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-a949ec16bf`、不要なら無視

#### `pro-40634b80c2` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-4x", name="J-POINT パートナー (4倍)", scope="member-stores", rate=0.025, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", description="JCB J-POINT パートナー 4倍店 (W はカード特典+1倍で計5倍 = 実効 2.5%)", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="App Store ポイント 最大 5倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-40634b80c2`、不要なら無視

#### `pro-9e074466cf` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-5x", name="J-POINT パートナー (5倍)", scope="member-stores", rate=0.03, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", description="JCB J-POINT パートナー 5倍店 (W はカード特典+1倍で計6倍 = 実効 3.0%)", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="App Store ポイント 最大 5倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-9e074466cf`、不要なら無視

#### `pro-d409bcba11` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-5x", name="J-POINT パートナー Gold (5倍)", scope="member-stores", rate=0.025, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", description="JCB J-POINT パートナー 5倍店 (Gold は計5倍 = 実効 2.5%)", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="App Store ポイント 最大 5倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-d409bcba11`、不要なら無視

#### `pro-a15836a340` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-6x", name="J-POINT パートナー (6倍)", scope="member-stores", rate=0.035, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", description="JCB J-POINT パートナー 6倍店 (W はカード特典+1倍で計7倍 = 実効 3.5%)", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="オリックスレンタカー ポイント 6倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-a15836a340`、不要なら無視

#### `pro-b6e88b1bbf` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-6x", name="J-POINT パートナー Gold (6倍)", scope="member-stores", rate=0.03, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", description="JCB J-POINT パートナー 6倍店 (Gold は計6倍 = 実効 3.0%)", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="オリックスレンタカー ポイント 6倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-b6e88b1bbf`、不要なら無視

#### `pro-03af01de9b` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-10x", name="J-POINT パートナー (10倍)", scope="member-stores", rate=0.055, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", description="JCB J-POINT パートナー 10倍店 (W はカード特典+1倍で計11倍 = 実効 5.5%)", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-03af01de9b`、不要なら無視

_他 12 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 excludedCategory (11 件)
理由: Policy B: 対象外カテゴリ (金融/保険/医療/ギャンブル等)。自動追加しない。

<details><summary>展開</summary>

#### `sto-3d9414fb45` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="adobe-creative-cloud", name="Adobe Creative Cloud", category="ネットサービス"`
- confidence: 0.81
- 評価: `evidenceQuote="Adobe Creative Cloud エポスポイント 30 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-3d9414fb45`、不要なら無視

#### `sto-07ca37ce7c` — `addRecord/stores` from `ponta-partners`
- 内容: `id="apamanshop", name="アパマンショップ", category="不動産・住宅"`
- confidence: 0.81
- 評価: `evidenceQuote="アパマンショップ たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-07ca37ce7c`、不要なら無視

#### `sto-1d0cf4c10d` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="app-store", name="App Store", category="ネットサービス"`
- confidence: 0.90
- 評価: `evidenceQuote="App Store ポイント 最大 5倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-1d0cf4c10d`、不要なら無視

#### `sto-96efccc2d8` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="disney-plus", name="ディズニープラス", category="ネットサービス"`
- confidence: 0.90
- 評価: `evidenceQuote="ディズニープラス ポイント 20倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-96efccc2d8`、不要なら無視

#### `sto-5f344fbfa8` — `addRecord/stores` from `ponta-partners`
- 内容: `id="dmm-keirin", name="DMM競輪", category="ギャンブル"`
- confidence: 0.81
- 評価: `evidenceQuote="DMM競輪 たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-5f344fbfa8`、不要なら無視

#### `sto-bbf1431215` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="google-play", name="Google Play", category="ネットサービス"`
- confidence: 0.90
- 評価: `evidenceQuote="Google Play ポイント 最大 5倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-bbf1431215`、不要なら無視

#### `sto-09104f03cd` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="hulu", name="Hulu", category="ネットサービス"`
- confidence: 0.90
- 評価: `evidenceQuote="Hulu ポイント 最大 5倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-09104f03cd`、不要なら無視

#### `sto-8299921f3c` — `addRecord/stores` from `ponta-partners`
- 内容: `id="ponta-bitcoin-farm", name="Pontaビットコin牧場", category="その他"`
- confidence: 0.81
- 評価: `evidenceQuote="Pontaビットコin牧場 たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-8299921f3c`、不要なら無視

#### `sto-e49a77a47b` — `addRecord/stores` from `ponta-partners`
- 内容: `id="ponta-play", name="Ponta PLAY", category="その他"`
- confidence: 0.81
- 評価: `evidenceQuote="Ponta PLAY たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-e49a77a47b`、不要なら無視

#### `sto-9fad561d76` — `addRecord/stores` from `ponta-partners`
- 内容: `id="ur-rented-housing", name="UR賃貸住宅", category="不動産・住宅"`
- confidence: 0.81
- 評価: `evidenceQuote="UR賃貸住宅 たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-9fad561d76`、不要なら無視

#### `sto-2f6f0d4b5f` — `addRecord/stores` from `ponta-partners`
- 内容: `id="winticket", name="WINTICKET(ウィンチケット)", category="ギャンブル"`
- confidence: 0.81
- 評価: `evidenceQuote="WINTICKET(ウィンチケット) たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-2f6f0d4b5f`、不要なら無視

</details>

### ⚫ userBlocked (9 件)
理由: seed-blocklist.ts でユーザが除外指定済み。意図した除外であれば無視してよい。

<details><summary>展開</summary>

#### `sto-926029de10` — `addRecord/stores` from `ponta-partners`
- 内容: `id="17live", name="17LIVE(ワンセブンライブ)", category="エンタメ・チケット"`
- confidence: 0.81
- 評価: `evidenceQuote="17LIVE(ワンセブンライブ) たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-926029de10`、不要なら無視

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

#### `sto-8ee2edafd2` — `addRecord/stores` from `ponta-partners`
- 内容: `id="gasone", name="ガスワン（株式会社サイサン）", category="電気・ガス"`
- confidence: 0.81
- 評価: `evidenceQuote="ガスワン（株式会社サイサン） たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-8ee2edafd2`、不要なら無視

#### `sto-2a371f5017` — `addRecord/stores` from `ponta-partners`
- 内容: `id="premium-water", name="プレミアムウォーター", category="生活サービス"`
- confidence: 0.81
- 評価: `evidenceQuote="プレミアムウォーター たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-2a371f5017`、不要なら無視

#### `sto-9cfbfb9793` — `addRecord/stores` from `ponta-partners`
- 内容: `id="president-sha", name="プレジデント社", category="書店"`
- confidence: 0.81
- 評価: `evidenceQuote="プレジデント社 たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-9cfbfb9793`、不要なら無視

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