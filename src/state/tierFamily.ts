// 倍率 tier 系列 (J-POINT パートナー W / Gold、たまるマーケット) の判定 (PR-0a-2c)。
//
// 背景: 同じ店舗が同じ系列の別倍率 program に二重に紐づくと (例: 高島屋 × Gold 2倍 と Gold 4倍、
//   無印 × たまる 2倍 と 4倍)、計算は最大値が勝つため古い tier が残っても気づけない。
//   tier の付け替え (倍率改定・受け皿の誤り) を検知するため、program id から系列と倍率を取り出す。
//
// 使い道:
//   - scripts/sync/propose-helpers.ts: 同 store × 同系列の別倍率 membership 提案を tierMove で review へ
//   - src/state/seed.test.ts: (storeId, 系列, 有効チャネル) ごとに membership ≤ 1 の契約
// アプリ本体からは import しない (bundle 影響 0)。
//
// 正規表現は末尾 `-(\d+)x$` のアンカーで W (prog-jcb-jpoint-2x) と Gold (prog-jcb-jpoint-gold-2x) が
// 一意に分かれる (「gold を先に判定」は不要)。membership id (m-prog-…) や倍率の無い id は null。
//
// TODO(PR-4b): tier-ladder.ts に統合予定 (REMOVED_MEMBERSHIP_IDS_AUTO の codegen と同時)。
//
// ⚠ scripts/ (tsx / Node) から import されるため、DOM API や import.meta.env を使わないこと。

/** 倍率 tier を持つ program 系列。 */
export type TierFamily = "epos-tamaru" | "jcb-jpoint-gold" | "jcb-jpoint";

export type TierInfo = {
  family: TierFamily;
  /** 倍率 (prog-…-4x なら 4)。 */
  multiplier: number;
};

const TIER_PROGRAM_RE = /^prog-(epos-tamaru|jcb-jpoint-gold|jcb-jpoint)-(\d+)x$/;

/** program id から tier 系列と倍率を返す。tier 系列でない id は null。 */
export function tierFamilyOf(programId: string): TierInfo | null {
  const m = TIER_PROGRAM_RE.exec(programId);
  if (m === null) return null;
  return { family: m[1] as TierFamily, multiplier: Number(m[2]) };
}
