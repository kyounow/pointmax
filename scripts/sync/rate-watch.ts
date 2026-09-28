// 率カナリア (PR-5c-1、Gemini 0 req)。
//
// sources/rate-watch.yaml に並べた公式ページを素の HTTP GET で取り (Gemini は呼ばない)、seed の率の根拠に
// なった逐語句が今も載っているかを照合する。週次 cron の抽出 (Gemini) とは独立した「率が変わった / 店が
// 外れた」の検知経路。検知だけで seed は書き換えない (取り込みは人手の PR)。
//
// 照合の種類 (assertion):
//   - phrases (既定) : anchor (例『ポイントアップ期間』) の各出現位置の ±window 字に phrases が全部そろえば
//                      match。anchor を省くと全文で判定。比較は normalizeForMatch 後の部分一致 (正規表現は使わない)。
//                      subject は program / card / membership で、seedRateAtCuration (照合句を確かめたときの
//                      seed の率) を持つ。seed との一致は rate-watch.test の契約が見る。
//   - storeSet       : 一覧ページの本文に expectedStoreNames が全部あるか (店名集合の fingerprint)。欠けた店名を
//                      storeMissing で返す = 20 倍からの脱落 (membership の欠落) を 0 req で検知する。
//
// 結果の状態: match / phraseMissing / anchorMissing / storeMissing / notFound (HTTP 404・410 = ページ消滅) /
// unreachable (その他の HTTP エラー・timeout・接続エラー・本文が短すぎる tooShort)。unreachable は照合できて
// いないだけなので、--history の前回結果があれば前回の状態を carried で引き継ぐ (carryForward)。
//
// CLI (npm run sync:rate-watch -- [options]):
//   --probe          targets と candidates の HTTP status・本文長・title だけを出す (照合しない。到達性の実測用)
//   --only <id>      その target (probe では candidate も) だけ
//   --out <file>     結果 JSON の出力先 (既定 os.tmpdir()/rate-watch.json。sources/extracted 配下は拒否)
//   --history <file> 前回の結果 (この CLI の出力 JSON、または entries[].rateWatch を持つ履歴 JSON)。5c-2 で使う
// 不一致・到達不可があっても exit 0 (検知専用)。引数の誤りと rate-watch.yaml の破損だけ exit 1。
// GITHUB_STEP_SUMMARY があれば表を追記し、不一致は ::warning:: で最大 5 行出す。
//
// diff-and-propose (Phase C5 guardRateWatched) は loadRateWatchFile / loadWatchedSubjects を使う。
// アプリ (src/) からは import しない。

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { load as parseYaml } from "js-yaml";
import { membershipId } from "../../src/state/defineMemberships";
import { isSafeHttpUrl } from "../../src/domain/urlSafety";
import {
  PREFETCH_TIMEOUT_MS,
  PrefetchError,
  prefetchRawHtml,
  stripHtmlToText,
} from "./fetch-response";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
export const RATE_WATCH_PATH = resolve(REPO_ROOT, "sources/rate-watch.yaml");
const EXTRACTED_DIR = resolve(REPO_ROOT, "sources/extracted");

/** phrases 照合の既定 window (anchor の前後それぞれの字数)。 */
export const DEFAULT_WINDOW = 300;
export const MIN_WINDOW = 50;
export const MAX_WINDOW = 2000;
/** 正規化後の本文がこれ未満なら unreachable (tooShort、JS 描画の疑い)。target ごとに minTextLength で上書きできる。 */
export const DEFAULT_MIN_TEXT_LENGTH = 500;
/** 1 リクエストの上限 (fetch + body 受信)。 */
export const RATE_WATCH_TIMEOUT_MS = PREFETCH_TIMEOUT_MS;
/** 同じサイトに続けて GET するので、リクエストの間に空ける時間。 */
export const REQUEST_INTERVAL_MS = 1000;

// ───────────────────────────────────────────────────────────────
// 型
// ───────────────────────────────────────────────────────────────

export type RateWatchSubject =
  | { kind: "program"; id: string }
  | { kind: "card"; id: string }
  | { kind: "membership"; programId: string; storeId: string }
  /** storeSet 専用。seed に対応する record は無い (一覧ページの店名集合そのものが監視対象)。 */
  | { kind: "category"; id: string };

/** 率を持つ subject (phrases 照合の対象)。 */
export type RateSubject = Exclude<RateWatchSubject, { kind: "category" }>;

export type PhraseAssertion = {
  kind?: "phrases";
  subject: RateSubject;
  /** 照合句を確かめたときの seed の率 (program は PROGRAM_OVERRIDES 適用後の rate、card は defaultRate、
   *  membership は overrideRate ?? program.rate)。seed の率を直す PR はここも同じ PR で更新する。 */
  seedRateAtCuration: number;
  anchor?: string;
  /** normalizeForMatch 後の逐語一致。全部そろって match。 */
  phrases: string[];
  /** anchor の前後それぞれの字数 (既定 DEFAULT_WINDOW)。 */
  window?: number;
};

export type StoreSetAssertion = {
  kind: "storeSet";
  subject: { kind: "category"; id: string };
  /** 一覧に載っているはずの店名 (normalizeForMatch 後の部分一致)。 */
  expectedStoreNames: string[];
};

export type RateWatchAssertion = PhraseAssertion | StoreSetAssertion;

export type RateWatchPriority = 1 | 2 | 3 | 4;

