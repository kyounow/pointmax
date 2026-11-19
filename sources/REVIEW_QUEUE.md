# 📋 週次マスタ同期: 要レビュー項目

(自動生成 2026-11-19。merge 前に項目を確認してください。)

## サマリ
- 要レビュー: 228 件
- ソース別: epos-tamaru-market=91, jcb-jpoint=133, smbc-vpoint-up=4
- 主な理由: idCollision=19, missingStoreBody=129, lowConfidence=9, missingProgramBody=7, storeNameMismatch=2, storeAdditionsDisabled=61, unknownCategory=1

## 項目 (理由別)

### 🔴 storeNameMismatch (evidence に店名が無い membership) (2 件)
理由: 既存の店舗への新規 membership だが、evidence に店名 (seed の store.name から括弧書きを除いたもの) が見当たらない (例: かっぱ寿司の evidence でくら寿司に紐付け、ネット通販版の店名で実店舗に紐付け)。店の取り違え疑い。**承認すると record がそのまま全額に乗る** (上限・対象商品・店舗・帰属を record では表現できない)。原則は見送る。取り込むなら手書き seed で上限・限定・帰属を表現する。`npm run sync:approve` で承認するには `--accept-risk` が必要。

<details><summary>展開</summary>

#### `mem-c0856ccc75` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-2x", storeId="cocokara"`
- confidence: 0.90
- 評価: `evidenceQuote="ダックス 2 倍"`
- 判定詳細: evidence に店名「ココカラファイン」が無い
- 対応案: 原則見送り (承認すると record がそのまま全額に乗る)。取り込むなら手書き seed で上限・限定・帰属を表現する。どうしても record のまま取り込むなら `npm run sync:approve -- mem-c0856ccc75 --accept-risk`

#### `mem-0f7f98abcc` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-2x", storeId="cocokara"`
- confidence: 0.90
- 評価: `evidenceQuote="ダックス 2 倍"`
- 判定詳細: evidence に店名「ココカラファイン」が無い
- 対応案: 原則見送り (承認すると record がそのまま全額に乗る)。取り込むなら手書き seed で上限・限定・帰属を表現する。どうしても record のまま取り込むなら `npm run sync:approve -- mem-0f7f98abcc --accept-risk`

</details>

### 🟠 missingStoreBody (store 本体なし membership) (129 件)
理由: membership 提案だが、参照先 store 本体が seed 未存在 + 同 run の auto 候補にも無い (例: category cap で deferred された場合)。そのまま auto-merge すると孤児 membership (店名解決できない、UI で店舗未表示) が seed に残るため降格。store 本体を手動キュレートで追加するか、次回 cron で store 側が auto 化されるのを待つ。

<details><summary>展開</summary>

#### `mem-7327e30f39` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="gu"`
- confidence: 0.90
- 評価: `evidenceQuote="ジーユー オンラインストア エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-7327e30f39`、不要なら無視

#### `mem-fe63c5068b` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="rakuten-travel"`
- confidence: 0.90
- 評価: `evidenceQuote="楽天トラベル【楽天市場】 エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-fe63c5068b`、不要なら無視

#### `mem-23eee49a66` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-2x", storeId="nitori"`
- confidence: 0.90
- 評価: `evidenceQuote="ニトリ 家具・インテリアの通販サイト【楽天市場】 エポスポイント 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-23eee49a66`、不要なら無視

#### `mem-89f78be4ff` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="qoo10"`
- confidence: 0.90
- 評価: `evidenceQuote="Qoo10 エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-89f78be4ff`、不要なら無視

#### `mem-e4fe0b46d5` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="oris"`
- confidence: 0.90
- 評価: `evidenceQuote="オルビス エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-e4fe0b46d5`、不要なら無視

#### `mem-37af6dc4ba` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="cainz"`
- confidence: 0.90
- 評価: `evidenceQuote="カインズ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-37af6dc4ba`、不要なら無視

#### `mem-f8c63425ab` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="agoda-flights"`
- confidence: 0.90
- 評価: `evidenceQuote="国内・海外の格安航空券予約ならアゴダ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-f8c63425ab`、不要なら無視

#### `mem-69f80f01ea` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="new-balance-outlet"`
- confidence: 0.90
- 評価: `evidenceQuote="ニューバランス公式オンラインアウトレット エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-69f80f01ea`、不要なら無視

