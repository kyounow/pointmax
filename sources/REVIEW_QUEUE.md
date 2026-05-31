# 📋 週次マスタ同期: 要レビュー項目

(自動生成 2026-06-01。merge 前に項目を確認してください。)

## サマリ
- 要レビュー: 139 件
- ソース別: rakuten-point=120, ponta=18, jal-card-tokuyaku-list=1
- 主な理由: missingStoreBody=26, idCollision=68, lowConfidence=27, excludedCategory=5, userBlocked=3, storeAdditionsDisabled=10

## 項目 (理由別)

### 🟠 missingStoreBody (store 本体なし membership) (26 件)
理由: membership 提案だが、参照先 store 本体が seed 未存在 + 同 run の auto 候補にも無い (例: category cap で deferred された場合)。そのまま auto-merge すると孤児 membership (店名解決できない、UI で店舗未表示) が seed に残るため降格。store 本体を手動キュレートで追加するか、次回 cron で store 側が auto 化されるのを待つ。

<details><summary>展開</summary>

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="tokyu-store"`
- notes: 税抜換算
- confidence: 0.90
- 評価: `evidenceQuote="東急ストア　200円(税抜)につき1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="kyorindo"`
- notes: 税抜換算
- confidence: 0.90
- 評価: `evidenceQuote="杏林堂　200円(税抜)につき1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="sundrug"`
- notes: 税抜換算
- confidence: 0.90
- 評価: `evidenceQuote="サンドラッグ　200円(税抜)につき1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="drug-seims"`
- notes: 税抜換算
- confidence: 0.90
- 評価: `evidenceQuote="ドラッグセイムス　200円(税抜)につき1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="kusuri-no-fukutaro"`
- notes: 税抜換算
- confidence: 0.90
- 評価: `evidenceQuote="くすりの福太郎　200円(税抜)につき1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="wants"`
- notes: 税抜換算
- confidence: 0.90
- 評価: `evidenceQuote="ウォンツ　200円(税抜)につき1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="drug-wellness"`
- notes: 税抜換算
- confidence: 0.90
- 評価: `evidenceQuote="ドラッグストアウェルネス　200円(税抜)につき1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="kusuri-no-lady-medico21"`
- notes: 税抜換算
- confidence: 0.90
- 評価: `evidenceQuote="くすりのレデイ・メディコ21　200円(税抜)につき1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="drug-tops"`
- notes: 税抜換算
- confidence: 0.90
- 評価: `evidenceQuote="ドラッグトップス　200円(税抜)につき1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="drugstore-smile"`
- notes: 税抜換算
- confidence: 0.90
- 評価: `evidenceQuote="ドラッグストアスマイル　200円(税抜)につき1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="just-drug"`
- notes: 税抜換算
- confidence: 0.90
- 評価: `evidenceQuote="ジャストドラッグ　200円(税抜)につき1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="shibata-yakuhin"`
- notes: 税抜換算
- confidence: 0.90
- 評価: `evidenceQuote="シバタ薬品　200円(税抜)につき1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="super-drug-kirin"`
- notes: 税抜換算
- confidence: 0.90
- 評価: `evidenceQuote="スーパードラッグキリン　200円(税抜)につき1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="kusuri-no-taiyodo"`
- notes: 税抜換算
- confidence: 0.90
- 評価: `evidenceQuote="くすりの太陽堂　200円(税抜)につき1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="drugstore-ace"`
- notes: 税抜換算
- confidence: 0.90
- 評価: `evidenceQuote="ドラッグストアエース　200円(税抜)につき1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="kusuri-no-kyumeido"`
- notes: 税抜換算
- confidence: 0.90
- 評価: `evidenceQuote="くすりの救命堂　200円(税抜)につき1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="drugstore-seki"`
- notes: 税抜換算
- confidence: 0.90
- 評価: `evidenceQuote="ドラッグストアセキ　200円(税抜)につき1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="higuchi-yakkyoku"`
- notes: 税抜換算
- confidence: 0.90
- 評価: `evidenceQuote="薬のヒグチ　200円(税抜)につき1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="yax"`
- notes: 税抜換算
- confidence: 0.90
- 評価: `evidenceQuote="ヤックス　200円(税抜)につき1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `rakuten-point-partners`
- 内容: `programId="prog-rakuten-pointcard-0.5pc", storeId="drug-yamazawa"`
- notes: 税抜換算
- confidence: 0.90
- 評価: `evidenceQuote="ドラッグヤマザワ　200円(税抜)につき1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

_他 6 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### ⏸ storeAdditionsDisabled (store 追加は手動キュレ運用) (10 件)
理由: 新規 store の追加は cron では行わない方針 (キャンペーン情報の獲得に注力するため)。ここに列挙された店舗は cron が検知した「seed に未追加の店舗候補」で、必要な場合は手動で seed-data-stores.ts に追加 → 次回 cron で関連 membership が自動取り込まれる。全件無視も OK (リストとしての参照のみ)。