export type RateWatchTarget = {
  id: string;
  label: string;
  url: string;
  priority: RateWatchPriority;
  assertions: RateWatchAssertion[];
  /** 正規化後の本文の最小字数 (既定 DEFAULT_MIN_TEXT_LENGTH)。一覧が空になると短くなるページ用。 */
  minTextLength?: number;
  notes?: string;
};

/** 到達性プローブ専用 (照合しない)。URL はリポジトリに既にあるものだけ。 */
export type RateWatchCandidate = { id: string; url: string; note: string };

export type RateWatchExcluded = { subject: RateWatchSubject; reason: string };

export type RateWatchFile = {
  version: 1;
  targets: RateWatchTarget[];
  candidates?: RateWatchCandidate[];
  excluded: RateWatchExcluded[];
};

// ───────────────────────────────────────────────────────────────
// Loader (構造の検証。fail-closed: 壊れていれば throw)
// ───────────────────────────────────────────────────────────────

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function parseSubject(raw: unknown, where: string): RateWatchSubject {
  if (!isObject(raw)) throw new Error(`rate-watch: ${where}.subject がオブジェクトではない`);
  switch (raw.kind) {
    case "program":
    case "card":
    case "category":
      if (!isNonEmptyString(raw.id)) throw new Error(`rate-watch: ${where}.subject.id が無い`);
      return { kind: raw.kind, id: raw.id };
    case "membership":
      if (!isNonEmptyString(raw.programId) || !isNonEmptyString(raw.storeId)) {
        throw new Error(`rate-watch: ${where}.subject (membership) に programId / storeId が無い`);
      }
      return { kind: "membership", programId: raw.programId, storeId: raw.storeId };
    default:
      throw new Error(
        `rate-watch: ${where}.subject.kind は program / card / membership / category のどれか: ${JSON.stringify(raw.kind)}`,
      );
  }
}

function parseAssertion(raw: unknown, where: string): RateWatchAssertion {
  if (!isObject(raw)) throw new Error(`rate-watch: ${where} がオブジェクトではない`);
  const subject = parseSubject(raw.subject, where);
  if (raw.kind === "storeSet") {
    if (subject.kind !== "category") {
      throw new Error(`rate-watch: ${where} (storeSet) の subject.kind は category`);
    }
    if (!isStringArray(raw.expectedStoreNames)) {
      throw new Error(`rate-watch: ${where}.expectedStoreNames は文字列の配列`);
    }
    return { kind: "storeSet", subject, expectedStoreNames: [...raw.expectedStoreNames] };
  }
  if (raw.kind !== undefined && raw.kind !== "phrases") {
    throw new Error(`rate-watch: ${where}.kind は phrases (省略可) か storeSet: ${JSON.stringify(raw.kind)}`);
  }
  if (subject.kind === "category") {
    throw new Error(`rate-watch: ${where} の subject.kind=category は storeSet でだけ使える`);
  }
  if (typeof raw.seedRateAtCuration !== "number" || !Number.isFinite(raw.seedRateAtCuration)) {
    throw new Error(`rate-watch: ${where}.seedRateAtCuration は数値`);
  }
  if (!isStringArray(raw.phrases)) throw new Error(`rate-watch: ${where}.phrases は文字列の配列`);
  if (raw.anchor !== undefined && typeof raw.anchor !== "string") {
    throw new Error(`rate-watch: ${where}.anchor は文字列`);
  }
  if (raw.window !== undefined && typeof raw.window !== "number") {
    throw new Error(`rate-watch: ${where}.window は数値`);
  }
  return {
    subject,
    seedRateAtCuration: raw.seedRateAtCuration,
    phrases: [...raw.phrases],
    ...(raw.anchor !== undefined ? { anchor: raw.anchor } : {}),
    ...(raw.window !== undefined ? { window: raw.window } : {}),
  };
}

function parseTarget(raw: unknown, i: number): RateWatchTarget {
  const where = `targets[${i}]`;
  if (!isObject(raw)) throw new Error(`rate-watch: ${where} がオブジェクトではない`);
  for (const key of ["id", "label", "url"] as const) {
    if (!isNonEmptyString(raw[key])) throw new Error(`rate-watch: ${where}.${key} が無い`);
  }
  if (typeof raw.priority !== "number") throw new Error(`rate-watch: ${where}.priority は数値`);
  if (!Array.isArray(raw.assertions)) throw new Error(`rate-watch: ${where}.assertions は配列`);
  if (raw.minTextLength !== undefined && typeof raw.minTextLength !== "number") {
    throw new Error(`rate-watch: ${where}.minTextLength は数値`);
  }
  if (raw.notes !== undefined && typeof raw.notes !== "string") {
    throw new Error(`rate-watch: ${where}.notes は文字列`);
  }
  return {
    id: raw.id as string,
    label: raw.label as string,
    url: raw.url as string,
    priority: raw.priority as RateWatchPriority,
    assertions: raw.assertions.map((a, j) => parseAssertion(a, `${where}.assertions[${j}]`)),
    ...(raw.minTextLength !== undefined ? { minTextLength: raw.minTextLength } : {}),
    ...(raw.notes !== undefined ? { notes: raw.notes } : {}),
  };
}

