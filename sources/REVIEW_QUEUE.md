# 📋 週次マスタ同期: 要レビュー項目

(自動生成 2026-07-23。merge 前に項目を確認してください。)

## サマリ
- 要レビュー: 366 件
- ソース別: epos-tamaru-market=105, jcb-jpoint=179, smbc-v-gold-7percent=1, smbc-vpoint-up=38, v-point=42, jal-card-tokuyaku-list=1
- 主な理由: idCollision=27, missingStoreBody=179, missingProgramBody=8, lowConfidence=38, storeAdditionsDisabled=99, userBlocked=1, excludedCategory=11, safetyFailed=3

## 項目 (理由別)

### 🛡 safetyFailed (auto-merge 件数オーバー降格) (3 件)
理由: auto-merge 候補だが、件数が maxAutoChangesPerRun を超えたため安全弁で review に降格。内容は健全な auto 候補なので、個別精査の上 maxAutoChangesPerRun を一時 bump して再実行 or 手動で取り込み判断。

<details><summary>展開</summary>

#### `pro-08ad1776bd` — `updateField/programs` `prog-jcb-jpoint-20x` from `jcb-jpoint-partners`
- フィールド: `rate`
- 変更: `10.500%` → `20.000%`
- confidence: 0.90
- 評価: `evidenceQuote="マクドナルド（モバイルオーダー・マックデリバリー(R)サービス限定） ポイント 20 倍, スターバックス（モバイルオーダー） ポイント 20 倍, すき家 ポイント 20 倍, 吉野家 ポイント 20 倍, ガスト ポイント 20 倍, "`
- 対応案: 取り込むなら `npm run sync:approve -- pro-08ad1776bd`、不要なら無視

#### `pro-c7ba60c42c` — `updateField/programs` `prog-jcb-jpoint-3x` from `jcb-jpoint-partners`
- フィールド: `rate`
- 変更: `2.000%` → `3.000%`
- confidence: 0.90
- 評価: `evidenceQuote="Amazon.co.jp ポイント 3 倍, セブン-イレブン ポイント 3 倍, Qoo10 ポイント 3 倍, Uber Eats ポイント 3 倍, OWNDAYS／オンデーズ ポイント 3 倍, 京王百貨店 ポイント 3 倍, バジ"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-c7ba60c42c`、不要なら無視

#### `pro-9b511ef867` — `updateField/programs` `prog-jcb-jpoint-2x` from `jcb-jpoint-partners`
- フィールド: `rate`
- 変更: `1.500%` → `2.000%`
- confidence: 0.90
- 評価: `evidenceQuote="ビックカメラ/ビックドラッグ ポイント 2 倍, ウエルシア・ハックドラッグ・金光薬品 ポイント 2 倍, メルカリ ポイント 2 倍, apollostation ポイント 2 倍, 丸善・ジュンク堂書店 ポイント 2 倍, タイムズパー"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-9b511ef867`、不要なら無視

</details>

### 🟠 missingStoreBody (store 本体なし membership) (179 件)
理由: membership 提案だが、参照先 store 本体が seed 未存在 + 同 run の auto 候補にも無い (例: category cap で deferred された場合)。そのまま auto-merge すると孤児 membership (店名解決できない、UI で店舗未表示) が seed に残るため降格。store 本体を手動キュレートで追加するか、次回 cron で store 側が auto 化されるのを待つ。

<details><summary>展開</summary>

#### `mem-89f78be4ff` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="qoo10"`
- confidence: 0.90
- 評価: `evidenceQuote="Qoo10 エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-89f78be4ff`、不要なら無視

#### `mem-cd2ee1e2bb` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-7x", storeId="adidas-online-shop"`
- confidence: 0.90
- 評価: `evidenceQuote="adidas ONLINE SHOP エポスポイント 7 倍 ゴールド プラチナ 9 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-cd2ee1e2bb`、不要なら無視

#### `mem-43ff49eebe` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-7x", storeId="shein"`
- confidence: 0.90
- 評価: `evidenceQuote="SHEIN エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-43ff49eebe`、不要なら無視

#### `mem-98ec00d30f` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="gu-online-store"`
- confidence: 0.90
- 評価: `evidenceQuote="ジーユー オンラインストア エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-98ec00d30f`、不要なら無視

#### `mem-04928bfa27` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-18x", storeId="airalo"`
- confidence: 0.90
- 評価: `evidenceQuote="airalo エポスポイント 18 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-04928bfa27`、不要なら無視

