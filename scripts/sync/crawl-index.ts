// 索引ハブ型ソースの 2 段階クロール (registry の crawl: { mode: index }) 用ヘルパ群。
//
// 背景: jre-point-campaigns / rakuten-pay-campaigns 等のキャンペーン「一覧」URL は
// 索引ハブ (実データは個別キャンペーン詳細の子ページ) であり、単発 fetch では
// 恒常的に抽出 0 件だった (registry.yaml の各 notes 参照)。本モジュールは
//
//   1 段目: campaign-index extractor が索引ページから子 URL を列挙
//   2 段目: 各子 URL を source 本来の extractor (campaign) で抽出
//   3 統合: 子ページごとの結果を 1 つの ExtractedSource に merge して
//           sources/extracted/<id>.json へ (後段 propose は従来と同じ入力形)
//
// のうち、純粋ロジック部分 (index 応答 parse / URL 正規化 / merge) を担う。
// Gemini 呼び出しと I/O は fetch-source.ts の runIndexCrawl が行う。

import type { ExtractedSource, ExtractorKind } from "./types";
import { stripHtmlToText } from "./fetch-response";

/** 1 run あたりの子ページ fetch 上限 (registry の crawl.maxChildren 未指定時)。 */
export const DEFAULT_MAX_CHILDREN = 5;
/** maxChildren の上限クランプ (Gemini RPM / cron 実行時間の保護)。 */
export const MAX_CHILDREN_HARD_CAP = 10;
/**
 * 子ページ fetch 間の待機。gemini-2.5-flash free tier は 10 RPM = 1 call/6s。
 * fetch-all のソース間 5s sleep と同じ思想で、子ページ間にも余裕を持たせる。
 */
export const CHILD_FETCH_SLEEP_MS = 6000;

export function resolveMaxChildren(configured: number | undefined): number {
  if (configured === undefined || !Number.isFinite(configured)) {
    return DEFAULT_MAX_CHILDREN;
  }
  return Math.max(1, Math.min(MAX_CHILDREN_HARD_CAP, Math.floor(configured)));
}

// ───────────────────────────────────────────────────────────────
// 1 段目: campaign-index 応答の parse
// ───────────────────────────────────────────────────────────────

export type IndexUrlEntry = { url: string; title?: string };

export type ParsedIndexResponse =
  | { ok: true; urls: IndexUrlEntry[]; droppedEntries: number; notes?: string }
  | { ok: false; error: string };

// campaign-index prompt の出力 ({ urls: [{url,title}], notes? }) を parse する。
// Gemini の癖 (コードフェンス / 配列ラップ) は fetch-source 本流と同じ保険を掛け、
// エントリ単位の型違反は落として残りを救済する (salvageBySchema と同思想)。
export function parseIndexResponse(raw: string): ParsedIndexResponse {
  const cleaned = raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  if (cleaned.length === 0) return { ok: false, error: "empty response" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { ok: false, error: `not JSON: ${cleaned.slice(0, 120)}` };
  }
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return { ok: false, error: "empty array response" };
    parsed = parsed[0];
  }
  if (parsed === null || typeof parsed !== "object") {
    return { ok: false, error: "response is not an object" };
  }
  const urlsRaw = (parsed as { urls?: unknown }).urls;
  if (!Array.isArray(urlsRaw)) {
    return { ok: false, error: "urls[] missing" };
  }
  const urls: IndexUrlEntry[] = [];
  let droppedEntries = 0;
  for (const e of urlsRaw) {
    if (e === null || typeof e !== "object") {
      droppedEntries += 1;
      continue;
    }
    const url = (e as { url?: unknown }).url;
    if (typeof url !== "string" || url.trim().length === 0) {
      droppedEntries += 1;
      continue;
    }
    const title = (e as { title?: unknown }).title;
    urls.push({
      url: url.trim(),
      ...(typeof title === "string" && title.trim().length > 0
        ? { title: title.trim() }
        : {}),
    });
  }
  const notes = (parsed as { notes?: unknown }).notes;
  return {
    ok: true,
    urls,
    droppedEntries,
    ...(typeof notes === "string" && notes.length > 0 ? { notes } : {}),
  };
}

// ───────────────────────────────────────────────────────────────
// 索引 HTML からの実在アンカー抽出 (ground truth)
// ───────────────────────────────────────────────────────────────
// 2026-06-10 の rakuten-pay 実 fetch で、URL Context 直読みの Gemini が
// キャンペーン名は正しく読みつつ URL を捏造する事象を確認 (4/4 件が 404)。
// 対策として索引 HTML を自前 prefetch し、実在する <a href> 一覧を抽出して
// Gemini には「この一覧から選ぶ」選択タスクを与え、出力 URL は実在集合と
// 照合して強制検証する (normalizeChildUrls の candidates オプション)。

