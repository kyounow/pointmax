# 📋 週次マスタ同期: 要レビュー項目

(自動生成 2026-07-15。merge 前に項目を確認してください。)

## サマリ
- 要レビュー: 66 件
- ソース別: v-point=55, ponta=10, jal-card-tokuyaku-list=1
- 主な理由: idCollision=5, userBlocked=6, storeAdditionsDisabled=42, lowConfidence=10, excludedCategory=3

## 項目 (理由別)

### ⏸ storeAdditionsDisabled (store 追加は手動キュレ運用) (42 件)
理由: 新規 store の追加は cron では行わない方針 (キャンペーン情報の獲得に注力するため)。ここに列挙された店舗は cron が検知した「seed に未追加の店舗候補」で、必要な場合は手動で seed-data-stores.ts に追加 → 次回 cron で関連 membership が自動取り込まれる。全件無視も OK (リストとしての参照のみ)。

<details><summary>展開</summary>

#### `sto-e44d4e4655` — `addRecord/stores` from `v-point-partners`
- 内容: `id="autobacs-dot-com", name="オートバックス・ドットコム", category="車・バイク"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: オートバックス・ドットコム"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-e44d4e4655`、不要なら無視

#### `sto-85b7796b9b` — `addRecord/stores` from `v-point-partners`
- 内容: `id="camera-no-kitamura-netshop", name="カメラのキタムラネットショップ", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: カメラのキタムラネットショップ（カメラ用品）"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-85b7796b9b`、不要なら無視

#### `sto-4da629603f` — `addRecord/stores` from `v-point-partners`
- 内容: `id="chargerspot", name="ChargeSPOT", category="生活サービス"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: ChargeSPOT"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-4da629603f`、不要なら無視

#### `sto-4a819a90dc` — `addRecord/stores` from `v-point-partners`
- 内容: `id="e-best", name="イーベスト", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: イーベスト"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-4a819a90dc`、不要なら無視

#### `sto-50a0498a2d` — `addRecord/stores` from `v-point-partners`
- 内容: `id="ec-current", name="ECカレント", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: ECカレント"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-50a0498a2d`、不要なら無視

#### `sto-689eee2002` — `addRecord/stores` from `v-point-partners`
- 内容: `id="eneos-denki", name="ＥＮＥＯＳでんき", category="電気・ガス"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: ＥＮＥＯＳでんき"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-689eee2002`、不要なら無視

#### `sto-2c49431722` — `addRecord/stores` from `v-point-partners`
- 内容: `id="eneos-toshigas", name="ＥＮＥＯＳ都市ガス", category="電気・ガス"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: ＥＮＥＯＳ都市ガス"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-2c49431722`、不要なら無視

#### `sto-4b007e460b` — `addRecord/stores` from `v-point-partners`
- 内容: `id="festa-garden", name="フェスタガーデン", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: フェスタガーデン"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-4b007e460b`、不要なら無視

#### `sto-2dcfca26ce` — `addRecord/stores` from `v-point-partners`
- 内容: `id="fuku-yakuhin", name="ふく薬品", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: ふく薬品"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-2dcfca26ce`、不要なら無視

#### `sto-2b7c08f9df` — `addRecord/stores` from `v-point-partners`
- 内容: `id="granbuffet", name="グランブッフェ", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: グランブッフェ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-2b7c08f9df`、不要なら無視

#### `sto-ff1cedb307` — `addRecord/stores` from `v-point-partners`
- 内容: `id="hac-drug", name="ハックドラッグ", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: ハックドラッグ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-ff1cedb307`、不要なら無視

#### `sto-377f1f788c` — `addRecord/stores` from `v-point-partners`
- 内容: `id="happy-drug", name="ハッピー・ドラッグ", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: ハッピー・ドラッグ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-377f1f788c`、不要なら無視

#### `sto-0ad374dbb3` — `addRecord/stores` from `v-point-partners`
- 内容: `id="homecenter-mitsuwa", name="ホームセンターみつわ", category="ホームセンター"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: ホームセンターみつわ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-0ad374dbb3`、不要なら無視

#### `sto-92460c1b03` — `addRecord/stores` from `v-point-partners`
- 内容: `id="jomo-shimbun", name="上毛新聞", category="書店"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: 上毛新聞"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-92460c1b03`、不要なら無視

#### `sto-688775e4cf` — `addRecord/stores` from `v-point-partners`
- 内容: `id="kagu-no-taishodo", name="家具の大正堂", category="家具・インテリア"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: 家具の大正堂"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-688775e4cf`、不要なら無視

#### `sto-508305f8ef` — `addRecord/stores` from `v-point-partners`
- 内容: `id="kitamura-shashinki-ten", name="北村写真機店", category="カメラ・写真"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: 北村写真機店"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-508305f8ef`、不要なら無視

#### `sto-a45b2bf403` — `addRecord/stores` from `v-point-partners`
- 内容: `id="kokumin", name="コクミン", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: コクミン"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-a45b2bf403`、不要なら無視

