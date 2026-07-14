// カード family (同一ブランドのグレード系列) の静的マスタ。
//
// Card.familyId が参照する定義源。seed() の戻り値には含めず (SeedShape 不変)、
// UI / domain / validators から直接 import して使う静的定数。
//
// exclusive=true は「物理的に同時保有しない切替型」(EPOS のグレード、JALカードSuica の
// 普通/ゴールド)。store の enabled トグルで「同 family の 1 枚だけ有効」の排他 invariant が
// 適用される。exclusive=false は併存保有可 (JCB CARD W + ゴールドは両方保有・利用できる)。
//
// familyId が実在すること (Card.familyId → CARD_FAMILIES.id) の契約は
// src/state/validators.ts (import 検証) と src/state/seed.test.ts (seed 契約) が担保する。
import type { CardFamily } from "../domain/types";

export const CARD_FAMILIES: CardFamily[] = [
  // エポスカード: 一般 / ゴールド / プラチナ の 3 グレードは同一の物理カード種別を
  // 切り替える方式 (インビテーション等でアップグレード)。同時に複数グレードは保有しない。
  { id: "family-epos", name: "エポスカード", exclusive: true },
  // JALカードSuica: 普通 / CLUB-Aゴールド の 2 グレード。従来は「両方 ON でゴールド優先」を
  // 許容していたが、実際には同一ブランドの切替型なので exclusive 化 (PR-1c で挙動変更)。
  { id: "family-jal-suica", name: "JALカードSuica", exclusive: true },
  // JCBカード: W とゴールドは別カードとして両方を保有・利用できる (併存可)。
  // よって exclusive=false — 排他 invariant の対象外。
  { id: "family-jcb", name: "JCBカード", exclusive: false },
];
