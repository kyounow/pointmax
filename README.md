# PointMax

クレジットカード・ポイントカード・決済アプリの還元と、ポイント交換ルートを横断して
**「この店でいくら使うなら、どの組み合わせが一番お得か」** を即座に答えるローカル動作のPWAです。

[**▶ ブラウザで開く（GitHub Pages）**](https://kyounow.github.io/pointmax/)

スマホでアクセス → ホーム画面に追加すると、ネイティブアプリのように使えます。
データは端末の `localStorage` に保存され、サーバには送信されません。

---

## 主な機能

### 計算（メイン画面）
- **店舗・金額・目標通貨（例: JALマイル）** を選ぶだけ。
- 保有カードごとに最終取得量を比較表示。**支払方法はユーザーが選ばずに自動で最良が選ばれます**
  （楽天Pay／d払い／PayPay／au PAY／メルペイ／Visaタッチ／QUICPay／iD／通常クレカ決済を内部で全部評価）。
- 還元は **BenefitProgram** という単一モデルに統合。1 つのプログラムが
  カード／ポイントカード／決済アプリのいずれかに紐づき、`primary`（排他・最高採用）と
  `addOn`（上乗せ）の 2 種類で重ね合わせを表現する。
- 各プログラムは適用範囲 **`scope`** を必須で持つ（v6）。`all-stores` = 全店適用
  （決済アプリのベース/上乗せ系。membership を持ってはいけない）、`member-stores` =
  StoreProgramMembership のある店舗のみ。以前の「membership 行数からの推論」は廃止。
- 支払アプリは紐付けカード別の還元率を持てる（例: d払い × dカード = 1%、d払い × 他社 = 0%）。
- カードからのチャージ式アプリ（楽天Pay/d払い/PayPay 等）と直接決済（Visaタッチ/iD等）は
  主従関係をUIで切り替え表示。例：「**[d払い] の残高にカードからチャージ、dカード**」
- 店舗別の **ポイントカード二重取り／三重取り** にも対応（複数提示可能な店舗）。
- 店舗 select は **文字列検索 + カテゴリ絞り込み** で多数の店舗から素早く選択可能。
- **店頭クイック入力（PR-3a）**: 店舗 select の上に **直近に計算した店舗チップ**（新しい順・
  現選択は active、`usageStats.getRecentStoreIds` が `calcEvents` から抽出。履歴が無ければ
  `storeSelections` 上位で fallback）、金額欄に **プリセットチップ**（500 / 1,000 / 3,000 /
  5,000 / 10,000 円）をワンタップで反映。チップ行は 1 行横スクロールで高さを固定する。
- **通知バナーの積層ガバナンス（PR-3a / N-1、PR-4b で 2 枠追加）**: 計算画面上部の通知系
  バナーは **常時 1 枚まで**。優先度
  `オンボーディング > アプリ更新(SW) > 更新通知(SEED_VERSION) > 自動反映(Undo) > 今日バナー`
  で最初に表示可能な 1 種だけを `BannerSlot` が描画する（オンボーディング枠には下記
  チェックリストを描画し、他の通知系は抑制する）。ポイントカード併用／未使用カード有効化
  バナーは "結果付随" として結果リスト直上に別勘定で置き、通知枠とは競合しない。モバイル
  実機で「店舗・金額・結果 1 位の折り畳みヘッダ」が初期ビューポートに収まることを条件とする。
- **マスタ更新の自動反映＋事後 Undo（PR-4b / UX-5）**: 週次 cron の seed 差分は、**安全な週**
  （追加・非破壊の内容更新のみ）なら起動時に**自動反映**し、フルスクリーンの `SyncUpdateModal`
  を出さない。反映後は `BannerSlot` の自動反映枠に「マスタを自動更新しました（N 件）［詳細］
  ［元に戻す］✕」を出す（`[詳細]`→更新履歴、`[元に戻す]`→PR-4a のスナップショット復元、
  `✕`→同一 digest を既読化して再表示しない）。**削除・scope 変更・SEED_VERSION の版更新**を
  含む週だけ従来モーダルにフォールバックし、「削除や大きな変更を含むため確認をお願いします」を
  添えてユーザー確認を挟む。安全判定は純関数 `isAutoApplySafe`（`src/domain/autoApplySafety.ts`）。
  自動反映も従来モーダルもオフライン時は抑制する（`useOnline`）。
- **アプリ更新通知（PR-4b / UX-8(3)）**: `vite-plugin-pwa` の `autoUpdate` 構成では Service
  Worker が裏で新版に入れ替わる。ビルドごとに変わる識別子 `__BUILD_ID__`（vite `define` 注入）を
  独立キー `pointmax:build-id:v1` に記録し、**前回起動時と異なれば「更新後の初回起動」**と判定して
  「アプリを新しいバージョンに更新しました」を通知枠（最優先）に 1 回出す。`✕` で当該ビルドを
  記録し再表示しない（`src/state/swUpdateNotice.ts`。schema-reset 非依存の独立キー）。
- **オンボーディングチェックリスト（PR-3c / ONB-1）**: 非ブロッキングな 2 ステップ案内を
  `BannerSlot` の最優先枠に描画する。`① 保有カードを選ぶ`（enabled カードが 1 枚以上）/
  `② よく貯める通貨を選ぶ`（preferredCurrencyIds 非空）に ✓／未の視覚状態を持ち、各未完了
  ステップにウォレット／通貨画面への遷移ボタンを出す。**両方完了で自動的に消え**、`✕` の
  **手動クローズ**は persist 外の独立キー `pointmax:onboarding-dismissed:v1` に保存して以後は
  未完了でも再表示しない（`usageStats` と同型の schema-reset 非依存キー）。表示条件は
  `(① or ② 未完了) かつ 手動クローズしていない`。
- **対象外カードの理由コード＋次アクション導線（PR-3c / UX-7）**: `rankCards` は到達不能
  （`reachable=false`）カードに `unreachableReason`（`no-path` = 交換ルート不在 / `currency-blocked`
  = `currencyGating` で経路上の通貨が「使わない」設定）を付与する（純粋な戻り値拡張・schema 影響
  なし）。結果カードは折り畳みヘッダに短い理由バッジ（`ルート未登録` / `通貨OFF`）、展開ビューに
  次アクション CTA（`no-path` → 交換ルート画面 / `currency-blocked` → ウォレット/ポイントカード）を出す。
  CTA 遷移先の `EdgesScreen`（lazy, ~190KB）は計算画面マウント後のアイドル時に先読みする。
- **計算フォームの同日内復元（PR-3d / UX-6）**: 金額・優先通貨タブ（＋任意で店舗）を
  独立キー `pointmax:calc-form:v1` に保存し、**同じ暦日のうちだけ**マウント時に復元する。
  保存形は `{ date: "YYYY-MM-DD"(ローカル), amount, activeCurrencyId, storeId? }`。日付判定は
  `useToday` と同じローカル暦日基準（`localDateKey`）で、**保存日が今日と一致する場合のみ**採用し、
  翌日以降は無視（キーは次の書き込みで上書き）。復元にはガードがあり、`activeCurrencyId` は
  **優先通貨リストに現存する**場合のみ／`storeId` は**実在する**場合のみ採用する（外れていれば既定挙動）。
  `sessionStorage` は Android PWA の kill で消えるため不採用。`usageStats` / `onboardingDismissed` と
  同型の schema-reset 非依存キーで、read/write 失敗は try/catch で握りつぶす（送信は一切しない）。

### 優先通貨（v4.0.0）
- 「普段ためたい通貨」を **順序付きリスト** で登録（CurrenciesScreen で ↑↓× 管理）。
- Calculator は **通貨タブ切替** で、選んだ対象通貨ごとの最終取得量を単一表示。
- 優先通貨が未設定の場合は従来どおり対象通貨 select にフォールバック。

### 円換算（目安）タブ（PR-5a / DB-2）
- 通貨タブの末尾（優先通貨未設定時は対象通貨 select の選択肢）に **`¥ 円換算`** を追加。
  目標通貨への交換ルートが無いカードも横並び比較できる **fallback ビュー**。
- **交換 path は使わない**。各カードで貯まる通貨を、その通貨の円換算目安
  （`Currency.yenValue` = 1 単位 ≒ 円）で直接評価する（`earnedAmount × yenValue`）。
  決済アプリの上乗せ（addOn）も同様に円評価して加算。金額に **`≈` プレフィクス**と
  **`目安` バッジ**（muted）を付け、path 由来の正確値と視覚的に区別する。
- 貯まる通貨に `yenValue` が無い（マイル/ホテル系など価値が使い方で大きく変わる通貨は
  **あえて未設定**）カードは「目安値未設定」で対象外表示。
- **yenValue 規約**: `path`（交換ルート）が存在する通貨間は、edge の
  `rate × yenValue(to) / yenValue(from)` が概ね 1 付近（`[1/2.5, 2.5]`）に収まる。
  この契約は `seed.test.ts`（`findYenRatioViolations`）で seed の全 edge をガードする
  （import 検証には入れない = ユーザー編集 edge は縛らない）。
- **自分の換算値**: CurrenciesScreen の「1pt≒円 (目安)」列を編集すると上書きできる
  （空欄で seed 目安値に戻る）。上書きは Currency 行本体ではなく **`store.yenValueOverrides`**
  （`currencyId → 円`、user-owned な永続キー）に保存するため、`syncFromUrl` / `importJson` の
  currencies 全置換でも消えずに残る。円換算タブは `override ?? seed yenValue` を使う。

### レジで使えない決済のワンタップ除外 (PR-2)
- 「1位提示の決済がこの店では使えなかった」(AMEX 非対応の個人店など) をレジで踏んだとき、
  結果カード展開ビューの「この決済（◯◯）は使えなかった」ボタンで**その店 × その決済**を
  ワンタップ除外できる。除外された決済は当該店の候補から外れ、`rankCards` が**他の決済で
  最良を再計算**する (= 次善の決済/カードが繰り上がる)。
- スコープは**店舗 × 決済のペア単位** (`store.excludedStorePayments: { storeId, paymentAppId, excludedAt }[]`)。
  グローバル除外だと 1 店の事故でその決済が全店から消えるため。除外は結果から隠さず、対象外
  グループに「〔◯◯〕除外済 — タップで戻す」チップで可視化し、誤タップの 1 タップ復帰と、店側が
  対応を始めた時の自己修復を両立する (`restoreStorePayment`)。汎用ダミー店 (`general`) / 店舗
  未選択では除外ボタンを出さない (汎用店への除外は無意味)。
- **保護**: `excludedStorePayments` は `yenValueOverrides` 等と同じ user-owned な永続キーで、
  `syncFromUrl` / `importJson` の全置換 set() ブロックが一切触らないため、週次の公式同期・
  インポートで消えない (`preferenceMerge.ts` の per-user 設定保護と同じ動機。store.test に保護テスト)。
- 有名チェーンの非対応情報を seed に手キュレートするのは**恒久不採用** (腐る deny 情報で「使えるのに
  出ない」逆事故を起こすため)。除外はユーザー自身の記録に限る。

### キャンペーン（期間限定ルール）
- 開始日・終了日付きに加え、**毎月の日にち指定**（`recurringDays`、例:「5と0のつく日」=
  [5,10,15,20,25,30]）と**曜日指定**（`recurringWeekdays`、0=日〜6=土。例:「毎週日曜」= [0]）の
  BenefitProgram を表現できる（全条件は AND 結合）。
- 通常プログラムと共存し、期間中のみ有効化（`primary` は最高 rate を採用、`addOn` は上乗せ）。
- 計算結果にキャンペーンバッジを表示。**特典・キャンペーン**タブ（`#benefits`、PR-2c で
  旧「プログラム」＋「キャンペーン」を統合）の単一フィルタ行で「常設／期間限定(有効中)／
  期限切れ／未来開始／ポイントカード提示／決済アプリ／opt-in 特典」を件数バッジ付きで切替。
  「期間限定(有効中)」は**終了が近い順**に並び、終了日に「あと N 日」カウントダウンを表示。
  計算画面の今日バナーにも「⌛ まもなく終了 N 件」(7 日以内) が出る。
- 「今日」の判定は日付が変わると自動で更新される（開きっぱなしの PWA でも
  キャンペーンの開始・終了・「5のつく日」が翌日に正しく切り替わる）。
- 公式分はマスターデータ (seed + 週次自動同期) で管理。加えて**アプリ内の手動登録フォーム**
  （特典・キャンペーンタブ下部の「キャンペーンを手動登録」）から、見つけたキャンペーンを
  「発動の種類（決済アプリ/ポイントカード提示/クレカ）× 還元率 × 期間 × 曜日限定 ×
  **複数店舗まとめて選択**」で自分のデータとして一括登録できる（自作分のみ削除可、公式分は保護）。

### 交換ルート（グラフ表示）
- 通貨ノード間のレートを **@xyflow/react** で図示。
- **ルート検索**: 起点／終点通貨を選ぶと `bestPath()` で最効率ルートを表示。
  グラフとルート検索は双方向連動し、選択 path を中心に直線レイアウトへ自動再配置。
- EdgeDetailPanel は閲覧／編集の 2 段階（誤編集防止）。
- v4.0.0 でオリコポイント／三菱UFJグローバルポイントと公式交換 edge を追加。

### マスタデータ管理
- 起動時に GitHub Pages 上の公式マスタ JSON (`master.json`) と差分マージ可能。
- ユーザー独自のカード／プログラム／店舗を保持したまま「新しいマスタの追加分だけ取り込み」できる
  **add-only マージ**。プログラム (特典・キャンペーン) は加えて、**未編集の公式由来コピー**に限り
  内容更新 (還元率改定・期間延長) と終了キャンペーンの削除 (tombstone) も伝播する
  (ユーザーが編集したものは従来どおり保護され、更新も削除もされない)。
- 公式由来データをユーザーが編集すると「公式」バッジが外れ、「公式に戻す」で復元可能
  （substantive な編集のみ判定、`src/state/userModified.ts`）。
- 「サンプル投入」「ローカルデータ初期化」「JSONエクスポート/インポート」は設定画面から。
- **破壊的操作の直前スナップショット＋「直前の状態に戻す」（PR-4a / N-4）**: インポート・
  ローカルデータ初期化・URL 同期の全上書き・マスタ更新の反映の**直前**に、その時点の
  persist state を独立キー `pointmax:snapshot:v1` に **1 世代だけ**自動退避する
  (`src/state/stateSnapshot.ts`)。設定「データ管理」の「直前の状態に戻す」から 1 手だけ
  巻き戻せる (`trigger` に応じて「インポート前 / 初期化前 / URL同期前 / マスタ更新前」を表示)。
  マスタ更新前スナップ (`seed-apply`) は PR-4b の自動反映バナー「元に戻す」の巻き戻し元も兼ねる。
  復元は persist キー (`pointmax-v08-store`) へ `{ state, version }` を直書き→`location.reload()`
  で反映し、成功時にスナップショットを消費する。**スナップショット対象は persist state のみ**で、
  独立キー群 (`usage-stats` / `calc-form` / `onboarding-dismissed`) は含めない (巻き戻しで消さない)。
  スナップショットの `schemaVersion` が現行の `PERSIST_SCHEMA_VERSION` と異なる場合は復元を拒否し
  (ボタン disabled + 理由表示)、不整合 state を作らない。quota 等の保存失敗は握りつぶし、
  **本体の破壊的操作は止めない** (`usageStats` / `calcFormDraft` と同型の schema-reset 非依存キー)。
- **マスタ更新履歴** (設定画面内セクション、旧「更新履歴」タブ): 週次 cron で自動マージ
  された変更を時系列で閲覧 (`sources/SYNC_HISTORY.json` を bundle 同梱、最新 104 件、
  GitHub commit/PR への動線あり)。最新 1 件は設定上部に常時プレビュー表示し、全履歴は
  折りたたみで展開する。`#settings/history` で直接開ける (旧 `#sync-history` からも自動
  リダイレクト)。自動マージが 0 件で要レビューのみの週も、件数と理由内訳 (`reviewStats`)
  を記録する。

### マスタ自動アップデート
- `sources/registry.yaml` に各カード・ポイント・決済アプリの公式 URL を登録。
- `npm run sync:fetch -- <id>` で Gemini に渡し、構造化 JSON を `sources/extracted/<id>.json` に出力。
- キャンペーン一覧が**索引ハブ** (実データが個別詳細の子ページ) のソースは
  registry に `crawl: { mode: index, maxChildren: N }` を設定すると 2 段階クロール:
  1 段目 (`campaign-index` prompt) で詳細ページ URL を列挙 → 2 段目で各子ページを
  campaign extractor で抽出 → 1 つの extracted JSON に統合 (後段 propose は従来同形)。
  子 URL は同一ドメインの http(s) のみ・最大 10 件にガード。
- `npm run sync:propose` で現在 seed と diff、`autoApplicable`/`needsReview` に分類:
  - confidence ≥ 0.9 / rate 変動 ±10pp 以内 / 倍率 0.5x〜2x / 既存と衝突なし → auto
  - それ以外 (excludedCategory / lowConfidence / referenceChange / unsupportedDateClaim 等) → review
- `npm run sync:apply` で autoApplicable を `src/state/seed-additions.ts` に書き出し。
- Gemini が schema 外プロパティを混ぜた場合も、違反アイテムのみ除去して残りを救済
  （ソース全体のクラッシュを防ぐ段階的降格）。

### ナビゲーション（PR-2e）
- タブを 3 グループに分類（`src/ui/nav/navConfig.ts`）: **daily**（計算／特典・キャンペーン／
  交換ルート／ウォレット）／ **data**（通貨／店舗／データハブ）／ **meta**（設定）。
- **デスクトップ**: daily 4 タブを横並び + 「データ ▾」ドロップダウン（通貨／店舗、menu button
  パターン: `aria-haspopup="menu"` / Esc で閉じてトリガーへフォーカス戻し / 外側クリックで閉じる）
  + 設定タブ。
- **モバイル**: 下部固定タブバー 4 枠（🧮計算 / 🎁特典 / 📚データ / ⚙設定）。「データ」枠は
  ハブ画面 `#data`（`DataHubScreen`）へ遷移し、ウォレット／交換ルート／通貨／店舗を件数バッジ付き
  カードで一覧。data 系（ウォレット／交換ルート／通貨／店舗／ハブ）表示中は「データ」枠が active。
  交換ルート表示中はグラフ操作域確保のため下部バーを自動で隠す。
- **ARIA（UX-8(1))**: メインナビは `role=tablist/tab/tabpanel` を使わず（tabpanel を伴わない
  orphan ARIA を排除）、現在タブに `aria-current="page"` のみを付与。ウォレットのセクション切替と
  計算の目標通貨切替も同方針（`aria-current`）に統一。

