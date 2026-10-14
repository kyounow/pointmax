# 📋 週次マスタ同期: 要レビュー項目

(自動生成 2026-10-15。merge 前に項目を確認してください。)

## サマリ
- 要レビュー: 214 件
- ソース別: epos-tamaru-market=94, jcb-jpoint=108, smbc-vpoint-up=12
- 主な理由: idCollision=22, missingStoreBody=107, tierMove=1, missingProgramBody=11, lowConfidence=45, excludedCategory=2, storeAdditionsDisabled=26

## 項目 (理由別)

### 🟠 missingStoreBody (store 本体なし membership) (107 件)
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

#### `mem-7e7c0d5ea6` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-5x", storeId="dhc-online-shop"`
- confidence: 0.90
- 評価: `evidenceQuote="DHCオンラインショップ エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-7e7c0d5ea6`、不要なら無視

#### `mem-0fd77c1ea4` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-18x", storeId="yamada-youhoujou-online-shop"`
- confidence: 0.90
- 評価: `evidenceQuote="山田養蜂場オンラインショップ エポスポイント 18 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-0fd77c1ea4`、不要なら無視

#### `mem-334220a82f` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="nitori-net"`
- confidence: 0.90
- 評価: `evidenceQuote="ニトリ 家具・インテリアの通販サイト【楽天市場】 エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-334220a82f`、不要なら無視

#### `mem-dcc93c43d5` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-4x", storeId="daiso-net-store"`
- confidence: 0.90
- 評価: `evidenceQuote="ダイソーネットストア エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-dcc93c43d5`、不要なら無視

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

#### `mem-e800e35bcd` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-5x", storeId="keyuca-online-shop"`
- confidence: 0.90
- 評価: `evidenceQuote="KEYUCA オンラインショップ エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-e800e35bcd`、不要なら無視

#### `mem-58d2b6a740` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-14x", storeId="aesop-online-store"`
- confidence: 0.90
- 評価: `evidenceQuote="イソップオンラインストア エポスポイント 14 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-58d2b6a740`、不要なら無視

#### `mem-fae25d1de7` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="new-balance-online-outlet"`
- confidence: 0.90
- 評価: `evidenceQuote="ニューバランス公式オンラインアウトレット エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-fae25d1de7`、不要なら無視

#### `mem-25370c3df5` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-6x", storeId="bluebottlecoffee-online"`
- confidence: 0.90
- 評価: `evidenceQuote="ブルーボトルコーヒー公式オンラインストア エポスポイント 6 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-25370c3df5`、不要なら無視

#### `mem-84d3d61aff` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-13x", storeId="maison-margiela-fragrances"`
- confidence: 0.90
- 評価: `evidenceQuote="メゾン マルジェラ フレグランス公式オンラインストア エポスポイント 13 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-84d3d61aff`、不要なら無視

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

#### `mem-73ea46a08b` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-5x", storeId="house-of-rose-online"`
- confidence: 0.90
- 評価: `evidenceQuote="ハウスオブローゼ オンラインショップ本店／化粧品 エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-73ea46a08b`、不要なら無視

_他 87 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 missingProgramBody (program 本体なし membership) (11 件)
理由: membership 提案だが、参照先 program 本体が seed 未存在 + 同 run の auto 候補にも無い (proposePrograms は新規 program に必ず idCollision を付けるため、program 本体は同 run では auto に上がらず needsReview に行く)。そのまま membership だけ auto-merge すると BenefitProgram が無く還元計算できない孤児が seed に残るため降格。program 本体側の needsReview を先に承認 → 手動で seed に program 追加 → 次回 cron で membership 側も自動的に通る運用。

<details><summary>展開</summary>

#### `mem-655fae323b` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-10x", storeId="toku-taku"`
- confidence: 0.90
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-655fae323b`、不要なら無視

#### `mem-74ee2d6421` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-10x", storeId="toku-taku"`
- confidence: 0.90
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-74ee2d6421`、不要なら無視

#### `mem-41f36cda16` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x", storeId="aoki"`
- confidence: 0.90
- 評価: `evidenceQuote="洋服の青山 ポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-41f36cda16`、不要なら無視

#### `mem-124ff47776` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x", storeId="aoki"`
- confidence: 0.90
- 評価: `evidenceQuote="洋服の青山 ポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-124ff47776`、不要なら無視

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

#### `mem-2f7cc34b69` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-vup-touch-conveni", storeId="conv-7eleven"`
- confidence: 0.90
- 評価: `evidenceQuote="セブン-イレブン（※1）で、スマホのVisaのタッチ決済・Mastercardタッチ決済（※2）で支払うと、最大11％（※3）ポイント還元！"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-2f7cc34b69`、不要なら無視

</details>

