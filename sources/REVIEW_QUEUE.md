# 📋 週次マスタ同期: 要レビュー項目

(自動生成 2026-05-14。merge 前に項目を確認してください。)

## サマリ
- 要レビュー: 90 件
- ソース別: d-point=15, jal-card-tokuyaku-list=1, smbc-v-gold-7percent=23, v-point=49, ponta=2
- 主な理由: lowConfidence=15, rateRatioOutOfRange=1, unsupportedDateClaim=22, idCollision=22, excludedCategory=21, userBlocked=9

## 項目 (理由別)

### 🔴 unsupportedDateClaim (22 件)
理由: validFrom/validTo が抽出されたが evidenceQuote に日付の根拠 (期間 / YYYY年 / まで 等) が見当たらない。日付の hallucination 疑い。元 URL を直接確認の上採否を判断。

<details><summary>展開</summary>

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-gold-7percent-seicomart-pa-default", cardId="smbc-v-gold-7percent", storeId="seicomart", paymentAppId="pa-default", rate=0.07, currencyId="v-pt", validFrom="2026-02-01"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！
対象店舗：セイコーマート"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-gold-7percent-conv-7eleven-pa-default", cardId="smbc-v-gold-7percent", storeId="conv-7eleven", paymentAppId="pa-default", rate=0.07, currencyId="v-pt", validFrom="2026-02-01"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！
対象店舗：セブン-イレブン"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-gold-7percent-poplar-pa-default", cardId="smbc-v-gold-7percent", storeId="poplar", paymentAppId="pa-default", rate=0.07, currencyId="v-pt", validFrom="2026-02-01"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！
対象店舗：ポプラ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-gold-7percent-conv-ministop-pa-default", cardId="smbc-v-gold-7percent", storeId="conv-ministop", paymentAppId="pa-default", rate=0.07, currencyId="v-pt", validFrom="2026-02-01"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！
対象店舗：ミニストップ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-gold-7percent-conv-lawson-pa-default", cardId="smbc-v-gold-7percent", storeId="conv-lawson", paymentAppId="pa-default", rate=0.07, currencyId="v-pt", validFrom="2026-02-01"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！
対象店舗：ローソン"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-gold-7percent-mcdonalds-pa-default", cardId="smbc-v-gold-7percent", storeId="mcdonalds", paymentAppId="pa-default", rate=0.07, currencyId="v-pt", validFrom="2026-02-01"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！
対象店舗：マクドナルド"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-gold-7percent-mos-burger-pa-default", cardId="smbc-v-gold-7percent", storeId="mos-burger", paymentAppId="pa-default", rate=0.07, currencyId="v-pt", validFrom="2026-02-01"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！
対象店舗：モスバーガー"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-gold-7percent-kfc-pa-default", cardId="smbc-v-gold-7percent", storeId="kfc", paymentAppId="pa-default", rate=0.07, currencyId="v-pt", validFrom="2026-02-01"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！
対象店舗：ケンタッキーフライドチキン"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-gold-7percent-yoshinoya-pa-default", cardId="smbc-v-gold-7percent", storeId="yoshinoya", paymentAppId="pa-default", rate=0.07, currencyId="v-pt", validFrom="2026-02-01"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！
対象店舗：吉野家"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-gold-7percent-saizeriya-pa-default", cardId="smbc-v-gold-7percent", storeId="saizeriya", paymentAppId="pa-default", rate=0.07, currencyId="v-pt", validFrom="2026-02-01"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！
対象店舗：サイゼリヤ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-gold-7percent-gusto-pa-default", cardId="smbc-v-gold-7percent", storeId="gusto", paymentAppId="pa-default", rate=0.07, currencyId="v-pt", validFrom="2026-02-01"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！
対象店舗：ガスト"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-gold-7percent-bamiyan-pa-default", cardId="smbc-v-gold-7percent", storeId="bamiyan", paymentAppId="pa-default", rate=0.07, currencyId="v-pt", validFrom="2026-02-01"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！
対象店舗：バーミヤン"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-gold-7percent-shabu-yo-pa-default", cardId="smbc-v-gold-7percent", storeId="shabu-yo", paymentAppId="pa-default", rate=0.07, currencyId="v-pt", validFrom="2026-02-01"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！
対象店舗：しゃぶ葉"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-gold-7percent-jonathans-pa-default", cardId="smbc-v-gold-7percent", storeId="jonathans", paymentAppId="pa-default", rate=0.07, currencyId="v-pt", validFrom="2026-02-01"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！
対象店舗：ジョナサン"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-gold-7percent-yumetoan-pa-default", cardId="smbc-v-gold-7percent", storeId="yumetoan", paymentAppId="pa-default", rate=0.07, currencyId="v-pt", validFrom="2026-02-01"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！
対象店舗：夢庵"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-gold-7percent-sukiya-pa-default", cardId="smbc-v-gold-7percent", storeId="sukiya", paymentAppId="pa-default", rate=0.07, currencyId="v-pt", validFrom="2026-02-01"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！
対象店舗：すき家"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-gold-7percent-hamazushi-pa-default", cardId="smbc-v-gold-7percent", storeId="hamazushi", paymentAppId="pa-default", rate=0.07, currencyId="v-pt", validFrom="2026-02-01"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！
対象店舗：はま寿司"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-gold-7percent-cocos-pa-default", cardId="smbc-v-gold-7percent", storeId="cocos", paymentAppId="pa-default", rate=0.07, currencyId="v-pt", validFrom="2026-02-01"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！
対象店舗：ココス"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-gold-7percent-doutor-pa-default", cardId="smbc-v-gold-7percent", storeId="doutor", paymentAppId="pa-default", rate=0.07, currencyId="v-pt", validFrom="2026-02-01"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！
対象店舗：ドトールコーヒーショップ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-gold-7percent-excelsior-cafe-pa-default", cardId="smbc-v-gold-7percent", storeId="excelsior-cafe", paymentAppId="pa-default", rate=0.07, currencyId="v-pt", validFrom="2026-02-01"`
- confidence: 0.90
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！
対象店舗：エクセルシオール カフェ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

