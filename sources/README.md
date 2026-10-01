# sources/ - マスタ自動同期パイプライン

週 2 回 (月・木 06:00 JST) GitHub Actions `weekly-sync.yml` が `registry.yaml` の enabled ソースを
Gemini API (`@google/genai`、既定モデル gemini-2.5-flash) で抽出し、seed との差分を
auto (自動反映) と review (要レビュー) に分けて処理する。単発ソースの抽出は URL Context →
待機して再試行 → HTML を pre-fetch して直渡し、の最大 3 attempts。
**auto-merge の範囲はルート README の「cron が auto-merge する/しない範囲」表が正**で、ここには書かない。

現在の構成 (2026-09-27、PR-0b-3 後): enabled は 5 本 (mon: jcb-jpoint-partners → epos-tamaru-market →
d-pay-campaigns、thu: smbc-vpoint-up → paypay-campaigns。記載順 = 実行順、worst は mon 9 / thu 6 req)。
d-pay-campaigns / paypay-campaigns は `autoMerge: false` + `target` 付きで、由来の提案は全ガードを通過しても
review (`sourceAutoMergeDisabled`) に回る。解除条件は registry の notes。停止中ソースの理由と再開条件は
registry の各 notes、無料枠 (20 req/日) の見積りは registry ヘッダとルート README の「自動アップデート」節。

## ディレクトリ構成

```
sources/
  registry.yaml                  # 取得元 URL の台帳 (手編集)。enabled / fetchGroup (mon|thu) / target / autoMerge / notes
  schema/extracted-source.schema.json  # 抽出 JSON の schema (fetch 時に ajv で検証)
  extractors/<name>.prompt.md    # Gemini プロンプト 9 ファイル (ExtractorKind 8 種 + crawl 専用 campaign-index)
  extracted/<sourceId>.json      # 抽出結果。毎 run main に入る (auto-sync 週は auto-sync PR、他の週は Publish step)
  aliases.json                   # cardId / storeId の表記揺れ辞書 (propose 時に正規化)
  proposed-migrations.json       # propose の出力 (autoApplicable / needsReview)。main には auto-sync 週だけ入る
  SYNC_HISTORY.json / .md        # 同期履歴。run ごとに main に入り (変化の無い run を除く)、アプリ設定の「マスタ更新履歴」のデータ源
  rate-watch.yaml                # 率カナリア (PR-5c-1) の監視リスト (手編集)。targets / candidates / excluded
```