### モバイルUX
- レスポンシブテーブル（PC=表 / モバイル=カード）と編集モード分離（誤操作防止）。
- 下部固定タブバーで主要画面を切替（PR-2e でハンバーガードロワーから移行）。
- 計算結果は折り畳み式。
- 画面状態は URL ハッシュ（`#calculator` / `#settings/history` 等）に反映され、
  リロードしても画面を維持、ブラウザ／PWA の戻る・進むでタブ間を移動できる。
- **既知の確認残**: モバイルでソフトキーボード表示時に、下部固定タブバーが金額 input に
  被る可能性（`visualViewport` 対応の要否）は実機依存のため未検証。実機で input 遮蔽が
  起きる場合は `visualViewport.resize` でバーを退避させる対応を検討する。

---

## アーキテクチャ

| レイヤ | スタック |
|---|---|
| UI | React 19 + TypeScript + Vite + @xyflow/react |
| 状態管理 | Zustand + persist (`localStorage`) |
| ドメインロジック | `src/domain/` 配下に純関数で集約（テスト容易） |
| グラフ最適化 | Bellman-Ford 派生の **最大積パス** (`bestPath.ts`) |
| 自動同期 | `scripts/sync/*` ＋ Gemini API (`@google/genai`) |
| テスト | Vitest（**1061 ケース / 65 ファイル**） |
| PWA | vite-plugin-pwa（precache + service worker） |
| デプロイ | GitHub Actions → GitHub Pages（main push で自動） |

