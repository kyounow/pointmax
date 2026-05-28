// PointMax: チェーン店判定ヘルパ (Wave 3 C-9 audit-fix、PR #56 部分解除)
//
// 背景:
//   PR #56 で「新規 store の auto-merge 全停止 (storeAdditionsDisabled)」を確定したが、
//   ユーザー指示 (2026-05-28) で「キャンペーンが実施されるような層 (チェーン店等) は
//   auto-merge OK」に方針を緩める。
//
//   本モジュールは「(a) 同 run に campaign program が membership 参照」+
//   「(b) チェーン名パターン or chain-heavy category」を AND で満たす新規 store を
//   storeAdditionsDisabled ガードから除外し auto に復帰させる判定群を提供する。
//
// 注意:
//   - 名前パターン (KNOWN_CHAIN_NAME_PATTERNS) は保守対象。新しい全国チェーンが
//     追加された場合はここに patternsを追記する。SESSION_LOG の「将来の地雷」候補。
//   - chain-heavy category は「同 category に既存 store が 3+ あればチェーン業態」と
//     判定。コンビニ / 飲食 / ドラッグストア / 家電 等が該当しやすい。
//   - 単独で実装しても誤検知は campaign 参照条件で抑制される (店舗が campaign 程
//     注目されていない = リスク低)。

const KNOWN_CHAIN_NAME_PATTERNS: RegExp[] = [
  // コンビニエンスストア
  /^セブン[‐-]?イレブン/,
  /^ファミリーマート/,
  /^ローソン/,
  /^ミニストップ/,
  /^デイリーヤマザキ/,
  // ファストフード / 全国飲食チェーン
  /^マクドナルド/,
  /^モスバーガー/,
  /^ケンタッキー/,
  /^バーガーキング/,
  /^ロッテリア/,
  /^フレッシュネス/,
  /^ファーストキッチン/,
  /^サブウェイ/,
  /^ガスト$/,
  /^バーミヤン/,
  /^ジョナサン/,
  /^デニーズ/,
  /^サイゼリヤ/,
  /^ジョリーパスタ/,
  /^ステーキガスト/,
  /^幸楽苑/,
  /^なか卯/,
  /^吉野家/,
  /^松屋/,
  /^すき家/,
  /^ココイチ/,
  /^CoCo壱番屋/,
  /^大戸屋/,
  /^やよい軒/,
  // ドラッグストア
  /^マツモトキヨシ/,
  /^マツキヨ/,
  /^ウエルシア/,
  /^ツルハ/,
  /^サンドラッグ/,
  /^スギ薬局/,
  /^コスモス薬品?/,
  // 家電量販店
  /^ビックカメラ/,
  /^ヨドバシ/,
  /^ヤマダ(電機|デンキ)?/,
  /^ケーズデンキ/,
  /^エディオン/,
  /^ジョーシン/,
  // ガソリンスタンド
  /^ENEOS/i,
  /^出光/,
  /^エネオス/,
  /^コスモ石油/,
  /^apollo[\s-]?station/i,
  // ホームセンター
  /^カインズ/,
  /^コーナン/,
  /^DCM/,
  /^ニトリ/,
  // 書店
  /^紀伊國屋(書店)?/,
  /^三洋堂(書店)?/,
  // その他全国チェーン
  /^スターバックス/,
  /^Starbucks/i,
  /^ドトール/,
  /^タリーズ/,
  /^コメダ/,
];

const CHAIN_KEYWORD_PATTERNS: RegExp[] = [
  /全国\s*[0-9]+\s*店舗/,
  /[0-9]+\s*店舗\s*展開/,
  /チェーン店/,
  /(全国|全店).{0,3}展開/,
  /FC\s*加盟/,
  /フランチャイズ/,
  /都道府県/,
];

const MIN_CATEGORY_STORE_COUNT_FOR_CHAIN_HEAVY = 3;

/** store 名が既知のチェーン名パターンに合致するか。 */
export function matchesKnownChain(name: string): boolean {
  if (!name) return false;
  return KNOWN_CHAIN_NAME_PATTERNS.some((p) => p.test(name));
}

/** notes / description にチェーン規模シグナルがあるか。 */
export function hasChainKeywords(notes?: string, name?: string): boolean {
  const text = `${name ?? ""}\n${notes ?? ""}`;
  return CHAIN_KEYWORD_PATTERNS.some((p) => p.test(text));
}

/** 既存 stores の同 category に 3+ store があれば chain-heavy 業態と判定。 */
export function isChainHeavyCategory(
  category: string | undefined,
  existingStores: Array<{ category?: string }>,
): boolean {
  if (!category) return false;
  let count = 0;
  for (const s of existingStores) {
    if (s.category === category) {
      count += 1;
      if (count >= MIN_CATEGORY_STORE_COUNT_FOR_CHAIN_HEAVY) return true;
    }
  }
  return false;
}

/**
 * チェーン店として auto-merge 復帰の判定。
 * (b OR c): 名前パターン or chain-heavy category。
 * (a) は呼出側で「同 run の campaign program に参照されている」ことを確認する。
 */
export function isChainLikeStore(args: {
  name: string;
  category?: string;
  notes?: string;
  existingStores: Array<{ category?: string }>;
}): boolean {
  if (matchesKnownChain(args.name)) return true;
  if (hasChainKeywords(args.notes, args.name)) return true;
  if (isChainHeavyCategory(args.category, args.existingStores)) return true;
  return false;
}
