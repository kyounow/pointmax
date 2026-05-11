// 配列を指定キーでグループ化（出現順を維持）
export function groupBy<T, K extends string>(
  items: T[],
  keyFn: (item: T) => K,
): { key: K; items: T[] }[] {
  const map = new Map<K, T[]>();
  const order: K[] = [];
  for (const item of items) {
    const k = keyFn(item);
    if (!map.has(k)) {
      map.set(k, []);
      order.push(k);
    }
    map.get(k)!.push(item);
  }
  return order.map((key) => ({ key, items: map.get(key)! }));
}