_他 2 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 rateRatioOutOfRange (1 件)
理由: 還元率の倍率が 0.5x〜2x の範囲外。大幅な変化は要確認。

<details><summary>展開</summary>

#### `updateField/loyaltyRules` `loy-d-mcdonalds` from `d-point-partners`
- フィールド: `rate`
- 変更: `1.000%` → `0.000%`
- confidence: 0.90
- 評価: `evidenceQuote="マクドナルド ※の店舗はd払いのみご利用できます。"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

</details>

### 🟡 lowConfidence (15 件)
理由: Gemini の評価で confidence < 0.9。エビデンス不明瞭・推測混入の疑い。

<details><summary>展開</summary>

#### `updateField/loyaltyRules` `loy-d-lawson` from `d-point-partners`
- フィールド: `rate`
- 変更: `0.500%` → `0.000%`
- confidence: 0.64
- 評価: `evidenceQuote="ローソン"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `updateField/loyaltyRules` `loy-d-familymart` from `d-point-partners`
- フィールド: `rate`
- 変更: `0.500%` → `0.000%`
- confidence: 0.64
- 評価: `evidenceQuote="ファミリーマート"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `d-point-partners`
- 内容: `id="loy-d-pointcard-lawson-store100", storeId="lawson-store100", pointCardId="d-pointcard", rate=0`
- notes: dポイントは使えるが、貯まる記載なし（d払いのみかdポイントカード提示可だが還元率未記載）
- confidence: 0.64
- 評価: `evidenceQuote="ローソンストア100"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `d-point-partners`
- 内容: `id="loy-d-pointcard-poplar", storeId="poplar", pointCardId="d-pointcard", rate=0`
- notes: dポイントは使えるが、貯まる記載なし（d払いのみかdポイントカード提示可だが還元率未記載）
- confidence: 0.64
- 評価: `evidenceQuote="ポプラ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `updateField/loyaltyRules` `loy-d-sukiya` from `d-point-partners`
- フィールド: `rate`
- 変更: `0.500%` → `0.000%`
- confidence: 0.64
- 評価: `evidenceQuote="すき家"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `d-point-partners`
- 内容: `id="loy-d-pointcard-mister-donut", storeId="mister-donut", pointCardId="d-pointcard", rate=0`
- notes: dポイントは使えるが、貯まる記載なし（d払いのみかdポイントカード提示可だが還元率未記載）
- confidence: 0.64
- 評価: `evidenceQuote="ミスタードーナツ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `d-point-partners`
- 内容: `id="loy-d-pointcard-mos-burger", storeId="mos-burger", pointCardId="d-pointcard", rate=0`
- notes: dポイントは使えるが、貯まる記載なし（d払いのみかdポイントカード提示可だが還元率未記載）
- confidence: 0.64
- 評価: `evidenceQuote="モスバーガー"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `d-point-partners`
- 内容: `id="loy-d-pointcard-wendys-first-kitchen", storeId="wendys-first-kitchen", pointCardId="d-pointcard", rate=0`
- notes: dポイントは使えるが、貯まる記載なし（d払いのみかdポイントカード提示可だが還元率未記載）
- confidence: 0.64
- 評価: `evidenceQuote="ウェンディーズ・ファーストキッチン"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `d-point-partners`
- 内容: `id="loy-d-pointcard-matsuya", storeId="matsuya", pointCardId="d-pointcard", rate=0`
- notes: dポイントは使えるが、貯まる記載なし（d払いのみかdポイントカード提示可だが還元率未記載）
- confidence: 0.64
- 評価: `evidenceQuote="松屋"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `d-point-partners`
- 内容: `id="loy-d-pointcard-kappa-sushi", storeId="kappa-sushi", pointCardId="d-pointcard", rate=0`
- notes: dポイントは使えるが、貯まる記載なし（d払いのみかdポイントカード提示可だが還元率未記載）
- confidence: 0.64
- 評価: `evidenceQuote="かっぱ寿司"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `updateField/loyaltyRules` `loy-d-gusto` from `d-point-partners`
- フィールド: `rate`
- 変更: `0.500%` → `0.000%`
- confidence: 0.64
- 評価: `evidenceQuote="ガスト"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `d-point-partners`
- 内容: `id="loy-d-pointcard-hamazushi", storeId="hamazushi", pointCardId="d-pointcard", rate=0`
- notes: dポイントは使えるが、貯まる記載なし（d払いのみかdポイントカード提示可だが還元率未記載）
- confidence: 0.64
- 評価: `evidenceQuote="はま寿司"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `d-point-partners`
- 内容: `id="loy-d-pointcard-kamakura-pasta", storeId="kamakura-pasta", pointCardId="d-pointcard", rate=0`
- notes: dポイントは使えるが、貯まる記載なし（d払いのみかdポイントカード提示可だが還元率未記載）
- confidence: 0.64
- 評価: `evidenceQuote="鎌倉パスタ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/loyaltyRules` from `d-point-partners`
- 内容: `id="loy-d-pointcard-hidakaya", storeId="hidakaya", pointCardId="d-pointcard", rate=0`
- notes: dポイントは使えるが、貯まる記載なし（d払いのみかdポイントカード提示可だが還元率未記載）
- confidence: 0.64
- 評価: `evidenceQuote="日高屋"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `jal-card-tokuyaku-list`
- 内容: `id="rule-jal-suica-royal-host-pa-default", cardId="jal-suica", storeId="royal-host", paymentAppId="pa-default", rate=0.02, currencyId="jal-mile"`
- confidence: 0.85
- 評価: `evidenceQuote="ロイヤルホスト JAL CARD 決済でマイルが2倍"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