/** parse 済みの YAML から RateWatchFile を作る。構造が不正なら throw (値域・seed 整合は契約テスト)。 */
export function parseRateWatchFile(data: unknown): RateWatchFile {
  if (!isObject(data)) throw new Error("rate-watch: トップレベルがオブジェクトではない");
  if (data.version !== 1) throw new Error(`rate-watch: version は 1: ${JSON.stringify(data.version)}`);
  if (!Array.isArray(data.targets)) throw new Error("rate-watch: targets[] が無い");
  if (!Array.isArray(data.excluded)) throw new Error("rate-watch: excluded[] が無い (無ければ空配列)");
  const targets = data.targets.map((t, i) => parseTarget(t, i));
  let candidates: RateWatchCandidate[] | undefined;
  if (data.candidates !== undefined) {
    if (!Array.isArray(data.candidates)) throw new Error("rate-watch: candidates は配列");
    candidates = data.candidates.map((c, i) => {
      if (!isObject(c) || !isNonEmptyString(c.id) || !isNonEmptyString(c.url) || typeof c.note !== "string") {
        throw new Error(`rate-watch: candidates[${i}] は { id, url, note }`);
      }
      return { id: c.id, url: c.url, note: c.note };
    });
  }
  const excluded = data.excluded.map((e, i) => {
    if (!isObject(e)) throw new Error(`rate-watch: excluded[${i}] がオブジェクトではない`);
    if (typeof e.reason !== "string") throw new Error(`rate-watch: excluded[${i}].reason は文字列`);
    return { subject: parseSubject(e.subject, `excluded[${i}]`), reason: e.reason };
  });
  return { version: 1, targets, ...(candidates ? { candidates } : {}), excluded };
}

/**
 * sources/rate-watch.yaml を読む。ファイルが無ければ null (guard は no-op)。
 * YAML の構文エラーや構造の不正は throw (fail-closed。registry-policy と同じ方針)。
 */
export function loadRateWatchFile(path: string = RATE_WATCH_PATH): RateWatchFile | null {
  if (!existsSync(path)) return null;
  const text = readFileSync(path, "utf-8");
  let data: unknown;
  try {
    data = parseYaml(text);
  } catch (e) {
    throw new Error(`rate-watch: ${path} の YAML が不正: ${e instanceof Error ? e.message : String(e)}`, {
      cause: e,
    });
  }
  return parseRateWatchFile(data);
}

/** subject の比較キー (membership は membershipId で id にする)。 */
export function subjectKey(s: RateWatchSubject): string {
  switch (s.kind) {
    case "membership":
      return `membership:${membershipId(s.programId, s.storeId)}`;
    default:
      return `${s.kind}:${s.id}`;
  }
}

// ───────────────────────────────────────────────────────────────
// 監視対象の集合 (guardRateWatched 用)
// ───────────────────────────────────────────────────────────────

export type WatchedSubjects = {
  /** program id → 監視元の説明 (reviewDetail 用)。membership subject の programId も入る
   *  (membership の率 = overrideRate ?? program.rate なので、program の率・削除も契約を壊す)。 */
  programIds: ReadonlyMap<string, string>;
  cardIds: ReadonlyMap<string, string>;
  /** membershipId(programId, storeId) → 監視元の説明。 */
  membershipIds: ReadonlyMap<string, string>;
};

/** rate-watch.yaml の target の subject から監視対象の id を集める。file が null なら全部空。 */
export function loadWatchedSubjects(file: RateWatchFile | null): WatchedSubjects {
  const programIds = new Map<string, string>();
  const cardIds = new Map<string, string>();
  const membershipIds = new Map<string, string>();
  const setOnce = (m: Map<string, string>, k: string, v: string) => {
    if (!m.has(k)) m.set(k, v);
  };
  for (const t of file?.targets ?? []) {
    for (const a of t.assertions) {
      const s = a.subject;
      if (s.kind === "program") setOnce(programIds, s.id, `target「${t.id}」`);
      else if (s.kind === "card") setOnce(cardIds, s.id, `target「${t.id}」`);
      else if (s.kind === "membership") {
        const mid = membershipId(s.programId, s.storeId);
        setOnce(membershipIds, mid, `target「${t.id}」`);
        setOnce(programIds, s.programId, `target「${t.id}」(${mid} の率の元)`);
      }
    }
  }
  return { programIds, cardIds, membershipIds };
}

// ───────────────────────────────────────────────────────────────
// 契約 (seed との整合と値域)。rate-watch.test が seed() を渡して空配列を期待する
// ───────────────────────────────────────────────────────────────

/** 契約が見る seed の形 (seed() の戻り値をそのまま渡せる)。 */
export type RateWatchSeedView = {
  programs: readonly { id: string; rate: number; validTo?: string }[];
  cards: readonly { id: string; defaultRate: number }[];
  memberships: readonly { id: string; programId: string; overrideRate?: number }[];
};

const KEBAB_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isHttpsSafe(url: string): boolean {
  return url.startsWith("https://") && isSafeHttpUrl(url);
}

