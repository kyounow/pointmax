import type { BenefitProgram, StoreProgramMembership } from "./types";
import { stableStringifyProgramContent, type Diff } from "./mergeSeed";

// 週次 cron 同期で bundled seed に増えた「ユーザー未取得データ」を
// 安定指紋にする。SEED_VERSION とは独立 (cron は版数を bump しない方針)。
// 同じ差分集合なら順序によらず同一文字列、別の差分なら別文字列を返す。
//
// extras (Phase 5): program の内容更新 / tombstone 削除も指紋に含める。
// 更新は内容込み (同じ campaign が再延長されたら別バッチとして再通知するため)、
// 削除は id のみ。
// PR-0a-2b: membership の内容更新 (memU) / 単体 tombstone 削除 (memD) も含める。
export type DigestExtras = {
  updatedPrograms?: ReadonlyArray<BenefitProgram>;
  removedPrograms?: ReadonlyArray<BenefitProgram>;
  updatedMemberships?: ReadonlyArray<StoreProgramMembership>;
  removedMemberships?: ReadonlyArray<StoreProgramMembership>;
};

// FNV-1a 32bit。短く決定論的で衝突実用上問題なし (localStorage 比較用途)。
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

export function syncDigest(diff: Diff, extras?: DigestExtras): string {
  const keys: string[] = [];
  for (const c of diff.cards) keys.push(`card:${c.id}`);
  for (const c of diff.currencies) keys.push(`cur:${c.id}`);
  for (const s of diff.stores) keys.push(`store:${s.id}`);
  for (const e of diff.edges) keys.push(`edge:${e.id}`);
  for (const p of diff.pointCards) keys.push(`pc:${p.id}`);
  for (const a of diff.paymentApps) keys.push(`pa:${a.id}`);
  for (const p of diff.programs ?? []) keys.push(`prog:${p.id}`);
  for (const m of diff.memberships ?? [])
    keys.push(`mem:${m.programId}:${m.storeId}`);
  // PR-0a-2b: 更新は内容全体 (mergeSeed の比較と同じ正規形) のハッシュで指紋化する。
  // 以前は rate / validFrom / validTo だけだったため、channel / conditions / notes だけの
  // 公式更新が既読 digest と同一になり、自動反映も通知もされなかった (GAPS P3)。
  for (const p of extras?.updatedPrograms ?? [])
    keys.push(`progU:${p.id}:${fnv1a(stableStringifyProgramContent(p))}`);
  for (const p of extras?.removedPrograms ?? []) keys.push(`progD:${p.id}`);
  for (const m of extras?.updatedMemberships ?? [])
    keys.push(
      `memU:${m.id}:${JSON.stringify([
        m.overrideRate ?? null,
        m.overrideCurrencyId ?? null,
        m.channel ?? null,
        m.notes ?? null,
      ])}`,
    );
  for (const m of extras?.removedMemberships ?? []) keys.push(`memD:${m.id}`);

  if (keys.length === 0) return "";

  keys.sort();
  return `${keys.length}-${fnv1a(keys.join("|"))}`;
}

export type SyncGroup = { label: string; items: string[] };

type NameResolver = {
  store: (id: string) => string;
  program: (id: string) => string;
};

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

// 差分を「カード / 店舗 / 提携店舗 ...」の人間可読グループに整形する。
// memberships は id だけだと読めないので resolver で店舗名/プログラム名に解決する。
// extras (Phase 5): program の内容更新 (rate 改定/期間延長) と
// tombstone 削除 (終了キャンペーン) も表示グループに含める。
// PR-0a-2b: membership の内容更新 (提携条件の更新) と単体 tombstone (提携店舗の削除) も含める。
export function buildSyncGroups(
  diff: Diff,
  resolve: NameResolver,
  extras?: DigestExtras,
): SyncGroup[] {
  const groups: SyncGroup[] = [];
  const push = (label: string, items: string[]) => {
    if (items.length > 0) groups.push({ label, items });
  };
  const membershipLabel = (m: StoreProgramMembership) =>
    `${resolve.program(m.programId)} → ${resolve.store(m.storeId)}`;

  push("カード", diff.cards.map((c) => c.name));
  push("通貨", diff.currencies.map((c) => c.name));
  push("店舗", diff.stores.map((s) => s.name));
  push("交換ルート", diff.edges.map((e) => e.id));
  push("ポイントカード", diff.pointCards.map((p) => p.name));
  push("支払方法", diff.paymentApps.map((a) => a.name));
  push(
    "特典・キャンペーン",
    (diff.programs ?? []).map((p) => `${p.name} (${pct(p.rate)})`),
  );
  push("提携店舗", (diff.memberships ?? []).map(membershipLabel));
  push(
    "内容更新 (還元率・期間・条件)",
    (extras?.updatedPrograms ?? []).map(
      (p) =>
        `${p.name} (${pct(p.rate)}${p.validTo ? `、〜${p.validTo}` : ""})`,
    ),
  );
  push(
    "提携条件の更新",
    (extras?.updatedMemberships ?? []).map(membershipLabel),
  );
  push(
    "終了・削除",
    (extras?.removedPrograms ?? []).map((p) => p.name),
  );
  push(
    "提携店舗の削除",
    (extras?.removedMemberships ?? []).map(membershipLabel),
  );

  return groups;
}