### ドメインの構造

```
src/domain/
  types.ts            # 全エンティティの型 (Card, Currency, Store, BenefitProgram,
                       #   StoreProgramMembership, ConversionEdge, PointCard, PaymentApp ...)
  programEvaluator.ts # ★ 還元評価の中核。BenefitProgram を評価し primary/addOns を返す
  rankCards.ts        # loyalty + paymentApp 評価を統合しカード別ランキング生成
  loyalty.ts          # ポイントカード提示分（重取り）の最良を返す
  paymentApp.ts       # PaymentApp 評価アダプタ (programEvaluator へ委譲)
  bestPath.ts         # 通貨間の最大積交換ルートを探索
  mergeSeed.ts        # add-only マージ（ユーザー編集保護）
  migrations.ts       # 既存レコードへの宣言型マイグレーション基盤
  ruleActiveAt.ts     # キャンペーン期間 (validFrom/validTo/recurringDays) のアクティブ判定
  noteParser.ts       # notes から条件チップ (入会/上限/除外/期間) を抽出
  cardLabel.ts        # カード名 + グレード表示整形
  currencyKind.ts     # 通貨種別 (point/mile/cashlike) のスタイル
  formatNum.ts        # 数値フォーマッタ
  groupBy.ts          # 汎用グルーピング
```