/** subject の seed 上の率。無ければ error (実在しない / 参照先 program が無い)。 */
export function seedRateOf(
  s: RateSubject,
  seed: RateWatchSeedView,
): { rate: number; programValidTo?: string } | { error: string } {
  if (s.kind === "program") {
    const p = seed.programs.find((x) => x.id === s.id);
    if (!p) return { error: `program ${s.id} が seed().programs に無い` };
    return { rate: p.rate, programValidTo: p.validTo };
  }
  if (s.kind === "card") {
    const c = seed.cards.find((x) => x.id === s.id);
    if (!c) return { error: `card ${s.id} が seed().cards に無い` };
    return { rate: c.defaultRate };
  }
  const mid = membershipId(s.programId, s.storeId);
  const m = seed.memberships.find((x) => x.id === mid);
  if (!m) return { error: `membership ${mid} が seed().memberships に無い` };
  const p = seed.programs.find((x) => x.id === m.programId);
  if (!p) return { error: `membership ${mid} の program ${m.programId} が seed().programs に無い` };
  return { rate: m.overrideRate ?? p.rate, programValidTo: p.validTo };
}

/**
 * rate-watch.yaml の契約違反を列挙する (空配列なら OK)。検査内容:
 * version 1 / target・candidate の id が一意で kebab-case / url が https で isSafeHttpUrl / label 非空 /
 * priority 1〜4 / assertions 非空 / minTextLength 100〜5000 / phrases 非空 (正規化後も) / window 50〜2000 /
 * subject が seed に実在 / seedRateAtCuration が seed の率と完全一致 / 監視 program (membership の program を
 * 含む) は validTo を持たない (常設だけ) / storeSet の店名が非空で重複なし / excluded.reason 非空 /
 * target と excluded で subject が重複しない。
 * excluded の subject は実在を求めない (期限切れ整理で消える ADDED campaign を載せるため。消えても
 * cron の safety gate でこの契約が落ちないように)。
 */
export function collectRateWatchViolations(
  file: RateWatchFile,
  seed: RateWatchSeedView,
): string[] {
  const v: string[] = [];
  if (file.version !== 1) v.push(`version が 1 ではない: ${String(file.version)}`);
  const ids = new Set<string>();
  const targetSubjectKeys = new Set<string>();
  for (const t of file.targets) {
    const at = `target ${t.id}`;
    if (!KEBAB_ID.test(t.id)) v.push(`${at}: id が kebab-case ではない`);
    if (ids.has(t.id)) v.push(`${at}: id が重複`);
    ids.add(t.id);
    if (t.label.trim() === "") v.push(`${at}: label が空`);
    if (!isHttpsSafe(t.url)) v.push(`${at}: url が https ではない / isSafeHttpUrl を通らない: ${t.url}`);
    if (![1, 2, 3, 4].includes(t.priority)) v.push(`${at}: priority は 1〜4: ${t.priority}`);
    if (t.assertions.length === 0) v.push(`${at}: assertions が空`);
    if (
      t.minTextLength !== undefined &&
      !(Number.isInteger(t.minTextLength) && t.minTextLength >= 100 && t.minTextLength <= 5000)
    ) {
      v.push(`${at}: minTextLength は 100〜5000 の整数: ${t.minTextLength}`);
    }
    t.assertions.forEach((a, j) => {
      const aw = `${at}.assertions[${j}]`;
      targetSubjectKeys.add(subjectKey(a.subject));
      if (a.kind === "storeSet") {
        if (!KEBAB_ID.test(a.subject.id)) v.push(`${aw}: category id が kebab-case ではない`);
        const names = a.expectedStoreNames.map(normalizeForMatch);
        if (names.length === 0) v.push(`${aw}: expectedStoreNames が空`);
        if (names.some((n) => n === "")) v.push(`${aw}: expectedStoreNames に空文字`);
        if (new Set(names).size !== names.length) v.push(`${aw}: expectedStoreNames が重複`);
        return;
      }
      const phrases = a.phrases.map(normalizeForMatch);
      if (phrases.length === 0) v.push(`${aw}: phrases が空`);
      if (phrases.some((p) => p === "")) v.push(`${aw}: phrases に空文字`);
      if (a.anchor !== undefined && normalizeForMatch(a.anchor) === "") v.push(`${aw}: anchor が空`);
      if (
        a.window !== undefined &&
        !(Number.isInteger(a.window) && a.window >= MIN_WINDOW && a.window <= MAX_WINDOW)
      ) {
        v.push(`${aw}: window は ${MIN_WINDOW}〜${MAX_WINDOW} の整数: ${a.window}`);
      }
      const r = seedRateOf(a.subject, seed);
      if ("error" in r) {
        v.push(`${aw}: ${r.error}`);
        return;
      }
      if (r.rate !== a.seedRateAtCuration) {
        v.push(
          `${aw}: seedRateAtCuration ${a.seedRateAtCuration} が seed の率 ${r.rate} と一致しない ` +
            `(${subjectKey(a.subject)}。seed の率を直したら rate-watch.yaml も同じ PR で更新する)`,
        );
      }
      if (r.programValidTo !== undefined) {
        v.push(`${aw}: 監視する program が validTo (${r.programValidTo}) を持つ (常設だけを監視する)`);
      }
    });
  }
  for (const c of file.candidates ?? []) {
    const at = `candidate ${c.id}`;
    if (!KEBAB_ID.test(c.id)) v.push(`${at}: id が kebab-case ではない`);
    if (ids.has(c.id)) v.push(`${at}: id が target / candidate と重複`);
    ids.add(c.id);
    if (!isHttpsSafe(c.url)) v.push(`${at}: url が https ではない / isSafeHttpUrl を通らない: ${c.url}`);
    if (c.note.trim() === "") v.push(`${at}: note が空`);
  }
  file.excluded.forEach((e, i) => {
    const at = `excluded[${i}] (${subjectKey(e.subject)})`;
    if (e.reason.trim() === "") v.push(`${at}: reason が空`);
    if (targetSubjectKeys.has(subjectKey(e.subject))) v.push(`${at}: target の subject と重複`);
  });
  return v;
}

