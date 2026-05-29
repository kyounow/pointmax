// PointMax v6.0.1: 全置換取込 (syncFromUrl / importJson) で「使う/使わない」等の
// preference フィールドを保護するヘルパ。
//
// 背景:
//   syncFromUrl (設定の「URLから取得して全上書き」) と importJson は state を全置換する。
//   対象が公式 master.json (cron 配信物、デフォルト URL) のとき、master.json には
//   per-user preference (Card/PaymentApp/PointCard.enabled、userModifiedAt) が含まれない
//   (seed が未設定 + JSON.stringify が undefined を落とす) ため、全置換でユーザーの
//   「使う/使わない」設定が消えていた。
//
// 方針:
//   取込レコード (incoming) が preference キーを **持たない** 場合のみローカル値を引き継ぐ。
//   - 公式 master 取込 (キー無し) → ローカルの on/off を保持
//   - クロスデバイス export (enabled:false を明示的に持つ) → リモート値が優先
//   "key in r" 判定でこの 2 ケースを正しく分岐する。

type WithId = { id: string };

export function preservePreferences<T extends WithId>(
  incoming: T[],
  local: T[],
  prefKeys: readonly string[],
): T[] {
  const byId = new Map(local.map((x) => [x.id, x]));
  return incoming.map((r) => {
    const l = byId.get(r.id);
    if (!l) return r; // ローカルに無い新規レコードはそのまま
    const rec = r as Record<string, unknown>;
    const localRec = l as Record<string, unknown>;
    let changed = false;
    const merged: Record<string, unknown> = { ...rec };
    for (const k of prefKeys) {
      // 取込側に当該キーが無く、ローカルに値があれば引き継ぐ
      if (!(k in rec)) {
        const lv = localRec[k];
        if (lv !== undefined) {
          merged[k] = lv;
          changed = true;
        }
      }
    }
    return (changed ? merged : r) as T;
  });
}