#### `mem-dd32902f86` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-7x", storeId="agoda"`
- confidence: 0.90
- 評価: `evidenceQuote="Agoda エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-dd32902f86`、不要なら無視

#### `mem-c7e664f8a1` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-10x", storeId="expedia-hotel"`
- confidence: 0.90
- 評価: `evidenceQuote="【海外・国内ホテル】旅行予約のエクスペディア エポスポイント 10 倍 ゴールド プラチナ 14 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-c7e664f8a1`、不要なら無視

#### `mem-fe63c5068b` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="rakuten-travel"`
- confidence: 0.90
- 評価: `evidenceQuote="楽天トラベル【楽天市場】 エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-fe63c5068b`、不要なら無視

#### `mem-c3d8737308` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="trip-com-flight"`
- confidence: 0.90
- 評価: `evidenceQuote="Trip.com（航空券） エポスポイント 2 倍 ゴールド プラチナ 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-c3d8737308`、不要なら無視

#### `mem-815fc52ae7` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="orbis"`
- confidence: 0.90
- 評価: `evidenceQuote="オルビス エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-815fc52ae7`、不要なら無視

#### `mem-4506e58c9d` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-14x", storeId="shiseido-online-store"`
- confidence: 0.90
- 評価: `evidenceQuote="資生堂オンラインストア エポスポイント 14 倍 ゴールド プラチナ 15 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-4506e58c9d`、不要なら無視

#### `mem-bfa126c454` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-4x", storeId="at-cosme-shopping"`
- confidence: 0.90
- 評価: `evidenceQuote="@cosme SHOPPING エポスポイント 4 倍 ゴールド プラチナ 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-bfa126c454`、不要なら無視

#### `mem-9bb5b00c1f` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-18x", storeId="yamada-yohojo-online-shop"`
- confidence: 0.90
- 評価: `evidenceQuote="山田養蜂場オンラインショップ エポスポイント 18 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-9bb5b00c1f`、不要なら無視

#### `mem-c1eda7ce00` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-6x", storeId="loccitane-online-shop"`
- confidence: 0.90
- 評価: `evidenceQuote="ロクシタンオンラインショップ エポスポイント 6 倍 ゴールド プラチナ 9 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-c1eda7ce00`、不要なら無視

#### `mem-23eee49a66` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="nitori"`
- confidence: 0.90
- 評価: `evidenceQuote="ニトリ 家具・インテリアの通販サイト【楽天市場】 エポスポイント 2 倍"`
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

#### `mem-9c0a4f37f3` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-13x", storeId="hibiya-kadank"`
- confidence: 0.90
- 評価: `evidenceQuote="日比谷花壇 エポスポイント 13 倍 ゴールド プラチナ 17 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-9c0a4f37f3`、不要なら無視

#### `mem-e800e35bcd` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-5x", storeId="keyuca-online-shop"`
- confidence: 0.90
- 評価: `evidenceQuote="KEYUCA オンラインショップ エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-e800e35bcd`、不要なら無視

#### `mem-b5ff951d7f` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-7x", storeId="vaio-store"`
- confidence: 0.90
- 評価: `evidenceQuote="VAIOストア エポスポイント 7 倍 ゴールド プラチナ 10 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-b5ff951d7f`、不要なら無視

_他 159 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 missingProgramBody (program 本体なし membership) (8 件)
理由: membership 提案だが、参照先 program 本体が seed 未存在 + 同 run の auto 候補にも無い (proposePrograms は新規 program に必ず idCollision を付けるため、program 本体は同 run では auto に上がらず needsReview に行く)。そのまま membership だけ auto-merge すると BenefitProgram が無く還元計算できない孤児が seed に残るため降格。program 本体側の needsReview を先に承認 → 手動で seed に program 追加 → 次回 cron で membership 側も自動的に通る運用。

<details><summary>展開</summary>

#### `mem-f9678d6b6f` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-7x", storeId="aeon"`
- confidence: 0.90
- 評価: `evidenceQuote="おうちでイオン イオンショップ エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-f9678d6b6f`、不要なら無視

#### `mem-97c49a3cf0` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-4x", storeId="takashimaya"`
- confidence: 0.90
- 評価: `evidenceQuote="高島屋 ポイント 最大 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-97c49a3cf0`、不要なら無視

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

</details>