### 🪜 tierMove (同じ店 × 同じ倍率系列の別倍率) (1 件)
理由: membership 提案が、同じ店舗 × 同じ倍率系列 (J-POINT W / J-POINT Gold / たまるマーケット) の**別倍率**と重なる (seed に既にある、または同じ run で別倍率も提案されている)。倍率の改定か、受け皿 (例: 高島屋の SC・レストラン街 2 倍を百貨店本体に) の誤りの疑い。承認すると計算は最大値が勝つため、旧 tier が残ると過大表示や死にデータになり、seed の tier 契約テスト (1 店 × 1 系列 × 1 チャネルに membership 1 件) も落ちる。**承認するなら、旧 tier の membership を `src/state/seed-blocklist.ts` の `REMOVED_MEMBERSHIP_IDS` に入れる PR と同時に**。誤抽出なら無視 (次の run でも同じ理由で review に留まる)。

<details><summary>展開</summary>

#### `mem-97c49a3cf0` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-4x", storeId="takashimaya"`
- confidence: 0.90
- 評価: `evidenceQuote="高島屋 ポイント 最大 4 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-97c49a3cf0`、不要なら無視

</details>

### ⏸ storeAdditionsDisabled (store 追加は手動キュレ運用) (26 件)
理由: 新規 store の追加は cron では行わない方針 (キャンペーン情報の獲得に注力するため)。ここに列挙された店舗は cron が検知した「seed に未追加の店舗候補」で、必要な場合は手動で seed-data-stores.ts に追加 → 次回 cron で関連 membership が自動取り込まれる。全件無視も OK (リストとしての参照のみ)。

<details><summary>展開</summary>

#### `sto-efa999b8e4` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="alex-drug", name="アレックス", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="アレックス ポイント 5 倍 登録不要"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-efa999b8e4`、不要なら無視

#### `sto-ee15f50778` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="bridgestone-sports-online", name="ブリヂストンスポーツオンラインストア", category="スポーツ"`
- confidence: 0.90
- 評価: `evidenceQuote="ブリヂストンスポーツオンラインストア ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-ee15f50778`、不要なら無視

#### `sto-3d69e6e7af` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="budget-rent-a-car", name="バジェット・レンタカー", category="レンタカー"`
- confidence: 0.90
- 評価: `evidenceQuote="バジェット・レンタカー ポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-3d69e6e7af`、不要なら無視

#### `sto-547e2e157c` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="daacs", name="ダックス", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="ダックス ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-547e2e157c`、不要なら無視

#### `sto-64ee262112` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="dai-marufujii-central", name="大丸藤井セントラル", category="雑貨"`
- confidence: 0.90
- 評価: `evidenceQuote="大丸藤井セントラル ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-64ee262112`、不要なら無視

#### `sto-b5ca79ed27` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="daishin-homecenter", name="ダイシン", category="ホームセンター"`
- confidence: 0.90
- 評価: `evidenceQuote="ダイシン ポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-b5ca79ed27`、不要なら無視

#### `sto-7a21cc2744` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="domino-pizza", name="ドミノ・ピザ", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="ドミノ・ピザ ポイント 20 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-7a21cc2744`、不要なら無視

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

#### `sto-c118501c79` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="humming-bird-group", name="ハミングバード・グループ", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="ハミングバード・グループ ポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c118501c79`、不要なら無視

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

#### `sto-d17c78db3e` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="kokumin", name="コクミン", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="コクミン ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-d17c78db3e`、不要なら無視

#### `sto-188f49f8a7` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="le-trois", name="ル・トロワ", category="百貨店"`
- confidence: 0.90
- 評価: `evidenceQuote="ル・トロワ ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-188f49f8a7`、不要なら無視

#### `sto-3d5f8a129f` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="megane-no-prince", name="メガネのプリンス", category="メガネ"`
- confidence: 0.90
- 評価: `evidenceQuote="メガネのプリンス ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-3d5f8a129f`、不要なら無視

#### `sto-ff2a3af903` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="orix-rent-a-car", name="オリックスレンタカー", category="レンタカー"`
- confidence: 0.90
- 評価: `evidenceQuote="オリックスレンタカー ポイント 6 倍 登録不要"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-ff2a3af903`、不要なら無視

_他 6 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟡 lowConfidence (45 件)
理由: Gemini の評価で confidence < 0.9。エビデンス不明瞭・推測混入の疑い。

<details><summary>展開</summary>