> 旧 `StoreRule` / `LoyaltyRule` / `PaymentApp.cardSpecificBonusRates` は v3 で
> **BenefitProgram + StoreProgramMembership** に統合済み。`StoreRule` 型は物理削除、
> `LoyaltyRule` 型も v6 (schema v6 トレイン PR-1e) で物理削除した。手動の
> 「店舗×ポイントカード提示還元」は store の `addUserLoyaltyProgram` が
> BenefitProgram (`scope:"member-stores"` / `pointCardId`) + membership に変換して
> atomic に追加する (旧 `addLoyaltyRule` の後継)。master.json も `loyaltyRules` 欄を持たない。

### Seed データの構造

```
src/state/
  seed.ts                       # SEED_VERSION / SEED_CHANGELOG / seed() 関数
  persist-versions.ts           # PERSIST_SCHEMA_VERSION + SCHEMA_MIGRATIONS
  store.ts                      # Zustand store (state mutation / selector)
  userModified.ts               # 「公式」バッジの substantive 編集判定 (純関数)
  seed-data-currencies.ts       # 通貨マスタ
  seed-data-cards.ts            # Card / PointCard / PaymentApp
  seed-data-stores.ts           # Store マスタ (提示還元は BenefitProgram に統合)
  seed-data-programs.ts         # BenefitProgram / StoreProgramMembership
  seed-data-edges.ts            # 通貨間交換レート
  seed-additions.ts             # 自動同期で追加されたデータ (auto-generated)
  seed-overrides.ts             # 既存 program への部分上書き (PROGRAM_OVERRIDES) の型 + 適用関数
  seed-blocklist.ts             # 自動同期で除外したい storeId
  seed-category-aliases.ts      # カテゴリ統合マップ (旧名 → 新名)
```

`seed()` が組み立てる現在のマスタ（手キュレート + 自動同期分の合算）:

| エンティティ | 件数 |
|---|---|
| 通貨 (currencies) | 22 |
| カード (cards) | 24 |
| ポイントカード (pointCards) | 7 |
| 決済アプリ (paymentApps) | 11 |
| 店舗 (stores) | 267（手キュレート + 自動同期分） |
| BenefitProgram (programs) | 47 |
| StoreProgramMembership (memberships) | 383 |
| 交換エッジ (edges) | 60 |

#### 還元の「有効化」規約（opt-in vs 都度登録）

BenefitProgram の付与前提は 2 系統で表現する（R1 規約: seed / master は `enabled` などの per-user preference キーを出荷しない）:

- **有料オプション / 事前選択制の特典** = `optIn: true` で出荷（既定 OFF）。ユーザーが「使う」（`enabled: true`）を選んで初めて還元計算に載る。全 `cardIds` 保有者に自動加算すると未加入・未選択者への過大計算になるため。
  - 例: ショッピングマイル・プレミアム加入前提の JAL カード特約店2倍（普通カード `jal-card`）、Olive「選べる特典」+1%、エポス「選べるポイントアップ」2倍。
- **無料の都度登録系**（登録すれば誰でも同率）= `conditions` チップ + `entryUrl` で表現し、`optIn` は付けない（計算には常時載せ、UI で「要エントリー / 要登録」を促す）。
  - 例: JCB J-POINT パートナーの店ごとポイントアップ登録、楽天「5と0のつく日」のエントリー。

### 自動同期パイプライン

```
scripts/sync/
  fetch-source.ts      # 1 ソース取得 (Gemini URL Context Tool + pre-fetch fallback + retry)
  fetch-all.ts         # 週次 cron 用: enabled ソースを順次取得 (--group mon|thu|all で無料枠分割)
  fetch-response.ts    # Gemini レスポンス分類 (success/retryable/error)
  crawl-index.ts       # 索引ハブ型ソースの 2 段階クロール (子 URL 列挙 → 個別抽出 → 統合)
  diff-and-propose.ts  # seed vs extracted の差分 → ProposalReport
  propose-helpers.ts   # propose<Entity> 個別関数群
  apply-proposals.ts   # autoApplicable を seed-additions.ts に書き出し
  approve-proposals.ts # needsReview を ID 指定で seed-additions.ts に承認適用 (半自動レビュー)
  inject-prompt.ts     # extractor プロンプトに seed 内容を動的注入
  aliases.ts           # cardId / storeId の表記揺れ正規化
  evidence-check.ts    # hallucination guard (日付主張の根拠検証 等)
  report.ts            # AUTO_SUMMARY.md / REVIEW_QUEUE.md 生成
  types.ts             # 共通型 + 閾値定数 + scope ディレクティブ
```

## ローカル開発

```bash
npm install
npm run dev          # http://localhost:5173 （predev で master.json も再生成）
npm run test         # Vitest (1061 ケース)
npm run build        # 本番ビルド
npm run lint         # 全 lint (eslint .)。CI ゲート (PR / main push でブロック)
npm run sync:fetch -- <sourceId>   # 1 ソースを Gemini で抽出
npm run sync:propose               # 全 extracted vs seed の差分提案
npm run sync:apply                 # autoApplicable を seed-additions.ts へ
npm run sync:approve -- --list     # needsReview 一覧 (ID 付き) を表示
npm run sync:approve -- <ID> ...   # 指定 needsReview 項目を seed-additions.ts へ承認適用
                                    # (⚠ chore/sync-review-queue ブランチ上の commit は次回 cron の
                                    #  ブランチ再構築で失われるため、approve 後は速やかに PR をマージすること)
npm run sync:report                # AUTO_SUMMARY / REVIEW_QUEUE 生成
```

`scripts/generate-master.ts` がビルド時に走り、`src/state/seed.ts` の内容を
`public/master.json` として出力します。これが GitHub Pages から
`https://kyounow.github.io/pointmax/master.json` として配信されます。

`npm run sync:*` には `.env.local` の `GEMINI_API_KEY` が必要です（gitignore 済）。

## デプロイ

`main` ブランチに push すると GitHub Actions が自動でビルド & GitHub Pages にデプロイされます。
週次 cron (Weekly Master Sync) が `GITHUB_TOKEN` で main を更新するケース (auto-merge / 履歴 push) は
push トリガーが起動しない (GitHub の再帰防止仕様) ため、`deploy.yml` の `workflow_run`
(sync 完了で発火) が再デプロイを担います。

---

## 自動アップデート (cron)

- 週2回（毎週月曜・木曜 06:00 JST）GitHub Actions が同期パイプラインを実行 (`workflow_dispatch` で手動実行可)
- **同期ソースの月/木 2グループ分割 (無料枠対策)**: 抽出に使う gemini-2.5-flash は無料枠が
  20 リクエスト/日のため、enabled 15 ソースを 1 日で全 fetch すると後半ソースが 429 で枯渇する。
  そこで各ソースに `fetchGroup: mon | thu` を付与し (`sources/registry.yaml`)、**月曜 run は mon
  グループ / 木曜 run は thu グループ**だけを fetch して各実行を無料枠内に収める。重量級
  (3 attempts 常連: 楽天/Ponta/Vポイント) と crawl:index 型 (JRE/楽天Pay) を両グループに分散し、
  worst-case を mon ≈18 req / thu ≈19 req に均衡させている。曜日は weekly-sync.yml が実行時刻の
  JST 曜日から自動導出。手動 `workflow_dispatch` では `group` 入力 (`auto` / `mon` / `thu` /
  `all`=全 enabled) でグループを明示指定できる (`all` は無料枠を消費するため手動フル実行専用)
