# 📋 週次マスタ同期: 要レビュー項目

(自動生成 2026-05-12。merge 前に項目を確認してください。)

## サマリ
- 要レビュー: 215 件
- ソース別: ponta=68, smbc-v-gold-7percent=23, rakuten-point=77, v-point=46, d-point=1
- 主な理由: lowConfidence=42, idCollision=122, userBlocked=23, excludedCategory=28

## 項目 (理由別)

### 🟡 lowConfidence (42 件)
理由: Gemini の評価で confidence < 0.9。エビデンス不明瞭・推測混入の疑い。

<details><summary>展開</summary>

#### `updateField/loyaltyRules` `loy-p-lawson` from `ponta-partners`
- フィールド: `rate`
- 変更: `0.500%` → `1.000%`
- confidence: 0.64
- 評価: `evidenceQuote="PickUpたまる・つかえるサービス、お店: ローソン"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `ponta-partners`
- 内容: `id="loy-ponta-card-apollostation", storeId="apollostation", pointCardId="ponta-card", rate=0.005`
- notes: Web上ではレート記載なし。通常200円につき1ポイント。
- confidence: 0.49
- 評価: `evidenceQuote="PickUpたまる・つかえるサービス、お店: apollostation / レンタカー・ガソリンスタンド・駐車場: apollostation たまる つかえる アプリ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `ponta-partners`
- 内容: `id="loy-ponta-card-kentucky", storeId="kentucky", pointCardId="ponta-card", rate=0.01`
- notes: Web上ではレート記載なし。通常100円につき1ポイント。
- confidence: 0.49
- 評価: `evidenceQuote="PickUpたまる・つかえるサービス、お店: ケンタッキーフライドチキン / グルメ・飲食: ケンタッキーフライドチキン たまる つかえる アプリ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `ponta-partners`
- 内容: `id="loy-ponta-card-geo", storeId="geo", pointCardId="ponta-card", rate=0.01`
- notes: Web上ではレート記載なし。通常100円につき1ポイント。
- confidence: 0.49
- 評価: `evidenceQuote="PickUpたまる・つかえるサービス、お店: ゲオ / 音楽・映像・ゲーム: ゲオ たまる つかえる アプリ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `ponta-partners`
- 内容: `id="loy-ponta-card-ace-contact", storeId="ace-contact", pointCardId="ponta-card", rate=0.005`
- notes: Web上ではレート記載なし。通常200円につき1ポイント。
- confidence: 0.49
- 評価: `evidenceQuote="百貨店・コンビニ・スーパー・ドラッグストア: エースコンタクト たまる つかえる アプリ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `ponta-partners`
- 内容: `id="loy-ponta-card-takashimaya", storeId="takashimaya", pointCardId="ponta-card", rate=0.005`
- notes: Web上ではレート記載なし。通常200円につき1ポイント。
- confidence: 0.49
- 評価: `evidenceQuote="百貨店・コンビニ・スーパー・ドラッグストア: 高島屋 たまる つかえる アプリ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `ponta-partners`
- 内容: `id="loy-ponta-card-suika", storeId="suika", pointCardId="ponta-card", rate=0.005`
- notes: Web上ではレート記載なし。通常200円につき1ポイント。
- confidence: 0.49
- 評価: `evidenceQuote="グルメ・飲食: すき家 たまる つかえる アプリ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `ponta-partners`
- 内容: `id="loy-ponta-card-doutor", storeId="doutor", pointCardId="ponta-card", rate=0.01`
- notes: Web上ではレート記載なし。通常100円につき1ポイント。
- confidence: 0.49
- 評価: `evidenceQuote="グルメ・飲食: ドトールコーヒーショップ たまる つかえる アプリ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `ponta-partners`
- 内容: `id="loy-ponta-card-best-megane-contact", storeId="best-megane-contact", pointCardId="ponta-card", rate=0.005`
- notes: Web上ではレート記載なし。通常200円につき1ポイント。
- confidence: 0.49
- 評価: `evidenceQuote="ファッション・美容: ベストメガネコンタクト たまる つかえる アプリ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `ponta-partners`
- 内容: `id="loy-ponta-card-joshin", storeId="joshin", pointCardId="ponta-card", rate=0.005`
- notes: Web上ではレート記載なし。通常200円につき1ポイント。
- confidence: 0.49
- 評価: `evidenceQuote="音楽・映像・ゲーム: ジョーシン たまる つかえる アプリ / 家電・コンピューター・通信: ジョーシン たまる つかえる アプリ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `ponta-partners`
- 内容: `id="loy-ponta-card-kojima", storeId="kojima", pointCardId="ponta-card", rate=0.005`
- notes: Web上ではレート記載なし。通常200円につき1ポイント。
- confidence: 0.49
- 評価: `evidenceQuote="家電・コンピューター・通信: コジマ たまる つかえる アプリ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `ponta-partners`
- 内容: `id="loy-ponta-card-sofmap", storeId="sofmap", pointCardId="ponta-card", rate=0.005`
- notes: Web上ではレート記載なし。通常200円につき1ポイント。
- confidence: 0.49
- 評価: `evidenceQuote="家電・コンピューター・通信: ソフマップ たまる つかえる アプリ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `ponta-partners`
- 内容: `id="loy-ponta-card-bic-camera", storeId="bic-camera", pointCardId="ponta-card", rate=0.005`
- notes: Web上ではレート記載なし。通常200円につき1ポイント。
- confidence: 0.49
- 評価: `evidenceQuote="家電・コンピューター・通信: ビックカメラ たまる つかえる アプリ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `ponta-partners`
- 内容: `id="loy-ponta-card-saibu-gas", storeId="saibu-gas", pointCardId="ponta-card", rate=0.005`
- notes: Web上ではレート記載なし。通常200円につき1ポイント。
- confidence: 0.49
- 評価: `evidenceQuote="電気・ガス: 西部ガス たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `ponta-partners`
- 内容: `id="loy-ponta-card-conv-familymart", storeId="conv-familymart", pointCardId="ponta-card", rate=0.005`
- notes: PontaWebのトップページでFamilyMartのロゴがありPontaがたまる・つかえると記載。一般的なレートを推定。
- confidence: 0.49
- 評価: `evidenceQuote="PickUpたまる・つかえるサービス、お店: ファミリーマート"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `ponta-partners`
- 内容: `id="loy-ponta-card-au", storeId="au", pointCardId="ponta-card", rate=0.01`
- notes: au利用料金での付与レートは別途確認が必要だが、汎用的なレートを設定。
- confidence: 0.49
- 評価: `evidenceQuote="PickUpたまる・つかえるサービス、お店: au / 家電・コンピューター・通信: au たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `ponta-partners`
- 内容: `id="loy-ponta-card-toku-taku", storeId="toku-taku", pointCardId="ponta-card", rate=0.01`
- notes: Web上ではレート記載なし。通常100円につき1ポイント。
- confidence: 0.49
- 評価: `evidenceQuote="レジャー・旅行: 得タク たまる / 車・バイク: 得タク たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `ponta-partners`
- 内容: `id="loy-ponta-card-hotel-keihan-chain", storeId="hotel-keihan-chain", pointCardId="ponta-card", rate=0.005`
- notes: Web上ではレート記載なし。通常200円につき1ポイント。
- confidence: 0.49
- 評価: `evidenceQuote="レジャー・旅行: ホテル京阪チェーン たまる つかえる アプリ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `ponta-partners`
- 内容: `id="loy-ponta-card-sakai-hikkoshi", storeId="sakai-hikkoshi", pointCardId="ponta-card", rate=0.01`
- notes: Web上ではレート記載なし。通常100円につき1ポイント。
- confidence: 0.49
- 評価: `evidenceQuote="引越し・住まい: サカイ引越センター たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `ponta-partners`
- 内容: `id="loy-ponta-card-heart-hikkoshi", storeId="heart-hikkoshi", pointCardId="ponta-card", rate=0.01`
- notes: Web上ではレート記載なし。通常100円につき1ポイント。
- confidence: 0.49
- 評価: `evidenceQuote="引越し・住まい: ハート引越センター たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