/** Gemini に渡す実在リンク一覧の上限 (プロンプトサイズ保護)。 */
export const MAX_ANCHOR_CANDIDATES = 150;

export function extractAnchors(
  html: string,
  baseUrl: string,
  maxAnchors: number = MAX_ANCHOR_CANDIDATES,
): IndexUrlEntry[] {
  const out: IndexUrlEntry[] = [];
  const seen = new Set<string>();
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return out;
  }
  const re = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && out.length < maxAnchors) {
    const href = (m[1] ?? m[2] ?? "").trim();
    if (!href || href.startsWith("#")) continue;
    let u: URL;
    try {
      u = new URL(href, base);
    } catch {
      continue;
    }
    if (u.protocol !== "https:" && u.protocol !== "http:") continue;
    u.hash = "";
    const url = u.toString();
    if (seen.has(url)) continue;
    seen.add(url);
    const inner = m[3] ?? "";
    // リンクテキスト。空 (画像のみリンク等) なら img alt を拾う
    const text = stripHtmlToText(inner);
    const alt = inner.match(/\balt\s*=\s*["']([^"']+)["']/i)?.[1];
    const title = (text || alt || "").trim().slice(0, 120);
    out.push({ url, ...(title ? { title } : {}) });
  }
  return out;
}

// クエリ (トラッキング ?scid= 等) と trailing slash を無視した URL 照合キー。
// Gemini がコピー時にクエリを落とす / スラッシュを付け外しするケースを許容して
// 実在リンクと突き合わせる。
export function pathnameKey(url: string): string | null {
  try {
    const u = new URL(url);
    const path =
      u.pathname.endsWith("/") && u.pathname !== "/"
        ? u.pathname.slice(0, -1)
        : u.pathname;
    return `${u.origin.toLowerCase()}${path}`;
  } catch {
    return null;
  }
}

// タイトルから明らかに campaign extractor 対象外と分かるリンクを 2 段目の
// Gemini 呼び出し前に弾く (free tier RPM の節約)。campaign extractor 自体も
// 同種の内容を拒否するため、これは defense-in-depth ではなくコスト最適化。
// 「タイトルは抽選風だが本文に固定率施策がある」ケースを失う代わりに
// 1 子ページ × 最大 3 attempts の Gemini 呼び出しを節約するトレードオフ。
export const EXCLUDED_TITLE_PATTERNS: ReadonlyArray<RegExp> = [
  /抽選/,
  /くじ/,
  /ガチャ/,
  /山分け/,
  /名様/,
  /名さま/,
  /スタンプラリー/,
  /じゃんけん/,
  /友だち紹介/,
  /新規入会/,
];

// ───────────────────────────────────────────────────────────────
// 子 URL の正規化・フィルタ
// ───────────────────────────────────────────────────────────────

// hostname の「登録可能ドメイン」近似。.co.jp 等の複合 TLD を考慮し、
// cash.rakuten.co.jp と pay.rakuten.co.jp を同一 (rakuten.co.jp) と判定しつつ
// 他社の .co.jp ドメインは弾く。完全な Public Suffix List は cron 用途には過剰。
const COMPOUND_TLDS = new Set([
  "co.jp",
  "ne.jp",
  "or.jp",
  "go.jp",
  "ac.jp",
  "ad.jp",
  "ed.jp",
  "gr.jp",
  "lg.jp",
]);

export function registrableDomain(hostname: string): string {
  const labels = hostname.toLowerCase().split(".").filter((l) => l.length > 0);
  if (labels.length <= 2) return labels.join(".");
  const lastTwo = labels.slice(-2).join(".");
  if (COMPOUND_TLDS.has(lastTwo)) return labels.slice(-3).join(".");
  return lastTwo;
}

export type NormalizeRejection = {
  url: string;
  reason:
    | "invalidUrl"
    | "nonHttp"
    | "crossDomain"
    | "indexItself"
    | "duplicate"
    | "overCap"
    | "notInPage"
    | "excludedTitle";
};

export type NormalizedChildUrls = {
  accepted: IndexUrlEntry[];
  rejected: NormalizeRejection[];
};

