# 📋 週次マスタ同期: 要レビュー項目

(自動生成 2026-05-12。merge 前に項目を確認してください。)

## サマリ
- 要レビュー: 7 件
- ソース別: smbc-v-gold-7percent=7
- 主な理由: lowConfidence=7

## 項目 (理由別)

### 🟡 lowConfidence (7 件)
理由: Gemini の評価で confidence < 0.9。エビデンス不明瞭・推測混入の疑い。

<details><summary>展開</summary>

#### `updateField/rules` `rule-smbc-7eleven` from `smbc-v-gold-7percent`
- フィールド: `rate`
- 変更: `7.000%` → `11.000%`
- confidence: 0.56
- 評価: `evidenceQuote="条件達成のうえで、セブン‐イレブンで、スマホのVisaのタッチ決済・Mastercardタッチ決済で支払うと、最大11％ポイント還元！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-lowson-pa-visa-touch", cardId="smbc-v", storeId="lowson", paymentAppId="pa-visa-touch", rate=0.07, currencyId="v-pt"`
- confidence: 0.81
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-conv-familymart-pa-visa-touch", cardId="smbc-v", storeId="conv-familymart", paymentAppId="pa-visa-touch", rate=0.07, currencyId="v-pt"`
- confidence: 0.81
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-daily-yamazaki-pa-visa-touch", cardId="smbc-v", storeId="daily-yamazaki", paymentAppId="pa-visa-touch", rate=0.07, currencyId="v-pt"`
- confidence: 0.81
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-shabuyo-pa-visa-touch", cardId="smbc-v", storeId="shabuyo", paymentAppId="pa-visa-touch", rate=0.07, currencyId="v-pt"`
- confidence: 0.81
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-yumean-pa-visa-touch", cardId="smbc-v", storeId="yumean", paymentAppId="pa-visa-touch", rate=0.07, currencyId="v-pt"`
- confidence: 0.81
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/rules` from `smbc-v-gold-7percent`
- 内容: `id="rule-smbc-v-kappazushi-pa-visa-touch", cardId="smbc-v", storeId="kappazushi", paymentAppId="pa-visa-touch", rate=0.07, currencyId="v-pt"`
- confidence: 0.81
- 評価: `evidenceQuote="対象のコンビニ・飲食店で、スマホのタッチ決済またはモバイルオーダー（※5）で支払うと、ご利用金額200円（税込）につき7％ポイント還元！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

</details>

## 操作
- このまま **merge** すると、要レビュー項目を読み込んだ証拠として記録されるだけ (実体 seed 変更はなし)
- 手動キュレートしたい場合は、このブランチに追加 commit してから merge
- 不要なら **close** で次週まで保留