_他 22 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 idCollision (122 件)
理由: 新規追加だが既存 ID またはストア名と衝突。重複の可能性あり。

<details><summary>展開</summary>

#### `addRecord/cards` from `smbc-v-gold-7percent`
- 内容: `id="smbc-v-gold", name="smbc-v-gold", defaultRate=0.01, defaultCurrencyId="v-pt"`
- confidence: 0.81
- 評価: `evidenceQuote="三井住友カード Visa Infinite、三井住友カード プラチナ、三井住友カード プラチナプリファード、Oliveフレキシブルペイ プラチナプリファード、三井住友カード プラチナ、三井住友カード プラチナ PA-TYPE、三井住友ビジネ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="2ndstreet", name="セカンドストリート", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="ファッション・美容: セカンドストリート"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="a-pit-autobacs", name="A PIT AUTOBACS", category="車・バイク"`
- confidence: 0.90
- 評価: `evidenceQuote="A PIT AUTOBACS：楽天ポイントカードが使えるお店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="ace-contact", name="エースコンタクト", category="コンタクト"`
- confidence: 0.90
- 評価: `evidenceQuote="エースコンタクト：楽天ポイントカードが使えるお店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="ace-one", name="エースワン", category="スーパー"`
- confidence: 0.90
- 評価: `evidenceQuote="エースワン：楽天ポイントカードが使えるお店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="adam-et-rope", name="ADAM ET ROPÉ", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="ADAM ET ROPÉ：楽天ポイントカードが使えるお店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="aiya", name="藍屋", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="藍屋：楽天ポイントカードが使えるお店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="akakabe-group", name="アカカベグループ", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="アカカベグループ：楽天ポイントカードが使えるお店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="albis", name="アルビス", category="スーパー"`
- confidence: 0.90
- 評価: `evidenceQuote="百貨店・コンビニ・スーパー・ドラッグストア: アルビス"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="alook", name="ALOOK", category="メガネ"`
- confidence: 0.90
- 評価: `evidenceQuote="ALOOK: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="alpen", name="アルペン", category="スポーツ"`
- confidence: 0.90
- 評価: `evidenceQuote="アルペン：楽天ポイントカードが使えるお店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="alpen-mountains", name="アルペンマウンテンズ", category="スポーツ"`
- confidence: 0.90
- 評価: `evidenceQuote="アルペンマウンテンズ：楽天ポイントカードが使えるお店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="alpen-outdoors", name="アルペンアウトドアーズ", category="スポーツ"`
- confidence: 0.90
- 評価: `evidenceQuote="アルペンアウトドアーズ：楽天ポイントカードが使えるお店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="american-drug", name="アメリカンドラッグ", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="アメリカンドラッグ：楽天ポイントカードが使えるお店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="american-holic", name="AMERICAN HOLIC", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="AMERICAN HOLIC：楽天ポイントカードが使えるお店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="angie", name="ANGIE", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="ANGIE：楽天ポイントカードが使えるお店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="aoki", name="AOKI", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="ファッション・美容: AOKI"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="apollo-station", name="apollostation", category="ガソリンスタンド"`
- confidence: 0.90
- 評価: `evidenceQuote="apollostation：楽天ポイントカードが使えるお店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="arc-oasis", name="アークオアシス", category="雑貨"`
- confidence: 0.90
- 評価: `evidenceQuote="アークオアシス：楽天ポイントカードが使えるお店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="ari-san-hikkoshi", name="アリさんマークの引越社", category="引越し"`
- confidence: 0.90
- 評価: `evidenceQuote="アリさんマークの引越社：楽天ポイントカードが使えるお店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

_他 102 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 excludedCategory (28 件)
理由: Policy B: 対象外カテゴリ (金融/保険/医療/ギャンブル等)。自動追加しない。

<details><summary>展開</summary>

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="aflac", name="アフラック", category="保険"`
- confidence: 0.90
- 評価: `evidenceQuote="アフラック: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="apamanshop", name="アパマンショップ", category="不動産・住宅"`
- confidence: 0.90
- 評価: `evidenceQuote="引越し・住まい: アパマンショップ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="aplus", name="アプラス", category="金融"`
- confidence: 0.90
- 評価: `evidenceQuote="アプラス: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="caromama-plus", name="カロママ プラス", category="その他"`
- confidence: 0.90
- 評価: `evidenceQuote="グルメ・飲食: カロママ プラス"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="chargespot", name="ChargeSPOT", category="サービス"`
- confidence: 0.90
- 評価: `evidenceQuote="ChargeSPOT: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="epark-kusuri-no-madoguchi", name="EPARK くすりの窓口", category="医療"`
- confidence: 0.90
- 評価: `evidenceQuote="EPARK くすりの窓口: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="gaba-english", name="Gabaマンツーマン英会話", category="その他"`
- confidence: 0.90
- 評価: `evidenceQuote="ビジネス・英語・習い事: Gabaマンツーマン英会話"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="jaccs", name="JACCS", category="金融"`
- confidence: 0.90
- 評価: `evidenceQuote="JACCS: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="kansai-mirai-bank", name="関西みらい銀行", category="金融"`
- confidence: 0.90
- 評価: `evidenceQuote="関西みらい銀行: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="life-net", name="Life Net", category="その他"`
- confidence: 0.90
- 評価: `evidenceQuote="生活・暮らし・ペット: Life Net"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="lifenet-seimei", name="ライフネット生命", category="保険"`
- confidence: 0.90
- 評価: `evidenceQuote="ライフネット生命: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="lixil", name="LIXIL", category="住宅"`
- confidence: 0.90
- 評価: `evidenceQuote="LIXIL: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="marso", name="マーソ（人間ドック）", category="サービス"`
- confidence: 0.90
- 評価: `evidenceQuote="マーソ（人間ドック）: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="minato-bank", name="みなと銀行", category="金融"`
- confidence: 0.90
- 評価: `evidenceQuote="みなと銀行: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="mitsui-sumitomo-bank", name="三井住友銀行", category="金融"`
- confidence: 0.90
- 評価: `evidenceQuote="三井住友銀行: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="otocon", name="婚活支援サービス パートナーエージェント（OTOCON）", category="その他"`
- confidence: 0.90
- 評価: `evidenceQuote="生活・暮らし・ペット: 婚活支援サービス パートナーエージェント（OTOCON）"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="plaly", name="プラリー", category="その他"`
- confidence: 0.90
- 評価: `evidenceQuote="生活・暮らし・ペット: プラリー"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="ponta-kantan-hoken", name="Pontaかんたん保険", category="保険"`
- confidence: 0.90
- 評価: `evidenceQuote="生活・暮らし・ペット: Pontaかんたん保険"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="sbi-sonpo", name="SBI損保", category="保険"`
- confidence: 0.90
- 評価: `evidenceQuote="SBI損保: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="shimauma-print", name="しまうまプリント", category="サービス"`
- confidence: 0.90
- 評価: `evidenceQuote="しまうまプリント: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

_他 8 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### ⚫ userBlocked (23 件)
理由: seed-blocklist.ts でユーザが除外指定済み。意図した除外であれば無視してよい。

<details><summary>展開</summary>

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="17live", name="17LIVE(ワンセブンライブ)", category="エンタメ・チケット"`
- confidence: 0.90
- 評価: `evidenceQuote="音楽・映像・ゲーム: 17LIVE(ワンセブンライブ)"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="airbnb", name="Airbnb", category="宿泊"`
- confidence: 0.90
- 評価: `evidenceQuote="Airbnb（エアビーアンドビー）: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="ana", name="ANA", category="交通"`
- confidence: 0.90
- 評価: `evidenceQuote="ANA: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="aquaclara", name="アクアクララ", category="生活サービス"`
- confidence: 0.90
- 評価: `evidenceQuote="ネットショッピング・通販・宅配: アクアクララ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="au-bookpass", name="auブックパス", category="書店"`
- confidence: 0.90
- 評価: `evidenceQuote="本・電子書籍・新聞: auブックパス"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="auto-info", name="オート・インフォ", category="車・バイク"`
- confidence: 0.90
- 評価: `evidenceQuote="車・バイク: オート・インフォ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="denki-hikaku-insweb", name="でんきの比較インズウェブ", category="電気・ガス"`
- confidence: 0.90
- 評価: `evidenceQuote="生活・暮らし・ペット: でんきの比較インズウェブ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="enewan", name="エネワン（株式会社サイサン）", category="電気・ガス"`
- confidence: 0.90
- 評価: `evidenceQuote="電気・ガス: エネワン（株式会社サイサン）"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="gasone", name="ガスワン（株式会社サイサン）", category="電気・ガス"`
- confidence: 0.90
- 評価: `evidenceQuote="電気・ガス: ガスワン（株式会社サイサン）"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="hyundai-mobility-japan", name="Hyundai Mobility Japan", category="自動車"`
- confidence: 0.90
- 評価: `evidenceQuote="Hyundai Mobility Japan: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="jal-mileage-bank", name="日本航空(JALマイレージバンク)", category="交通"`
- confidence: 0.90
- 評価: `evidenceQuote="日本航空(JALマイレージバンク)"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="kamei", name="カメイ株式会社", category="エネルギー"`
- confidence: 0.90
- 評価: `evidenceQuote="カメイ株式会社：楽天ポイントカードが使えるお店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="mercedes-benz", name="メルセデス・ベンツ", category="自動車"`
- confidence: 0.90
- 評価: `evidenceQuote="メルセデス・ベンツ: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="oishix", name="Oisix", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="百貨店・コンビニ・スーパー・ドラッグストア: Oisix"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="premium-water", name="プレミアムウォーター", category="生活サービス"`
- confidence: 0.90
- 評価: `evidenceQuote="ネットショッピング・通販・宅配: プレミアムウォーター"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="princess-cruises", name="プリンセスクルーズ", category="旅行"`
- confidence: 0.90
- 評価: `evidenceQuote="プリンセスクルーズ：楽天ポイントカードが使えるお店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `rakuten-point-partners`
- 内容: `id="rakuten-gora", name="楽天GORA", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="楽天GORA：楽天ポイントカードが使えるお店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="sbinft-market", name="SBINFT Market", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="ネットショッピング・通販・宅配: SBINFT Market"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="shaddy-salada-kan", name="シャディ・サラダ館", category="ギフト"`
- confidence: 0.90
- 評価: `evidenceQuote="シャディ・サラダ館: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="telasa", name="TELASA（テラサ）", category="エンタメ・チケット"`
- confidence: 0.90
- 評価: `evidenceQuote="音楽・映像・ゲーム: TELASA（テラサ）"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

_他 3 件は省略 (sources/proposed-migrations.json を参照)_

</details>

## 操作
- このまま **merge** すると、要レビュー項目を読み込んだ証拠として記録されるだけ (実体 seed 変更はなし)
- 手動キュレートしたい場合は、このブランチに追加 commit してから merge
- 不要なら **close** で次週まで保留