// Gemini が列挙した子 URL を絶対 URL 化し、索引と同一ドメイン (registrableDomain
// 一致) の http(s) のみ・重複なし・maxChildren 件以内に正規化する。
// 捏造 URL / 外部サイト / javascript: リンク等の防御は propose 層より手前のここで行う。
//
// opts.candidates: 索引 HTML から抽出した実在アンカー一覧 (ground truth)。
// 指定時は pathnameKey (クエリ・trailing slash 無視) で照合し、
//   - 一覧に無い URL は "notInPage" で除外 (Gemini の URL 捏造を強制ブロック)
//   - 一致した URL は実在側の完全 URL (クエリ込み) に差し替えて採用
export function normalizeChildUrls(
  indexUrl: string,
  entries: IndexUrlEntry[],
  maxChildren: number,
  opts?: { candidates?: IndexUrlEntry[] },
): NormalizedChildUrls {
  const accepted: IndexUrlEntry[] = [];
  const rejected: NormalizeRejection[] = [];

  let base: URL;
  try {
    base = new URL(indexUrl);
  } catch {
    // index URL 自体が不正 (registry の設定ミス)。全エントリを invalidUrl 扱い。
    return {
      accepted,
      rejected: entries.map((e) => ({ url: e.url, reason: "invalidUrl" as const })),
    };
  }
  const baseDomain = registrableDomain(base.hostname);
  const seen = new Set<string>();

  // ground truth 照合用: pathnameKey → 実在側の完全 URL
  let candidateByKey: Map<string, string> | undefined;
  if (opts?.candidates !== undefined) {
    candidateByKey = new Map();
    for (const c of opts.candidates) {
      const key = pathnameKey(c.url);
      if (key !== null && !candidateByKey.has(key)) {
        candidateByKey.set(key, c.url);
      }
    }
  }

  for (const e of entries) {
    let u: URL;
    try {
      u = new URL(e.url, base);
    } catch {
      rejected.push({ url: e.url, reason: "invalidUrl" });
      continue;
    }
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      rejected.push({ url: e.url, reason: "nonHttp" });
      continue;
    }
    u.hash = "";
    let normalized = u.toString();

    // ground truth 照合 (candidates 指定時のみ)
    if (candidateByKey !== undefined) {
      const key = pathnameKey(normalized);
      const groundTruth = key !== null ? candidateByKey.get(key) : undefined;
      if (groundTruth === undefined) {
        rejected.push({ url: normalized, reason: "notInPage" });
        continue;
      }
      normalized = groundTruth;
    }

    let host: string;
    try {
      host = new URL(normalized).hostname;
    } catch {
      rejected.push({ url: normalized, reason: "invalidUrl" });
      continue;
    }
    if (registrableDomain(host) !== baseDomain) {
      rejected.push({ url: normalized, reason: "crossDomain" });
      continue;
    }
    if (normalized === base.toString()) {
      rejected.push({ url: normalized, reason: "indexItself" });
      continue;
    }
    if (e.title && EXCLUDED_TITLE_PATTERNS.some((p) => p.test(e.title!))) {
      rejected.push({ url: normalized, reason: "excludedTitle" });
      continue;
    }
    if (seen.has(normalized)) {
      rejected.push({ url: normalized, reason: "duplicate" });
      continue;
    }
    seen.add(normalized);
    if (accepted.length >= maxChildren) {
      rejected.push({ url: normalized, reason: "overCap" });
      continue;
    }
    accepted.push({ url: normalized, ...(e.title ? { title: e.title } : {}) });
  }

  return { accepted, rejected };
}

// ───────────────────────────────────────────────────────────────
// 3: 子ページ抽出結果の統合
// ───────────────────────────────────────────────────────────────

export type ChildExtraction = {
  url: string;
  title?: string;
  status: "success" | "failed";
  /** failed 時の分類 (fetch finalStatus / nonJson / schemaViolation 等) */
  failReason?: string;
  /** success 時のみ。salvage 済 + メタ上書き済の ExtractedSource */
  data?: ExtractedSource;
};

type ArrayKey =
  | "cards"
  | "storeRules"
  | "categoryRules"
  | "stores"
  | "loyaltyRules"
  | "paymentApps"
  | "programs"
  | "memberships";

