# 📋 週次マスタ同期: 要レビュー項目

(自動生成 2026-05-25。merge 前に項目を確認してください。)

## サマリ
- 要レビュー: 192 件
- ソース別: orico-card-member-point=1, smbc-vpoint-up=37, v-point=123, ponta=29, jal-card-tokuyaku-list=1, smbc-v-gold-7percent=1
- 主な理由: idCollision=7, lowConfidence=16, userBlocked=10, excludedCategory=12, safetyFailed=147

## 項目 (理由別)

### 🛡 safetyFailed (auto-merge 件数オーバー降格) (147 件)
理由: auto-merge 候補だが、件数が maxAutoChangesPerRun を超えたため安全弁で review に降格。内容は健全な auto 候補なので、個別精査の上 maxAutoChangesPerRun を一時 bump して再実行 or 手動で取り込み判断。

<details><summary>展開</summary>

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="samsonite"`
- notes: 税込換算
- confidence: 0.90
- 評価: `evidenceQuote="サムソナイト: 200円(税込)ごとに1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="sofmap"`
- notes: 税込換算
- confidence: 0.90
- 評価: `evidenceQuote="ソフマップ: 200円(税込)ごとに1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="tomods"`
- notes: 税込換算
- confidence: 0.90
- 評価: `evidenceQuote="トモズ: 200円(税込)ごとに1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="yakodo"`
- notes: 税込換算
- confidence: 0.90
- 評価: `evidenceQuote="薬王堂: 200円(税込)ごとに1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="hmv-books-online"`
- notes: 税込換算
- confidence: 0.90
- 評価: `evidenceQuote="HMV&BOOKS online: 200円(税込)ごとに1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `ponta-partners`
- 内容: `programId="prog-ponta-card-0.5pc", storeId="geo-takuhai-rental"`
- notes: 税込換算
- confidence: 0.90
- 評価: `evidenceQuote="ゲオ宅配レンタル: 200円(税込)ごとに1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `updateField/cards` `smbc-v` from `smbc-v-gold-7percent`
- フィールド: `defaultRate`
- 変更: `0.500%` → `1.000%`
- confidence: 0.90
- 評価: `evidenceQuote="三井住友カード ゴールド VISA/ Mastercard...通常のポイント分1％に加えて+6％ポイント還元となります。"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="seicomart"`
- confidence: 0.90
- 評価: `evidenceQuote="セイコーマート スマホのVisaのタッチ決済・Mastercard®タッチ決済またはモバイルオーダーを利用＋7.5％還元対象店舗"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="conv-7eleven"`
- confidence: 0.90
- 評価: `evidenceQuote="セブン‐イレブン スマホのVisaのタッチ決済・Mastercard®タッチ決済またはモバイルオーダーを利用＋7.5％還元対象店舗"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="poplar"`
- confidence: 0.90
- 評価: `evidenceQuote="ポプラ スマホのVisaのタッチ決済・Mastercard®タッチ決済またはモバイルオーダーを利用＋7.5％還元対象店舗"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="conv-ministop"`
- confidence: 0.90
- 評価: `evidenceQuote="ミニストップ スマホのVisaのタッチ決済・Mastercard®タッチ決済またはモバイルオーダーを利用＋7.5％還元対象店舗"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="conv-lawson"`
- confidence: 0.90
- 評価: `evidenceQuote="ローソン スマホのVisaのタッチ決済・Mastercard®タッチ決済またはモバイルオーダーを利用＋7.5％還元対象店舗"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="mcdonalds"`
- confidence: 0.90
- 評価: `evidenceQuote="マクドナルド スマホのVisaのタッチ決済・Mastercard®タッチ決済またはモバイルオーダーを利用＋7.5％還元対象店舗"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="mos-burger"`
- confidence: 0.90
- 評価: `evidenceQuote="モスバーガー スマホのVisaのタッチ決済・Mastercard®タッチ決済またはモバイルオーダーを利用＋7.5％還元対象店舗"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="kfc"`
- confidence: 0.90
- 評価: `evidenceQuote="ケンタッキーフライドチキン スマホのVisaのタッチ決済・Mastercard®タッチ決済またはモバイルオーダーを利用＋7.5％還元対象店舗"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="yoshinoya"`
- confidence: 0.90
- 評価: `evidenceQuote="吉野家 スマホのVisaのタッチ決済・Mastercard®タッチ決済またはモバイルオーダーを利用＋7.5％還元対象店舗"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="saizeriya"`
- confidence: 0.90
- 評価: `evidenceQuote="サイゼリヤ スマホのVisaのタッチ決済・Mastercard®タッチ決済またはモバイルオーダーを利用＋7.5％還元対象店舗"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="gusto"`
- confidence: 0.90
- 評価: `evidenceQuote="ガスト スマホのVisaのタッチ決済・Mastercard®タッチ決済またはモバイルオーダーを利用＋7.5％還元対象店舗"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="bamiyan"`
- confidence: 0.90
- 評価: `evidenceQuote="バーミヤン スマホのVisaのタッチ決済・Mastercard®タッチ決済またはモバイルオーダーを利用＋7.5％還元対象店舗"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="shabuyo"`
- confidence: 0.90
- 評価: `evidenceQuote="しゃぶ葉 スマホのVisaのタッチ決済・Mastercard®タッチ決済またはモバイルオーダーを利用＋7.5％還元対象店舗"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

_他 127 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟡 lowConfidence (16 件)
理由: Gemini の評価で confidence < 0.9。エビデンス不明瞭・推測混入の疑い。

<details><summary>展開</summary>

#### `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-1pc", storeId="tsutaya"`
- notes: TSUTAYAレンタル・購入（書籍、CD/DVDなど）が対象。店舗により異なる可能性あり。
- confidence: 0.81
- 評価: `evidenceQuote="TSUTAYA 100円(税抜)で1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/memberships` from `v-point-partners`
- 内容: `programId="prog-vpoint-card-0.5pc", storeId="ja-zennoh-a-coop"`
- notes: 税抜換算。東日本エリア・近畿・東海エリアの記載あり
- confidence: 0.81
- 評価: `evidenceQuote="JA全農Aコープ 200円(税抜)で1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="asaku-ma", name="ステーキのあさくま", category="飲食"`
- confidence: 0.81
- 評価: `evidenceQuote="ステーキのあさくま: たまる つかえる アプリ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="book-coffee-fukuro-shosabo", name="本と珈琲 梟書茶房", category="飲食"`
- confidence: 0.81
- 評価: `evidenceQuote="本と珈琲 梟書茶房: たまる つかえる アプリ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="jumble-store", name="ジャンブルストア", category="ファッション"`
- confidence: 0.81
- 評価: `evidenceQuote="ジャンブルストア: たまる つかえる アプリ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="nippon-road-service", name="日本ロードサービス（JRS）", category="車・バイク"`
- confidence: 0.81
- 評価: `evidenceQuote="日本ロードサービス（JRS）: たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="nishimuta", name="ニシムタ", category="スーパー"`
- confidence: 0.81
- 評価: `evidenceQuote="ニシムタ: たまる つかえる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="onix", name="ONIX", category="車・バイク"`
- confidence: 0.81
- 評価: `evidenceQuote="ONIX: たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="ponta-bitcoin-farm", name="Pontaビットコin牧場", category="エンタメ・チケット"`
- confidence: 0.81
- 評価: `evidenceQuote="Pontaビットコin牧場: たまる つかえる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="ponta-play", name="Ponta PLAY", category="エンタメ・チケット"`
- confidence: 0.81
- 評価: `evidenceQuote="Ponta PLAY: たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="riskmonster", name="リスクモンスター", category="ビジネス・教育"`
- confidence: 0.81
- 評価: `evidenceQuote="リスクモンスター: たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="seijo-ishii", name="成城石井", category="スーパー"`
- confidence: 0.81
- 評価: `evidenceQuote="成城石井: たまる つかえる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="sofmap", name="ソフマップ", category="家電量販店"`
- confidence: 0.81
- 評価: `evidenceQuote="ソフマップ: たまる つかえる アプリ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="study-sapuri-english", name="スタディサプリENGLISH", category="ビジネス・教育"`
- confidence: 0.81
- 評価: `evidenceQuote="スタディサプリENGLISH: たまる つかえる リクルートID"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="sunlive", name="サンリブ", category="スーパー"`
- confidence: 0.81
- 評価: `evidenceQuote="サンリブ: たまる つかえる アプリ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="winticket", name="WINTICKET(ウィンチケット)", category="エンタメ・チケット"`
- confidence: 0.81
- 評価: `evidenceQuote="WINTICKET(ウィンチケット): たまる つかえる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

</details>

### 🟠 idCollision (7 件)
理由: 新規追加だが既存 ID またはストア名と衝突。重複の可能性あり。

<details><summary>展開</summary>

#### `addRecord/cards` from `orico-card-member-point`
- 内容: `id="orico-the-point", name="orico-the-point", defaultRate=0.01, defaultCurrencyId="orico-pt"`
- confidence: 1.00
- 評価: `evidenceQuote="還元率は常に1.0％以上！100円で1オリコポイントがたまる！"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `smbc-vpoint-up`
- 内容: `id="prog-olive-selectable-bonus", name="Olive選べる特典 Vポイントアッププログラム+1%", rate=0.01, currencyId="v-pt", cardIds=["olive"], bonusType="addOn", description="Oliveアカウントの選べる特典で「Vポイントアッププログラム＋1％」を選択", officialUrl="https://www.smbc.co.jp/kojin/vpoint-up/", conditions="Oliveアカウントの選べる特典にて「Vポイントアッププログラム＋1％」を選択した場合"`
- confidence: 0.90
- 評価: `evidenceQuote="Oliveアカウントの選べる特典＋1％"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `smbc-vpoint-up`
- 内容: `id="prog-smbc-touch-conveni", name="SMBC対象コンビニ・飲食店スマホタッチ決済高還元", rate=0.075, currencyId="v-pt", cardIds=["smbc-v","olive"], paymentAppId="pa-visa-touch", bonusType="addOn", description="Visa/Mastercard®タッチ決済で対象コンビニ・飲食店 最大+7.5%", officialUrl="https://www.smbc.co.jp/kojin/vpoint-up/", conditions="Visa/Mastercard®のタッチ決済利用時のみ。カード現物のタッチ決済、iD、カードの差し込み、磁気取引は対象外。"`
- confidence: 0.90
- 評価: `evidenceQuote="B 対象店舗でスマホのVisaのタッチ決済・Mastercard®タッチ決済またはモバイルオーダーを利用＋7.5％還元"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/programs` from `v-point-partners`
- 内容: `id="prog-vpoint-card-1pc", name="Vポイントカード(旧Tカード) 提示 1%", pointCardId="vpoint-card", rate=0.01, currencyId="v-pt", bonusType="primary"`
- confidence: 0.81
- 評価: `evidenceQuote="TSUTAYA 100円(税抜)で1ポイント"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="kyoyo-gas", name="京葉ガス", category="電気・ガス"`
- confidence: 0.90
- 評価: `evidenceQuote="アトカラ 京葉ガス 高梁市図書館"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `jal-card-tokuyaku-list`
- 内容: `id="royal-host", name="ロイヤルホスト", category="JAL特約店"`
- confidence: 0.85
- 評価: `evidenceQuote="ロイヤルホスト 決済でマイルが 2 倍"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="sports-club-renaissance", name="スポーツクラブ ルネサンス", category="スポーツ"`
- confidence: 0.81
- 評価: `evidenceQuote="スポーツクラブ ルネサンス: たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

</details>

### 🟠 excludedCategory (12 件)
理由: Policy B: 対象外カテゴリ (金融/保険/医療/ギャンブル等)。自動追加しない。

<details><summary>展開</summary>

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="apaman-shop", name="アパマンショップ", category="不動産・住宅"`
- confidence: 0.81
- 評価: `evidenceQuote="アパマンショップ: たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="bitflyer", name="bitFlyer", category="金融"`
- confidence: 0.90
- 評価: `evidenceQuote="CREAL bitFlyer TSUTAYAネット買取"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="creal", name="CREAL", category="金融"`
- confidence: 0.90
- 評価: `evidenceQuote="寿司処 菱膳 CREAL bitFlyer"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="epark-kusuri-no-madoguchi", name="EPARK くすりの窓口", category="医療"`
- confidence: 0.90
- 評価: `evidenceQuote="TSUTAYA Conditioning EPARK くすりの窓口"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="lixil-fudosan-shop", name="LIXIL不動産ショップ", category="不動産・住宅"`
- confidence: 0.90
- 評価: `evidenceQuote="イーベスト ERA LIXIL不動産ショップ MADOショップ（YKK AP）"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="mado-shop", name="MADOショップ（YKK AP）", category="不動産・住宅"`
- confidence: 0.90
- 評価: `evidenceQuote="LIXIL不動産ショップ MADOショップ（YKK AP） クスリのアオキ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="miyazaki-taiyo-bank", name="宮崎太陽銀行", category="金融"`
- confidence: 0.90
- 評価: `evidenceQuote="TSUTAYAネット買取 宮崎太陽銀行 エバーグリーン・リテイリング"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="sokuyaku", name="SOKUYAKU", category="医療"`
- confidence: 0.90
- 評価: `evidenceQuote="TSUTAYAスマホ・タブレット買取 SOKUYAKU 毎日新聞"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="toshin-hearing-aid", name="トーシン補聴器センター", category="医療"`
- confidence: 0.90
- 評価: `evidenceQuote="ラ チッタデッラ トーシン補聴器センター 精文館書店"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="ur-chintai-jutaku", name="UR賃貸住宅", category="不動産・住宅"`
- confidence: 0.81
- 評価: `evidenceQuote="UR賃貸住宅: たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="v-fast-channel", name="V FASTチャンネル", category="その他"`
- confidence: 0.90
- 評価: `evidenceQuote="みなと銀行 V FASTチャンネル キューサイ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="zihanpi", name="ジハンピ", category="その他"`
- confidence: 0.90
- 評価: `evidenceQuote="メイクマン ジハンピ 新星堂"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

</details>

### ⚫ userBlocked (10 件)
理由: seed-blocklist.ts でユーザが除外指定済み。意図した除外であれば無視してよい。

<details><summary>展開</summary>

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="17live", name="17LIVE(ワンセブンライブ)", category="エンタメ・チケット"`
- confidence: 0.81
- 評価: `evidenceQuote="17LIVE(ワンセブンライブ): たまる つかえる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="ana", name="ANA", category="交通"`
- confidence: 0.90
- 評価: `evidenceQuote="オリコ ANA 関西みらい銀行"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="auto-info", name="オート・インフォ", category="車・バイク"`
- confidence: 0.81
- 評価: `evidenceQuote="オート・インフォ: たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="diamond-sha", name="ダイヤモンド社", category="書店"`
- confidence: 0.81
- 評価: `evidenceQuote="ダイヤモンド社: たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="hyundai-mobility-japan", name="Hyundai Mobility Japan", category="車・バイク"`
- confidence: 0.90
- 評価: `evidenceQuote="ネットマイル Hyundai Mobility Japan TSUTAYAスマホ・タブレット買取"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="jal-mileage-bank", name="日本航空(JALマイレージバンク)", category="交通"`
- confidence: 0.81
- 評価: `evidenceQuote="日本航空(JALマイレージバンク): たまる つかえる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="mercedes-benz", name="メルセデス・ベンツ", category="車・バイク"`
- confidence: 0.90
- 評価: `evidenceQuote="日本メディカルシステム メルセデス・ベンツ オリコ"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="president-sha", name="プレジデント社", category="書店"`
- confidence: 0.81
- 評価: `evidenceQuote="プレジデント社: たまる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `ponta-partners`
- 内容: `id="telasa", name="TELASA（テラサ）", category="音楽・映像"`
- confidence: 0.81
- 評価: `evidenceQuote="TELASA（テラサ）: たまる つかえる"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

#### `addRecord/stores` from `v-point-partners`
- 内容: `id="vip-liner", name="VIPライナー（高速バス）", category="交通"`
- confidence: 0.90
- 評価: `evidenceQuote="PeXポイント VIPライナー（高速バス） Powl（ポール）"`
- 対応案: 手動で seed ファイルに反映するか、不要なら無視

</details>

## 操作
- このまま **merge** すると、要レビュー項目を読み込んだ証拠として記録されるだけ (実体 seed 変更はなし)
- 手動キュレートしたい場合は、このブランチに追加 commit してから merge
- 不要なら **close** で次週まで保留