#### `mem-5e351f8dac` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="nissen"`
- confidence: 0.90
- 評価: `evidenceQuote="ニッセンオンライン エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-5e351f8dac`、不要なら無視

#### `mem-6c94b6b32f` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="oisix"`
- confidence: 0.90
- 評価: `evidenceQuote="Oisix（おいしっくす）エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-6c94b6b32f`、不要なら無視

#### `mem-b3c644272b` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="expedia-flight-hotel"`
- confidence: 0.90
- 評価: `evidenceQuote="【航空券＋宿泊の同時予約】旅行予約のエクスペディア エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-b3c644272b`、不要なら無視

#### `mem-d608cacfa2` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="his"`
- confidence: 0.90
- 評価: `evidenceQuote="HIS（エイチアイエス）エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-d608cacfa2`、不要なら無視

#### `mem-c4ed0367ae` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="apahotels"`
- confidence: 0.90
- 評価: `evidenceQuote="アパホテルズ＆リゾーツ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-c4ed0367ae`、不要なら無視

#### `mem-2a0e2e0697` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-3x", storeId="bcl-company"`
- confidence: 0.90
- 評価: `evidenceQuote="BCLカンパニー公式オンラインサイト エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-2a0e2e0697`、不要なら無視

#### `mem-7e8703db39` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-4x", storeId="daiso"`
- confidence: 0.90
- 評価: `evidenceQuote="ダイソーネットストア エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-7e8703db39`、不要なら無視

#### `mem-28323888f0` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-4x", storeId="loccitane"`
- confidence: 0.90
- 評価: `evidenceQuote="ロクシタンオンラインショップ エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-28323888f0`、不要なら無視

#### `mem-3bbe67e825` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-4x", storeId="ana-travelers"`
- confidence: 0.90
- 評価: `evidenceQuote="ANAの国内・海外ツアー【ANAトラベラーズ】 エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-3bbe67e825`、不要なら無視

#### `mem-68aed33600` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-5x", storeId="keyuca"`
- confidence: 0.90
- 評価: `evidenceQuote="KEYUCA オンラインショップ エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-68aed33600`、不要なら無視

#### `mem-e241f48475` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-5x", storeId="nippon-ryoko"`
- confidence: 0.90
- 評価: `evidenceQuote="日本旅行 エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-e241f48475`、不要なら無視

#### `mem-cc869c39d0` — `addRecord/memberships` from `epos-tamaru-market`
- 内容: `programId="prog-epos-tamaru-5x", storeId="view-travel"`
- confidence: 0.90
- 評価: `evidenceQuote="びゅうトラベル（えきねっと JR東日本国内ツアー） エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-cc869c39d0`、不要なら無視

_他 109 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟠 missingProgramBody (program 本体なし membership) (7 件)
理由: membership 提案だが、参照先 program 本体が seed 未存在 + 同 run の auto 候補にも無い (proposePrograms は新規 program に必ず idCollision を付けるため、program 本体は同 run では auto に上がらず needsReview に行く)。そのまま membership だけ auto-merge すると BenefitProgram が無く還元計算できない孤児が seed に残るため降格。program 本体側の needsReview を先に承認 → 手動で seed に program 追加 → 次回 cron で membership 側も自動的に通る運用。

<details><summary>展開</summary>

#### `mem-41f36cda16` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x", storeId="aoki"`
- confidence: 0.90
- 評価: `evidenceQuote="洋服の青山 5 倍 / AOKI 5 倍 / はるやまチェーン 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-41f36cda16`、不要なら無視

#### `mem-124ff47776` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x", storeId="aoki"`
- confidence: 0.90
- 評価: `evidenceQuote="洋服の青山 5 倍 / AOKI 5 倍 / はるやまチェーン 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-124ff47776`、不要なら無視

#### `mem-1131bb4f19` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x", storeId="poplar"`
- confidence: 0.90
- 評価: `evidenceQuote="ポプラグループ 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-1131bb4f19`、不要なら無視

#### `mem-de6f00fb0f` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x", storeId="poplar"`
- confidence: 0.90
- 評価: `evidenceQuote="ポプラグループ 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-de6f00fb0f`、不要なら無視

