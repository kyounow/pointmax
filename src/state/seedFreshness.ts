// PR-5a: 鮮度 (確認月) を同梱 seed から解決する resolver。
//
// lastVerifiedAt は META キー (mergeSeed.PROGRAM_META_KEYS) なので、四半期チェックで seed の
// 確認月を更新しても既存端末のローカルコピーには伝播しない (更新通知を出さないため)。そこで表示時に
// 同梱 seed を id で引き、rate が一致していれば seed の月を使う (resolveVerifiedMonth)。
// 7/21 より前に初期化した端末でも、seed の確認月がそのまま表示・判定に使われる。
//
// CalculatorScreen が CalcResultCard に、EdgeDetailPanel が交換ルートの最終確認表示に使う。
// ⚠ getSeed* は seed() の最終形 (override 適用後・tombstone 除外後) から作る lookup (seed.ts)。

import {
  resolveVerifiedMonth,
  type FreshnessResolver,
} from "../domain/edgeFreshness";
import { getSeedEdge, getSeedProgram } from "./seed";

export const seedFreshness: FreshnessResolver = {
  programMonth: (p) => resolveVerifiedMonth(p, getSeedProgram(p.id)),
  edgeMonth: (e) => resolveVerifiedMonth(e, getSeedEdge(e.id)),
};