### ⏸ storeAdditionsDisabled (store 追加は手動キュレ運用) (99 件)
理由: 新規 store の追加は cron では行わない方針 (キャンペーン情報の獲得に注力するため)。ここに列挙された店舗は cron が検知した「seed に未追加の店舗候補」で、必要な場合は手動で seed-data-stores.ts に追加 → 次回 cron で関連 membership が自動取り込まれる。全件無視も OK (リストとしての参照のみ)。

<details><summary>展開</summary>

#### `sto-bec7e76359` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="7net-shopping", name="セブンネットショッピング", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="セブンネットショッピング エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-bec7e76359`、不要なら無視

#### `sto-5371c31061` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="adidas-online-shop", name="adidas ONLINE SHOP", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="adidas ONLINE SHOP エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-5371c31061`、不要なら無視

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

#### `sto-8bebd0f408` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="airalo", name="airalo", category="旅行代理店"`
- confidence: 0.90
- 評価: `evidenceQuote="airalo エポスポイント 18 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-8bebd0f408`、不要なら無視

#### `sto-40930167f2` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="apa-hotels-resorts", name="アパホテルズ＆リゾーツ", category="ホテル"`
- confidence: 0.90
- 評価: `evidenceQuote="アパホテルズ＆リゾーツ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-40930167f2`、不要なら無視

#### `sto-5f5bbf9bd8` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="app-store", name="App Store", category="ネットサービスのみ"`
- confidence: 0.90
- 評価: `evidenceQuote="App Store ポイント 最大 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-5f5bbf9bd8`、不要なら無視

#### `sto-ebffcab95a` — `addRecord/stores` from `v-point-partners`
- 内容: `id="aruku-and", name="aruku&（あるくと）", category="ネットサービスのみ"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: aruku&（あるくと）"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-ebffcab95a`、不要なら無視

#### `sto-884966b366` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="at-cosme-shopping", name="@cosme SHOPPING", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="@cosme SHOPPING エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-884966b366`、不要なら無視

#### `sto-e0cc310029` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="atidimu-official-store", name="ATIDIMU公式ストア", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="ATIDIMU公式ストア エポスポイント 30 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-e0cc310029`、不要なら無視

#### `sto-e3c2ad477b` — `addRecord/stores` from `v-point-partners`
- 内容: `id="autobacs-dotcom", name="オートバックス・ドットコム", category="車・バイク"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: オートバックス・ドットコム"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-e3c2ad477b`、不要なら無視

#### `sto-54e3f697e1` — `addRecord/stores` from `v-point-partners`
- 内容: `id="b-b-on", name="B.B.ON", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: B.B.ON"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-54e3f697e1`、不要なら無視

#### `sto-f6d01b9bac` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="baribari-aobadori", name="バリバリ青葉通り店", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="バリバリ青葉通り店 ポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-f6d01b9bac`、不要なら無視

#### `sto-e018c92385` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="belluna", name="カタログ通販ベルーナ", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="カタログ通販ベルーナ（Belluna） エポスポイント 10 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-e018c92385`、不要なら無視

#### `sto-324ba23293` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="belluna-gourmet", name="ベルーナグルメ", category="食品"`
- confidence: 0.90
- 評価: `evidenceQuote="ベルーナグルメ エポスポイント 10 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-324ba23293`、不要なら無視

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

#### `sto-b6e44bbb97` — `addRecord/stores` from `v-point-partners`
- 内容: `id="camera-no-kitamura-netshop", name="カメラのキタムラネットショップ（カメラ用品）", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: カメラのキタムラネットショップ（カメラ用品）"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-b6e44bbb97`、不要なら無視

_他 79 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟡 lowConfidence (38 件)
理由: Gemini の評価で confidence < 0.9。エビデンス不明瞭・推測混入の疑い。

<details><summary>展開</summary>

#### `car-43ab591ee6` — `updateField/cards` `smbc-v` from `smbc-v-gold-7percent`
- フィールド: `defaultRate`
- 変更: `0.500%` → `1.000%`
- confidence: 0.81
- 評価: `evidenceQuote="三井住友カード ゴールド VISA/ Mastercard ... 通常のポイント分1％に加えて+6％ポイント還元となります。"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視 (この type/field は sync:approve 未対応)

#### `mem-19d87f13d1` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-7-5", storeId="seicomart"`
- confidence: 0.85
- 評価: `evidenceQuote="セイコーマート ※2 、セブン‐イレブン、ポプラ ※3 、ミニストップ、ローソン ※4 、マクドナルド、モスバーガー ※5 、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーく"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-19d87f13d1`、不要なら無視

