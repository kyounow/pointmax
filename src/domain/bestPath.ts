import type { ConversionEdge } from "./types";

export type BestPathResult = {
  finalAmount: number;
  product: number;
  steps: ConversionEdge[];
};

export function bestPath(
  edges: ConversionEdge[],
  fromId: string,
  toId: string,
  startAmount: number = 1,
  availableCardIds?: ReadonlySet<string>,
  blockedCurrencyIds?: ReadonlySet<string>,
): BestPathResult | null {
  if (fromId === toId) {
    return { finalAmount: startAmount, product: 1, steps: [] };
  }

  // ゲーティング (v6.0.0 で blockedCurrencyIds を追加):
  //  (1) availableCardIds: requiredCardIds が制約を満たさないエッジを除外 (クレカ保有)。
  //      undefined 時は従来通り全エッジ (テスト等の後方互換)。
  //  (2) blockedCurrencyIds: ユーザーが「使わない」選択をしたポイント通貨 (= 該当
  //      pointCard を OFF にし、他の有効資産でも貯まらない通貨) を起点・経由に持つ
  //      エッジを除外する。edge は fromCurrencyId が blocked のとき通行不可。
  //      目標通貨 (最終 toCurrency) はゲートしない (goal はユーザーが明示選択)。
  //      純粋な経由通貨 (どの pointCard にも紐づかない) はブロックされない。
  //      undefined / 空集合なら制約なし (全解放 = FULL ルート / 後方互換)。
  const gated = edges.filter((e) => {
    if (
      availableCardIds &&
      e.requiredCardIds?.length &&
      !e.requiredCardIds.some((id) => availableCardIds.has(id))
    ) {
      return false;
    }
    if (blockedCurrencyIds && blockedCurrencyIds.has(e.fromCurrencyId)) {
      return false;
    }
    return true;
  });
  const valid = gated.filter((e) => e.rate > 0);

  const nodes = new Set<string>([fromId, toId]);
  for (const e of valid) {
    nodes.add(e.fromCurrencyId);
    nodes.add(e.toCurrencyId);
  }

  const bestProduct = new Map<string, number>();
  const prevEdge = new Map<string, ConversionEdge | null>();
  for (const n of nodes) {
    bestProduct.set(n, n === fromId ? 1 : -Infinity);
    prevEdge.set(n, null);
  }

  const V = nodes.size;
  for (let i = 0; i < V - 1; i++) {
    let updated = false;
    for (const e of valid) {
      const u = bestProduct.get(e.fromCurrencyId);
      if (u === undefined || u === -Infinity) continue;
      const candidate = u * e.rate;
      // e.toCurrencyId は line 32-35 で nodes に追加されているので
      // bestProduct.get() は必ず値を返すが、防御的に -Infinity fallback。
      const v = bestProduct.get(e.toCurrencyId) ?? -Infinity;
      if (candidate > v) {
        bestProduct.set(e.toCurrencyId, candidate);
        prevEdge.set(e.toCurrencyId, e);
        updated = true;
      }
    }
    if (!updated) break;
  }

  // toId は line 31 で nodes に追加されているので必ず値が入るが、
  // 防御的に -Infinity fallback (= 後段で null 返却)。
  const finalProduct = bestProduct.get(toId) ?? -Infinity;
  if (finalProduct === -Infinity) return null;

  const steps: ConversionEdge[] = [];
  let cur = toId;
  let safety = V;
  while (cur !== fromId) {
    const e = prevEdge.get(cur);
    if (!e || safety-- <= 0) return null;
    steps.unshift(e);
    cur = e.fromCurrencyId;
  }

  return {
    finalAmount: startAmount * finalProduct,
    product: finalProduct,
    steps,
  };
}
