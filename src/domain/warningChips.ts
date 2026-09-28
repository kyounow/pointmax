// PR-0a-2b: 計算結果カード (CalcResultCard 展開ビュー) の「警告チップ」の表示予算を決める純関数。
//
// 【背景】
//   展開ビューには 要エントリー / 上限 / 条件チップ (notes・conditions・membership.notes 由来の
//   限定・対象外・経由型) / 公式情報の鮮度 (stale。PR-5a で交換ルート・還元率を『古い情報かも』
//   1 チップに統合) / 最低交換単位 (端数) が並びうる。
//   以前は「優先順で最大 3」をコメント運用で守っていたが、M3 (条件チップの合流) で同時に立つ
//   組み合わせが増えたため、優先順と件数予算を 1 関数に集約する。
//   6b (円換算モードへの移植)・5a (stale)・4e (要経由) もこの関数を使う (二重実装しない)。
//
// 【優先順 (高い順)】
//   要エントリー = 要経由 > channel (経由型・チャネル限定) > 上限 > 限定条件 / 対象外 > stale > 端数
//   同順位は候補の並び順 (安定ソート)。同じ kind は最初の 1 件だけ (専用バッジを先に渡せば
//   notes 由来の同種チップより優先される)。最大 WARNING_CHIP_BUDGET 件。
//
// 【buildWarningPlan (PR-6b)】
//   1 件の試算結果 (CardRanking) から警告候補 (要エントリー / 上限 / 条件チップ / stale / 端数) を
//   組み立てて rankWarningChips に通すまでを 1 関数にまとめたもの。通常ビュー (CalcResultCard の
//   展開ビュー) と円換算ビュー (CalcYenResults の各行) が同じ出力を描画する (二重実装しない)。
//
// React 非依存。node / jsdom どちらでもテストできる。

import type { CardRanking } from "./rankCards";
import type {
  BenefitProgram,
  ConversionEdge,
  StoreProgramMembership,
} from "./types";
import {
  extractNoteChips,
  joinNoteTexts,
  sanitizeNoteForDisplay,
  type NoteChipKind,
} from "./noteParser";
import {
  collectStaleItems,
  FRESHNESS_STALE_MONTHS,
  type FreshnessItem,
  type FreshnessResolver,
} from "./edgeFreshness";
import { isSafeHttpUrl } from "./urlSafety";
import { cardLabel } from "./cardLabel";

export type WarningChipKind =
  | NoteChipKind // entry / channel / cap / exclusion / limited (noteParser の条件チップ)
  | "via" // 要経由 (PR-4e のネットモードで使用。要エントリーと同順位)
  | "stale" // 公式情報の最終確認が 12 ヶ月超 (edgeFreshness.FRESHNESS_STALE_MONTHS)
  | "minUnit"; // 最低交換単位 (端数) の注記

/** 1 展開ビューに出す警告チップの上限件数。 */
export const WARNING_CHIP_BUDGET = 3;

/** 小さいほど優先。同値は同順位 (候補の並び順で決まる)。 */
export const WARNING_CHIP_PRIORITY: Readonly<Record<WarningChipKind, number>> = {
  entry: 0,
  via: 0,
  channel: 1,
  cap: 2,
  limited: 3,
  exclusion: 3,
  stale: 4,
  minUnit: 5,
};

/**
 * 警告チップの候補を優先順に並べ、同 kind の重複を除いて最大 budget 件に絞る。
 * 候補には任意の payload を載せてよい (描画側が kind 以外の情報を持ち回せるよう generic)。
 */