#### `mem-c7826c6677` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-7-5", storeId="conv-7eleven"`
- confidence: 0.85
- 評価: `evidenceQuote="セイコーマート ※2 、セブン‐イレブン、ポプラ ※3 、ミニストップ、ローソン ※4 、マクドナルド、モスバーガー ※5 、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーく"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-c7826c6677`、不要なら無視

#### `mem-4ff05fef4d` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-7-5", storeId="poplar"`
- confidence: 0.85
- 評価: `evidenceQuote="セイコーマート ※2 、セブン‐イレブン、ポプラ ※3 、ミニストップ、ローソン ※4 、マクドナルド、モスバーガー ※5 、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーく"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-4ff05fef4d`、不要なら無視

#### `mem-d67608bc38` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-7-5", storeId="conv-ministop"`
- confidence: 0.85
- 評価: `evidenceQuote="セイコーマート ※2 、セブン‐イレブン、ポプラ ※3 、ミニストップ、ローソン ※4 、マクドナルド、モスバーガー ※5 、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーく"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-d67608bc38`、不要なら無視

#### `mem-9424bac71d` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-7-5", storeId="conv-lawson"`
- confidence: 0.85
- 評価: `evidenceQuote="セイコーマート ※2 、セブン‐イレブン、ポプラ ※3 、ミニストップ、ローソン ※4 、マクドナルド、モスバーガー ※5 、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーく"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-9424bac71d`、不要なら無視

#### `mem-3e0ba90dc7` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-7-5", storeId="mcdonalds"`
- confidence: 0.85
- 評価: `evidenceQuote="セイコーマート ※2 、セブン‐イレブン、ポプラ ※3 、ミニストップ、ローソン ※4 、マクドナルド、モスバーガー ※5 、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーく"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-3e0ba90dc7`、不要なら無視

#### `mem-8d652ff176` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-7-5", storeId="mos-burger"`
- confidence: 0.85
- 評価: `evidenceQuote="セイコーマート ※2 、セブン‐イレブン、ポプラ ※3 、ミニストップ、ローソン ※4 、マクドナルド、モスバーガー ※5 、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーく"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-8d652ff176`、不要なら無視

#### `mem-f5be2a61d7` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-7-5", storeId="kfc"`
- confidence: 0.85
- 評価: `evidenceQuote="セイコーマート ※2 、セブン‐イレブン、ポプラ ※3 、ミニストップ、ローソン ※4 、マクドナルド、モスバーガー ※5 、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーく"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-f5be2a61d7`、不要なら無視

#### `mem-e25267af6a` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-7-5", storeId="yoshinoya"`
- confidence: 0.85
- 評価: `evidenceQuote="セイコーマート ※2 、セブン‐イレブン、ポプラ ※3 、ミニストップ、ローソン ※4 、マクドナルド、モスバーガー ※5 、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーく"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-e25267af6a`、不要なら無視

#### `mem-5f8c541eda` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-7-5", storeId="saizeriya"`
- confidence: 0.85
- 評価: `evidenceQuote="セイコーマート ※2 、セブン‐イレブン、ポプラ ※3 、ミニストップ、ローソン ※4 、マクドナルド、モスバーガー ※5 、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーく"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-5f8c541eda`、不要なら無視

#### `mem-ec4555980e` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-7-5", storeId="gusto"`
- confidence: 0.85
- 評価: `evidenceQuote="セイコーマート ※2 、セブン‐イレブン、ポプラ ※3 、ミニストップ、ローソン ※4 、マクドナルド、モスバーガー ※5 、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーく"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-ec4555980e`、不要なら無視

#### `mem-52f1252e8e` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-7-5", storeId="bamiyan"`
- confidence: 0.85
- 評価: `evidenceQuote="セイコーマート ※2 、セブン‐イレブン、ポプラ ※3 、ミニストップ、ローソン ※4 、マクドナルド、モスバーガー ※5 、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーく"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-52f1252e8e`、不要なら無視

#### `mem-c48b040633` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-7-5", storeId="shabuyo"`
- confidence: 0.85
- 評価: `evidenceQuote="セイコーマート ※2 、セブン‐イレブン、ポプラ ※3 、ミニストップ、ローソン ※4 、マクドナルド、モスバーガー ※5 、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーく"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-c48b040633`、不要なら無視