#### `sto-cc9a702df0` — `addRecord/stores` from `v-point-partners`
- 内容: `id="konko-yakuhin", name="金光薬品", category="ドラッグストア"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: 金光薬品"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-cc9a702df0`、不要なら無視

#### `sto-f8acb77b0b` — `addRecord/stores` from `v-point-partners`
- 内容: `id="mainichi-shimbun", name="毎日新聞", category="書店"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: 毎日新聞"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-f8acb77b0b`、不要なら無視

#### `sto-44155f6c75` — `addRecord/stores` from `v-point-partners`
- 内容: `id="misumi-gas-misumi-denki", name="ミスミガス・ミスミでんき", category="電気・ガス"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: ミスミガス・ミスミでんき"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-44155f6c75`、不要なら無視

_他 22 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟡 lowConfidence (10 件)
理由: Gemini の評価で confidence < 0.9。エビデンス不明瞭・推測混入の疑い。

<details><summary>展開</summary>

#### `sto-d6e3af6226` — `addRecord/stores` from `ponta-partners`
- 内容: `id="book-coffee-fukuroshasabo", name="本と珈琲 梟書茶房", category="飲食"`
- confidence: 0.85
- 評価: `evidenceQuote="Pontaポイントがたまる・つかえるサービス、お店: 本と珈琲 梟書茶房 たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-d6e3af6226`、不要なら無視

#### `sto-5d9a12bee5` — `addRecord/stores` from `v-point-partners`
- 内容: `id="central-park", name="セントラルパーク", category="商業施設"`
- confidence: 0.81
- 評価: `evidenceQuote="お店・サービス一覧: セントラルパーク"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-5d9a12bee5`、不要なら無視

#### `sto-3ae1f81a24` — `addRecord/stores` from `ponta-partners`
- 内容: `id="coppe-tajima", name="コッペ田島", category="飲食"`
- confidence: 0.85
- 評価: `evidenceQuote="Pontaポイントがたまる・つかえるサービス、お店: コッペ田島 たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-3ae1f81a24`、不要なら無視

#### `sto-151982c6b9` — `addRecord/stores` from `ponta-partners`
- 内容: `id="douter-coffee-farm", name="ドトール珈琲農園・ドトール珈琲店", category="飲食"`
- confidence: 0.85
- 評価: `evidenceQuote="Pontaポイントがたまる・つかえるサービス、お店: ドトール珈琲農園・ドトール珈琲店 たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-151982c6b9`、不要なら無視

#### `sto-b421d9f52d` — `addRecord/stores` from `v-point-partners`
- 内容: `id="fujimaru-park", name="藤丸パーク", category="商業施設"`
- confidence: 0.81
- 評価: `evidenceQuote="お店・サービス一覧: 藤丸パーク"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-b421d9f52d`、不要なら無視

#### `sto-1010b1cd22` — `addRecord/stores` from `v-point-partners`
- 内容: `id="la-cittadella", name="ラ チッタデッラ", category="商業施設"`
- confidence: 0.81
- 評価: `evidenceQuote="お店・サービス一覧: ラ チッタデッラ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-1010b1cd22`、不要なら無視

#### `sto-03cb06ef31` — `addRecord/stores` from `ponta-partners`
- 内容: `id="nishimuta", name="ニシムタ", category="スーパー"`
- confidence: 0.85
- 評価: `evidenceQuote="Pontaポイントがたまる・つかえるサービス、お店: ニシムタ たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-03cb06ef31`、不要なら無視

#### `sto-a73445f93d` — `addRecord/stores` from `ponta-partners`
- 内容: `id="oisix", name="Oisix", category="ネット通販"`
- confidence: 0.85
- 評価: `evidenceQuote="Pontaポイントがたまる・つかえるサービス、お店: Oisix（リクルートIDでのログインの場合） たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-a73445f93d`、不要なら無視

#### `sto-a1536cfecc` — `addRecord/stores` from `v-point-partners`
- 内容: `id="palio-city", name="パリオCITY", category="商業施設"`
- confidence: 0.81
- 評価: `evidenceQuote="お店・サービス一覧: パリオCITY"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-a1536cfecc`、不要なら無視

#### `sto-8a8a9b6c2b` — `addRecord/stores` from `ponta-partners`
- 内容: `id="seijo-ishii", name="成城石井", category="スーパー"`
- confidence: 0.85
- 評価: `evidenceQuote="Pontaポイントがたまる・つかえるサービス、お店: 成城石井 たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-8a8a9b6c2b`、不要なら無視

</details>

### 🟠 idCollision (5 件)
理由: 新規追加だが既存 ID またはストア名と衝突。重複の可能性あり。

<details><summary>展開</summary>

#### `sto-cfadbd441b` — `addRecord/stores` from `v-point-partners`
- 内容: `id="alook", name="ALOOK", category="メガネ"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: ALOOK"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-cfadbd441b`、不要なら無視