export function rankWarningChips<T extends { kind: WarningChipKind }>(
  candidates: ReadonlyArray<T>,
  budget: number = WARNING_CHIP_BUDGET,
): T[] {
  const seen = new Set<WarningChipKind>();
  const unique: { c: T; i: number }[] = [];
  candidates.forEach((c, i) => {
    if (seen.has(c.kind)) return;
    seen.add(c.kind);
    unique.push({ c, i });
  });
  unique.sort(
    (a, b) =>
      WARNING_CHIP_PRIORITY[a.c.kind] - WARNING_CHIP_PRIORITY[b.c.kind] ||
      a.i - b.i,
  );
  return unique.slice(0, Math.max(0, budget)).map((x) => x.c);
}

/** 警告候補の出どころ (同じ kind の専用バッジと条件チップを区別する)。 */
export type WarningSource =
  | "entryBadge"
  | "capBadge"
  | "note"
  | "stale"
  | "minUnit";

/** 『⚠ 要エントリー』の中身。entryUrl は isSafeHttpUrl を通った採用 program の最初の URL。 */
export type EntryWarning = { entryUrl: string | undefined; title: string };

/** 『⚠ 古い情報かも』の中身。oldest = 本文に出す最古の月、title = 閾値の案内 + 内訳。 */
export type StaleWarning = { oldest: string; title: string };

export type WarningPlan = {
  /** primary 行で採用された program (resolved.source === "program" のときだけ)。 */
  program: BenefitProgram | undefined;
  entry: EntryWarning | null;
  /** 条件チップの抽出元 = program の notes + conditions + この店の membership.notes。 */
  chipNotes: string | undefined;
  stale: StaleWarning | null;
  /** 警告予算の内側に残った候補の出どころ。描画側はここに含まれるものだけを出す。 */
  shown: ReadonlySet<WarningSource>;
  /** 予算内に残った条件チップの kind (NoteChips の visibleKinds)。 */
  noteKinds: ReadonlySet<NoteChipKind>;
};

export type WarningPlanInput = {
  ranking: CardRanking;
  programById: ReadonlyMap<string, BenefitProgram>;
  /** 現在の店舗での program の membership (親が storeId で束縛)。省略時は membership を見ない。 */
  membershipOf?: (programId: string) => StoreProgramMembership | undefined;
  /** 確認月の解決方法 (アプリは同梱 seed 参照の seedFreshness)。 */
  freshness: FreshnessResolver;
  /** stale 判定の基準日。 */
  now: Date;
  currencyName: (id: string) => string;
  /**
   * stale を判定するか。既定は ranking.reachable (通常ビュー = 目標通貨に届く結果だけ)。
   * 円換算ビューは rankCards 上は全カード path 到達不能なので、円評価の到達可否を渡す。
   */
  reachable?: boolean;
};

/**
 * 1 件の試算結果の警告チップを組み立てる (PR-6b で CalcResultCard から切り出し。挙動は不変)。
 *   - 要エントリー: 採用 program (adoptedProgramIds) のいずれかが requiresEntry。entryUrl は安全な
 *     http(s) だけ (無ければバッジのみ)。
 *   - 上限: primary 行の program の monthlyCapAmountYen。
 *   - 条件チップ: primary 行の program の notes + conditions + membership.notes (M3)。
 *   - stale: 採用した交換ルート (primary / addOn / reachable な loyalty の経路 edge) と還元率
 *     (採用 program / source:'default' ならカードの基本還元) の確認月の最古が 12 ヶ月超。
 *   - 端数: minUnitAnnotations が 1 件以上。
 * 専用バッジ (要エントリー・上限) を条件チップより先に渡し、同 kind は専用バッジを優先する。
 */