#### `mem-b0f5688bdc` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-7-5", storeId="jonathan"`
- confidence: 0.85
- 評価: `evidenceQuote="セイコーマート ※2 、セブン‐イレブン、ポプラ ※3 、ミニストップ、ローソン ※4 、マクドナルド、モスバーガー ※5 、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーく"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-b0f5688bdc`、不要なら無視

#### `mem-96d5a16cd2` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-7-5", storeId="yumetoan"`
- confidence: 0.85
- 評価: `evidenceQuote="セイコーマート ※2 、セブン‐イレブン、ポプラ ※3 、ミニストップ、ローソン ※4 、マクドナルド、モスバーガー ※5 、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーく"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-96d5a16cd2`、不要なら無視

#### `mem-2f4b2cde42` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-7-5", storeId="sukiya"`
- confidence: 0.85
- 評価: `evidenceQuote="セイコーマート ※2 、セブン‐イレブン、ポプラ ※3 、ミニストップ、ローソン ※4 、マクドナルド、モスバーガー ※5 、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーく"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-2f4b2cde42`、不要なら無視

#### `mem-550fbe6702` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-7-5", storeId="hamazushi"`
- confidence: 0.85
- 評価: `evidenceQuote="セイコーマート ※2 、セブン‐イレブン、ポプラ ※3 、ミニストップ、ローソン ※4 、マクドナルド、モスバーガー ※5 、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーく"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-550fbe6702`、不要なら無視

#### `mem-f18e7c9d50` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-7-5", storeId="cocos"`
- confidence: 0.85
- 評価: `evidenceQuote="セイコーマート ※2 、セブン‐イレブン、ポプラ ※3 、ミニストップ、ローソン ※4 、マクドナルド、モスバーガー ※5 、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーく"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-f18e7c9d50`、不要なら無視

#### `mem-af155d73b9` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni-7-5", storeId="starbucks"`
- confidence: 0.85
- 評価: `evidenceQuote="セイコーマート ※2 、セブン‐イレブン、ポプラ ※3 、ミニストップ、ローソン ※4 、マクドナルド、モスバーガー ※5 、ケンタッキーフライドチキン、吉野家、サイゼリヤ、ガスト、バーミヤン、しゃぶ葉、ジョナサン、夢庵、その他すかいらーく"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-af155d73b9`、不要なら無視

_他 18 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 idCollision (27 件)
理由: 新規追加だが既存 ID またはストア名と衝突。重複の可能性あり。

<details><summary>展開</summary>

#### `pro-2a8bfb0d9c` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-5x", name="たまるマーケット (5倍)", scope="member-stores", rate=0.025, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 5倍 (総倍率、EPOS 基本 0.5% × 5 = 実効 2.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="JTB旅物語公式サイト エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-2a8bfb0d9c`、不要なら無視

#### `pro-401cce4e15` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-6x", name="たまるマーケット (6倍)", scope="member-stores", rate=0.03, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 6倍 (総倍率、EPOS 基本 0.5% × 6 = 実効 3.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="ロクシタンオンラインショップ エポスポイント 6 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-401cce4e15`、不要なら無視

#### `pro-0703c0badb` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-7x", name="たまるマーケット (7倍)", scope="member-stores", rate=0.035, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 7倍 (総倍率、EPOS 基本 0.5% × 7 = 実効 3.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。ゴールド/プラチナ会員は +2倍 (9倍) の場合あり。"`
- confidence: 0.90
- 評価: `evidenceQuote="おうちでイオン イオンショップ エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-0703c0badb`、不要なら無視

#### `pro-61f1dc9c3a` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-9x", name="たまるマーケット (9倍)", scope="member-stores", rate=0.045, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 9倍 (総倍率、EPOS 基本 0.5% × 9 = 実効 4.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。ゴールド/プラチナ会員は +3倍 (12倍) の場合あり。"`
- confidence: 0.90
- 評価: `evidenceQuote="hince日本公式オンラインストア エポスポイント 9 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-61f1dc9c3a`、不要なら無視

#### `pro-496b08f81c` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-10x", name="たまるマーケット (10倍)", scope="member-stores", rate=0.05, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 10倍 (総倍率、EPOS 基本 0.5% × 10 = 実効 5.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。ゴールド/プラチナ会員は +1倍 (11倍) の場合あり。"`
- confidence: 0.90
- 評価: `evidenceQuote="カタログ通販ベルーナ（Belluna） エポスポイント 10 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-496b08f81c`、不要なら無視