// ───────────────────────────────────────────────────────────────
// 照合
// ───────────────────────────────────────────────────────────────

/**
 * 照合用の正規化: NFKC (全角英数・全角の％・全角空白 U+3000・NBSP U+00A0 を半角に寄せる)、空白類 (改行を
 * 含む。JS の \s は NBSP と全角空白も含む) の連続を 1 つの空白に、数字中の 3 桁区切りカンマを除去
 * ('1,000' → '1000')、数字と 倍 / % / pt の間の空白を除去 ('20 倍' → '20倍')。
 * 冪等 (正規化済みの文字列に当てても変わらない)。
 */
export function normalizeForMatch(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .replace(/(\d),(?=\d{3}(?:\D|$))/g, "$1")
    .replace(/(\d) (?=倍|%|pt)/gi, "$1")
    .trim();
}

export type AssertionStatus = "match" | "phraseMissing" | "anchorMissing" | "storeMissing";

export type AssertionCheck = {
  status: AssertionStatus;
  /** 見つからなかった phrases / 店名。 */
  missing?: string[];
  /** 照合位置の前後 (正規化後、最大 ~150 字)。 */
  snippet?: string;
};

const SNIPPET_RADIUS = 60;

function snippetAround(t: string, at: number, len: number): string {
  return t.slice(Math.max(0, at - SNIPPET_RADIUS), at + len + SNIPPET_RADIUS);
}

/** phrases 照合。text は生の本文でも正規化済みでもよい (内部で正規化する)。 */
export function checkAssertion(
  text: string,
  a: Pick<PhraseAssertion, "anchor" | "phrases" | "window">,
): AssertionCheck {
  const t = normalizeForMatch(text);
  const phrases = a.phrases.map(normalizeForMatch).filter((p) => p !== "");
  if (a.anchor === undefined || normalizeForMatch(a.anchor) === "") {
    const missing = phrases.filter((p) => !t.includes(p));
    if (missing.length > 0) return { status: "phraseMissing", missing };
    const at = phrases.length > 0 ? t.indexOf(phrases[0]) : 0;
    return { status: "match", snippet: snippetAround(t, at, phrases[0]?.length ?? 0) };
  }
  const anchor = normalizeForMatch(a.anchor);
  const w = a.window ?? DEFAULT_WINDOW;
  let best: { missing: string[]; at: number } | null = null;
  for (let i = t.indexOf(anchor); i >= 0; i = t.indexOf(anchor, i + 1)) {
    const around = t.slice(Math.max(0, i - w), i + anchor.length + w);
    const missing = phrases.filter((p) => !around.includes(p));
    if (missing.length === 0) return { status: "match", snippet: snippetAround(t, i, anchor.length) };
    if (best === null || missing.length < best.missing.length) best = { missing, at: i };
  }
  if (best === null) return { status: "anchorMissing", missing: [anchor] };
  return {
    status: "phraseMissing",
    missing: best.missing,
    snippet: snippetAround(t, best.at, anchor.length),
  };
}

/** storeSet 照合: expectedStoreNames が本文に全部あるか。欠けた店名を missing で返す。 */
export function checkStoreSet(
  text: string,
  a: Pick<StoreSetAssertion, "expectedStoreNames">,
): AssertionCheck {
  const t = normalizeForMatch(text);
  const missing = a.expectedStoreNames
    .map(normalizeForMatch)
    .filter((n) => n !== "" && !t.includes(n));
  return missing.length === 0 ? { status: "match" } : { status: "storeMissing", missing };
}

// ───────────────────────────────────────────────────────────────
// 取得と 1 target の実行
// ───────────────────────────────────────────────────────────────

export type RateWatchStatus = AssertionStatus | "notFound" | "unreachable";
export type UnreachableReason = "http" | "timeout" | "network" | "tooShort";

export type AssertionResult = AssertionCheck & { subject: RateWatchSubject };

export type TargetResult = {
  id: string;
  label: string;
  url: string;
  priority: RateWatchPriority;
  status: RateWatchStatus;
  /** 取得の HTTP status (成功は 200。接続エラー・timeout は null)。 */
  httpStatus: number | null;
  unreachableReason?: UnreachableReason;
  /** 正規化後の本文の字数。 */
  textLength?: number;
  assertions: AssertionResult[];
  checkedAt: string;
  /** 不一致 (match / unreachable 以外) を最初に観測した日 (JST の YYYY-MM-DD)。match で消える。 */
  since?: string;
  /** unreachable だったので前回の status / assertions / since を引き継いだ。 */
  carried?: boolean;
};

export type RateWatchRun = {
  version: 1;
  mode: "check";
  generatedAt: string;
  targets: TargetResult[];
};

export type FetchedPage = { status: number; text: string; title?: string };

export type RateWatchDeps = {
  /** 2xx 以外は status を返す (throw しない)。接続エラー・timeout は throw (PrefetchError の reason を見る)。 */
  fetchText(url: string, opts: { timeoutMs: number }): Promise<FetchedPage>;
  sleep?(ms: number): Promise<void>;
};

/** JST の暦日 (YYYY-MM-DD)。 */
export function jstDate(d: Date): string {
  return new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}

function extractTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return undefined;
  const t = stripHtmlToText(m[1]);
  return t === "" ? undefined : t.slice(0, 80);
}

/** 本番の fetchText: prefetchRawHtml (charset 解決 + AbortController timeout) → stripHtmlToText。
 *  prefetchRawHtml は 2xx 以外で throw するので、成功は 200 として返す。 */
export async function fetchPageText(
  url: string,
  opts: { timeoutMs: number },
): Promise<FetchedPage> {
  try {
    const html = await prefetchRawHtml(url, opts.timeoutMs);
    return { status: 200, text: stripHtmlToText(html), title: extractTitle(html) };
  } catch (e) {
    if (e instanceof PrefetchError && e.httpStatus !== null) return { status: e.httpStatus, text: "" };
    throw e;
  }
}

function failureReason(e: unknown): "timeout" | "network" {
  return e instanceof PrefetchError && e.reason === "timeout" ? "timeout" : "network";
}

/** 1 target を取得して全 assertion を照合する。throw しない。 */
export async function runTarget(
  t: RateWatchTarget,
  deps: Pick<RateWatchDeps, "fetchText">,
  now: Date = new Date(),
): Promise<TargetResult> {
  const base = {
    id: t.id,
    label: t.label,
    url: t.url,
    priority: t.priority,
    checkedAt: now.toISOString(),
  };
  let page: FetchedPage;
  try {
    page = await deps.fetchText(t.url, { timeoutMs: RATE_WATCH_TIMEOUT_MS });
  } catch (e) {
    return {
      ...base,
      status: "unreachable",
      httpStatus: null,
      unreachableReason: failureReason(e),
      assertions: [],
    };
  }
  if (page.status === 404 || page.status === 410) {
    // ページ消滅は確定的な信号 (掲載終了の疑い)。unreachable と違い前回の状態を引き継がない
    return { ...base, status: "notFound", httpStatus: page.status, assertions: [], since: jstDate(now) };
  }
  if (page.status < 200 || page.status >= 300) {
    return {
      ...base,
      status: "unreachable",
      httpStatus: page.status,
      unreachableReason: "http",
      assertions: [],
    };
  }
  const text = normalizeForMatch(page.text);
  if (text.length < (t.minTextLength ?? DEFAULT_MIN_TEXT_LENGTH)) {
    return {
      ...base,
      status: "unreachable",
      httpStatus: page.status,
      unreachableReason: "tooShort",
      textLength: text.length,
      assertions: [],
    };
  }
  const assertions: AssertionResult[] = t.assertions.map((a) => ({
    subject: a.subject,
    ...(a.kind === "storeSet" ? checkStoreSet(text, a) : checkAssertion(text, a)),
  }));
  const firstMiss = assertions.find((r) => r.status !== "match");
  return {
    ...base,
    status: firstMiss ? firstMiss.status : "match",
    httpStatus: page.status,
    textLength: text.length,
    assertions,
    ...(firstMiss ? { since: jstDate(now) } : {}),
  };
}

/** targets を順に実行する (同じサイトへの連続 GET の間に REQUEST_INTERVAL_MS 空ける)。 */
export async function runRateWatch(
  targets: readonly RateWatchTarget[],
  deps: RateWatchDeps,
  now: () => Date = () => new Date(),
): Promise<RateWatchRun> {
  const results: TargetResult[] = [];
  for (let i = 0; i < targets.length; i++) {
    if (i > 0) await deps.sleep?.(REQUEST_INTERVAL_MS);
    results.push(await runTarget(targets[i], deps, now()));
  }
  return { version: 1, mode: "check", generatedAt: now().toISOString(), targets: results };
}

function isMismatch(s: RateWatchStatus): boolean {
  return s !== "match" && s !== "unreachable";
}

/**
 * 前回の結果を引き継ぐ。
 * - unreachable: 前回に照合結果 (unreachable 以外) があれば、その status / assertions / since を carried で引き継ぐ
 *   (httpStatus / unreachableReason / checkedAt は今回の値 = なぜ照合できなかったかを残す)。
 * - 不一致: 前回も不一致なら since (初出日) を保つ。
 * - match: since を消す。
 */
export function carryForward(prev: RateWatchRun | null, cur: RateWatchRun): RateWatchRun {
  const prevById = new Map((prev?.targets ?? []).map((t) => [t.id, t]));
  const targets = cur.targets.map((t): TargetResult => {
    const p = prevById.get(t.id);
    if (t.status === "unreachable") {
      if (!p || p.status === "unreachable") return t;
      return {
        ...t,
        status: p.status,
        assertions: p.assertions,
        ...(p.since !== undefined ? { since: p.since } : {}),
        carried: true,
      };
    }
    if (t.status === "match") {
      const rest = { ...t };
      delete rest.since;
      return rest;
    }
    if (p && isMismatch(p.status) && p.since !== undefined) return { ...t, since: p.since };
    return t;
  });
  return { ...cur, targets };
}

// ───────────────────────────────────────────────────────────────
// 到達性プローブ (--probe)
// ───────────────────────────────────────────────────────────────

export type ProbeRow = {
  id: string;
  kind: "target" | "candidate";
  url: string;
  httpStatus: number | null;
  /** 正規化後の本文の字数 (2xx のときだけ)。 */
  textLength?: number;
  title?: string;
  /** timeout / network (接続できなかった理由)。 */
  error?: string;
  elapsedMs: number;
};