<details><summary>展開</summary>

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="au-mobile", name="au", category="通信"`
- confidence: 0.90
- 評価: `evidenceQuote="au たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="honto-coffee-fukurou-shosabo", name="本と珈琲 梟書茶房", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="本と珈琲 梟書茶房 たまる つかえる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="machi-ene", name="まちエネ", category="電気・ガス"`
- confidence: 0.90
- 評価: `evidenceQuote="まちエネ たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="mitsuuroko-denki-toshigas", name="ミツウロコでんき・都市ガス", category="電気・ガス"`
- confidence: 0.90
- 評価: `evidenceQuote="ミツウロコでんき・都市ガス たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="oisix", name="Oisix", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="Oisix（リクルートIDでのログインの場合） たまる つかえる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="onix", name="ONIX", category="車・バイク"`
- confidence: 0.90
- 評価: `evidenceQuote="ONIX たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="orix-auto-info", name="オート・インフォ", category="車・バイク"`
- confidence: 0.90
- 評価: `evidenceQuote="オート・インフォ たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="saibu-gas", name="西部ガス", category="電気・ガス"`
- confidence: 0.90
- 評価: `evidenceQuote="西部ガス たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="saican-enewan", name="エネワン（株式会社サイサン）", category="電気・ガス"`
- confidence: 0.90
- 評価: `evidenceQuote="エネワン（株式会社サイサン） たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="uber-eats", name="Uber Eats", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="Uber Eats たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

</details>

### 🟡 lowConfidence (27 件)
理由: Gemini の評価で confidence < 0.9。エビデンス不明瞭・推測混入の疑い。

<details><summary>展開</summary>

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="aland", name="ALAND", category="ファッション"`
- confidence: 0.81
- 評価: `evidenceQuote="ALAND：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="amica", name="アミカ", category="スーパー"`
- confidence: 0.81
- 評価: `evidenceQuote="アミカ：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="andemiu", name="Andemiu", category="ファッション"`
- confidence: 0.81
- 評価: `evidenceQuote="Andemiu：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="aoyama", name="洋服の青山", category="ファッション"`
- confidence: 0.81
- 評価: `evidenceQuote="洋服の青山：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="banda-record", name="バンダレコード", category="音楽・映像"`
- confidence: 0.81
- 評価: `evidenceQuote="バンダレコード：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="biople", name="Biople", category="美容"`
- confidence: 0.81
- 評価: `evidenceQuote="Biople：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="book-off", name="ブックオフ", category="買取"`
- confidence: 0.81
- 評価: `evidenceQuote="BOOKOFF：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="books-arude", name="ブックスアルデ", category="書店"`
- confidence: 0.81
- 評価: `evidenceQuote="ブックスアルデ：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="can-do", name="Can★Do", category="雑貨"`
- confidence: 0.81
- 評価: `evidenceQuote="Can★Do（キャンドゥ）：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="celvoke", name="Celvoke", category="美容"`
- confidence: 0.81
- 評価: `evidenceQuote="Celvoke：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="cosme-kitchen", name="Cosme Kitchen", category="美容"`
- confidence: 0.81
- 評価: `evidenceQuote="Cosme Kitchen：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="daimaru", name="大丸", category="百貨店"`
- confidence: 0.81
- 評価: `evidenceQuote="大丸：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="ecostore", name="ecostore", category="美容"`
- confidence: 0.81
- 評価: `evidenceQuote="ecostore：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="esaki-shoten", name="江崎書店", category="書店"`
- confidence: 0.81
- 評価: `evidenceQuote="江崎書店：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="fujio-ken", name="フジオ軒", category="飲食"`
- confidence: 0.81
- 評価: `evidenceQuote="フジオ軒：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="fujiya", name="不二家", category="飲食"`
- confidence: 0.81
- 評価: `evidenceQuote="不二家：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="hamakatsu", name="とんかつ濵かつ", category="飲食"`
- confidence: 0.81
- 評価: `evidenceQuote="とんかつ濵かつ：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="james", name="ジェームス", category="車・バイク"`
- confidence: 0.81
- 評価: `evidenceQuote="ジェームス：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="joshin-outlet", name="ジョーシンアウトレット", category="家電量販店"`
- confidence: 0.81
- 評価: `evidenceQuote="ジョーシンアウトレット：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="komehyo", name="KOMEHYO", category="買取"`
- confidence: 0.81
- 評価: `evidenceQuote="KOMEHYO：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

_他 7 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 idCollision (68 件)
理由: 新規追加だが既存 ID またはストア名と衝突。重複の可能性あり。

<details><summary>展開</summary>

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="a-pit-autobacs", name="A PIT AUTOBACS", category="車・バイク"`
- confidence: 0.81
- 評価: `evidenceQuote="A PIT AUTOBACS：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="ace-contact", name="エースコンタクト", category="コンタクト"`
- confidence: 0.81
- 評価: `evidenceQuote="エースコンタクト：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="ace-one", name="エースワン", category="スーパー"`
- confidence: 0.81
- 評価: `evidenceQuote="エースワン：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="adam-et-rope", name="ADAM ET ROPÉ", category="ファッション"`
- confidence: 0.81
- 評価: `evidenceQuote="ADAM ET ROPÉ：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="akakabe-group", name="アカカベグループ", category="ドラッグストア"`
- confidence: 0.81
- 評価: `evidenceQuote="アカカベグループ：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="alpen", name="アルペン", category="スポーツ"`
- confidence: 0.81
- 評価: `evidenceQuote="アルペン：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="alpen-mountains", name="アルペンマウンテンズ", category="スポーツ"`
- confidence: 0.81
- 評価: `evidenceQuote="アルペンマウンテンズ：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="alpen-outdoors", name="アルペンアウトドアーズ", category="スポーツ"`
- confidence: 0.81
- 評価: `evidenceQuote="アルペンアウトドアーズ：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="american-drug", name="アメリカンドラッグ", category="ドラッグストア"`
- confidence: 0.81
- 評価: `evidenceQuote="アメリカンドラッグ：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="american-holic", name="AMERICAN HOLIC", category="ファッション"`
- confidence: 0.81
- 評価: `evidenceQuote="AMERICAN HOLIC：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="angie", name="ANGIE", category="美容"`
- confidence: 0.81
- 評価: `evidenceQuote="ANGIE：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="apollo-station", name="apollostation", category="ガソリンスタンド"`
- confidence: 0.81
- 評価: `evidenceQuote="apollostation：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="arc-oasis", name="アークオアシス", category="雑貨"`
- confidence: 0.81
- 評価: `evidenceQuote="アークオアシス：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="au-denki", name="auでんき", category="電気・ガス"`
- confidence: 0.90
- 評価: `evidenceQuote="auでんき たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="autobacs", name="オートバックス", category="車・バイク"`
- confidence: 0.81
- 評価: `evidenceQuote="オートバックス：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="b-and-d-drugstore", name="B&Dドラッグストア", category="ドラッグストア"`
- confidence: 0.81
- 評価: `evidenceQuote="B&Dドラッグストア：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="beisia", name="ベイシア", category="スーパー"`
- confidence: 0.81
- 評価: `evidenceQuote="ベイシア：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="best-megane-contact", name="ベストメガネコンタクト", category="メガネ"`
- confidence: 0.81
- 評価: `evidenceQuote="ベストメガネコンタクト：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="bic-camera", name="ビックカメラ", category="家電量販店"`
- confidence: 0.81
- 評価: `evidenceQuote="ビックカメラ：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="bon-repas", name="ボンラパス", category="スーパー"`
- confidence: 0.81
- 評価: `evidenceQuote="ボンラパス：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

_他 48 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 excludedCategory (5 件)
理由: Policy B: 対象外カテゴリ (金融/保険/医療/ギャンブル等)。自動追加しない。

<details><summary>展開</summary>

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="apamanshop", name="アパマンショップ", category="不動産"`
- confidence: 0.90
- 評価: `evidenceQuote="アパマンショップ たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="seiban", name="セイバン", category="その他"`
- confidence: 0.81
- 評価: `evidenceQuote="セイバン：楽天ポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="sokuyaku", name="SOKUYAKU", category="医療"`
- confidence: 0.90
- 評価: `evidenceQuote="SOKUYAKU たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="ur-chintai-jutaku", name="UR賃貸住宅", category="不動産"`
- confidence: 0.90
- 評価: `evidenceQuote="UR賃貸住宅 たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="winticket", name="WINTICKET(ウィンチケット)", category="ギャンブル"`
- confidence: 0.90
- 評価: `evidenceQuote="WINTICKET(ウィンチケット) たまる つかえる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

</details>

### ⚫ userBlocked (3 件)
理由: seed-blocklist.ts でユーザが除外指定済み。意図した除外であれば無視してよい。

<details><summary>展開</summary>

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="au-bookpass", name="auブックパス", category="書店"`
- confidence: 0.90
- 評価: `evidenceQuote="auブックパス たまる つかえる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="diamond-sha", name="ダイヤモンド社", category="書店"`
- confidence: 0.90
- 評価: `evidenceQuote="ダイヤモンド社 たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="jal-mileage-bank", name="日本航空(JALマイレージバンク)", category="航空・旅行"`
- confidence: 0.90
- 評価: `evidenceQuote="日本航空(JALマイレージバンク) たまる つかえる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

</details>

## 操作
- このまま **merge** すると、要レビュー項目を読み込んだ証拠として記録されるだけ (実体 seed 変更はなし)
- 手動キュレートしたい場合は、このブランチに追加 commit してから merge
- 不要なら **close** で次週まで保留