#### `pro-5162a8e272` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-11x", name="たまるマーケット (11倍)", scope="member-stores", rate=0.055, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 11倍 (総倍率、EPOS 基本 0.5% × 11 = 実効 5.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="HP Directplus エポスポイント 11 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-5162a8e272`、不要なら無視

#### `pro-8b76512ae6` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-13x", name="たまるマーケット (13倍)", scope="member-stores", rate=0.065, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 13倍 (総倍率、EPOS 基本 0.5% × 13 = 実効 6.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。ゴールド/プラチナ会員は +1倍 (14倍) の場合あり。"`
- confidence: 0.90
- 評価: `evidenceQuote="日比谷花壇 エポスポイント 13 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-8b76512ae6`、不要なら無視

#### `pro-0eb4736ec1` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-14x", name="たまるマーケット (14倍)", scope="member-stores", rate=0.07, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 14倍 (総倍率、EPOS 基本 0.5% × 14 = 実効 7.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。ゴールド/プラチナ会員は +1倍 (15倍) の場合あり。"`
- confidence: 0.90
- 評価: `evidenceQuote="資生堂オンラインストア エポスポイント 14 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-0eb4736ec1`、不要なら無視

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

#### `pro-ec2630b87b` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-21x", name="たまるマーケット (21倍)", scope="member-stores", rate=0.105, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 21倍 (総倍率、EPOS 基本 0.5% × 21 = 実効 10.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="ショップジャパン エポスポイント 21 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-ec2630b87b`、不要なら無視

#### `pro-b0a5cef7ba` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-28x", name="たまるマーケット (28倍)", scope="member-stores", rate=0.14, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 28倍 (総倍率、EPOS 基本 0.5% × 28 = 実効 14.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。ゴールド/プラチナ会員は +2倍 (30倍) の場合あり。"`
- confidence: 0.90
- 評価: `evidenceQuote="マカフィーストア エポスポイント 28 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-b0a5cef7ba`、不要なら無視

#### `pro-a949ec16bf` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-30x", name="たまるマーケット (30倍)", scope="member-stores", rate=0.15, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", description="たまるマーケット経由で 30倍 (総倍率、EPOS 基本 0.5% × 30 = 実効 15.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="ATIDIMU公式ストア エポスポイント 30 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-a949ec16bf`、不要なら無視

#### `pro-6dc4f23781` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-10x", name="J-POINT パートナー (10倍)", scope="member-stores", rate=0.1, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10 倍, S.RIDE ポイント 10 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-6dc4f23781`、不要なら無視

#### `pro-a2bfee06a4` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-10x", name="J-POINT パートナー Gold (10倍)", scope="member-stores", rate=0.05, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="タクシーアプリ『GO』 ポイント 10 倍 プレミアムでおトク, Uber ポイント 10 倍 プレミアムでおトク, S.RIDE ポイント 10 倍 プレミアムでおトク"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-a2bfee06a4`、不要なら無視

#### `pro-a607716ec7` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-6x", name="J-POINT パートナー (6倍)", scope="member-stores", rate=0.06, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="オリックスレンタカー ポイント 6 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-a607716ec7`、不要なら無視

#### `pro-607e69cb99` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-6x", name="J-POINT パートナー Gold (6倍)", scope="member-stores", rate=0.03, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="オリックスレンタカー ポイント 6 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-607e69cb99`、不要なら無視

#### `pro-ff09e5316b` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-5x", name="J-POINT パートナー (5倍)", scope="member-stores", rate=0.05, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。Google Play, App Store, U-NEXT, コミックシーモア, 国内宿泊オンライン予約, Hulu, JCBトラベルは「プレミアムでおトク」表記がなく、また「登録不要」の記載がないためW系列にも適用されると判断。"`
- confidence: 0.90
- 評価: `evidenceQuote="Google Play ポイント 最大 5 倍, App Store ポイント 最大 5 倍, U-NEXT ポイント 最大 5 倍, コミックシーモア ポイント 最大 5 倍, 国内宿泊オンライン予約 ポイント 最大 5 倍 登録不要, "`
- 対応案: 取り込むなら `npm run sync:approve -- pro-ff09e5316b`、不要なら無視