export type RateWatchProbeRun = {
  version: 1;
  mode: "probe";
  generatedAt: string;
  rows: ProbeRow[];
};

export async function runProbe(
  file: RateWatchFile,
  deps: RateWatchDeps,
  opts: { only?: string } = {},
  now: () => Date = () => new Date(),
): Promise<RateWatchProbeRun> {
  const items = [
    ...file.targets.map((t) => ({ id: t.id, kind: "target" as const, url: t.url })),
    ...(file.candidates ?? []).map((c) => ({ id: c.id, kind: "candidate" as const, url: c.url })),
  ].filter((x) => opts.only === undefined || x.id === opts.only);
  const rows: ProbeRow[] = [];
  for (let i = 0; i < items.length; i++) {
    if (i > 0) await deps.sleep?.(REQUEST_INTERVAL_MS);
    const it = items[i];
    const started = Date.now();
    try {
      const page = await deps.fetchText(it.url, { timeoutMs: RATE_WATCH_TIMEOUT_MS });
      const ok = page.status >= 200 && page.status < 300;
      rows.push({
        ...it,
        httpStatus: page.status,
        ...(ok ? { textLength: normalizeForMatch(page.text).length } : {}),
        ...(ok && page.title ? { title: page.title } : {}),
        elapsedMs: Date.now() - started,
      });
    } catch (e) {
      rows.push({ ...it, httpStatus: null, error: failureReason(e), elapsedMs: Date.now() - started });
    }
  }
  return { version: 1, mode: "probe", generatedAt: now().toISOString(), rows };
}

// ───────────────────────────────────────────────────────────────
// Step Summary / annotation
// ───────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<RateWatchStatus, string> = {
  match: "✅ match",
  phraseMissing: "⚠️ phraseMissing",
  anchorMissing: "⚠️ anchorMissing",
  storeMissing: "⚠️ storeMissing",
  notFound: "⚠️ notFound",
  unreachable: "⛔ unreachable",
};

/** Markdown の表のセル用 (| と改行を潰す)。 */
function cell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

function describeTarget(t: TargetResult): string {
  const parts: string[] = [];
  if (t.carried) {
    parts.push(
      `今回は到達不可 (${t.unreachableReason ?? "?"}${t.httpStatus !== null ? ` ${t.httpStatus}` : ""})、前回の状態を表示`,
    );
  } else if (t.status === "unreachable") {
    parts.push(`到達不可: ${t.unreachableReason ?? "?"}`);
  }
  for (const a of t.assertions) {
    if (a.status === "match" || !a.missing || a.missing.length === 0) continue;
    const label = a.status === "storeMissing" ? "欠けた店名" : a.status === "anchorMissing" ? "anchor なし" : "欠けた句";
    parts.push(`${subjectKey(a.subject)}: ${label}「${a.missing.join("」「")}」`);
  }
  if (t.status === "notFound") parts.push("ページが消えている (掲載終了の疑い)");
  if (t.since && isMismatch(t.status)) parts.push(`${t.since} から`);
  return parts.join(" / ");
}

const MAX_ANNOTATIONS = 5;

/** check の結果を Step Summary の Markdown と ::warning:: (最大 5 行) にする。 */
export function renderRateWatchMarkdown(run: RateWatchRun): { markdown: string; annotations: string[] } {
  const rows = [...run.targets].sort((a, b) => a.priority - b.priority);
  const matched = rows.filter((t) => t.status === "match").length;
  const mismatched = rows.filter((t) => isMismatch(t.status));
  const unreachable = rows.filter((t) => t.status === "unreachable" || t.carried).length;
  const lines = [
    "## 率カナリア (rate-watch、Gemini 0 req)",
    "",
    `- ${run.generatedAt} / target ${rows.length} 件: match ${matched} / 不一致 ${mismatched.length} / 到達不可 ${unreachable} (うち前回の状態を引き継ぎ ${rows.filter((t) => t.carried).length})`,
    "- 不一致は seed の率・membership が古い疑い。公式ページを開いて確認し、直すなら seed の手修正と sources/rate-watch.yaml の更新を同じ PR で",
    "",
    "| 優先度 | target | 状態 | HTTP | 本文長 | 詳細 |",
    "|---|---|---|---|---|---|",
  ];
  for (const t of rows) {
    lines.push(
      `| ${t.priority} | [${cell(t.label)}](${t.url}) \`${t.id}\` | ${STATUS_LABEL[t.status]}${t.carried ? " (前回)" : ""} | ${t.httpStatus ?? "-"} | ${t.textLength ?? "-"} | ${cell(describeTarget(t))} |`,
    );
  }
  const annotations = mismatched.map(
    (t) => `::warning title=rate-watch ${t.id}::${t.label}: ${t.status} (${describeTarget(t)}) ${t.url}`,
  );
  if (annotations.length > MAX_ANNOTATIONS) {
    const rest = annotations.length - (MAX_ANNOTATIONS - 1);
    annotations.splice(
      MAX_ANNOTATIONS - 1,
      annotations.length,
      `::warning title=rate-watch::ほか ${rest} 件の不一致 (Step Summary の表を参照)`,
    );
  }
  return { markdown: lines.join("\n"), annotations };
}

