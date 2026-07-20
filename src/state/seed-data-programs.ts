import type { BenefitProgram, StoreProgramMembership } from "../domain/types";
import { defineMemberships } from "./defineMemberships";

// PointMax v3: BenefitProgram の seed データ。
// PR 1: JAL特約店 1 件
// PR 2: 旧 StoreRule / LoyaltyRule / PaymentApp.cardSpecificBonusRates 全件を移行
//   A. StoreRule 系 11 件 (SMBC 7% / Olive 8% / 楽天市場 / JAL Suica / ビューカード / メルカード / d払い×ビックカメラ)
//   B. LoyaltyRule 系 10 件 (pointCard × rate group で集約)
//   C. PaymentApp 系 11 件 (defaultBonusRate → primary / cardSpecificBonusRates → addOn)
export const SEED_BENEFIT_PROGRAMS: BenefitProgram[] = [
  // ═══════════════════════════════════════════════════════════════
  // PR 1: JAL特約店
  // ═══════════════════════════════════════════════════════════════
  // PR-1a: JAL特約店 2倍 を「加入要否」で 2 分割する。
  //   特約店 2倍 (100円=2マイル) は「ショッピングマイル・プレミアム (SMP)」加入が前提。
  //   - jal-suica (CLUB-Aゴールド系) は SMP が自動付帯なので常時 2倍 → optIn 無し。
  //   - jal-card (普通カード) は SMP が任意加入 (年会費4,950円)。未加入だと 2倍にならず、
  //     従来の「両カードに一律 2倍」は SMP 未加入者への過大案内だった → optIn:true で既定 OFF。
  //   membership は両 program に複製する (JAL_TOKUYAKU_STORE_IDS を両者で共有)。
  {
    id: "prog-jal-tokuyaku",
    scope: "member-stores",
    name: "JALカード特約店 (CLUB-A系)",
    cardIds: ["jal-suica"],
    rate: 0.02,
    currencyId: "jal-mile",
    bonusType: "primary",
    description:
      "JALカード CLUB-A系 (ショッピングマイル・プレミアム自動付帯) は特約店で 100円=2 マイル (通常の 2 倍)",
    conditions:
      "CLUB-A 系 (jal-suica 等) はショッピングマイル・プレミアムが自動付帯のため常時 2倍。100円=2 マイル積算。",
    officialUrl: "https://www.jal.co.jp/jp/ja/jalcard/service/tokuyakuten/",
  },

  // PR-1a: JAL特約店 2倍 (普通カード = SMP 任意加入者向け、既定 OFF)
  {
    id: "prog-jal-tokuyaku-normal",
    scope: "member-stores",
    name: "JALカード特約店 (普通カード・SMP加入時)",
    cardIds: ["jal-card"],
    rate: 0.02,
    currencyId: "jal-mile",
    bonusType: "primary",
    // 普通カードの 2倍は SMP (年会費4,950円) 加入者のみ → optIn:true で既定 OFF 出荷。
    // enabled は書かない (ユーザー所有キー)。SMP 加入者が「使う」を ON にした時のみ評価に載る。
    optIn: true,
    description:
      "JALカード普通カードでもショッピングマイル・プレミアム加入時は特約店で 100円=2 マイル (通常の 2 倍)。" +
      "既定OFF・SMP に加入済みなら「使う」をONに (未加入は 100円=1 マイルのため 2倍にならない)。",
    conditions:
      "ショッピングマイル・プレミアム (年会費 4,950円) 加入要。未加入時は特約店でも 100円=1 マイル (2倍にならない)。",
    officialUrl: "https://www.jal.co.jp/jp/ja/jalcard/service/tokuyakuten/",
  },

  // ═══════════════════════════════════════════════════════════════
  // PR 2 A: StoreRule 系
  // ═══════════════════════════════════════════════════════════════

  // A-1: 楽天カード × 楽天市場 通常 3% (SPU 基本込み)
  {
    id: "prog-rakuten-ichiba-base",
    scope: "member-stores",
    name: "楽天カード × 楽天市場 通常",
    cardIds: ["rakuten-card"],
    rate: 0.03,
    currencyId: "rakuten-pt",
    bonusType: "primary",
    description: "楽天カード × 楽天市場 通常 + SPU 基本 = 3%",
  },

  // A-2: 楽天カード × 楽天市場「5と0のつく日」+1% (recurringDays)
  // PR-1c: 旧実装は rate 0.04 / primary で「5と0の日は 4%」を単一 program で表していたが、
  //   これだと (1) A-1 base 3% と排他選択になり二重計上を取り違える、(2) この施策の
  //   本当の獲得上限「1,000pt/月」を primary に付けると SPU 基本分まで巻き添えクランプする
  //   過小誤差になる、という 2 点が問題だった。
  //   → 「5と0のつく日」の正味は +1% (カード分) なので、base 3% (A-1 primary) の上に
  //     addOn +1% として乗せる。獲得上限 1,000pt/月 は addOn 側だけに monthlyCapAmountYen
  //     (= 1,000pt ÷ 0.01 = 100,000円) で付与し、10万円超では addOn 分のみクランプ、
  //     base 3% は無傷に保つ。
  {
    id: "prog-rakuten-ichiba-zero-five-day",
    scope: "member-stores",
    name: "楽天市場「5と0のつく日」+1%",
    cardIds: ["rakuten-card"],
    rate: 0.01,
    currencyId: "rakuten-pt",
    bonusType: "addOn",
    validFrom: "2020-01-01",
    recurringDays: [5, 10, 15, 20, 25, 30],
    monthlyCapAmountYen: 100000, // 獲得上限 1,000pt/月 ÷ 0.01
    description: "楽天市場「5と0のつく日」の楽天カード +1% (毎月 5/10/15/20/25/30 日、base 3% に上乗せ)",
    notes:
      "5と0のつく日 (毎月 5/10/15/20/25/30) のみ、要エントリー。楽天カード分 +1% (base 3% と合算で実質4%)。獲得上限 1,000pt/月 (= 支払 10万円/月まで)。",
  },

  // A-3: SMBC ゴールド(NL) × タッチ決済 7% (22 stores)
  {
    id: "prog-smbc-7p",
    scope: "member-stores",
    name: "三井住友ゴールド(NL) Visa タッチ決済 7%",
    cardIds: ["smbc-v"],
    paymentAppId: "pa-visa-touch",
    rate: 0.07,
    currencyId: "v-pt",
    bonusType: "primary",
    validFrom: "2023-04-03",
    description:
      "SMBC ゴールド(NL) Visa/Master タッチ決済 + スマホ利用で 7% Vポイント還元",
    // PR-1b: 7%はスマホ (Apple Pay/Google Pay) のタッチ決済限定。物理カードのタッチは対象外。
    notes: "スマホのタッチ決済限定 (物理カードのタッチは対象外)",
  },

  // A-4: Olive × タッチ決済 8% (22 stores)
  {
    id: "prog-olive-8p",
    scope: "member-stores",
    name: "Oliveフレキシブルペイ スマホタッチ決済 8%",
    cardIds: ["olive"],
    paymentAppId: "pa-visa-touch",
    rate: 0.08,
    currencyId: "v-pt",
    bonusType: "primary",
    validFrom: "2023-04-03",
    description:
      "Oliveフレキシブルペイ スマホタッチ決済で 8% Vポイント還元 (smbc-v 7% + Olive 連携 +1%)",
    // PR-1b: 8%はスマホ (Apple Pay/Google Pay) のタッチ決済限定。物理カードのタッチは対象外。
    notes: "スマホのタッチ決済限定 (物理カードのタッチは対象外)",
  },

  // V5-3 follow-up: Olive アカウント 選べる特典「Vポイントアッププログラム+1%」
  // ※ Olive 保有 + 選べる特典で当該特典を選択した場合のみ適用 (条件付き opt-in)。
  //   全 Olive ユーザーに自動付与されると過大計算になるが、UI で program enable/disable が
  //   未実装のため conditions に明示。プラチナプリファードは 2 つ選択で +2% 可能。
  //   ongoing-program extractor (V5-3) で smbc.co.jp/kojin/vpoint-up/ から抽出した
  //   15 program のうち、店舗紐付けなしで適用範囲が広い「選べる特典」のみ反映。
  //   他 12 件の lifestyle 系 (給与振込/円預金/住宅ローン/SBI/Vitality 等) は UX 設計
  //   (ユーザー条件 opt-in) 未実装のため今期スコープ外。
  {
    id: "prog-olive-vpoint-up-selected-benefit",
    scope: "all-stores",
    name: "Olive 選べる特典「Vポイントアッププログラム+1%」",
    cardIds: ["olive"],
    rate: 0.01,
    currencyId: "v-pt",
    bonusType: "addOn",
    // R1 (PR-1d): 登録/選択制の特典 → optIn:true で既定 OFF 出荷。enabled は書かない
    // (ユーザー所有キー)。ユーザーが「使う」を ON にした時のみ評価に載る。
    optIn: true,
    description:
      "Oliveアカウントの「選べる特典」で「Vポイントアッププログラム+1%」を選択すると +1% Vポイント還元 (全店適用)。" +
      "プラチナプリファードは 2 つ選択可で最大 +2%。" +
      "既定OFF・「選べる特典」で選択している場合は「使う」をONに。",
    conditions:
      "Olive アカウント契約 + 「選べる特典」で当該特典を選択している場合のみ。" +
      "選択していない場合は 0% (PointMax は条件未追跡なのでユーザー判断で除外を推奨)。",
    officialUrl: "https://www.smbc.co.jp/kojin/vpoint-up/",
  },

  // A-5: JALカードSuica × Suicaチャージ 1.5% JRE POINT
  {
    id: "prog-jal-suica-charge",
    scope: "member-stores",
    name: "JALカードSuica × Suicaチャージ",
    cardIds: ["jal-suica"],
    rate: 0.015,
    currencyId: "jre",
    bonusType: "primary",
    description: "JALカードSuica (ビューカード機能) × Suicaチャージで 1.5% JRE POINT",
  },

  // A-6: JALカードSuica × えきねっと新幹線 8%
  {
    id: "prog-jal-suica-ekinet-shinkansen",
    scope: "member-stores",
    name: "JALカードSuica × えきねっと新幹線eチケット",
    cardIds: ["jal-suica"],
    rate: 0.08,
    currencyId: "jre",
    bonusType: "primary",
    description: "ビューカード会員 新幹線eチケット 8% JRE POINT 還元",
  },

  // A-7: JALカードSuica × えきねっと在来線 5%
  {
    id: "prog-jal-suica-ekinet-zairaisen",
    scope: "member-stores",
    name: "JALカードSuica × えきねっと在来線特急",
    cardIds: ["jal-suica"],
    rate: 0.05,
    currencyId: "jre",
    bonusType: "primary",
    description: "ビューカード会員 在来線チケットレス特急券 5% JRE POINT 還元",
  },

  // A-8: ビューカード × Suicaチャージ 1.5%
  {
    id: "prog-viewcard-suica-charge",
    scope: "member-stores",
    name: "ビューカード × Suicaチャージ",
    cardIds: ["viewcard"],
    rate: 0.015,
    currencyId: "jre",
    bonusType: "primary",
    description: "ビューカード スタンダード × Suica オートチャージ/モバイルチャージで 1.5% JRE POINT",
  },

  // A-9: メルカード × メルカリ 4% (定常最大)
  {
    id: "prog-mercard-mercari",
    scope: "member-stores",
    name: "メルカード × メルカリ",
    cardIds: ["mercard"],
    rate: 0.04,
    currencyId: "mercari-pt",
    bonusType: "primary",
    description: "メルカリ内お買い物で最大 4% メルカリポイント還元 (利用額連動、定常最大)",
  },

  // A-10: メルカード × メルカリ 毎月8日 8%
  {
    id: "prog-mercard-mercari-day8",
    scope: "member-stores",
    name: "メルカード × メルカリ 毎月8日",
    cardIds: ["mercard"],
    rate: 0.08,
    currencyId: "mercari-pt",
    bonusType: "primary",
    recurringDays: [8],
    description: "メルカード毎月8日: メルカリ内お買い物で 8% 還元 (常設)",
  },

  // A-11: dカード × d払い × ビックカメラ 6% 期間限定 (2026/5/16〜5/31)
  {
    id: "prog-dcard-bic-camera-may2026",
    scope: "member-stores",
    name: "d払い × dカード × ビックカメラ +5% キャンペーン",
    cardIds: ["dcard"],
    paymentAppId: "pa-d-pay",
    rate: 0.06,
    currencyId: "d-pt",
    bonusType: "primary",
    validFrom: "2026-05-16",
    validTo: "2026-05-31",
    description: "d払い+5% ビックカメラ限定キャンペーン (要エントリー、進呈上限 2000pt)",
    officialUrl:
      "https://service.smt.docomo.ne.jp/keitai_payment/campaign/dpay_biccamera_260507_7487/",
    monthlyCapAmountYen: 40000, // 2000pt ÷ 0.05
  },

  // ═══════════════════════════════════════════════════════════════
  // PR 2 B: LoyaltyRule 系 (pointCard × rate group で集約)
  // ═══════════════════════════════════════════════════════════════

  // B-1: 楽天ポイントカード 0.5% (複数店舗)
  {
    id: "prog-rakuten-pointcard-0.5pc",
    scope: "member-stores",
    name: "楽天ポイントカード提示 0.5%",
    pointCardId: "rakuten-pointcard",
    rate: 0.005,
    currencyId: "rakuten-pt",
    bonusType: "primary",
    description: "楽天ポイントカード提示で 200円=1pt (0.5%) 還元",
    notes: "付与は200円単位 (端数切り捨て)", // PR-1d
  },

  // B-2: 楽天ポイントカード 1% (複数店舗)
  {
    id: "prog-rakuten-pointcard-1pc",
    scope: "member-stores",
    name: "楽天ポイントカード提示 1%",
    pointCardId: "rakuten-pointcard",
    rate: 0.01,
    currencyId: "rakuten-pt",
    bonusType: "primary",
    description: "楽天ポイントカード提示で 100円=1pt (1%) 還元",
  },

  // B-3: dポイントカード 0.5% (複数店舗)
  {
    id: "prog-d-pointcard-0.5pc",
    scope: "member-stores",
    name: "dポイントカード提示 0.5%",
    pointCardId: "d-pointcard",
    rate: 0.005,
    currencyId: "d-pt",
    bonusType: "primary",
    description: "dポイントカード提示で 200円=1pt (0.5%) 還元",
    notes: "付与は200円単位 (端数切り捨て)", // PR-1d
  },

  // B-4: dポイントカード 1% (複数店舗)
  {
    id: "prog-d-pointcard-1pc",
    scope: "member-stores",
    name: "dポイントカード提示 1%",
    pointCardId: "d-pointcard",
    rate: 0.01,
    currencyId: "d-pt",
    bonusType: "primary",
    description: "dポイントカード提示で 100円=1pt (1%) 還元",
  },

  // B-5: Pontaカード 0.5% (複数店舗)
  {
    id: "prog-ponta-card-0.5pc",
    scope: "member-stores",
    name: "Pontaカード提示 0.5%",
    pointCardId: "ponta-card",
    rate: 0.005,
    currencyId: "ponta-pt",
    bonusType: "primary",
    description: "Pontaカード提示で 200円=1pt (0.5%) 還元",
    notes: "付与は200円単位 (端数切り捨て)", // PR-1d
  },

  // B-6: Pontaカード 1% (複数店舗)
  {
    id: "prog-ponta-card-1pc",
    scope: "member-stores",
    name: "Pontaカード提示 1%",
    pointCardId: "ponta-card",
    rate: 0.01,
    currencyId: "ponta-pt",
    bonusType: "primary",
    description: "Pontaカード提示で 100円=1pt (1%) 還元",
  },

  // B-7: Vポイントカード 0.5% (複数店舗)
  {
    id: "prog-vpoint-card-0.5pc",
    scope: "member-stores",
    name: "Vポイントカード提示 0.5%",
    pointCardId: "vpoint-card",
    rate: 0.005,
    currencyId: "v-pt",
    bonusType: "primary",
    description: "Vポイントカード(旧Tカード)提示で 200円=1pt (0.5%) 還元",
    notes: "付与は200円単位 (端数切り捨て)", // PR-1d
  },

  // B-8: nanacoカード 1% (セブン-イレブン)
  {
    id: "prog-nanaco-card-1pc",
    scope: "member-stores",
    name: "nanacoカード提示 1%",
    pointCardId: "nanaco-card",
    rate: 0.01,
    currencyId: "nanaco-pt",
    bonusType: "primary",
    description: "nanacoカード提示で 100円=1pt (1%) 還元 (電子マネー支払い時)",
  },

  // B-9: WAONカード 0.5% (複数店舗)
  {
    id: "prog-waon-card-0.5pc",
    scope: "member-stores",
    name: "WAONカード提示 0.5%",
    pointCardId: "waon-card",
    rate: 0.005,
    currencyId: "waon-pt",
    bonusType: "primary",
    description: "WAONカード提示で 200円=1pt (0.5%) 還元",
    notes: "付与は200円単位 (端数切り捨て)", // PR-1d
  },

  // B-10: JRE POINT カード 0.5% (駅ナカ加盟店)
  {
    id: "prog-jre-pointcard-0.5pc",
    scope: "member-stores",
    name: "JRE POINT カード提示 0.5%",
    pointCardId: "jre-pointcard",
    rate: 0.005,
    currencyId: "jre",
    bonusType: "primary",
    description: "JRE POINT カード提示で 200円(税抜)=1pt (0.5%) 還元 (駅ナカ加盟店)",
    notes: "付与は200円(税抜)単位 (端数切り捨て)", // PR-1d
  },

  // ═══════════════════════════════════════════════════════════════
  // PR 2 C: PaymentApp 系 (defaultBonusRate → primary / cardSpecificBonusRates → addOn)
  // ═══════════════════════════════════════════════════════════════

  // C-1: 楽天Pay ベース還元 1% (全 store、primary)
  {
    id: "prog-rakuten-pay-base",
    scope: "all-stores",
    name: "楽天Pay ベース還元",
    paymentAppId: "pa-rakuten-pay",
    rate: 0.01,
    currencyId: "rakuten-pt",
    bonusType: "primary",
    description: "楽天Pay 利用で 1% 楽天ポイント還元 (誰でも)",
  },

  // C-2: 楽天Pay × 楽天カード 上乗せ 0.5% (addOn)
  {
    id: "prog-rakuten-pay-rakuten-card-addon",
    scope: "all-stores",
    name: "楽天Pay × 楽天カード 上乗せ",
    paymentAppId: "pa-rakuten-pay",
    cardIds: ["rakuten-card"],
    rate: 0.005,
    currencyId: "rakuten-pt",
    bonusType: "addOn",
    description: "楽天カード経由チャージで +0.5% 上乗せ (楽天Pay 1% と合わせて 1.5%)",
  },

  // C-3: d払い ベース還元 0.5% (全 store、primary)
  {
    id: "prog-d-pay-base",
    scope: "all-stores",
    name: "d払い ベース還元",
    paymentAppId: "pa-d-pay",
    rate: 0.005,
    currencyId: "d-pt",
    bonusType: "primary",
    description: "d払い利用で 0.5% dポイント還元 (誰でも、200円=1pt)",
    notes: "付与は200円単位 (端数切り捨て)", // PR-1d
  },

  // C-4: d払い × dカード 上乗せ 0.5% (addOn)
  {
    id: "prog-d-pay-dcard-addon",
    scope: "all-stores",
    name: "d払い × dカード 上乗せ",
    paymentAppId: "pa-d-pay",
    cardIds: ["dcard"],
    rate: 0.005,
    currencyId: "d-pt",
    bonusType: "addOn",
    description: "dカード設定で +0.5% 上乗せ (d払い 0.5% と合わせて 1.0%)",
  },

  // C-5: PayPay ベース還元 0.5% (全 store、primary)
  {
    id: "prog-paypay-base",
    scope: "all-stores",
    name: "PayPay ベース還元",
    paymentAppId: "pa-paypay",
    rate: 0.005,
    currencyId: "paypay",
    bonusType: "primary",
    description: "PayPay 残高払いで 0.5% PayPayポイント還元 (誰でも)",
  },

  // C-6: PayPay × PayPayカード 上乗せ 0.5% (addOn)
  {
    id: "prog-paypay-card-addon",
    scope: "all-stores",
    name: "PayPay × PayPayカード 上乗せ",
    paymentAppId: "pa-paypay",
    cardIds: ["paypay-card"],
    rate: 0.005,
    currencyId: "paypay",
    bonusType: "addOn",
    description: "PayPayクレジット連携で +0.5% 上乗せ (PayPay 0.5% と合わせて 1.0%)",
  },

  // C-7: au PAY ベース還元 0.5% (全 store、primary)
  {
    id: "prog-au-pay-base",
    scope: "all-stores",
    name: "au PAY ベース還元",
    paymentAppId: "pa-au-pay",
    rate: 0.005,
    currencyId: "ponta-pt",
    bonusType: "primary",
    description: "au PAY コード支払いで 0.5% Pontaポイント還元 (誰でも)",
  },

  // C-8: au PAY × au PAYカード 上乗せ 1% (addOn)
  {
    id: "prog-au-pay-card-addon",
    scope: "all-stores",
    name: "au PAY × au PAYカード 上乗せ",
    paymentAppId: "pa-au-pay",
    cardIds: ["au-pay-card"],
    rate: 0.01,
    currencyId: "ponta-pt",
    bonusType: "addOn",
    description: "au PAYカードからチャージで +1% 上乗せ (au PAY 0.5% と合わせて 1.5%)",
  },

  // 【削除済 v4.0.1】C-9 prog-famipay-base / C-10 prog-famima-card-addon:
  // ファミペイ廃止に伴い削除。ファミペイのポイント付与は d/楽天/V 選択式で
  // 単一通貨 program では正確に表せず、ファミマでの d/楽天/V 還元は
  // prog-{d,rakuten,vpoint}-pointcard × conv-familymart の loyalty で
  // カバー済のため不要。pa-famipay 自体も seed-data-cards.ts から削除。

  // C-11: メルペイ × メルカード 上乗せ 1% (addOn)
  // ※ メルペイ defaultBonusRate=0 なので primary program は不要
  {
    id: "prog-merpay-mercard-addon",
    scope: "all-stores",
    name: "メルペイ × メルカード 上乗せ",
    paymentAppId: "pa-merpay",
    cardIds: ["mercard"],
    rate: 0.01,
    currencyId: "mercari-pt",
    bonusType: "addOn",
    description: "メルカード連携時 +1% 上乗せ (メルペイ単体は 0%)",
  },

  // ─── v3.6.0: nanaco / WAON 電子マネー支払い側の base 還元 ───
  // PointCard モデル (nanaco-card / waon-card) は「カード提示 loyalty」専用なので、
  // 「電子マネー支払で還元」側を PaymentApp + BenefitProgram で別経路化。
  //
  // 設計判断 1: pointCard loyalty と pa-* PaymentApp 経路は二重取りされうるので
  // membership を排他的に持つ (loyalty 加盟店は e-money の membership に入れない)。
  // 例: セブン-イレブンは nanaco-card loyalty 加盟、pa-nanaco の membership には入れない。
  //
  // 設計判断 2: bonusType は addOn (primary ではない)。理由:
  //   - chargeBased=true の paymentApp で primary を持つと rankCards.ts が
  //     cardCurrencyId を nanaco-pt / waon-pt に上書きしてしまう
  //   - nanaco-pt / waon-pt は edges が限定的 (jal/edy/v 等) で、target=rakuten-pt 等への
  //     path が無い場合「他通貨カードまで waon-pt 表示で 0 になる」現象が発生する
  //   - addOn にすればカードの primary 通貨 (= card.defaultCurrencyId) は維持され、
  //     waon-pt/nanaco-pt は独立した addOn として加算される (path 不可なら 0 黙殺)
  //   - 既存の prog-d-pay-base / prog-rakuten-pay-base が primary でも問題ないのは
  //     d-pt / rakuten-pt の edges が豊富で path が常に存在するため

  // C-12: nanaco 電子マネー ベース還元 0.5% (addOn)
  {
    id: "prog-pa-nanaco-base",
    scope: "member-stores",
    name: "nanaco 電子マネー ベース還元",
    paymentAppId: "pa-nanaco",
    rate: 0.005,
    currencyId: "nanaco-pt",
    bonusType: "addOn",
    description:
      "nanaco 電子マネー支払いで 200円1pt (0.5%) 還元。" +
      "セブン-イレブン等 loyalty 加盟店は nanaco-card 経路で計上、ここは非 loyalty 店のみ。",
    notes: "付与は200円単位 (端数切り捨て)", // PR-1d
  },

  // C-13: WAON 電子マネー ベース還元 0.5% (addOn)
  {
    id: "prog-pa-waon-base",
    scope: "member-stores",
    name: "WAON 電子マネー ベース還元",
    paymentAppId: "pa-waon",
    rate: 0.005,
    currencyId: "waon-pt",
    bonusType: "addOn",
    description:
      "WAON 電子マネー支払いで 200円1pt (0.5%) 還元。" +
      "イオン系等 loyalty 加盟店は waon-card 経路で計上、ここは非 loyalty 店のみ。",
    notes: "付与は200円単位 (端数切り捨て)", // PR-1d
  },

  // ═══════════════════════════════════════════════════════════════
  // V5: JCB J-POINT パートナー (旧 Oki Doki ランド系、2026/1〜J-POINT 名称統一)
  // ───────────────────────────────────────────────────────────────
  // V5-2 でカードグレード別に W 用 / Gold 用 2 系列に分離。
  // - 公式の「○倍」は OkiDoki 倍率 (= 200円1pt 基準) なのでカード基本還元率に
  //   依存する: W 基本 2倍×1% / Gold 基本 1倍×0.5%。
  // - Gold「最大10%還元」= 0.5% × 20倍 (= スタバ) と整合、Gold プレミアム
  //   「最大4倍」= 0.5% × 4倍 = 2% (= 高島屋プレミアム) が W の 2倍と同等。
  // - 「プレミアムでおトク」は Gold が W と同等実効率に追いつく仕組み。
  // - 全店「ポイントアップ登録 (無料、店ごと)」必須 → 全 program に entryUrl。
  // 出典: https://j-pointpartner.jcb.co.jp/search +
  //       https://www.jcb.co.jp/ordercard/kojin_card/gold2.html (V5-2、2026-05-20)
  // ═══════════════════════════════════════════════════════════════

  // ─── W 系列 (cardIds=["jcb-w"]、基本 1% × 倍率) ───
  {
    id: "prog-jcb-jpoint-2x",
    scope: "member-stores",
    name: "J-POINT パートナー (2倍) W向け",
    cardIds: ["jcb-w"],
    rate: 0.02,
    currencyId: "j-point",
    bonusType: "primary",
    description: "JCB J-POINT パートナー店で 2倍 (W 基本 1% × 2 = 実効 2%)",
    conditions:
      "J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。",
    entryUrl: "https://j-pointpartner.jcb.co.jp/search",
  },
  {
    id: "prog-jcb-jpoint-3x",
    scope: "member-stores",
    name: "J-POINT パートナー (3倍) W向け",
    cardIds: ["jcb-w"],
    rate: 0.03,
    currencyId: "j-point",
    bonusType: "primary",
    description: "JCB J-POINT パートナー店で 3倍 (W 基本 1% × 3 = 実効 3%)",
    conditions:
      "J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。",
    entryUrl: "https://j-pointpartner.jcb.co.jp/search",
  },
  // V5-2: prog-jcb-jpoint-4x (W 向け 4倍 rate 0.04) を廃止。
  // 高島屋は W で「2倍 = 2%」が正解 (倍率 4 は Gold プレミアム視点)、
  // W 用 memberships は prog-jcb-jpoint-2x に移管。Gold プレミアム 4倍は
  // prog-jcb-jpoint-gold-4x で表現 (実効 2%、W の 2倍と同等)。
  {
    id: "prog-jcb-jpoint-20x",
    scope: "member-stores",
    name: "J-POINT パートナー (20倍) W向け",
    cardIds: ["jcb-w"],
    rate: 0.2,
    currencyId: "j-point",
    bonusType: "primary",
    description:
      "JCB J-POINT パートナー店で 20倍 (W 基本 1% × 20 = 実効 20%)。" +
      "対象店舗により適用条件が異なる (店舗ごとにモバイルオーダー等の限定条件あり)。",
    conditions:
      "J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料) が必須。" +
      "対象店舗により適用条件が異なる: " +
      "スターバックスはモバイルオーダー・スターバックスカードへのオンライン入金・" +
      "オートチャージ・Starbucks eGift限定、" +
      "マクドナルドはモバイルオーダー・マックデリバリー(R)サービス限定。" +
      "その他対象店舗 (すき家・吉野家・ガスト・バーミヤン・サンマルクカフェ・" +
      "ジョナサン等) は店頭決済含め対象。詳細は J-POINT パートナーサイトで確認。",
    entryUrl: "https://j-pointpartner.jcb.co.jp/search",
  },

  // ─── Gold 系列 (cardIds=["jcb-gold"]、基本 0.5% × 倍率) ───
  {
    id: "prog-jcb-jpoint-gold-2x",
    scope: "member-stores",
    name: "J-POINT パートナー (2倍) Gold向け",
    cardIds: ["jcb-gold"],
    rate: 0.01,
    currencyId: "j-point",
    bonusType: "primary",
    description: "JCB J-POINT パートナー店で 2倍 (Gold 基本 0.5% × 2 = 実効 1%)",
    conditions:
      "J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。",
    entryUrl: "https://j-pointpartner.jcb.co.jp/search",
  },
  {
    id: "prog-jcb-jpoint-gold-3x",
    scope: "member-stores",
    name: "J-POINT パートナー (3倍) Gold向け",
    cardIds: ["jcb-gold"],
    rate: 0.015,
    currencyId: "j-point",
    bonusType: "primary",
    description: "JCB J-POINT パートナー店で 3倍 (Gold 基本 0.5% × 3 = 実効 1.5%)",
    conditions:
      "J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料、期限なし) が必要。",
    entryUrl: "https://j-pointpartner.jcb.co.jp/search",
  },
  {
    id: "prog-jcb-jpoint-gold-4x",
    scope: "member-stores",
    name: "J-POINT パートナー (4倍 プレミアム) Gold向け",
    cardIds: ["jcb-gold"],
    rate: 0.02,
    currencyId: "j-point",
    bonusType: "primary",
    description:
      "JCB J-POINT パートナー店「プレミアムでおトク」枠で 4倍 (Gold 基本 0.5% × 4 = 実効 2%)。" +
      "W 向けの 2倍店舗と同等の実効率に Gold が追いつく仕組み。",
    conditions:
      "J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料) + " +
      "「プレミアムでおトク」対象店 (高島屋等) で Gold グレード保有時の優遇。",
    entryUrl: "https://j-pointpartner.jcb.co.jp/search",
  },
  {
    id: "prog-jcb-jpoint-gold-20x",
    scope: "member-stores",
    name: "J-POINT パートナー (20倍) Gold向け",
    cardIds: ["jcb-gold"],
    rate: 0.1,
    currencyId: "j-point",
    bonusType: "primary",
    description:
      "JCB J-POINT パートナー店で 20倍 (Gold 基本 0.5% × 20 = 実効 10%)。" +
      "公式の「ポイント還元率は最大10%」と一致。" +
      "対象店舗により適用条件が異なる (店舗ごとにモバイルオーダー等の限定条件あり)。",
    conditions:
      "J-POINT パートナーサイトで店ごとのポイントアップ登録 (無料) が必須。" +
      "対象店舗により適用条件が異なる: " +
      "スターバックスはモバイルオーダー・スターバックスカードへのオンライン入金・" +
      "オートチャージ・Starbucks eGift限定、" +
      "マクドナルドはモバイルオーダー・マックデリバリー(R)サービス限定。" +
      "その他対象店舗 (すき家・吉野家・ガスト・バーミヤン・サンマルクカフェ・" +
      "ジョナサン等) は店頭決済含め対象。詳細は J-POINT パートナーサイトで確認。",
    entryUrl: "https://j-pointpartner.jcb.co.jp/search",
  },

  // ═══════════════════════════════════════════════════════════════
  // v6.5.0: エポス ゴールド/プラチナ グレード優待 + たまるマーケット
  // ───────────────────────────────────────────────────────────────
  // エポスカードは 3 グレード体制 (一般 epos-card / ゴールド epos-gold /
  // プラチナ epos-platinum)、基本還元はいずれも 200円=1pt=0.5% で共通。
  // グレード差は「マルイ 2倍」「選べるポイントアップ 2倍」の 2 優待で表現する
  // (いずれもゴールド/プラチナ限定、一般は 0.5% のまま)。
  // - マルイ 2倍・選べるポイントアップ 2倍はどちらも 200円=2pt = 実効 1.0%。
  //   2025-04 改定で選べるポイントアップは旧 3倍(1.5%) から 2倍(1.0%) に縮小済み。
  // ポイントアップサイト「たまるマーケット」は JCB J-POINT パートナーと同型で、
  // サイト経由の購入時にショップ別倍率が乗る (基本 0.5%×N)。3 グレード共通。
  // 出典: https://www.eposcard.co.jp/pointup/index.html +
  //       https://tamaru.eposcard.co.jp/ (2026-07 実測)
  // ═══════════════════════════════════════════════════════════════

  // (a) エポス ゴールド/プラチナ マルイ優待 (2倍)
  {
    id: "prog-epos-gp-marui",
    scope: "member-stores",
    name: "エポス ゴールド/プラチナ マルイ優待 (2倍)",
    cardIds: ["epos-gold", "epos-platinum"],
    rate: 0.01,
    currencyId: "epos",
    bonusType: "primary",
    description:
      "ゴールド/プラチナはマルイ・モディ・マルイウェブチャネルで 200円=2pt (1.0%、一般は0.5%)。一部商品・ショップ除く。",
    officialUrl:
      "https://faq.eposcard.co.jp/faq/show/63?category_id=17&site_domain=default",
  },

  // (b) エポス 選べるポイントアップ (2倍)
  // ⚠ 2025-04 改定で旧 3倍(1.5%) → 2倍(1.0%) に縮小済み。ネット上の解説記事の多くは
  //   旧 3倍のままなので、それを根拠に rate を 0.015 へ「修正」しないこと
  //   (seed.test.ts に退行防止 assert あり)。
  {
    id: "prog-epos-gp-selectable-pointup",
    scope: "member-stores",
    name: "エポス 選べるポイントアップ (2倍)",
    cardIds: ["epos-gold", "epos-platinum"],
    rate: 0.01,
    currencyId: "epos",
    bonusType: "primary",
    // R1 (PR-1d): 登録制の特典 (対象ショップ登録が前提) → optIn:true で既定 OFF 出荷。
    // enabled は書かない (ユーザー所有キー)。登録ショップがある人が「使う」を ON にする。
    optIn: true,
    description:
      "ゴールド/プラチナ限定「選べるポイントアップショップ」登録ショップで 200円=2pt (合計1.0%)。2025年4月改定後の倍率 (旧3倍から縮小)。" +
      "既定OFF・対象ショップを登録して使う場合は「使う」をONに。",
    conditions:
      "対象300以上から最大3ショップを登録した場合のみ (登録後3ヶ月間変更不可)。未登録ショップは通常0.5%。",
    officialUrl: "https://www.eposcard.co.jp/pointup/index.html",
    entryUrl: "https://www.eposcard.co.jp/pointup/index.html",
  },

  // (c) たまるマーケット 3階層 (jcb-jpoint と同型、倍率=総倍率、rate = 0.005×N)
  {
    id: "prog-epos-tamaru-2x",
    scope: "member-stores",
    name: "たまるマーケット (2倍)",
    cardIds: ["epos-card", "epos-gold", "epos-platinum"],
    rate: 0.01,
    currencyId: "epos",
    bonusType: "primary",
    description:
      "たまるマーケット (エポスポイントUPサイト) 経由の購入で 2倍 (基本0.5%×2)。一部ショップはゴールド/プラチナに個別上乗せ倍率あり (ショップごと設定のため未モデル化)。",
    conditions:
      "たまるマーケットを経由して対象ショップで購入した場合のみボーナス付与。",
    entryUrl: "https://tamaru.eposcard.co.jp/",
  },
  {
    id: "prog-epos-tamaru-3x",
    scope: "member-stores",
    name: "たまるマーケット (3倍)",
    cardIds: ["epos-card", "epos-gold", "epos-platinum"],
    rate: 0.015,
    currencyId: "epos",
    bonusType: "primary",
    description:
      "たまるマーケット (エポスポイントUPサイト) 経由の購入で 3倍 (基本0.5%×3)。一部ショップはゴールド/プラチナに個別上乗せ倍率あり (ショップごと設定のため未モデル化)。",
    conditions:
      "たまるマーケットを経由して対象ショップで購入した場合のみボーナス付与。",
    entryUrl: "https://tamaru.eposcard.co.jp/",
  },
  {
    id: "prog-epos-tamaru-4x",
    scope: "member-stores",
    name: "たまるマーケット (4倍)",
    cardIds: ["epos-card", "epos-gold", "epos-platinum"],
    rate: 0.02,
    currencyId: "epos",
    bonusType: "primary",
    description:
      "たまるマーケット (エポスポイントUPサイト) 経由の購入で 4倍 (基本0.5%×4)。一部ショップはゴールド/プラチナに個別上乗せ倍率あり (ショップごと設定のため未モデル化)。",
    conditions:
      "たまるマーケットを経由して対象ショップで購入した場合のみボーナス付与。",
    entryUrl: "https://tamaru.eposcard.co.jp/",
  },
];