#### `mem-894003e4df` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-5x", storeId="megane-salon-look"`
- confidence: 0.90
- 評価: `evidenceQuote="メガネサロンルック 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-894003e4df`、不要なら無視

#### `mem-1f2c7f5052` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-5x", storeId="megane-salon-look"`
- confidence: 0.90
- 評価: `evidenceQuote="メガネサロンルック 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-1f2c7f5052`、不要なら無視

#### `mem-3a8935449a` — `addRecord/memberships` from `smbc-vpoint-up`
- 内容: `programId="prog-smbc-touch-conveni", storeId="conv-7eleven"`
- confidence: 0.90
- 評価: `evidenceQuote="条件達成のうえで、セブン-イレブンで、スマホのVisaのタッチ決済・Mastercardタッチ決済で支払うと、最大11％ポイント還元！"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-3a8935449a`、不要なら無視

</details>

### ⏸ storeAdditionsDisabled (store 追加は手動キュレ運用) (61 件)
理由: 新規 store の追加は cron では行わない方針 (キャンペーン情報の獲得に注力するため)。ここに列挙された店舗は cron が検知した「seed に未追加の店舗候補」で、必要な場合は手動で seed-data-stores.ts に追加 → 次回 cron で関連 membership が自動取り込まれる。全件無視も OK (リストとしての参照のみ)。

<details><summary>展開</summary>

#### `sto-70be5721b2` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="adidas", name="adidas ONLINE SHOP", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="adidas ONLINE SHOP エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-70be5721b2`、不要なら無視

#### `sto-c833ce18d7` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="aeon-shop", name="おうちでイオン イオンショップ", category="スーパー"`
- confidence: 0.90
- 評価: `evidenceQuote="おうちでイオン イオンショップ エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c833ce18d7`、不要なら無視

#### `sto-d41329ccd8` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="agoda-activities", name="国内・海外の遊び・体験予約ならアゴダ", category="旅行代理店"`
- confidence: 0.90
- 評価: `evidenceQuote="国内・海外の遊び・体験予約ならアゴダ エポスポイント 6 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-d41329ccd8`、不要なら無視

#### `sto-db15cd7982` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="agoda-flights", name="国内・海外の格安航空券予約ならアゴダ", category="旅行代理店"`
- confidence: 0.90
- 評価: `evidenceQuote="国内・海外の格安航空券予約ならアゴダ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-db15cd7982`、不要なら無視

#### `sto-2f9a169da2` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="agoda-hotels", name="国内・海外のホテル予約ならアゴダ", category="ホテル"`
- confidence: 0.90
- 評価: `evidenceQuote="国内・海外のホテル予約ならアゴダ エポスポイント 7 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-2f9a169da2`、不要なら無視

#### `sto-49be226458` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="ana-travelers", name="ANAの国内・海外ツアー【ANAトラベラーズ】", category="旅行代理店"`
- confidence: 0.90
- 評価: `evidenceQuote="ANAの国内・海外ツアー【ANAトラベラーズ】 エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-49be226458`、不要なら無視

#### `sto-68e3e8162a` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="aoyama", name="洋服の青山オンラインストア", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="洋服の青山オンラインストア エポスポイント 25 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-68e3e8162a`、不要なら無視

#### `sto-2fe5d7a260` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="aoyama-trading", name="洋服の青山", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="洋服の青山 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-2fe5d7a260`、不要なら無視

#### `sto-17fb5f768b` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="apahotels", name="アパホテルズ＆リゾーツ", category="ホテル"`
- confidence: 0.90
- 評価: `evidenceQuote="アパホテルズ＆リゾーツ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-17fb5f768b`、不要なら無視

#### `sto-fb490ec91a` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="bcl-company", name="BCLカンパニー公式オンラインサイト", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="BCLカンパニー公式オンラインサイト エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-fb490ec91a`、不要なら無視

#### `sto-9c88baf0da` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="belluna-catalog", name="カタログ通販ベルーナ（Belluna）", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="カタログ通販ベルーナ（Belluna） エポスポイント 10 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-9c88baf0da`、不要なら無視

#### `sto-0f61959fea` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="belluna-gourmet", name="ベルーナグルメ", category="ネット通販"`
- confidence: 0.90
- 評価: `evidenceQuote="ベルーナグルメ エポスポイント 13 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-0f61959fea`、不要なら無視