/** probe の結果を Step Summary の Markdown にする (到達性の表)。 */
export function renderProbeMarkdown(run: RateWatchProbeRun): string {
  const ok = run.rows.filter((r) => r.httpStatus !== null && r.httpStatus >= 200 && r.httpStatus < 300).length;
  const lines = [
    "## 率カナリア 到達性プローブ (rate-watch --probe、Gemini 0 req)",
    "",
    `- ${run.generatedAt} / ${run.rows.length} URL: 2xx ${ok} / それ以外 ${run.rows.length - ok}。照合はしない`,
    "- 2xx で本文長が十分 (目安 500 字以上) の domain だけを canary の target にする",
    "",
    "| 種別 | id | HTTP | 本文長 | title | ms |",
    "|---|---|---|---|---|---|",
  ];
  for (const r of run.rows) {
    lines.push(
      `| ${r.kind} | [\`${r.id}\`](${r.url}) | ${r.httpStatus ?? `- (${r.error ?? "error"})`} | ${r.textLength ?? "-"} | ${cell(r.title ?? "")} | ${r.elapsedMs} |`,
    );
  }
  return lines.join("\n");
}

// ───────────────────────────────────────────────────────────────
// CLI
// ───────────────────────────────────────────────────────────────

export type CliArgs = { probe: boolean; only?: string; out: string; history?: string };

/** --out の解決。既定は os.tmpdir()/rate-watch.json。sources/extracted 配下は throw (抽出キャッシュを汚さない)。 */
export function resolveOutPath(out: string | undefined, extractedDir: string = EXTRACTED_DIR): string {
  const p = resolve(out ?? resolve(tmpdir(), "rate-watch.json"));
  const rel = relative(resolve(extractedDir), p);
  if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) {
    throw new Error(`rate-watch: --out に sources/extracted 配下は指定できない: ${p}`);
  }
  return p;
}

export function parseCliArgs(argv: readonly string[]): CliArgs {
  let probe = false;
  let only: string | undefined;
  let out: string | undefined;
  let history: string | undefined;
  const value = (i: number, flag: string): string => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) throw new Error(`rate-watch: ${flag} に値が無い`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--probe") probe = true;
    else if (a === "--only") only = value(i++, a);
    else if (a === "--out") out = value(i++, a);
    else if (a === "--history") history = value(i++, a);
    else throw new Error(`rate-watch: 未知の引数 ${a} (--probe / --only <id> / --out <file> / --history <file>)`);
  }
  return { probe, out: resolveOutPath(out), ...(only !== undefined ? { only } : {}), ...(history !== undefined ? { history: resolve(history) } : {}) };
}

/**
 * 前回の結果を読む。この CLI の出力 (mode: check) か、entries[] に rateWatch を持つ履歴 JSON (5c-2 の
 * SYNC_HISTORY.json) の先頭の rateWatch。ファイルが無い・形が違えば null。
 */
export function readPreviousRun(path: string): RateWatchRun | null {
  if (!existsSync(path)) return null;
  const data: unknown = JSON.parse(readFileSync(path, "utf-8"));
  const asRun = (x: unknown): RateWatchRun | null =>
    isObject(x) && x.version === 1 && x.mode === "check" && Array.isArray(x.targets)
      ? (x as unknown as RateWatchRun)
      : null;
  const direct = asRun(data);
  if (direct) return direct;
  if (isObject(data) && Array.isArray(data.entries)) {
    for (const e of data.entries) {
      const r = isObject(e) ? asRun(e.rateWatch) : null;
      if (r) return r;
    }
  }
  return null;
}

function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
}

function appendStepSummary(markdown: string): void {
  const p = process.env.GITHUB_STEP_SUMMARY;
  if (p) appendFileSync(p, `${markdown}\n`);
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));
  const file = loadRateWatchFile();
  if (!file) {
    console.log("ℹ️ sources/rate-watch.yaml が無いので何もしない");
    return;
  }
  const deps: RateWatchDeps = {
    fetchText: fetchPageText,
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  };
  if (args.only !== undefined) {
    const known = [...file.targets.map((t) => t.id), ...(file.candidates ?? []).map((c) => c.id)];
    if (!known.includes(args.only)) throw new Error(`rate-watch: --only ${args.only} は rate-watch.yaml に無い`);
  }

  if (args.probe) {
    console.log(`🔎 rate-watch probe: ${file.targets.length} target + ${(file.candidates ?? []).length} candidate (照合しない)`);
    const run = await runProbe(file, deps, { only: args.only });
    writeJson(args.out, run);
    const md = renderProbeMarkdown(run);
    console.log(md);
    appendStepSummary(md);
    console.log(`✓ wrote ${args.out}`);
    return;
  }

  const targets = file.targets.filter((t) => args.only === undefined || t.id === args.only);
  console.log(`🔎 rate-watch: ${targets.length} target を照合 (Gemini 0 req)`);
  const cur = await runRateWatch(targets, deps);
  const run = carryForward(args.history ? readPreviousRun(args.history) : null, cur);
  writeJson(args.out, run);
  const { markdown, annotations } = renderRateWatchMarkdown(run);
  console.log(markdown);
  for (const a of annotations) console.log(a);
  appendStepSummary(markdown);
  console.log(`✓ wrote ${args.out}`);
}

// CLI として実行された場合のみ main を呼ぶ (テスト・diff-and-propose からの import 時は呼ばない)
const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  main().catch((err) => {
    console.error("💥 Error:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