export function buildWarningPlan({
  ranking: r,
  programById,
  membershipOf,
  freshness,
  now,
  currencyName,
  reachable = r.reachable,
}: WarningPlanInput): WarningPlan {
  const resolvedProgram =
    r.resolved.source === "program"
      ? programById.get(r.resolved.programId)
      : undefined;
  const adopted = r.adoptedProgramIds
    .map((id) => programById.get(id))
    .filter((p): p is BenefitProgram => p !== undefined);

  // REM-#5: 要エントリー (charge の base program は requiresEntry を持たない)。
  let entry: EntryWarning | null = null;
  const entryProgs = adopted.filter((p) => p.requiresEntry === true);
  if (entryProgs.length > 0) {
    const names = entryProgs.map((p) => p.name).join(" / ");
    const entryUrl = entryProgs
      .map((p) => p.entryUrl)
      .find((u): u is string => !!u && isSafeHttpUrl(u));
    entry = {
      entryUrl,
      title: `エントリー / 登録が必要な特典が含まれます (${names})。${entryUrl ? "タップでエントリーページを開きます。" : ""}未エントリーだと表示の還元が付かない場合があります。`,
    };
  }

  // PR-0a-2b (M3): 条件チップの抽出元 (店別の条件 = membership.notes を合流)。
  const chipNotes = resolvedProgram
    ? joinNoteTexts(
        resolvedProgram.notes,
        resolvedProgram.conditions,
        membershipOf?.(resolvedProgram.id)?.notes,
      )
    : undefined;

  // REM-#2 / PR-5a: 鮮度。未記入は無視 (未検証を古い扱いしない)。対象外の結果には出さない。
  let stale: StaleWarning | null = null;
  if (reachable) {
    const items: FreshnessItem[] = [];
    const seenEdgeIds = new Set<string>();
    const addRoute = (steps: readonly ConversionEdge[]) => {
      for (const e of steps) {
        if (seenEdgeIds.has(e.id)) continue;
        seenEdgeIds.add(e.id);
        items.push({
          kind: "route",
          label: `${currencyName(e.fromCurrencyId)}→${currencyName(e.toCurrencyId)}`,
          month: freshness.edgeMonth(e),
        });
      }
    };
    addRoute(r.pathSteps);
    for (const b of r.appBonusBreakdown) addRoute(b.pathSteps);
    for (const l of r.loyalties) if (l.reachable) addRoute(l.pathSteps);
    for (const p of adopted) {
      items.push({ kind: "rate", label: p.name, month: freshness.programMonth(p) });
    }
    // B11: カードの基本還元 (defaultRate) で計算した結果は、その確認月も対象。
    if (r.resolved.source === "default") {
      items.push({
        kind: "rate",
        label: `${cardLabel(r.card)} の基本還元`,
        month: freshness.cardMonth(r.card),
      });
    }
    const summary = collectStaleItems(items, now);
    if (summary) {
      stale = {
        oldest: summary.oldest,
        title:
          `最終確認から${FRESHNESS_STALE_MONTHS}ヶ月超。公式サイトで最新の内容をご確認ください (計算は現在の値のまま)` +
          summary.stale
            .map(
              (s) =>
                `\n・${s.kind === "route" ? "ルート" : "還元率"} ${s.label} (${s.month})`,
            )
            .join(""),
      };
    }
  }

  type Candidate = { kind: WarningChipKind; source: WarningSource };
  const warnings = rankWarningChips<Candidate>([
    ...(entry ? [{ kind: "entry", source: "entryBadge" } as const] : []),
    ...(resolvedProgram?.monthlyCapAmountYen
      ? [{ kind: "cap", source: "capBadge" } as const]
      : []),
    ...extractNoteChips(sanitizeNoteForDisplay(chipNotes)).map(
      (c): Candidate => ({ kind: c.kind, source: "note" }),
    ),
    ...(stale ? [{ kind: "stale", source: "stale" } as const] : []),
    ...(r.minUnitAnnotations.length > 0
      ? [{ kind: "minUnit", source: "minUnit" } as const]
      : []),
  ]);

  return {
    program: resolvedProgram,
    entry,
    chipNotes,
    stale,
    shown: new Set(warnings.map((w) => w.source)),
    noteKinds: new Set(
      warnings
        .filter((w) => w.source === "note")
        .map((w) => w.kind as NoteChipKind),
    ),
  };
}