main に置かないもの:
- `REVIEW_QUEUE.md` — 要レビュー一覧。`chore/sync-review-queue` ブランチ (長寿命 PR #145 の本文) にだけ置く。
  review-only 週の最新の proposed-migrations.json も同じブランチにある (extracted は main)。
- `AUTO_SUMMARY.md` — auto-sync の commit message / PR 本文用の一時生成物 (git 管理外)。
- 過去スナップショットのディレクトリは無い。過去の抽出結果は git 履歴で追う。

## パイプライン (weekly-sync.yml)

1. `sync:fetch-all -- --group mon|thu` (JST の曜日から導出。workflow_dispatch では `all` も指定可) → `extracted/`
   ただし quota 枯渇・API エラー・crash のソースは上書きせず前回版を残す (keep-last-good)。429 日次枠 / 402 /
   API キー・モデル不正では後続ソースも打ち切る。source ごとの outcome は Actions の Step Summary に出る
2. `sync:propose` → `proposed-migrations.json` (confidence と各種ガードで autoApplicable / needsReview に分類)
3. `sync:report` → `AUTO_SUMMARY.md` / `REVIEW_QUEUE.md` / `SYNC_HISTORY.json`・`.md`
4. auto > 0 なら `sync:apply` → `src/state/seed-additions.ts` だけを書く (SEED_VERSION・手書き seed は触らない)
5. Safety check (auto > 0 かつ `sync.config.json` の `autoMergeEnabled` が true の週だけ走る):
   件数上限 (`maxAutoChangesPerRun`) / `npm test` / `npm run build` ほか。検査内容は同 step が正
6. 通過したら `auto-sync/YYYY-MM-DD-HHMM` PR を作り、`gh pr merge --squash --auto` で即時マージ
   → `deploy.yml` の `workflow_run` が再デプロイ
7. Safety 失敗・auto-merge 無効の週は auto を全件 review に降格 (`safetyFailed` / `autoMergeDisabled`) し、
   SYNC_HISTORY と extracted を main に直 push する (「Publish SYNC_HISTORY to main」step)。降格後の Regenerate reports は
   同じ generatedAt の entry を置換するので、履歴には降格後の値 (auto 0) が残る (PR-0b-3)
8. needsReview があれば peter-evans/create-pull-request が `chore/sync-review-queue` を作り直して PR #145 を更新

## 率カナリア (rate-watch.yaml、PR-5c-1)

registry.yaml (Gemini で抽出するソースの台帳) とは別の、**Gemini を使わない**監視リスト。
`npm run sync:rate-watch` が各 target の公式ページを素の HTTP GET で取り、seed の率の根拠になった逐語句
(anchor の近くの phrases) や一覧の店名集合 (storeSet) がまだ載っているかを照合する。検知だけで、seed も
extracted も書かない (結果 JSON は既定で `os.tmpdir()`、`sources/extracted` 配下への出力は拒否)。

- **target**: 照合する公式ページ。URL と逐語句は実際に開いて確認したものだけ (捏造禁止、確認日を notes に)。
  subject (program / card / membership / category) と `seedRateAtCuration` (照合したときの seed の率) を持つ。
- **candidates**: 到達性プローブ (`--probe`) 専用。リポジトリ (registry / seed) に既にある URL だけ。
  Actions ランナーから届くか (403 / JS 描画) を測り、target に昇格させるかを V3 (四半期チェック) で決める。
- **excluded**: 意図して監視しない subject と理由 (倍率 tier = 週次ソースが監視 / 提示還元 = 店ごとに率が違う /
  ADDED の期間限定 campaign = cron が管理)。
- 契約 (`scripts/sync/rate-watch.test.ts`、npm test = cron の safety gate でも走る): subject が seed に実在し、
  `seedRateAtCuration` が seed の率と完全一致し、監視 program は validTo を持たない。**seed の率を直す PR では
  このファイルも同じ PR で更新する**。監視中の率への cron の変更は propose の Phase C5 が `rateWatched` で review に回す。
- 手動プローブ (Actions から): weekly-sync を `group=rate-watch-only` で workflow_dispatch (Gemini 0 req。手順は
  ルート README の「率カナリア」)。

## review 経路

- PR #145 の本文 (REVIEW_QUEUE.md) で項目 ID を確認し、review ブランチ上で `sync:approve -- <ID> ...` を実行すると
  seed-additions.ts への反映・queue からの除去・REVIEW_QUEUE.md の再生成まで行う (`--list` / `--dry-run` あり)。
- review ブランチの commit は次回 cron の作り直しで消えるので、approve したら速やかにマージする。
  そのままマージすると REVIEW_QUEUE.md も main に入るので、マージ前に review ブランチで
  `git rm sources/REVIEW_QUEUE.md` するか、マージ後に外す。

## 判定基準

auto / review の詳細はルート README の表を参照 (唯一の正)。confidence の合成式だけここに残す
(`scripts/sync/types.ts` の `computeConfidence`):

```
confidence = evidenceQuote ? explicitness * (1 - ambiguity) : 0.3
```

`evidenceQuote` (元ページからの逐語引用) が空なら 0.3 になり、auto の基本閾値 0.9 を下回る。

## ローカル実行

1. Google AI Studio で API Key を発行し、`.env.example` を参考にリポジトリ直下の `.env.local` に
   `GEMINI_API_KEY` を設定する (CI は GitHub Secrets `GEMINI_API_KEY` に別の Key を登録)。
2. 実行は `npm run <script>`。一括実行用の `npm run sync` という script は存在しない。

| script | 用途 |
|---|---|
| `sync:fetch -- <sourceId> [--dry-run] [--allow-disabled]` | 1 ソースを抽出 (enabled:false のソースは拒否。再開検証だけ `--allow-disabled`) |
| `sync:fetch-all -- --group mon\|thu\|all [--dry-run]` | グループ単位で抽出 (cron と同じ) |
| `sync:propose` | enabled ソースの extracted と seed の差分提案 (`SYNC_INCLUDE_SOURCES=<id>` で停止ソースも含める) |
| `sync:report` | AUTO_SUMMARY / REVIEW_QUEUE / SYNC_HISTORY を生成 |
| `sync:apply [--dry-run]` | autoApplicable を seed-additions.ts へ |
| `sync:approve -- --list` / `-- <ID> ... [--accept-risk]` | needsReview の一覧 / 承認適用 (全額に乗る危険な理由の項目は `--accept-risk` 必須) |
| `sync:rate-watch [-- --probe \| --only <id> \| --out <file> \| --history <file>]` | 率カナリアの照合 / 到達性プローブ (Gemini 0 req、API キー不要) |

- ローカルで `sync:report` / `sync:approve` を実行すると `REVIEW_QUEUE.md` / `AUTO_SUMMARY.md` が untracked で
  再生成される。**commit しない** (`git add -A` や `git add sources/` で化石が main に戻る)。
  `proposed-migrations.json` と `SYNC_HISTORY.json`・`.md` も書き換わるので `git checkout` で戻す。
- PR-0b-3 以降の `appendSyncHistory` は同じ generatedAt の entry を同位置で置換 (upsert) する。ローカルの `sync:report` は
  `proposed-migrations.json` と同じ generatedAt の過去 entry を上書きする (needsReview の減少やラベルの再解決が入る) ので、
  変わった `SYNC_HISTORY.json`・`.md` も commit せず `git checkout` で戻す。

## セキュリティと保護

- API Key は `.env.local` / GitHub Secrets だけで管理し、commit しない。pre-commit hook (`.githooks/pre-commit`、
  `git config core.hooksPath .githooks` で有効化) が `AIza...` 等を検出して commit を止める。
- main に branch protection は無い (2026-09-26 に gh api で確認。Branch not protected / rulesets なし)。
- PR 上の CI (ci / lint / bundle-size) は cron の変更に対して実質走らない。auto-sync PR の run は即時マージと
  ブランチ削除で 0 jobs の failure になり、review PR の run は action_required のまま実行されない。
  cron 由来の変更に対する事前検査は workflow 内の Safety check だけ。
- review-only 週 (auto 0 件または降格した週) は bot が SYNC_HISTORY と extracted を main に直 push する。