#### `mem-4b40318209` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-vup-touch-conveni", storeId="conv-lawson"`
- confidence: 0.64
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン-イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤなど）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-4b40318209`、不要なら無視

#### `mem-6024515a13` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-vup-touch-conveni", storeId="conv-familymart"`
- confidence: 0.64
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン-イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤなど）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-6024515a13`、不要なら無視

#### `mem-dc5ced9ace` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-vup-touch-conveni", storeId="mcdonalds"`
- confidence: 0.64
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン-イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤなど）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-dc5ced9ace`、不要なら無視

#### `mem-048d93ec27` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-vup-touch-conveni", storeId="saizeriya"`
- confidence: 0.64
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン-イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤなど）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-048d93ec27`、不要なら無視

#### `mem-224b411595` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-vup-touch-conveni", storeId="sukiya"`
- confidence: 0.64
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン-イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤ、すき家、ドトールコーヒーショップ、エクセルシオールカフェ、ガストなど）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-224b411595`、不要なら無視

#### `mem-5553025b51` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-vup-touch-conveni", storeId="doutor"`
- confidence: 0.64
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン-イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤ、すき家、ドトールコーヒーショップ、エクセルシオールカフェ、ガストなど）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-5553025b51`、不要なら無視

#### `mem-3df43519a9` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-vup-touch-conveni", storeId="excelsior-cafe"`
- confidence: 0.64
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン-イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤ、すき家、ドトールコーヒーショップ、エクセルシオールカフェ、ガストなど）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-3df43519a9`、不要なら無視

#### `mem-0efa757661` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-vup-touch-conveni", storeId="gusto"`
- confidence: 0.64
- 評価: `evidenceQuote="対象のコンビニ・飲食店（セブン-イレブン、ローソン、ファミリーマート、マクドナルド、サイゼリヤ、すき家、ドトールコーヒーショップ、エクセルシオールカフェ、ガストなど）"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-0efa757661`、不要なら無視

#### `sto-5371c31061` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="adidas-online-shop", name="adidas ONLINE SHOP", category="ファッション"`
- confidence: 0.81
- 評価: `evidenceQuote="adidas ONLINE SHOP エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-5371c31061`、不要なら無視

#### `sto-c833ce18d7` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="aeon-shop", name="おうちでイオン イオンショップ", category="スーパー"`
- confidence: 0.81
- 評価: `evidenceQuote="おうちでイオン イオンショップ エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c833ce18d7`、不要なら無視

#### `sto-423912a2fb` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="aesop-online-store", name="イソップオンラインストア", category="美容"`
- confidence: 0.81
- 評価: `evidenceQuote="イソップオンラインストア エポスポイント 14 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-423912a2fb`、不要なら無視

#### `sto-69312df957` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="agoda", name="Agoda", category="旅行代理店"`
- confidence: 0.81
- 評価: `evidenceQuote="Agoda エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-69312df957`、不要なら無視

#### `sto-7c1da97b2f` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="ana-travelers", name="ANAトラベラーズ", category="旅行代理店"`
- confidence: 0.81
- 評価: `evidenceQuote="ANAの国内・海外ツアー【ANAトラベラーズ】 エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-7c1da97b2f`、不要なら無視

#### `sto-ca13000284` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="apahotels-resorts", name="アパホテルズ＆リゾーツ", category="ホテル"`
- confidence: 0.81
- 評価: `evidenceQuote="アパホテルズ＆リゾーツ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-ca13000284`、不要なら無視

#### `sto-884966b366` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="at-cosme-shopping", name="@cosme SHOPPING", category="美容"`
- confidence: 0.81
- 評価: `evidenceQuote="@cosme SHOPPING エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-884966b366`、不要なら無視

#### `sto-50df4f250f` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="atidimu-official-store", name="ATIDIMU公式ストア", category="ファッション"`
- confidence: 0.81
- 評価: `evidenceQuote="ATIDIMU公式ストア エポスポイント 30 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-50df4f250f`、不要なら無視

#### `sto-e018c92385` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="belluna", name="カタログ通販ベルーナ", category="ネット通販"`
- confidence: 0.81
- 評価: `evidenceQuote="カタログ通販ベルーナ（Belluna） エポスポイント 10 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-e018c92385`、不要なら無視

#### `sto-9e6abe3066` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="bluebottlecoffee-online", name="ブルーボトルコーヒー公式オンラインストア", category="飲食"`
- confidence: 0.81
- 評価: `evidenceQuote="ブルーボトルコーヒー公式オンラインストア エポスポイント 6 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-9e6abe3066`、不要なら無視

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

_他 25 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 idCollision (22 件)
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
- 評価: `evidenceQuote="ブルーボトルコーヒー公式オンラインストア エポスポイント 6 倍"`
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
- 評価: `evidenceQuote="イソップオンラインストア エポスポイント 14 倍"`
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

#### `pro-9e57013460` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-19x", name="たまるマーケット (19倍)", scope="member-stores", rate=0.095, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 19倍 (総倍率、EPOS 基本 0.5% × 19 = 実効 9.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="IPSA 公式サイト エポスポイント 19 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-9e57013460`、不要なら無視