#### `sto-20ff320bc8` — `addRecord/stores` from `v-point-partners`
- 内容: `id="epark-relax-and-este", name="EPARKリラク＆エステ", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: EPARKリラク＆エステ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-20ff320bc8`、不要なら無視

#### `sto-45eb01a592` — `addRecord/stores` from `ponta-partners`
- 内容: `id="hotpepper-beauty-clinic", name="HOT PEPPER Beauty 美容クリニック", category="美容"`
- confidence: 0.85
- 評価: `evidenceQuote="Pontaポイントがたまる・つかえるサービス、お店: HOT PEPPER Beauty 美容クリニック たまる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-45eb01a592`、不要なら無視

#### `sto-73713eead8` — `addRecord/stores` from `v-point-partners`
- 内容: `id="lens-style", name="レンズスタイル", category="コンタクト"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: レンズスタイル"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-73713eead8`、不要なら無視

#### `sto-bc3c4190d9` — `addRecord/stores` from `jal-card-tokuyaku-list`
- 内容: `id="royal-host", name="ロイヤルホスト", category="JAL特約店"`
- confidence: 0.85
- 評価: `evidenceQuote="ロイヤルホスト 決済でマイルが 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-bc3c4190d9`、不要なら無視

</details>

### 🟠 excludedCategory (3 件)
理由: Policy B: 対象外カテゴリ (金融/保険/医療/ギャンブル等)。自動追加しない。

<details><summary>展開</summary>

#### `sto-ef8738c380` — `addRecord/stores` from `v-point-partners`
- 内容: `id="jihampi", name="ジハンピ", category="その他"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: ジハンピ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-ef8738c380`、不要なら無視

#### `sto-32d7ada76e` — `addRecord/stores` from `v-point-partners`
- 内容: `id="toshin-hochokicenter", name="トーシン補聴器センター", category="その他"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: トーシン補聴器センター"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-32d7ada76e`、不要なら無視

#### `sto-2f6f0d4b5f` — `addRecord/stores` from `ponta-partners`
- 内容: `id="winticket", name="WINTICKET(ウィンチケット)", category="ギャンブル"`
- confidence: 0.85
- 評価: `evidenceQuote="Pontaポイントがたまる・つかえるサービス、お店: WINTICKET(ウィンチケット) たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-2f6f0d4b5f`、不要なら無視

</details>

### ⚫ userBlocked (6 件)
理由: seed-blocklist.ts でユーザが除外指定済み。意図した除外であれば無視してよい。

<details><summary>展開</summary>

#### `sto-0835d85432` — `addRecord/stores` from `v-point-partners`
- 内容: `id="ana", name="ANA", category="交通"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: ANA"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-0835d85432`、不要なら無視

#### `sto-47a9824577` — `addRecord/stores` from `v-point-partners`
- 内容: `id="hyundai-mobility-japan", name="Hyundai Mobility Japan", category="車・バイク"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: Hyundai Mobility Japan"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-47a9824577`、不要なら無視

#### `sto-0e7abd1d4b` — `addRecord/stores` from `ponta-partners`
- 内容: `id="jal-mileage-bank", name="日本航空(JALマイレージバンク)", category="航空"`
- confidence: 0.85
- 評価: `evidenceQuote="Pontaポイントがたまる・つかえるサービス、お店: 日本航空(JALマイレージバンク) たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-0e7abd1d4b`、不要なら無視

#### `sto-ec2a8575ea` — `addRecord/stores` from `v-point-partners`
- 内容: `id="mercedes-benz", name="メルセデス・ベンツ", category="車・バイク"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: メルセデス・ベンツ"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-ec2a8575ea`、不要なら無視

#### `sto-0babf3d693` — `addRecord/stores` from `ponta-partners`
- 内容: `id="telasa", name="TELASA（テラサ）", category="動画配信"`
- confidence: 0.85
- 評価: `evidenceQuote="Pontaポイントがたまる・つかえるサービス、お店: TELASA（テラサ） たまる つかえる"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-0babf3d693`、不要なら無視

#### `sto-ded8618d60` — `addRecord/stores` from `v-point-partners`
- 内容: `id="vip-liner", name="VIPライナー（高速バス）", category="交通"`
- confidence: 0.90
- 評価: `evidenceQuote="お店・サービス一覧: VIPライナー（高速バス）"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-ded8618d60`、不要なら無視

</details>

## 操作
- **取り込みたい項目がある場合 (半自動)**: ローカルでこのブランチを checkout し、`npm run sync:approve -- <ID> [<ID> ...]` を実行 (ID は各項目見出しの先頭)。seed-additions.ts への反映・queue からの除去・REVIEW_QUEUE.md の再生成まで自動。`npm run sync:approve -- --list` で一覧表示。実行後 `npm test && npm run build` を確認して commit
- このまま **merge** すると、要レビュー項目を読み込んだ証拠として記録されるだけ (実体 seed 変更はなし)
- 手動キュレートしたい場合は、このブランチに追加 commit してから merge
- 不要なら **close** で次週まで保留