- 高信頼項目 (autoApplicable) は `auto-sync/YYYY-MM-DD-HHMM` ブランチ + `auto-sync` ラベル付き PR を作成し、
  safety check (件数上限/test/build) 通過後に **squash auto-merge** → main。
  bot のマージ (`GITHUB_TOKEN`) は push トリガーを起動しないため、GitHub Pages 再デプロイは
  `deploy.yml` の **`workflow_run`** (Weekly Master Sync 完了で発火) が担う
- 要レビュー項目は `chore/sync-review-queue` ブランチの長寿命 PR (`needs-review` ラベル) に集約。
  各項目には安定 ID が振られ、取り込みたいものはレビュー PR ブランチ上で
  `npm run sync:approve -- <ID> [<ID> ...]` を実行すると seed-additions.ts への反映・
  queue からの除去・REVIEW_QUEUE.md 再生成まで半自動で完了する
  (`--list` で一覧、`--dry-run` で確認のみ。対応: addRecord 全般 /
  updateField/programs の rate・validFrom・validTo / delete/programs)
- `sync.config.json` の `autoMergeEnabled` で auto-merge の ON/OFF、`maxAutoChangesPerRun` が安全弁
  （超過時は全件 review 降格）
- 同期履歴は `sources/SYNC_HISTORY.json` / `sources/SYNC_HISTORY.md` に時系列で蓄積 (最大 104 件、newest first)。
  auto-merge 週は auto-sync PR が、要レビューのみの週は weekly-sync の「Publish SYNC_HISTORY to main」step が
  履歴を main へ直 push し、いずれも `workflow_run` deploy でアプリの設定内「マスタ更新履歴」に反映される。
  GitHub の PR タブ (`auto-sync` ラベル絞り込み) + 履歴ファイルの両方で同じ情報を参照可
- inject-prompt は実行時に `seed()` をライブ参照するため、seed に追加した新カード/通貨は
  自動でプロンプトへ反映される（回帰契約テストで保証）
- ローカル PC は完全に無関係 — GitHub のサーバー上で実行される

### cron が auto-merge する/しない範囲