// PR-1a: JAL特約店の加盟店リスト。CLUB-A系 (prog-jal-tokuyaku) と
// 普通カード+SMP (prog-jal-tokuyaku-normal) の両 program で同一店舗に適用するため、
// store-id 配列を 1 箇所に集約して両 defineMemberships で共有する (list のドリフト防止)。
const JAL_TOKUYAKU_STORE_IDS = [
  "eneos",
  "idemitsu",
  "welcia",
  "matsukiyo",
  "kinokuniya",
  "aeon",
  "daimaru-matsuzakaya",
  "muji",
  "uniqlo",
  "royal-host",
  "tsuruha",
  "conv-familymart",
];

// 店舗 × プログラムの加盟関係 (M2M)
// PR 1: JAL特約店 12 件 (CLUB-A系 / 普通カード の 2 program に複製)
// PR 2: 上記 Programs の memberships を大幅追加 (合計 200+ 件)
export const SEED_STORE_PROGRAM_MEMBERSHIPS: StoreProgramMembership[] = [
  // ═══════════════════════════════════════════════════════════════
  // PR 1: JAL特約店 加盟店 12 件 × 2 program (CLUB-A系 / 普通カード+SMP)
  // ═══════════════════════════════════════════════════════════════
  ...defineMemberships("prog-jal-tokuyaku", JAL_TOKUYAKU_STORE_IDS),
  ...defineMemberships("prog-jal-tokuyaku-normal", JAL_TOKUYAKU_STORE_IDS),

  // ═══════════════════════════════════════════════════════════════
  // PR 2 A: StoreRule 系 memberships
  // ═══════════════════════════════════════════════════════════════

  // A-1: 楽天カード × 楽天市場 通常
  ...defineMemberships("prog-rakuten-ichiba-base", ["rakuten-ichiba"]),

  // A-2: 楽天市場「5と0のつく日」
  ...defineMemberships("prog-rakuten-ichiba-zero-five-day", ["rakuten-ichiba"]),

  // A-3: SMBC 7% タッチ決済 22 stores
  ...defineMemberships("prog-smbc-7p", [
    "conv-7eleven",
    "conv-lawson",
    "mcdonalds",
    "conv-ministop",
    "sukiya",
    "saizeriya",
    "gusto",
    "doutor",
    "starbucks",
    "mos-burger",
    "kfc",
    "yoshinoya",
    "bamiyan",
    "jonathan",
    "yumetoan",
    "hamazushi",
    "cocos",
    "excelsior-cafe",
    "kappa-sushi",
    "shabuyo",
    "seicomart",
    "poplar",
    // V5-3 follow-up: すかいらーくグループ minor チェーン拡張 (ongoing-program 抽出より)
    "aiya",
    "grazie-gardens",
    "steak-gusto",
    "karaage-karayoshi",
    "musashino-mori-coffee",
    "uoya-michi",
    "chawan",
    "la-ohana",
    "tonkara-tei",
    "yumean-shokudo",
    "monana",
    "hachiro-soba",
    "sanmarusan",
  ]),

  // A-4: Olive 8% スマホタッチ決済 22 stores (SMBC と同じ店舗)
  ...defineMemberships("prog-olive-8p", [
    "conv-7eleven",
    "conv-lawson",
    "mcdonalds",
    "conv-ministop",
    "sukiya",
    "saizeriya",
    "gusto",
    "doutor",
    "starbucks",
    "mos-burger",
    "kfc",
    "yoshinoya",
    "bamiyan",
    "jonathan",
    "yumetoan",
    "hamazushi",
    "cocos",
    "excelsior-cafe",
    "kappa-sushi",
    "shabuyo",
    "seicomart",
    "poplar",
    // V5-3 follow-up: すかいらーくグループ minor チェーン拡張 (ongoing-program 抽出より)
    "aiya",
    "grazie-gardens",
    "steak-gusto",
    "karaage-karayoshi",
    "musashino-mori-coffee",
    "uoya-michi",
    "chawan",
    "la-ohana",
    "tonkara-tei",
    "yumean-shokudo",
    "monana",
    "hachiro-soba",
    "sanmarusan",
  ]),

  // A-5: JALカードSuica × Suicaチャージ
  ...defineMemberships("prog-jal-suica-charge", ["suica-charge"]),

  // A-6: JALカードSuica × えきねっと新幹線
  ...defineMemberships("prog-jal-suica-ekinet-shinkansen", [
    "ekinet-shinkansen",
  ]),

  // A-7: JALカードSuica × えきねっと在来線
  ...defineMemberships("prog-jal-suica-ekinet-zairaisen", ["ekinet-zairaisen"]),

  // A-8: ビューカード × Suicaチャージ
  ...defineMemberships("prog-viewcard-suica-charge", ["suica-charge"]),

  // A-9: メルカード × メルカリ
  ...defineMemberships("prog-mercard-mercari", ["mercari"]),

  // A-10: メルカード × メルカリ 毎月8日
  ...defineMemberships("prog-mercard-mercari-day8", ["mercari"]),

  // A-11: dカード × d払い × ビックカメラ 期間限定
  ...defineMemberships("prog-dcard-bic-camera-may2026", ["bic-camera"]),

  // ═══════════════════════════════════════════════════════════════
  // PR 2 B: LoyaltyRule 系 memberships
  // ═══════════════════════════════════════════════════════════════

  // B-1: 楽天ポイントカード 0.5% memberships
  ...defineMemberships("prog-rakuten-pointcard-0.5pc", [
    // SEED_LOYALTY_RULES から
    "conv-familymart",
    "gusto",
    "seiyu",
    "tsuruha",
    // ADDED_LOYALTY_RULES から (rakuten-pointcard 0.5%)
    "kfc",
    "bamiyan",
    "shabuyo",
    "jonathan",
    "yumetoan",
    "aiya",
    "grazie-gardens",
    "sukiya",
    "hamazushi",
    "cocos",
    "big-boy",
    "hanaya-yohei",
    "royal-host",
    "yoshinoya",
    "coco-ichibanya",
    "daily-yamazaki",
    "poplar",
    "beisia",
    "kaldi-coffee-farm",
    "commodi-iida",
    "ooga-yakkyoku",
    "hands",
    "golf-five",
    "alpen-mountains",
    "alpen-outdoors",
    "kojitsu-sanso",
    "joshin",
    "edion",
    "kojima",
    "angie",
    "maruzen-junkudo-shoten",
    "gyokukodo",
    "super-kids-land",
    "ari-san-hikkoshi",
    "sakai-hikkoshi",
    "heart-hikkoshi",
    "toku-taku",
    "seagull-japan",
    "haneda-airport-pet-hotel",
    "pet-design",
    "pet-land-peace-one",
    "rakuten-mobile",
    "apollo-station",
    "eneos",
    "enejet",
    "enex-fleet",
    "cosmo-oil",
    "cygnus-oil",
    "autobacs",
    "a-pit-autobacs",
    "j-net-rent-a-car",
    "sky-rent-a-car",
    "nippon-rent-a-car",
    "cd-energy-direct-point-denki",
    "tokyu-hotel",
    "excel-hotel-tokyu",
    "hotel-keihan-chain",
    // v3.5.0: Phase A 楽天 追加
    // welcia: ウエルシアは楽天ポイントカード加盟 (Sonnet 検証)
    // nico-pet: 公式 JSON にあるが storeId mismatch (`nicopet` → `nico-pet`) で漏れていた
    "welcia",
    "nico-pet",
  ]),

  // B-2: 楽天ポイントカード 1% memberships
  ...defineMemberships("prog-rakuten-pointcard-1pc", ["mcdonalds", "doutor"]),

  // B-3: dポイントカード 0.5% memberships
  ...defineMemberships("prog-d-pointcard-0.5pc", [
    "conv-lawson",
    "conv-familymart",
    "sukiya",
    "eneos",
    "gusto",
    "takashimaya",
    // v3.5.0: Phase A 高信頼度追加 (Sonnet + Gemini 両方が支持)
    "yoshinoya",
    "welcia",
    "tsuruha",
  ]),

  // B-4: dポイントカード 1% memberships
  ...defineMemberships("prog-d-pointcard-1pc", [
    "mcdonalds",
    "matsukiyo",
    "nojima",
    "cocokara",
  ]),

  // B-5: Pontaカード 0.5% memberships
  ...defineMemberships("prog-ponta-card-0.5pc", [
    "conv-lawson",
    "sukiya",
    "idemitsu",
    // v3.5.0: Phase 2 Ponta 拡張 (Gemini が示唆、Sonnet が store 存在を確認)
    "kfc",
    "doutor",
    "joshin",
    "apollo-station",
  ]),

  // B-6: Pontaカード 1% memberships (ADDED_LOYALTY_RULES)
  ...defineMemberships("prog-ponta-card-1pc", [
    "jalannet",
    "hotpepper-beauty",
    "hotpepper-gourmet",
    "jalan-golf",
    "jal-rentacar",
  ]),

  // B-7: Vポイントカード 0.5% memberships
  ...defineMemberships("prog-vpoint-card-0.5pc", [
    "conv-familymart",
    "welcia",
    // v3.5.0: Phase 2 V 拡張
    // 飲食大手 (旧Tポイント時代からの主要加盟先)
    "yoshinoya",
    "sukiya",
    // すかいらーくグループ
    "gusto",
    "jonathan",
    "shabuyo",
    "yumetoan",
    "bamiyan",
    "aiya",
    // ゼンショーグループ
    "cocos",
    "hamazushi",
    "big-boy",
    "hanaya-yohei",
    // 家電・書店・GS
    "edion",
    "tsutaya",
    "eneos",
  ]),

  // B-8: nanacoカード 1% memberships
  // 注: nanaco は「カード提示で貯まる loyalty」と「電子マネー決済で貯まる」の
  // 2 モードがある。ここは loyalty (提示で貯まる) 加盟店のみ = セブン&アイグループ。
  // 「電子マネーとして使えるだけ」の店 (吉野家・マック等) はここに入れない。
  // 電子マネー支払側の還元は将来 PaymentApp として nanaco をモデル化する別議題。
  ...defineMemberships("prog-nanaco-card-1pc", ["conv-7eleven"]),

  // B-9: WAONカード 0.5% memberships
  // 注: WAON も nanaco と同じく loyalty / 電子マネー の 2 モードがある。
  // ここは loyalty (提示で貯まる) 加盟店のみ = イオングループ系。
  // ウエルシアはイオングループ傘下のドラッグなので loyalty 加盟。
  // ファミマ・ローソン・ガスト・吉野家・ビックカメラ・コスモ石油は WAON 電子マネー
  // 決済は可能だが loyalty 提示加盟ではないため除外。
  ...defineMemberships("prog-waon-card-0.5pc", [
    "aeon",
    "conv-ministop",
    // v3.5.0: WAON loyalty 拡張 (カード提示でポイントが貯まる加盟店)
    // - welcia: イオン系ドラッグ、WAON POINT 提示加盟 (確認済)
    // - tsuruha: 提示・支払どちらでも WAON POINT 加盟 (Gemini 検証で確認)
    // - cosmo-oil: 提示のみで WAON POINT 加盟 (e-money 支払では貯まらないので注意)
    "welcia",
    "tsuruha",
    "cosmo-oil",
  ]),

  // B-10: JRE POINT カード 0.5% memberships (8 件)
  ...defineMemberships("prog-jre-pointcard-0.5pc", [
    "newdays",
    "kiosk",
    "acure",
    "ecute",
    "gransta",
    "atre",
    "lumine",
    "newoman",
  ]),

  // ═══════════════════════════════════════════════════════════════
  // PR 2 C: PaymentApp 系 memberships
  // 既存の PaymentApp 系 programs (楽天Pay / d払い / PayPay 等) は membership 無し
  // = 全 store 適用 (global program)。
  //
  // ─── v3.6.0: nanaco / WAON 電子マネー memberships ───
  // PointCard モデル (nanaco-card / waon-card) loyalty と二重取りを避けるため、
  // loyalty 加盟店 (= SEED_STORE_PROGRAM_MEMBERSHIPS の B-8 / B-9 セクション) は
  // ここに含めない。「e-money 支払いのみで貯まる」店だけ列挙。
  // ═══════════════════════════════════════════════════════════════

  // C-12: nanaco 電子マネー memberships
  // セブン-イレブン (loyalty 加盟) は除外。e-money のみで貯まる店:
  // - 吉野家 / マクドナルド / ツルハ / ENEOS / ビックカメラ (Gemini 検証)
  ...defineMemberships("prog-pa-nanaco-base", [
    "yoshinoya",
    "mcdonalds",
    "tsuruha",
    "eneos",
    "bic-camera",
  ]),

  // C-13: WAON 電子マネー memberships
  // イオン系 (aeon/ministop/welcia/tsuruha/cosmo-oil) は loyalty 加盟なので除外。
  // ENEOS は WAON 給油非対応のため対象外。
  // e-money のみで貯まる店 = ファミマ/ローソン/ガスト/吉野家/マクドナルド/ビックカメラ
  ...defineMemberships("prog-pa-waon-base", [
    "conv-familymart",
    "conv-lawson",
    "gusto",
    "yoshinoya",
    "mcdonalds",
    "bic-camera",
  ]),

  // V5: JCB J-POINT パートナー memberships
  // V5-2 で W 系列 / Gold 系列の 2 系列に分離 (10 件 = W6 + Gold9、高島屋は Gold のみプレミアム)
  // 倍率は j-pointpartner.jcb.co.jp/search で WebFetch 検証済 (mos-burger のみ未検証、subagent 一般知識)
  // W (jcb-w): 2倍 / 3倍 / 20倍 (4倍は廃止、高島屋を 2倍へ移管)
  // Gold (jcb-gold): 2倍 / 3倍 / 4倍 (高島屋プレミアム) / 20倍

  // ─── W 系列 (jcb-w) ───
  ...defineMemberships("prog-jcb-jpoint-2x", [
    "mercari",
    "welcia",
    "apollo-station",
    "bic-camera",
    "mos-burger",
    // V5-2: 高島屋を W では 2倍 (実効 2%) に移管 (Gold プレミアム 4倍 = 2% と同等)
    "takashimaya",
  ]),
  ...defineMemberships("prog-jcb-jpoint-3x", ["amazon", "conv-7eleven"]),
  ...defineMemberships("prog-jcb-jpoint-20x", ["starbucks"]),

  // ─── Gold 系列 (jcb-gold) ───
  ...defineMemberships("prog-jcb-jpoint-gold-2x", [
    "mercari",
    "welcia",
    "apollo-station",
    "bic-camera",
    "mos-burger",
  ]),
  ...defineMemberships("prog-jcb-jpoint-gold-3x", ["amazon", "conv-7eleven"]),
  ...defineMemberships("prog-jcb-jpoint-gold-4x", ["takashimaya"]),
  ...defineMemberships("prog-jcb-jpoint-gold-20x", ["starbucks"]),

  // ═══════════════════════════════════════════════════════════════
  // v6.5.0: エポス ゴールド/プラチナ優待 + たまるマーケット memberships
  // ═══════════════════════════════════════════════════════════════

  // (a) マルイ優待 (2倍)
  ...defineMemberships("prog-epos-gp-marui", ["marui"]),

  // (b) 選べるポイントアップ (2倍)。対象300以上のうち seed 実在 store を列挙
  // (マルエツ・成城石井は store 未登録のため対象外)。
  ...defineMemberships("prog-epos-gp-selectable-pointup", [
    "conv-7eleven",
    "conv-familymart",
    "conv-lawson",
    "conv-ministop",
    "aeon",
    "seiyu",
    "matsukiyo",
    "welcia",
    "tsuruha",
    [
      "suica-charge",
      { notes: "モバイルSuicaチャージが対象ショップ (エポスゴールド定番の使い方)" },
    ],
    [
      "marui",
      {
        overrideRate: 0.015,
        notes: "マルイ登録時は通常2pt+ボーナス1pt=1.5% (2025-04改定の影響なし)",
      },
    ],
  ]),

  // (c) たまるマーケット (2/3/4倍)。倍率は 2026-07 実測
  // 楽天市場2倍 / Yahoo!2倍 / ユニクロ2倍 / じゃらん3倍 / 無印4倍
  ...defineMemberships("prog-epos-tamaru-2x", [
    "rakuten-ichiba",
    "yahoo-shopping",
    "uniqlo",
  ]),
  ...defineMemberships("prog-epos-tamaru-3x", ["jalannet"]),
  ...defineMemberships("prog-epos-tamaru-4x", ["muji"]),
];