// コレクションごとの自然キー。子ページ間で同一キャンペーン/店舗が重複掲載される
// ケース (索引が同じ詳細を複数導線で持つ等) を先勝ちで dedupe する。
const DEDUPE_KEYS: Record<ArrayKey, (item: Record<string, unknown>) => string> = {
  cards: (i) => `${i.cardId}`,
  storeRules: (i) => `${i.cardId}|${i.storeId}|${i.paymentAppId ?? ""}`,
  categoryRules: (i) => `${i.cardId}|${i.category}|${i.paymentAppId ?? ""}`,
  stores: (i) => `${i.storeId}`,
  loyaltyRules: (i) => `${i.pointCardId}|${i.storeId}`,
  paymentApps: (i) => `${i.paymentAppId}`,
  programs: (i) => `${i.programId}`,
  memberships: (i) => `${i.programId}|${i.storeId}`,
};

// 子ページごとの抽出結果を 1 つの ExtractedSource に統合する。
// - 配列はコレクションごとの自然キーで dedupe (先勝ち)
// - 各アイテムの evidenceUrl が無ければ子ページ URL で補完 (出典の追跡性)
// - notes に crawl サマリ (子ごとの件数 / 失敗理由 / 重複除去数) を残す
// - sourceUrl は索引 URL のまま (registry と extracted の対応を保つ)
export function mergeChildExtractions(args: {
  source: { id: string; url: string; extractor: ExtractorKind };
  geminiModel: string;
  fetchedAt: string;
  children: ChildExtraction[];
  indexNotes?: string;
}): ExtractedSource {
  const { source, geminiModel, fetchedAt, children, indexNotes } = args;

  const firstSuccess = children.find(
    (c) => c.status === "success" && c.data !== undefined,
  );
  const merged: ExtractedSource = {
    sourceId: source.id,
    sourceUrl: source.url,
    fetchedAt,
    promptVersion:
      firstSuccess?.data?.promptVersion ?? `${source.extractor}-vUnknown`,
    extractor: source.extractor,
    geminiModel,
  };

  const seen = new Map<ArrayKey, Set<string>>();
  const dupDropped: Partial<Record<ArrayKey, number>> = {};
  const mergedRec = merged as unknown as Record<string, unknown>;

  for (const child of children) {
    if (child.status !== "success" || !child.data) continue;
    const childRec = child.data as unknown as Record<string, unknown>;
    for (const key of Object.keys(DEDUPE_KEYS) as ArrayKey[]) {
      const arr = childRec[key];
      if (!Array.isArray(arr) || arr.length === 0) continue;
      const seenSet = seen.get(key) ?? new Set<string>();
      seen.set(key, seenSet);
      for (const item of arr as Record<string, unknown>[]) {
        const k = DEDUPE_KEYS[key](item);
        if (seenSet.has(k)) {
          dupDropped[key] = (dupDropped[key] ?? 0) + 1;
          continue;
        }
        seenSet.add(k);
        const withUrl =
          item.evidenceUrl !== undefined
            ? item
            : { ...item, evidenceUrl: child.url };
        const target = (mergedRec[key] ?? []) as Record<string, unknown>[];
        target.push(withUrl);
        mergedRec[key] = target;
      }
    }
  }

  // ── crawl サマリを notes に残す (REVIEW_QUEUE / 手動確認時の出典追跡用) ──
  const okCount = children.filter((c) => c.status === "success").length;
  const lines: string[] = [];
  lines.push(
    `[crawl:index] index=${source.url} 子ページ ${children.length} 件 (成功 ${okCount} / 失敗 ${children.length - okCount})`,
  );
  for (const c of children) {
    const label = c.title ? ` (${c.title})` : "";
    if (c.status === "success") {
      const counts = (Object.keys(DEDUPE_KEYS) as ArrayKey[])
        .map(
          (k) =>
            [k, ((c.data as unknown as Record<string, unknown>)?.[k] as unknown[] | undefined)?.length ?? 0] as const,
        )
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${k}:${n}`)
        .join(", ");
      lines.push(`✓ ${c.url}${label} → ${counts || "0件"}`);
      const childNotes = c.data?.notes?.trim();
      if (childNotes) {
        lines.push(`  notes: ${childNotes.replace(/\s+/g, " ").slice(0, 160)}`);
      }
    } else {
      lines.push(`✗ ${c.url}${label} → ${c.failReason ?? "failed"}`);
    }
  }
  const dupStr = Object.entries(dupDropped)
    .map(([k, n]) => `${k}:${n}`)
    .join(", ");
  if (dupStr) lines.push(`重複除去 (子ページ間): ${dupStr}`);
  if (indexNotes) {
    lines.push(`index notes: ${indexNotes.replace(/\s+/g, " ").slice(0, 200)}`);
  }
  merged.notes = lines.join("\n");

  return merged;
}