| 対象 | auto-merge | 備考 |
|---|---|---|
| 既存 store/program 参照の **memberships** | ✅ する | rakuten/Ponta/JAL 等の提携店追加 |
| 既存 program の **rate 変動** | ✅ する (pp ±10 / 倍率 0.5x〜2x 以内なら) | 範囲外は needsReview。反映は `seed-additions.ts` の `PROGRAM_OVERRIDES` (部分上書き) 経由で、手書き seed ファイルは書き換えない |
| 既存 program の **期間変更** (validFrom/validTo) | ❌ しない (`periodChange` で needsReview) | キャンペーン延長/期間訂正の検知。承認は `npm run sync:approve -- <ID>` → `PROGRAM_OVERRIDES` 経由で反映 |
| 新規 **stores** | ⚠ 原則しない (PR #56) / 部分例外 (Wave 3 C-9) | 原則: キャンペーン情報の獲得に注力するため、店舗の seed 肥大化を抑制 (`storeAdditionsDisabled`)。**例外 (Phase B' chain-promote)**: 同 run に campaign extractor 由来の program (validTo 持ち) が当該 store を membership 参照 **AND** チェーン名パターン (KNOWN_CHAIN_NAME_PATTERNS) or chain-heavy category (同 category に既存 3+ 店) なら `🔓 chain-promote` log とともに auto。詳細は `scripts/sync/chain-store-detection.ts` / `scripts/sync/diff-and-propose.ts` の promoteChainStoreAutoMerge |
| 新規 **campaign program** (campaign extractor 由来) | ✅ する (安全条件を全て満たせば) | `isCampaignAutoMergeable` の全ゲート通過時のみ auto: 期間明示 (validTo 未来) / rate≤30% / 既存参照整合 / lifestyle 無し / confidence ≥ **0.90**。1 つでも外れたら needsReview (`idCollision`)。confidence は逐語根拠つきキャンペーンが ≥0.90 に乗るよう campaign プロンプトを校正 (v3.3、`explicitness=1.0`)。閾値は旧 0.95 → 0.90 (構造ゲートが既に強力なため) |
| 対象店 membership が全滅した **新規 member-stores program 単独** | ❌ しない (`orphanedProgram` で needsReview) | **原子性ガード (Phase C2 `demoteChildlessMemberStorePrograms`)**: campaign 由来 program は auto でも、その membership が全て `missingStoreBody` 等で review 降格されると member-stores × membership 0 の死にデータになる。program 単独 auto を防ぎ、`member-stores は membership ≥1` 契約テストが apply 後 safety gate で fail → 無関係な auto 変更まで巻き添え review 降格するのを propose 層で阻止。対象店 membership 側と同時に `npm run sync:approve` する運用 |
| 新規 **cards / paymentApps / 非キャンペーン program** | ❌ しない | 還元計算に直結するため必ず人手レビュー (`idCollision` 理由で needsReview) |
| **期限切れ campaign の削除** (validTo+30 日経過) | ✅ する (**自動削除**) | 既に非アクティブで還元計算に影響しないためクリーンアップを自動化。tombstone (`REMOVED_PROGRAM_IDS`) 化で program + 関連 memberships が cascade 除外され、**既存ユーザーの端末からも次回更新で除去される** (未編集の公式由来コピーのみ。編集済みは保護)。**安全弁**: 同 run で期間変更 (`periodChange`) が提案されている program は延長中の可能性を考慮し自動削除せず needsReview (`expiredCampaign`)。件数 cap / apply 後の test・build gate / `autoMergeEnabled` も従来どおり適用 |

---

## バージョン管理

PointMax は 2 つの version を独立管理:

| 種類 | 用途 | 現在値 |
|---|---|---|
| `SEED_VERSION` (seed.ts) | データ版。rate 修正・データ追加の通知 (UpdateBanner) や SyncUpdateModal の差分検知に使用 | **44** |
| `PERSIST_SCHEMA_VERSION` (persist-versions.ts) | localStorage の形の版。型レベル schema 変更時に bump | **7** |

schema 変更時の挙動は `src/state/persist-versions.ts` の `SCHEMA_MIGRATIONS` で declarative に定義:
- `passthrough`: 互換あり、何もしない
- `reset`: 全消去 + 新 seed で初期化（ユーザに明示同意を求める）
- `transform`: 個別変換関数を適用 (best-effort migration)

登録済み migration:

| from version | 戦略 | 契機 |
|---|---|---|
| 1 | `reset` | v3.0.0 BenefitProgram モデル刷新（旧構造と非互換） |
| 2 | `reset` | v5.0.0 で V4 未満を強制アプデ化（旧 passthrough、SEED_VERSION 30+ 回ぶんを取りこぼした「ゴーストデータ」化のため公式マスタ再初期化） |
| 3 | `reset` | v5.0.0 で V4 未満を強制アプデ化（同上） |
| 4 | `passthrough` | v5.0.0 `BenefitProgram.entryUrl` 新設（任意フィールドの純加算で旧 v4 localStorage は無問題） |
| 5 | `reset` | schema v6 破壊的刷新（`BenefitProgram.scope` 必須化。以降のトレイン PR で membership id 必須化 / `Card.familyId` / `optIn` / `LoyaltyRule` 削除を積む起点） |
| 6 | `transform` | v7.0.0 `enabled` デフォルト反転。旧 v6 データの有効状態を `enabled = (enabled !== false)` として各行に明示化してから判定を反転する（reset せず「使う」設定を保存。programs は `enabled===true` の opt-in ON のみ残し他は削除して既定に委ねる） |

トレイン中の `reset` は v5→6 の 1 回のみ。v6→7 の `enabled` 反転は `transform` で無告知移行する（`SchemaUpgradeModal` の同意モーダルは `reset` 専用）。今後 schema を変更する場合は `PERSIST_SCHEMA_VERSION` を bump し、`SCHEMA_MIGRATIONS` に対応するエントリを追加する。

---

## これまでの歩み

- **v3.0.0** — `StoreRule` / `LoyaltyRule` / `cardSpecificBonusRates` を **BenefitProgram** 統合モデルへ刷新（評価エンジンを `programEvaluator.ts` に一本化）
- **v3.3.0** — 死蔵コード一掃（`state.rules` 系・`resolveRate` 実装・旧型を物理削除、-1100 行超）
- **v3.4.0** — 「公式」バッジ正確化（substantive 編集で badge が外れる・「公式に戻す」）
- **v3.5〜v3.6** — ポイントカード提携の補充、nanaco/WAON を電子マネー PaymentApp 化
- **v4.0.0** — EdgesScreen ルート検索 / 優先通貨タブ / オリコ・三菱UFJ 通貨・カード追加
- **v4.0.1** — ファミペイ廃止、migration クラッシュ修正と全 migration 耐性の回帰テスト
- **v5.0.0** — `BenefitProgram.entryUrl` 追加で「🔗 エントリー」リンク表示、JCB J-POINT パートナー (旧 Oki Doki ランド) 提携店 + 新 extractor `jcb-jpoint` 追加、PERSIST_SCHEMA 4→5 で V4 未満を強制アプデ化
- **v5.1.0** — JCB ゴールド (jcb-gold) 追加、J-POINT パートナー programs を W 系列 / Gold 系列に分離（公式「最大10%還元」の数値検証で仕様確定）
- **v5.1.1** — すかいらーく系 13 店 + Olive 選べる特典 program 追加。ライフスタイル系 program (給与振込/住宅ローン/SBI/Vitality 等) は全カード保有者に過大計算されるため恒久除外方針
- **v5.1.2** — `chargeBased` paymentApp 経由で cardIds-only program (Olive 選べる特典等) が誤適用されるバグ修正
- **v5.1.3** — legacy `paymentApp.ts` 削除 + 異種通貨 addOn の分離表示 (`CardRanking.appBonusBreakdown` 追加で program 名明示)
- **v6.0.0** — ポイントカードに「使う/使わない」チェックボックスを追加 (クレカ・支払方法と同 UI)。使わないポイントは二重取りから外れ、交換ルートの起点・経由からも除外 (`bestPath` に `blockedCurrencyIds` ゲート新設、deny-list 方式)。Calculator は「未使用ポイントカードを有効化すると +X」(`rankCards` 戻り値を `RankResult { rankings, upgrade }` 化)、EdgesScreen ルート検索は「保有優先メイン + 使い始めればより良いサブルート」を提示。PERSIST_SCHEMA は 5 据え置き (PointCard.enabled は任意フィールド、後方互換)
- **v6.0.1** — 全上書き同期 (設定の「URLから取得して全上書き」/ インポート) で「使う/使わない」設定 (`enabled` / `userModifiedAt`) を id マッチで保護 (`preferenceMerge.ts`)。ポイントカードの「使う」列をクレカ・支払方法と同じ末尾位置に統一
- **v6.1.0** — カード保有で開く交換ルートを追加。WAON→JALマイルをイオンカード保有特典としてゲート化、JRキューポ⇔JALマイル (JMB JQ SUGOCA) / JRキューポ⇔ANAマイル (JQ SUGOCA ANA) を新設。新カード `jmb-jq-sugoca` / `jq-sugoca-ana` (enabled:false)。既存ユーザーには migration v41 で WAON→JAL ゲートを反映
- **v6.1.1** — `SyncUpdateModal` のクラッシュ修正。「アプリに反映」/「閉じる」押下で `visible` が false に変わる再レンダー時、早期 return より後ろに置かれた `useRef`/`useEffect` が Rules of Hooks 違反 ("Rendered fewer hooks than expected") を起こし全画面が白くなっていた。hooks を早期 return より前へ移動。SEED_VERSION 41 / PERSIST_SCHEMA 5 据え置き
- **v6.2.0** — lint エラーを全解消し、CI ゲートを `lint:hooks` (rules-of-hooks のみ) から full `npm run lint` に昇格。`set-state-in-effect`/`immutability` は React 公認の「prop 変化時に state 調整」(render-guard) パターンで解消 (Calculator 同率展開・Dialog・EdgeDetailPanel)、`only-export-components` は React Flow の `nodeTypes`/`edgeTypes` と `useDialog`/`DialogContext` を別ファイルへ分離。暫定 `eslint.hooks.config.js` は撤去。挙動・SEED_VERSION 41・PERSIST_SCHEMA 5 据え置き
- **v6.3.0** — キャンペーン収集/取込/期間ライフサイクル大幅強化 (PR #84-#92 の 9 本)。収集: 索引ハブの 2 段階クロール (`crawl: index`、実在リンク照合で捏造 URL 遮断) + 手動登録フォーム復活。取込: `sync:approve` (review 承認 1 コマンド化)・`PROGRAM_OVERRIDES` (rate/期間変更の実書き込み)・`REMOVED_PROGRAM_IDS` (期限切れ削除 tombstone)。期間: 日付判定のローカルタイム統一・`useToday` (日付跨ぎ自動更新)・終了カウントダウン・`recurringWeekdays` (曜日限定)・公式 program の更新/削除が既存ユーザーの端末にも伝播 (未編集分のみ、編集済みは保護)。tests 565→687。SEED_VERSION 41 / PERSIST_SCHEMA 5 据え置き
- **v6.4.0** — JALカードSuica の JRE POINT → JAL マイル交換レート修正。CLUB-Aゴールド (`jal-suica`) を 1500pt→1000マイル (0.6667) に訂正 (従来 0.5 は普通カード相当の誤り)、普通カード版を新カード `jal-suica-normal` (enabled:false) + edge `jre-to-jal-normal` (1500pt→750マイル) として追加。両カード保有時はゴールドが優先。既存ユーザーには migration v42 で rate 修正を反映。SEED_VERSION 41→42 / PERSIST_SCHEMA 5 据え置き
- **v6.5.0** — エポスカードを 3 グレード体制に拡張 (`epos-gold` / `epos-platinum` 追加、いずれも enabled:false)。基本還元は全グレード 0.5% で共通とし、グレード差は program で表現: マルイ・モディ 2倍 (G/P 限定 1.0%)、選べるポイントアップ 2倍 (G/P 限定、**2025-04 改定後の倍率** — 旧 3倍への退行防止テスト付き、マルイ登録時は override 1.5%、モバイルSuicaチャージ含む実在 store 11 件)。ポイントアップサイト**たまるマーケット**を J-POINT パートナー同型でモデル化 (`prog-epos-tamaru-{2,3,4}x`、楽天市場/Yahoo!ショッピング/ユニクロ/じゃらん/無印良品)。エポス→dポイント等価交換 edge 追加 (Ponta 1:1 は au 回線契約者限定のため意図的に見送り、ANA 優遇 0.6 は 2026-03 終了済み)。sync に新 extractor `epos-tamaru` + キャンペーンソース `epos-news-campaigns` を enabled:false でステージング。SEED_VERSION 42→43 / PERSIST_SCHEMA 5 据え置き
- **schema v6 (PERSIST_SCHEMA 5→6)** — `BenefitProgram.scope` を必須化 (`all-stores` = 全店適用・membership 不可 / `member-stores` = membership のある店のみ)。「membership 行数からの適用範囲推論」を廃止し、`programEvaluator` / `loyalty` は scope のみで判定 (`membershipIndex.programsWithMembership` を削除)。エクスポート JSON に `schemaVersion` を埋め、`importJson` は旧バージョン (欠落含む) を明確なメッセージで拒否 (公式 `master.json` を読む `syncFromUrl` はガード対象外)。validators に scope enum + 「all-stores なのに membership」矛盾検出を追加。v5 localStorage は `reset` で v6 へ再初期化 (`SchemaUpgradeModal` に「エクスポートしてから続行」ボタン追加、export util を `exportFile.ts` に集約)。sync は `ExtractedProgram.scope` を任意追加 + propose 層の derive-on-missing (scope 欠落時に membership 有無から補完、`🧭 scope-derive:` ログ) でプロンプト未改訂でも同期継続。以降のトレイン PR (membership id 必須化 / `Card.familyId` / `optIn` / `LoyaltyRule` 削除) の起点。PERSIST_SCHEMA 5→6
- **schema v6 トレイン PR-1d (BenefitProgram opt-in + preference 保護)** — `BenefitProgram.optIn?` (登録/選択制の特典。既定 OFF 出荷) / `birthdayMonthOnly?` (ユーザーの誕生月のみ有効) / `enabled?` (ユーザー所有キー) を追加。評価式 `isProgramPreferenceActive` (programEvaluator / loyalty で共有) が `enabled===false` (明示 OFF) / `optIn:true` かつ `enabled!==true` (opt-in 未選択) / `birthdayMonthOnly` の誕生月外 を不発にする。誕生月は `store.birthMonth` → `RankInput.userBirthMonth` (1-12) で評価式まで貫通。`store.setProgramEnabled` (opt-in トグル、`userModifiedAt` はスタンプしない) / `setBirthMonth` を追加。seed の `prog-olive-vpoint-up-selected-benefit` / `prog-epos-gp-selectable-pointup` を `optIn:true` 化 (既定 OFF、ProgramsScreen に暫定「使う」トグルを追加)。**R1 横断規約**: seed / master は per-user preference キー (`enabled` 等) を出荷しない (`generate-master` が programs から `enabled` / `userModifiedAt` を strip)。opt-in 特典は `optIn:true` のみで出荷し、既定 OFF は評価式が担う。preference 保護 2 経路 — (1) `mergeSeed.propagateProgramUpdates` は preference キーを除いた正規形で公式差分を判定し、更新採用時に local の `enabled` を carry-over (ユーザーが ON にした opt-in に公式が rate 改定を出しても ON 維持、`enabled` だけの差は公式更新と誤検知しない)、(2) 全上書き取込 (`syncFromUrl` / `importJson`) は programs にも `preferenceMerge.preservePreferences` を適用し、incoming が `enabled` を持たない (公式由来) 時は local 値を carry-over・明示する (ユーザー export) 時はそちらを採用。SEED_VERSION 43 / PERSIST_SCHEMA 6 据え置き
- **schema v6 トレイン PR-1c (Card family + 排他)** — `Card.familyId?` (同一ブランドのグレード系列を束ねる) + `Card.gradeLevel?` (family 内の並び順専用・計算不使用) を追加。新型 `CardFamily = { id; name; exclusive }` を静的マスタ `CARD_FAMILIES` (seed() には含めない) で定義: `family-epos` (一般/ゴールド/プラチナ) と `family-jal-suica` (普通/CLUB-Aゴールド) は **exclusive** (物理的に切替型)、`family-jcb` (W/ゴールド) は非 exclusive (併存保有可)。カードの「使う」トグル (`setCardEnabled`) に排他 invariant を追加 — exclusive family のカードを ON にすると同 family の兄弟カードが自動 OFF になり、CardsScreen が「◯◯ を OFF にしました」を通知する。**挙動変更**: 従来 JALカードSuica 普通/ゴールドは「両方 ON でゴールド優先」だったが、両方 ON が不可能になった (同一ブランドの切替型のため意図的)。validators は `card.familyId` の `CARD_FAMILIES` 実在を検証、seed.test は family 内 gradeLevel 重複なし + familyId 実在を担保。sync の cards INJECT 既定列に `familyId` を追加 (Gemini のグレード系列認識語彙、プロンプト本文改訂は後続 PR)。SEED_VERSION 43 / PERSIST_SCHEMA 6 据え置き
- **schema v6 トレイン PR-1b (membership id 必須化)** — `StoreProgramMembership.id` を必須化 (規約 `m-{programId}-{storeId}`)。id 生成関数 `membershipId()` と `defineMemberships` DSL を新設し、`mergeSeed` の複合キー (`:` / `|`) 運用を他エンティティと同じ id ベースの add-only merge / tombstone に統一。SEED_VERSION / PERSIST_SCHEMA 据え置き
- **schema v6 トレイン PR-1e (LoyaltyRule 物理削除)** — 旧 `LoyaltyRule` 型と関連 state / action / 評価パス / validators / export・import 欄を全削除。手動の「店舗×ポイントカード提示還元」は `store.addUserLoyaltyProgram` が BenefitProgram (`scope:"member-stores"` / `pointCardId` / `userModifiedAt`) + membership を **同一 action で atomic に**追加する形へ統合 (フォームの見た目・入力項目は不変)。`master.json` も `loyaltyRules` 欄を持たない。SEED_VERSION / PERSIST_SCHEMA 6 据え置き
- **schema v7 (PERSIST_SCHEMA 6→7、トレイン最終 PR-1f)** — `enabled` デフォルトを反転。**v7 は `enabled === true` のみ有効**（`undefined`/`false` = 無効）。`seed` / `master` は `enabled` を出荷せず、カード・ポイントカード・決済アプリは**全て OFF 起点**で出荷する (`generate-master` が全エンティティから `enabled` を strip、R1 規約の完成)。保有選択はユーザーが「使う」トグルで ON にする (`setCardEnabled` / `addCard` 等は `enabled:true` を明示、`preservePreferences` の carry-over に載る)。**暫定オンボーディング**: Calculator は保有カード 0 枚時に「① 保有カードを選ぶ / ② よく貯める通貨を選ぶ」の 2 ステップ案内を表示し、非保有 42 枚の比較リスト (`CardComparisonSection`) を初回画面で抑制する (正式版は Phase 3)。既存 v6 localStorage は `SCHEMA_MIGRATIONS[6]` の `transform` が有効状態を明示化してから反転するため「使う」設定を失わない。Gemini プロンプト総改訂 (programs を出す `campaign` / `jcb-jpoint` / `epos-tamaru` / `ongoing-program` に `scope` 出力を必須化、`enabled`/`optIn` 非出力を明記、`promptVersion` bump + `registry.yaml` 同期)。SEED_VERSION 43→44 / PERSIST_SCHEMA 6→7
- **Phase 2 ウォレット統合 (UI)** — カード / ポイントカード / 支払方法の 3 画面を「ウォレット」1 タブに統合 (PR-2b1、hash sub `#wallet[/point-cards|/payment-apps]`、family グループ表示 + `?highlight`)。**PR-2b2**: カード起点の **opt-in 特典 一次導線** を追加 — カードを `cardIds` に含む `optIn` 特典があると「◯◯ の特典 N 件」を `details` で展開し、特典名 / 説明 / 適用条件 + 「使う」トグル (`setProgramEnabled`) を出す (ProgramsScreen 暫定トグルと同じ state を触り挙動一貫、二次導線として ProgramsScreen 側も存置)。カードが OFF のときは「カード自体が OFF」の注記を添える。**誕生月の遅延プロンプト**: `birthdayMonthOnly` 特典を持つカードを ON にした瞬間、`birthMonth` 未設定なら 1〜12 を入力する軽量 dialog (既存 `prompt` 流用) を出す (seed は当該 program 0 件のため機構のみ、テストは fixture)。設定画面に恒久設定として「誕生月」select (未設定 + 1〜12) を追加。ポイントカードの「カスタム還元ルール追加」フォームは `details`「▸ カスタム還元ルールを追加 (上級)」へ降格 (既定は閉じ、自作ルール一覧は常時表示)。SEED_VERSION / PERSIST_SCHEMA 据え置き
- **残改善 PR-2 (決済ワンタップ除外)** — 「レジでこの決済が使えなかった」を店舗 × 決済ペア単位で
  ワンタップ除外する user-owned 機能。`store.excludedStorePayments` state (`{ storeId, paymentAppId, excludedAt }[]`)
  + `excludeStorePayment` / `restoreStorePayment` action (重複防止付き) を追加。`RankInput.excludedStorePayments`
  を追加し、`rankCards` は `payment.storeId` に一致する除外ペアの `paymentApp` を `compatibleApps` から
  外す (= 当該決済の評価を止め他決済で最良を再計算)。UI は CalcResultCard 展開ビューに除外ボタン、
  対象外グループに「除外済 — タップで戻す」チップを追加。`excludedStorePayments` は per-user 設定系 state
  として `syncFromUrl` / `importJson` の全置換対象に含めず (保護テスト付き)、公式同期で消えない。
  SEED_VERSION / PERSIST_SCHEMA 据え置き (新フィールドは任意・後方互換不要方針)
- **新 extractor**: `jcb-jpoint` (v5.0.0、JCB J-POINT 倍率階層別) / `ongoing-program` (v5.1.3 系、常設優遇プログラム、validFrom/validTo を付けない汎用版) / `epos-tamaru` (v6.5.0、たまるマーケット倍率一覧)。`ExtractorKind` は計 8 種類

リリース運用: 1 PR = 1 commit 群 → merge 後に annotated tag + `gh release`。
sync インフラ修正系の PR (#19-#26、#33-#35、#37、#39 等) は tag なしで運用。
詳細な開発履歴はリポジトリの git log / リリースノートを参照。

---

## データの取り扱い

- **個人情報は一切扱いません**。カード名・利用店舗・金額入力は全て端末ローカル。
- 還元率・交換レートは公式情報に基づく**概算値**です。会員ステータスや期間限定キャンペーンは
  完全には反映していないため、**実利用前には必ず各社の公式条件をご確認ください**。
- 月次の還元上限 (`monthlyCapAmountYen`) は「その取引単独が今月の対象支出の全て」とみなす
  per-transaction 近似でランキングに反映 (上限超の支払いは付与対象額を上限でクランプ)。
  月内の累積利用は考慮しないため、あくまで目安として扱ってください。
- ポイント交換の**最低交換単位** (`ConversionEdge.minFromUnits`) は**経路選択には影響させず、注記のみ**に
  とどめています。経路探索 (`bestPath` / `pathCache`) は「レート積は交換量に対し線形」という前提で
  最適ルートを 1 度だけ計算して使い回すため、最低単位という量依存の非線形ゲートは持ち込みません。
  代わりに、計算結果を展開したとき、その取引で貯まる量が最低交換単位に満たない交換ステップがあれば
  「◯◯ を △△ 貯めてから交換 (最低交換単位)」と事後注記します。**貯めてから (単位を満たしてから)
  交換すれば、表示のレート積どおりに交換できます**。
- 「ポイントカード」画面で「使う」を OFF にすると、**交換ルート画面**ではそのポイント通貨を
  起点・経由から強く除外します (有効なクレジットカードが同じ通貨を貯めていても除外。グラフ上は
  灰色・点線で表示)。一方 **計算画面**は保有資産で実際に取得できる通貨を最適化するため、
  クレカで貯まる通貨は維持されます (画面ごとに除外の強さが異なります)。
- `localStorage` は端末／ブラウザごとに別。複数端末で共有したい場合は
  「エクスポート」→ 保存 → 別端末で「同期URL」設定、が想定フロー。
  エクスポート JSON はローカル全データ (カード/通貨/店舗/交換ルート/ポイントカード/
  loyalty ルール/支払方法/プログラム/メンバーシップ) のスナップショットで、インポートで
  まるごと復元できる (プログラム/メンバーシップ欄が無い旧フォーマットは既存値を保持)。
  エクスポート JSON には `schemaVersion` が埋め込まれ、**現在のアプリと版が異なる (欠落含む) 旧形式の
  インポートは明確なメッセージで拒否**される (v6 未満のファイルは現行アプリで再エクスポートが必要)。
  この版ガードは import 経路のみで、公式 `master.json` の URL 同期には影響しない。
- **データの保持 (耐久性)**: ブラウザ利用（特に iOS Safari を非インストールで使う場合）は、
  長期間アクセスしないと `localStorage` が自動削除されたり、容量逼迫時に消去されることがあります。
  対策として、アプリ起動時に**永続ストレージ**（`navigator.storage.persist()`）を自動要求し、
  **設定 → データ保持 (PWA)** から現在の許可状態の確認・再要求ができます。
  **ホーム画面に追加（PWA インストール）** すると保持が強化されます。いずれも完全な保証では
  ないため、重要なデータは定期的に**エクスポート**してください。
- **オフライン動作**: 計算・閲覧は全て端末内で完結するため、オフラインでもそのまま利用できます。
  オフライン時はマスタの更新チェック（更新バナー／同期通知モーダル）を自動でスキップし、
  オンライン復帰後に自動で再表示します（店頭・弱電波環境で同期系 UI が出しゃばらないため）。