#### `sto-48b4f4f2bc` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="big-holiday-ski", name="ビッグホリデースキーツアー＆スノボツアー予約サイト", category="旅行代理店"`
- confidence: 0.90
- 評価: `evidenceQuote="ビッグホリデースキーツアー＆スノボツアー予約サイト エポスポイント 5 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-48b4f4f2bc`、不要なら無視

#### `sto-df63d972c2` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="blue-bottle-coffee", name="ブルーボトルコーヒー公式オンラインストア", category="飲食"`
- confidence: 0.90
- 評価: `evidenceQuote="ブルーボトルコーヒー公式オンラインストア エポスポイント 6 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-df63d972c2`、不要なら無視

#### `sto-b58c5b080f` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="bridgestone-sports-online-store", name="ブリヂストンスポーツオンラインストア", category="スポーツ"`
- confidence: 0.90
- 評価: `evidenceQuote="ブリヂストンスポーツオンラインストア 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-b58c5b080f`、不要なら無視

#### `sto-3d69e6e7af` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="budget-rent-a-car", name="バジェット・レンタカー", category="レンタカー"`
- confidence: 0.90
- 評価: `evidenceQuote="バジェット・レンタカー 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-3d69e6e7af`、不要なら無視

#### `sto-cb74ee08cc` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="cainz", name="カインズ", category="ホームセンター"`
- confidence: 0.90
- 評価: `evidenceQuote="カインズ エポスポイント 3 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-cb74ee08cc`、不要なら無視

#### `sto-d6c06b1f48` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="cefini", name="セフィーヌ 公式オンラインショップ", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="セフィーヌ 公式オンラインショップ エポスポイント 13 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-d6c06b1f48`、不要なら無視

#### `sto-a4c93c8432` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="charles-keith", name="CHARLES & KEITH 公式オンラインストア", category="ファッション"`
- confidence: 0.90
- 評価: `evidenceQuote="CHARLES & KEITH 公式オンラインストア エポスポイント 13 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-a4c93c8432`、不要なら無視

#### `sto-c43e265f22` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="cosme-shopping", name="@cosme SHOPPING", category="美容"`
- confidence: 0.90
- 評価: `evidenceQuote="@cosme SHOPPING エポスポイント 4 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-c43e265f22`、不要なら無視

_他 41 件は省略 (sources/proposed-migrations.json を参照)_

</details>

### 🟡 lowConfidence (9 件)
理由: Gemini の評価で confidence < 0.9。エビデンス不明瞭・推測混入の疑い。

<details><summary>展開</summary>

#### `mem-2cbf949363` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-2x", storeId="jcb-gift-card"`
- confidence: 0.81
- 評価: `evidenceQuote="JCBギフトカード公式 オンライン注文 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-2cbf949363`、不要なら無視

#### `mem-29472eb192` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-2x", storeId="jcb-gift-card"`
- confidence: 0.81
- 評価: `evidenceQuote="JCBギフトカード公式 オンライン注文 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-29472eb192`、不要なら無視

#### `mem-4bacaad273` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-2x", storeId="seijo-ishii"`
- confidence: 0.81
- 評価: `evidenceQuote="成城石井・成城石井.com（オンラインショップ）・Le Bar a Vin 52 AZABU TOKYO 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-4bacaad273`、不要なら無視

#### `mem-008598973a` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-2x", storeId="seijo-ishii"`
- confidence: 0.81
- 評価: `evidenceQuote="成城石井・成城石井.com（オンラインショップ）・Le Bar a Vin 52 AZABU TOKYO 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-008598973a`、不要なら無視

#### `mem-d04da7186c` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-2x", storeId="takashimaya-group-shopping-center"`
- confidence: 0.81
- 評価: `evidenceQuote="タカシマヤグループのショッピングセンター・レストラン街 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-d04da7186c`、不要なら無視

#### `mem-2ae1443eef` — `addRecord/memberships` from `jcb-jpoint-partners`
- 内容: `programId="prog-jcb-jpoint-gold-2x", storeId="takashimaya-group-shopping-center"`
- confidence: 0.81
- 評価: `evidenceQuote="タカシマヤグループのショッピングセンター・レストラン街 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- mem-2ae1443eef`、不要なら無視