#### `pro-6b3990a94f` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-5x", name="J-POINT パートナー Gold (5倍)", scope="member-stores", rate=0.025, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="Google Play ポイント 最大 5 倍 プレミアムでおトク, App Store ポイント 最大 5 倍 プレミアムでおトク, U-NEXT ポイント 最大 5 倍 プレミアムでおトク, コミックシーモア ポイント 最大 5 倍 プ"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-6b3990a94f`、不要なら無視

#### `pro-060feb0248` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-4x", name="J-POINT パートナー (4倍)", scope="member-stores", rate=0.04, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="高島屋 ポイント 最大 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- pro-060feb0248`、不要なら無視

_他 7 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 excludedCategory (11 件)
理由: Policy B: 対象外カテゴリ (金融/保険/医療/ギャンブル等)。自動追加しない。

<details><summary>展開</summary>

#### `sto-90d1329085` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="alex", name="アレックス", category="その他"`
- confidence: 0.90
- 評価: `evidenceQuote="アレックス ポイント 5 倍 登録不要"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-90d1329085`、不要なら無視

#### `sto-078eef3ebc` — `addRecord/stores` from `v-point-partners`
- 内容: `id="central-park", name="セントラルパーク", category="その他"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: セントラルパーク"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-078eef3ebc`、不要なら無視

#### `sto-514edff8fd` — `addRecord/stores` from `v-point-partners`
- 内容: `id="entas", name="エヌタス", category="その他"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: エヌタス"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-514edff8fd`、不要なら無視

#### `sto-f39c60bdef` — `addRecord/stores` from `v-point-partners`
- 内容: `id="fujimaru-park", name="藤丸パーク", category="その他"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: 藤丸パーク"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-f39c60bdef`、不要なら無視

#### `sto-ef8738c380` — `addRecord/stores` from `v-point-partners`
- 内容: `id="jihampi", name="ジハンピ", category="その他"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: ジハンピ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-ef8738c380`、不要なら無視

#### `sto-abca8b1177` — `addRecord/stores` from `v-point-partners`
- 内容: `id="moneyforward-me", name="マネーフォワード ME", category="金融"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: マネーフォワード ME"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-abca8b1177`、不要なら無視

#### `sto-59e5b34c1a` — `addRecord/stores` from `v-point-partners`
- 内容: `id="sbi-shoken", name="SBI証券", category="金融"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: SBI証券"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-59e5b34c1a`、不要なら無視

#### `sto-29e63c8529` — `addRecord/stores` from `v-point-partners`
- 内容: `id="smbc-mobit", name="SMBCモビット", category="金融"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: SMBCモビット"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-29e63c8529`、不要なら無視

#### `sto-476bf53bd7` — `addRecord/stores` from `v-point-partners`
- 内容: `id="toshin-hochoki-center", name="トーシン補聴器センター", category="医療"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: トーシン補聴器センター"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-476bf53bd7`、不要なら無視

#### `sto-06d3675e6f` — `addRecord/stores` from `v-point-partners`
- 内容: `id="v-neobank", name="V NEOBANK", category="金融"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: V NEOBANK"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-06d3675e6f`、不要なら無視

#### `sto-4cd4366c16` — `addRecord/stores` from `v-point-partners`
- 内容: `id="winticket", name="WINTICKET", category="ギャンブル"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: WINTICKET"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-4cd4366c16`、不要なら無視

</details>

### ⚫ userBlocked (1 件)
理由: seed-blocklist.ts でユーザが除外指定済み。意図した除外であれば無視してよい。

<details><summary>展開</summary>

#### `sto-2c5471d6d1` — `addRecord/stores` from `v-point-partners`
- 内容: `id="airbnb", name="Airbnb（エアビーアンドビー）", category="ホテル"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: Airbnb（エアビーアンドビー）"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-2c5471d6d1`、不要なら無視

</details>

## 操作
- **取り込みたい項目がある場合 (半自動)**: ローカルでこのブランチを checkout し、`npm run sync:approve -- <ID> [<ID> ...]` を実行 (ID は各項目見出しの先頭)。seed-additions.ts への反映・queue からの除去・REVIEW_QUEUE.md の再生成まで自動。`npm run sync:approve -- --list` で一覧表示。実行後 `npm test && npm run build` を確認して commit
- このまま **merge** すると、要レビュー項目を読み込んだ証拠として記録されるだけ (実体 seed 変更はなし)
- 手動キュレートしたい場合は、このブランチに追加 commit してから merge
- 不要なら **close** で次週まで保留