</details>

### 🟠 idCollision (22 件)
理由: 新規追加だが既存 ID またはストア名と衝突。重複の可能性あり。

<details><summary>展開</summary>

#### `addRecord/cards` from `smbc-v-gold-7percent`
- 内容: `id="smbc-v-gold-7percent", name="smbc-v-gold-7percent", defaultRate=0.005, defaultCurrencyId="v-pt"`
- confidence: 0.49
- 評価: `evidenceQuote="通常のポイント分 合計200円（税込）につき、0.5％～1％ポイント還元"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="alook", name="ALOOK", category="メガネ"`
- confidence: 0.90
- 評価: `evidenceQuote="ALOOK: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="asahiya-shoten", name="旭屋書店", category="書店"`
- confidence: 0.90
- 評価: `evidenceQuote="旭屋書店: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="booklive", name="ブックライブ", category="書店"`
- confidence: 0.90
- 評価: `evidenceQuote="ブックライブ: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="books-misumi", name="BOOKSmisumi", category="書店"`
- confidence: 0.90
- 評価: `evidenceQuote="BOOKSmisumi: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="camera-no-kitamura", name="カメラのキタムラ", category="カメラ・写真"`
- confidence: 0.90
- 評価: `evidenceQuote="カメラのキタムラ: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="dept-ryubo", name="デパートリウボウ", category="百貨店"`
- confidence: 0.90
- 評価: `evidenceQuote="デパートリウボウ: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="epark-relax-este", name="EPARKリラク＆エステ", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="EPARKリラク＆エステ: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="go-today-shaire-salon", name="GO TODAY SHAiRE SALON", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="GO TODAY SHAiRE SALON: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="green-dog-cat", name="GREEN DOG & CAT", category="ペット"`
- confidence: 0.90
- 評価: `evidenceQuote="GREEN DOG & CAT: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="hamasushi", name="はま寿司", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="はま寿司: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="hitachi-chain-store", name="日立チェーンストール", category="家電量販店"`
- confidence: 0.90
- 評価: `evidenceQuote="日立チェーンストール: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="iris-plaza", name="アイリスプラザ", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="アイリスプラザ: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="kawatoku-dept", name="川徳百貨店", category="百貨店"`
- confidence: 0.90
- 評価: `evidenceQuote="川徳百貨店: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="lens-style", name="レンズスタイル", category="コンタクト"`
- confidence: 0.90
- 評価: `evidenceQuote="レンズスタイル: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="make-man", name="メイクマン", category="ホームセンター"`
- confidence: 0.90
- 評価: `evidenceQuote="メイクマン: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="megane-ichiba", name="眼鏡市場", category="メガネ"`
- confidence: 0.90
- 評価: `evidenceQuote="眼鏡市場: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="net-off", name="ネットオフ", category="買取"`
- confidence: 0.90
- 評価: `evidenceQuote="ネットオフ: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="shinseido", name="新星堂", category="音楽・映像"`
- confidence: 0.90
- 評価: `evidenceQuote="新星堂: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="tsutaya", name="TSUTAYA", category="エンタメ・チケット"`
- confidence: 0.90
- 評価: `evidenceQuote="TSUTAYA: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

_他 2 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 excludedCategory (21 件)
理由: Policy B: 対象外カテゴリ (金融/保険/医療/ギャンブル等)。自動追加しない。

<details><summary>展開</summary>

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="aflac", name="アフラック", category="保険"`
- confidence: 0.90
- 評価: `evidenceQuote="アフラック: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="aplus", name="アプラス", category="金融"`
- confidence: 0.90
- 評価: `evidenceQuote="アプラス: Vポイント加盟店"`
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

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="sokuyaku", name="SOKUYAKU", category="医療"`
- confidence: 0.90
- 評価: `evidenceQuote="SOKUYAKU: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="sompo-himawari-seimei", name="ＳＯＭＰＯひまわり生命", category="保険"`
- confidence: 0.90
- 評価: `evidenceQuote="ＳＯＭＰＯひまわり生命: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="studio-mario", name="スタジオマリオ（写真館）", category="サービス"`
- confidence: 0.90
- 評価: `evidenceQuote="スタジオマリオ（写真館）: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="tabelog", name="食べログ", category="ネットサービス"`
- confidence: 0.90
- 評価: `evidenceQuote="食べログ: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="tiktok-lite", name="TikTok Lite", category="ネットサービス"`
- confidence: 0.90
- 評価: `evidenceQuote="TikTok Lite: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="winticket", name="WINTICKET", category="ギャンブル"`
- confidence: 0.90
- 評価: `evidenceQuote="WINTICKET: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="yahoo-japan", name="Yahoo! JAPAN", category="ネットサービス"`
- confidence: 0.90
- 評価: `evidenceQuote="Yahoo! JAPAN: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

_他 1 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### ⚫ userBlocked (9 件)
理由: seed-blocklist.ts でユーザが除外指定済み。意図した除外であれば無視してよい。

<details><summary>展開</summary>

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
- 内容: `id="auto-info", name="オート・インフォ", category="車・バイク"`
- confidence: 0.90
- 評価: `evidenceQuote="オート・インフォ たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="diamond-sha", name="ダイヤモンド社", category="書店"`
- confidence: 0.90
- 評価: `evidenceQuote="ダイヤモンド社 たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="hyundai-mobility-japan", name="Hyundai Mobility Japan", category="自動車"`
- confidence: 0.90
- 評価: `evidenceQuote="Hyundai Mobility Japan: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="mercedes-benz", name="メルセデス・ベンツ", category="自動車"`
- confidence: 0.90
- 評価: `evidenceQuote="メルセデス・ベンツ: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="shaddy-salada-kan", name="シャディ・サラダ館", category="ギフト"`
- confidence: 0.90
- 評価: `evidenceQuote="シャディ・サラダ館: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="tone-mobile", name="トーンモバイル", category="通信"`
- confidence: 0.90
- 評価: `evidenceQuote="トーンモバイル: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="vip-liner", name="VIPライナー（高速バス）", category="交通"`
- confidence: 0.90
- 評価: `evidenceQuote="VIPライナー（高速バス）: Vポイント加盟店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

</details>

## 操作
- このまま **merge** すると、要レビュー項目を読み込んだ証拠として記録されるだけ (実体 seed 変更はなし)
- 手動キュレートしたい場合は、このブランチに追加 commit してから merge
- 不要なら **close** で次週まで保留