#### `sto-a50fa8bba4` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="jcb-gift-card", name="JCBギフトカード公式 オンライン注文", category="ネット通販"`
- confidence: 0.81
- 評価: `evidenceQuote="JCBギフトカード公式 オンライン注文 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-a50fa8bba4`、不要なら無視

#### `sto-a75e23fdb7` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="seijo-ishii", name="成城石井", category="スーパー"`
- confidence: 0.81
- 評価: `evidenceQuote="成城石井・成城石井.com（オンラインショップ）・Le Bar a Vin 52 AZABU TOKYO 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-a75e23fdb7`、不要なら無視

#### `sto-969f2cd19a` — `addRecord/stores` from `jcb-jpoint-partners`
- 内容: `id="takashimaya-group-shopping-center", name="タカシマヤグループのショッピングセンター・レストラン街", category="百貨店"`
- confidence: 0.81
- 評価: `evidenceQuote="タカシマヤグループのショッピングセンター・レストラン街 2 倍"`
- 対応案: 取り込むなら `npm run sync:approve -- sto-969f2cd19a`、不要なら無視

</details>

### 🟠 idCollision (19 件)
理由: 新規追加だが既存 ID またはストア名と衝突。重複の可能性あり。

<details><summary>展開</summary>

#### `pro-159fc7f359` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-5x", name="たまるマーケット (5倍)", scope="member-stores", rate=0.025, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 5倍 (総倍率、EPOS 基本 0.5% × 5 = 実効 2.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="KEYUCA オンラインショップ エポスポイント 5 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-159fc7f359`、不要なら無視

#### `pro-7f13efa08f` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-6x", name="たまるマーケット (6倍)", scope="member-stores", rate=0.03, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 6倍 (総倍率、EPOS 基本 0.5% × 6 = 実効 3.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="Trip.com（ホテル）エポスポイント 6 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-7f13efa08f`、不要なら無視

#### `pro-8d11b6f8f7` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-7x", name="たまるマーケット (7倍)", scope="member-stores", rate=0.035, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 7倍 (総倍率、EPOS 基本 0.5% × 7 = 実効 3.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="SHEIN エポスポイント 7 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-8d11b6f8f7`、不要なら無視

#### `pro-fc5cdce822` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-9x", name="たまるマーケット (9倍)", scope="member-stores", rate=0.045, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 9倍 (総倍率、EPOS 基本 0.5% × 9 = 実効 4.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。ゴールド プラチナ会員はさらに+1倍 (計13倍)になる場合があります。"`
- confidence: 0.90
- 評価: `evidenceQuote="DHCオンラインショップ エポスポイント 9 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-fc5cdce822`、不要なら無視

#### `pro-41218b6a76` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-10x", name="たまるマーケット (10倍)", scope="member-stores", rate=0.05, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 10倍 (総倍率、EPOS 基本 0.5% × 10 = 実効 5.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。ゴールド プラチナ会員はさらに+1倍 (計11倍)になる場合があります。"`
- confidence: 0.90
- 評価: `evidenceQuote="【海外・国内ホテル】旅行予約のエクスペディア エポスポイント 10 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-41218b6a76`、不要なら無視

#### `pro-b54eb62188` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-13x", name="たまるマーケット (13倍)", scope="member-stores", rate=0.065, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 13倍 (総倍率、EPOS 基本 0.5% × 13 = 実効 6.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="資生堂オンラインストア エポスポイント 13 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-b54eb62188`、不要なら無視

#### `pro-3db70efd78` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-14x", name="たまるマーケット (14倍)", scope="member-stores", rate=0.07, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 14倍 (総倍率、EPOS 基本 0.5% × 14 = 実効 7.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="NARS公式オンラインショップ エポスポイント 14 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-3db70efd78`、不要なら無視

#### `pro-52783607d6` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-17x", name="たまるマーケット (17倍)", scope="member-stores", rate=0.085, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 17倍 (総倍率、EPOS 基本 0.5% × 17 = 実効 8.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。ゴールド プラチナ会員はさらに+1倍 (計18倍)になる場合があります。"`
- confidence: 0.90
- 評価: `evidenceQuote="メゾン マルジェラ フレグランス公式オンラインストア エポスポイント 17 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-52783607d6`、不要なら無視

#### `pro-9e57013460` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-19x", name="たまるマーケット (19倍)", scope="member-stores", rate=0.095, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 19倍 (総倍率、EPOS 基本 0.5% × 19 = 実効 9.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="IPSA 公式サイト エポスポイント 19 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-9e57013460`、不要なら無視