#### `pro-95dfd4ebfb` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-25x", name="たまるマーケット (25倍)", scope="member-stores", rate=0.125, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 25倍 (総倍率、EPOS 基本 0.5% × 25 = 実効 12.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="ドクターシーラボ公式オンラインショップ エポスポイント 25 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-95dfd4ebfb`、不要なら無視

#### `pro-d25ca5de81` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-30x", name="たまるマーケット (30倍)", scope="member-stores", rate=0.15, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 30倍 (総倍率、EPOS 基本 0.5% × 30 = 実効 15.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="Adobe Creative Cloud エポスポイント 30 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-d25ca5de81`、不要なら無視

#### `pro-5cc8d96a51` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-4x", name="J-POINT パートナー (4倍)", scope="member-stores", rate=0.025, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="高島屋 ポイント 最大 4 倍 プレミアムでおトク"`
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
- 評価: `evidenceQuote="洋服の青山 ポイント 5 倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-6b3990a94f`、不要なら無視

#### `pro-0828a58c21` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-6x", name="J-POINT パートナー (6倍)", scope="member-stores", rate=0.035, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。登録不要。"`
- confidence: 0.90
- 評価: `evidenceQuote="オリックスレンタカー ポイント 6 倍 登録不要"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-0828a58c21`、不要なら無視

#### `pro-c41d047315` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-6x", name="J-POINT パートナー Gold (6倍)", scope="member-stores", rate=0.03, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。登録不要。"`
- confidence: 0.90
- 評価: `evidenceQuote="オリックスレンタカー ポイント 6 倍 登録不要"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-c41d047315`、不要なら無視

#### `pro-157596bab6` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-10x", name="J-POINT パートナー (10倍)", scope="member-stores", rate=0.055, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10 倍 プレミアムでおトク"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-157596bab6`、不要なら無視

#### `pro-a2bfee06a4` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-10x", name="J-POINT パートナー Gold (10倍)", scope="member-stores", rate=0.05, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10 倍 プレミアムでおトク"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-a2bfee06a4`、不要なら無視

#### `pro-e56845311f` — `addRecord/programs` from `smbc-vpoint-up`
- 内容: `id="prog-smbc-vup-touch-conveni", name="Vポイントアッププログラム 対象店舗スマホタッチ決済", scope="member-stores", rate=0.075, currencyId="v-pt", cardIds=["smbc-v","olive"], paymentAppId="pa-visa-touch", bonusType="primary", description="Vポイントアッププログラム対象のコンビニ・飲食店でVisa/Mastercardのタッチ決済またはモバイルオーダー利用で+7.5%還元", officialUrl="https://www.smbc.co.jp/kojin/vpoint-up/", conditions="対象店舗でのスマホのVisaのタッチ決済・Mastercardタッチ決済、またはモバイルオーダー利用時。カード現物のタッチ決済、iD、カードの差し込み、磁気取引は対象外。"`
- confidence: 0.81
- 評価: `evidenceQuote="対象店舗でスマホのVisaのタッチ決済・Mastercard®︎タッチ決済またはモバイルオーダーを利用＋7.5％還元"`
- 判定詳細: 新規 program (extractor=ongoing-program は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-e56845311f`、不要なら無視

_他 2 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 excludedCategory (2 件)
理由: Policy B: 対象外カテゴリ (金融/保険/医療/ギャンブル/サブスクリプション等)。自動追加しない。

<details><summary>展開</summary>

#### `sto-3d9414fb45` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="adobe-creative-cloud", name="Adobe Creative Cloud", category="ネットサービス"`
- confidence: 0.81
- 評価: `evidenceQuote="Adobe Creative Cloud エポスポイント 30 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-3d9414fb45`、不要なら無視

#### `sto-1de9b8765b` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="sourcenext", name="ソースネクスト", category="ネットサービス"`
- confidence: 0.81
- 評価: `evidenceQuote="ソースネクスト エポスポイント 13 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-1de9b8765b`、不要なら無視

</details>

## 操作
- **取り込みたい項目がある場合 (半自動)**: ローカルでこのブランチを checkout し、`npm run sync:approve -- <ID> [<ID> ...]` を実行 (ID は各項目見出しの先頭)。seed-additions.ts への反映・queue からの除去・REVIEW_QUEUE.md の再生成まで自動。`npm run sync:approve -- --list` で一覧表示。実行後 `npm test && npm run build` を確認して commit
- 🔴 untargetedProgram / campaignConditional / campaignRateCeiling / targetMismatch / storeNameMismatch は承認すると record がそのまま全額に乗るため原則見送り。承認には `--accept-risk` が必要
- このまま **merge** すると、要レビュー項目を読み込んだ証拠として記録されるだけ (実体 seed 変更はなし)
- 手動キュレートしたい場合は、このブランチに追加 commit してから merge
- 不要なら **close** で次週まで保留