#### `pro-c201b9833d` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-21x", name="たまるマーケット (21倍)", scope="member-stores", rate=0.105, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 21倍 (総倍率、EPOS 基本 0.5% × 21 = 実効 10.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="e87.com（千趣会 イイハナ）エポスポイント 21 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-c201b9833d`、不要なら無視

#### `pro-95dfd4ebfb` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-25x", name="たまるマーケット (25倍)", scope="member-stores", rate=0.125, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 25倍 (総倍率、EPOS 基本 0.5% × 25 = 実効 12.5%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="洋服の青山オンラインストア エポスポイント 25 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-95dfd4ebfb`、不要なら無視

#### `pro-d25ca5de81` — `addRecord/programs` from `epos-tamaru-market`
- 内容: `id="prog-epos-tamaru-30x", name="たまるマーケット (30倍)", scope="member-stores", rate=0.15, currencyId="epos", cardIds=["epos-card","epos-gold","epos-platinum"], bonusType="primary", channel="online", description="たまるマーケット経由で 30倍 (総倍率、EPOS 基本 0.5% × 30 = 実効 15.0%)", entryUrl="https://tamaru.eposcard.co.jp/", conditions="たまるマーケット経由での購入が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="Adobe Creative Cloud エポスポイント 30 倍"`
- 判定詳細: 新規 program (extractor=epos-tamaru は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-d25ca5de81`、不要なら無視

#### `pro-3e40282d1f` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-5x", name="J-POINT パートナー (5倍)", scope="member-stores", rate=0.03, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="洋服の青山 5 倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-3e40282d1f`、不要なら無視

#### `pro-ec14c2c096` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-5x", name="J-POINT パートナー (Gold 5倍)", scope="member-stores", rate=0.025, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="洋服の青山 5 倍"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-ec14c2c096`、不要なら無視

#### `pro-157596bab6` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-10x", name="J-POINT パートナー (10倍)", scope="member-stores", rate=0.055, currencyId="j-point", cardIds=["jcb-w"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="Uber 10 倍 プレミアム でおトク"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-157596bab6`、不要なら無視

#### `pro-5f06a0e2fb` — `addRecord/programs` from `jcb-jpoint-partners`
- 内容: `id="prog-jcb-jpoint-gold-10x", name="J-POINT パートナー (Gold 10倍)", scope="member-stores", rate=0.05, currencyId="j-point", cardIds=["jcb-gold"], bonusType="primary", entryUrl="https://j-pointpartner.jcb.co.jp/search", conditions="J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。"`
- confidence: 0.90
- 評価: `evidenceQuote="Uber 10 倍 プレミアム でおトク"`
- 判定詳細: 新規 program (extractor=jcb-jpoint は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-5f06a0e2fb`、不要なら無視

#### `pro-51a055fe7e` — `addRecord/programs` from `smbc-vpoint-up`
- 内容: `id="prog-smbc-touch-conveni", name="対象店舗でスマホのタッチ決済・モバイルオーダー", scope="member-stores", rate=0.075, currencyId="v-pt", cardIds=["smbc-v","olive"], paymentAppId="pa-visa-touch", bonusType="addOn", description="対象のコンビニ・飲食店でスマホのVisa/Mastercardタッチ決済またはモバイルオーダー利用で+7.5%還元", officialUrl="https://www.smbc.co.jp/kojin/vpoint-up/", conditions="対象店舗でスマホのVisaのタッチ決済・Mastercardタッチ決済またはモバイルオーダーを利用。カード現物のタッチ決済、iD、カードの差し込み、磁気取引は対象外。一部ポイント加算対象とならない店舗および指定のポイント還元にならない場合あり。一定金額を超えるとタッチ決済ではなく挿入決済となりポイント加算対象外となる場合あり。"`
- confidence: 0.81
- 評価: `evidenceQuote="B 対象店舗でスマホのVisaのタッチ決済・Mastercard®タッチ決済またはモバイルオーダーを利用＋7.5％還元"`
- 判定詳細: 新規 program (extractor=ongoing-program は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-51a055fe7e`、不要なら無視

#### `pro-86fc392d18` — `addRecord/programs` from `smbc-vpoint-up`
- 内容: `id="prog-smbc-family-point", name="家族ポイント", scope="all-stores", rate=0.05, currencyId="v-pt", cardIds=["smbc-v","olive"], bonusType="addOn", description="家族ポイントに6人以上登録でVポイント+5%還元", officialUrl="https://www.smbc.co.jp/kojin/vpoint-up/", conditions="家族ポイントに6人以上登録（主会員1人＋従会員5人以上）が条件。登録されるご家族は、対象の三井住友カードに入会した本会員さまであり、当サービスに登録することが条件。最大5%まで。"`
- confidence: 0.81
- 評価: `evidenceQuote="C 家族ポイントに6人以上登録（主会員1人＋従会員5人以上）＝＋5％還元"`
- 判定詳細: 新規 program (extractor=ongoing-program は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-86fc392d18`、不要なら無視

#### `pro-d6f5ef8363` — `addRecord/programs` from `smbc-vpoint-up`
- 内容: `id="prog-olive-selectable-bonus", name="Oliveアカウント 選べる特典", scope="all-stores", rate=0.01, currencyId="v-pt", cardIds=["olive"], bonusType="addOn", description="Oliveアカウントの選べる特典で「Vポイントアッププログラム＋1％」を選択すると+1%還元", officialUrl="https://www.smbc.co.jp/kojin/vpoint-up/", conditions="Oliveアカウントの選べる特典で「Vポイントアッププログラム＋1％」をご選択。Olive プラチナプリファードのお客さまは、選べる特典で「Vポイントアッププログラム＋1％」を2つ選択した場合、＋2％還元。"`
- confidence: 0.81
- 評価: `evidenceQuote="Oliveアカウントの選べる特典 ＋1％ Oliveアカウントの選べる特典 で「Vポイントアッププログラム＋1％」をご選択"`
- 判定詳細: 新規 program (extractor=ongoing-program は campaign 以外)
- 対応案: 取り込むなら `npm run sync:approve -- pro-d6f5ef8363`、不要なら無視

</details>

### 🟠 unknownCategory (語彙外カテゴリ) (1 件)
理由: 新規店舗の category が店舗カテゴリの語彙 (`src/state/seed-categories.ts`) に無い、または未設定。語彙外の店は自動追加されない (chain-promote 等の昇格の対象にもならない)。既存語彙の表記揺れなら seed-categories.ts の `EXTRACTED_CATEGORY_ALIASES` に alias を、新しい業態なら `STORE_CATEGORIES` に語彙を足す PR を出す (次回 cron から再判定される)。この項目を `npm run sync:approve` でそのまま承認すると、seed 契約 (store の category は語彙内) で CI が落ちる。取り込むなら category を語彙内に直して手書き seed へ。

<details><summary>展開</summary>

#### `sto-5cefcbd8ec` — `addRecord/stores` from `epos-tamaru-market`
- 内容: `id="adobe-creative-cloud", name="Adobe Creative Cloud", category="ネットサービスのみ"`
- confidence: 0.90
- 評価: `evidenceQuote="Adobe Creative Cloud エポスポイント 30 倍"`
- 対応案: 表記揺れなら `src/state/seed-categories.ts` の EXTRACTED_CATEGORY_ALIASES に alias を、新しい業態なら STORE_CATEGORIES に語彙を足す PR を出す (次回 cron で再判定)。この項目を sync:approve でそのまま承認すると seed 契約で CI が落ちる。不要なら無視

</details>

## 操作
- **取り込みたい項目がある場合 (半自動)**: ローカルでこのブランチを checkout し、`npm run sync:approve -- <ID> [<ID> ...]` を実行 (ID は各項目見出しの先頭)。seed-additions.ts への反映・queue からの除去・REVIEW_QUEUE.md の再生成まで自動。`npm run sync:approve -- --list` で一覧表示。実行後 `npm test && npm run build` を確認して commit
- 🔴 untargetedProgram / campaignConditional / campaignRateCeiling / targetMismatch / storeNameMismatch は承認すると record がそのまま全額に乗るため原則見送り。承認には `--accept-risk` が必要
- このまま **merge** すると、要レビュー項目を読み込んだ証拠として記録されるだけ (実体 seed 変更はなし)
- 手動キュレートしたい場合は、このブランチに追加 commit してから merge
- 不要なら **close** で次週まで保留