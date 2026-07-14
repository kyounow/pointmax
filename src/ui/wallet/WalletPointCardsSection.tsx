import { useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useStore } from "../../state/store";
import { isMasterProgram } from "../../state/seed";
import { CurrencyIcon } from "../CurrencyIcon";
import { ResponsiveTable, type ColumnDef } from "../ResponsiveTable";
import type { PointCard } from "../../domain/types";
import { groupBy } from "../../domain/groupBy";
import { PointCardStoresPreview } from "../PointCardStoresPreview";
import { sanitizeNoteForDisplay } from "../../domain/noteParser";

// program × membership から合成する「加盟店 × 還元率」表示行 (旧 LoyaltyRule 相当)。
// v6 PR-1e で手動 loyaltyRule は BenefitProgram + membership に統一されたため、
// 画面はこの形に展開して表示する (BenefitProgram 概念は UI に露出しない)。
type PcStoreRule = {
  id: string;
  programId: string;
  pointCardId: string;
  storeId: string;
  rate: number;
  currencyId?: string;
  validFrom?: string;
  validTo?: string;
  notes?: string;
};

type Props = {
  // ?highlight=<pointCardId> の対象 id (後続 PR の導線用)。
  highlightId?: string;
};

// PointCardsScreen (旧 #pointcards) の内容を移植したウォレットのポイントカードセクション。
// 優先順位 ↑↓ / 二重取り提示還元ルールの追加・削除まで機能等価。
export function WalletPointCardsSection({ highlightId }: Props) {
  const {
    pointCards,
    currencies,
    stores,
    programs,
    memberships,
    addPointCard,
    updatePointCard,
    removePointCard,
    movePointCard,
    addUserLoyaltyProgram,
    removeUserProgram,
  } = useStore(
    useShallow((s) => ({
      pointCards: s.pointCards,
      currencies: s.currencies,
      stores: s.stores,
      programs: s.programs,
      memberships: s.memberships,
      addPointCard: s.addPointCard,
      updatePointCard: s.updatePointCard,
      removePointCard: s.removePointCard,
      movePointCard: s.movePointCard,
      addUserLoyaltyProgram: s.addUserLoyaltyProgram,
      removeUserProgram: s.removeUserProgram,
    })),
  );

  const [pcName, setPcName] = useState("");
  const [pcCurrency, setPcCurrency] = useState("");

  const [lrPointCard, setLrPointCard] = useState("");
  const [lrStore, setLrStore] = useState("");
  const [lrRate, setLrRate] = useState("0.005");
  const [lrNotes, setLrNotes] = useState("");

  const currencyById = useMemo(
    () => new Map(currencies.map((c) => [c.id, c])),
    [currencies],
  );
  const pointCardById = useMemo(
    () => new Map(pointCards.map((p) => [p.id, p])),
    [pointCards],
  );
  const storeById = useMemo(
    () => new Map(stores.map((s) => [s.id, s])),
    [stores],
  );
  const storesByCategory = useMemo(
    () => groupBy(stores, (s) => s.category ?? "その他"),
    [stores],
  );

  // v3 では loyalty 情報の主要な置き場が BenefitProgram + StoreProgramMembership に
  // 移った。表示用にカードごとに「program × membership を加盟店行に合成したもの」を
  // まとめる。ここで作る合成 rule は id を `prog:<programId>:<storeId>` 形式にして
  // 行 key の衝突 (master program は複数 membership を持つ) を避ける。
  //   - programBasedRulesByPointCard: カード列「対象加盟店」プレビュー用 (全 program)
  //   - userLoyaltyRows: 下部の管理表用 (ユーザー自作分 = 非 master のみ。削除可)
  const { programBasedRulesByPointCard, userLoyaltyRows } = useMemo(() => {
    const map = new Map<string, PcStoreRule[]>();
    const userRows: PcStoreRule[] = [];
    const membershipsByProgram = new Map<string, typeof memberships>();
    for (const m of memberships) {
      const arr = membershipsByProgram.get(m.programId);
      if (arr) arr.push(m);
      else membershipsByProgram.set(m.programId, [m]);
    }
    for (const prog of programs) {
      if (!prog.pointCardId) continue;
      const mems = membershipsByProgram.get(prog.id) ?? [];
      // membership がない program は「全店共通」なので店舗一覧には載せない
      if (mems.length === 0) continue;
      const isUser = !isMasterProgram(prog.id);
      const list = map.get(prog.pointCardId) ?? [];
      for (const m of mems) {
        const row: PcStoreRule = {
          id: `prog:${prog.id}:${m.storeId}`,
          programId: prog.id,
          pointCardId: prog.pointCardId,
          storeId: m.storeId,
          rate: m.overrideRate ?? prog.rate,
          currencyId: m.overrideCurrencyId ?? prog.currencyId,
          validFrom: prog.validFrom,
          validTo: prog.validTo,
          notes: prog.notes ?? m.notes,
        };
        list.push(row);
        // 管理表の削除は removeUserProgram(programId) なので id を programId にする
        // (ユーザー自作 loyalty program は membership 1 件なので id は一意)。
        if (isUser) userRows.push({ ...row, id: prog.id });
      }
      map.set(prog.pointCardId, list);
    }
    return { programBasedRulesByPointCard: map, userLoyaltyRows: userRows };
  }, [programs, memberships]);

  const pointCardColumns: ColumnDef<PointCard>[] = [
    {
      key: "icon",
      label: "アイコン",
      view: (p) => {
        const cur = currencyById.get(p.currencyId);
        return cur ? <CurrencyIcon currency={cur} size={28} /> : null;
      },
    },
    {
      key: "name",
      label: "名前",
      view: (p) => p.name,
      edit: (p, set) => (
        <input value={p.name} onChange={(e) => set({ name: e.target.value })} />
      ),
    },
    {
      key: "currency",
      label: "貯まる通貨",
      view: (p) => currencyById.get(p.currencyId)?.name ?? "?",
      edit: (p, set) => (
        <select
          value={p.currencyId}
          onChange={(e) => set({ currencyId: e.target.value })}
        >
          {currencies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "stores",
      label: "対象加盟店",
      view: (p) => {
        const rules = programBasedRulesByPointCard.get(p.id) ?? [];
        return (
          <PointCardStoresPreview
            rules={rules}
            storeName={(id) => storeById.get(id)?.name ?? id}
          />
        );
      },
    },
    {
      // v6.0.0: クレカ/支払方法と同じ「使う」トグル。OFF にすると二重取り loyalty 候補から
      // 外れ、かつこのポイント通貨が交換ルートの起点・経由から除外される (CalcUpgradeBanner で
      // 「有効化すれば +X」を提示)。CardsScreen / PaymentAppsScreen と同じ最後尾の列位置に配置 (v6.0.1)。
      key: "enabled",
      label: "使う",
      width: 90,
      view: (p) => {
        const on = p.enabled === true; // v7: enabled === true のみ「使う」
        return (
          <label
            className={`card-enabled-toggle ${on ? "is-on" : "is-off"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={on}
              onChange={(e) =>
                updatePointCard(p.id, {
                  // v7: ON = enabled:true (明示値) / OFF = false
                  enabled: e.target.checked ? true : false,
                })
              }
            />
            <span>{on ? "使う" : "OFF"}</span>
          </label>
        );
      },
      edit: (p, set) => {
        const on = p.enabled === true; // v7: enabled === true のみ「使う」
        return (
          <label className={`card-enabled-toggle ${on ? "is-on" : "is-off"}`}>
            <input
              type="checkbox"
              checked={on}
              onChange={(e) =>
                // v7: ON = enabled:true (明示値) / OFF = false
                set({ enabled: e.target.checked ? true : false })
              }
            />
            <span>{on ? "使う" : "OFF"}</span>
          </label>
        );
      },
    },
  ];

  // 自作の提示還元ルールの一覧。表示専用 (追加はフォーム、削除は removeUserProgram)。
  // 編集導線は Phase 2 (IA-4) で用意予定。
  const loyaltyColumns: ColumnDef<PcStoreRule>[] = [
    {
      key: "pointCard",
      label: "ポイントカード",
      view: (r) => pointCardById.get(r.pointCardId)?.name ?? "?",
    },
    {
      key: "store",
      label: "店舗",
      view: (r) => storeById.get(r.storeId)?.name ?? "?",
    },
    {
      key: "rate",
      label: "還元率",
      view: (r) => `${(r.rate * 100).toFixed(2)}%`,
    },
    {
      key: "campaign",
      label: "キャンペーン期間",
      view: (r) => {
        if (!r.validFrom && !r.validTo) return "-";
        return `${r.validFrom ?? "..."} 〜 ${r.validTo ?? "..."}`;
      },
    },
    {
      key: "notes",
      label: "メモ",
      view: (r) => sanitizeNoteForDisplay(r.notes) ?? "-",
    },
  ];

  return (
    <div>
      <h2>ポイントカード（二重取り用）</h2>
      <p className="hint">
        クレカ決済の還元と<strong>別軸</strong>で、店頭提示で貯まるポイントカード。計算画面で「ポイントカード併用ボーナス」として表示されます。
      </p>

      <h3 style={{ marginTop: 8 }}>保有しているポイントカード</h3>
      <p className="hint" style={{ marginBottom: 6 }}>
        並び順 = 優先順位（上ほど優先）。同点還元の店舗で複数カードが対象になった時、上のカードが採用されます。
      </p>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!pcName.trim() || !pcCurrency) return;
          addPointCard({
            name: pcName.trim(),
            currencyId: pcCurrency,
          });
          setPcName("");
          setPcCurrency("");
        }}
      >
        <input
          placeholder="ポイントカード名 (例: dポイントカード)"
          value={pcName}
          onChange={(e) => setPcName(e.target.value)}
        />
        <select value={pcCurrency} onChange={(e) => setPcCurrency(e.target.value)}>
          <option value="">貯まる通貨</option>
          {currencies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit">追加</button>
      </form>

      <ResponsiveTable
        rows={pointCards}
        columns={pointCardColumns}
        onSave={(id, patch) => updatePointCard(id, patch)}
        onDelete={removePointCard}
        highlightId={highlightId}
        extraActions={(p) => {
          const i = pointCards.findIndex((x) => x.id === p.id);
          return (
            <>
              <button
                onClick={() => movePointCard(p.id, "up")}
                disabled={i === 0}
                title="優先度を上げる"
              >
                ↑
              </button>
              <button
                onClick={() => movePointCard(p.id, "down")}
                disabled={i === pointCards.length - 1}
                title="優先度を下げる"
              >
                ↓
              </button>
            </>
          );
        }}
        testId="point-cards"
      />

      <h3 style={{ marginTop: 24 }}>店舗 × ポイントカード 提示還元ルール</h3>
      <p className="hint">
        店頭提示で貯まる自作の還元ルール一覧。クレカ決済とは別途加算されます。追加は下の
        「カスタム還元ルールを追加 (上級)」から。
      </p>

      {/* PR-2b2: 日常操作 (トグル/優先順位/一覧確認) を上に、たまにしか使わない追加フォームを
          details で下へ降格。既定は閉じる。一覧 (自作ルールの管理表) は details の外で常に表示。 */}
      <details className="wallet-advanced-form">
        <summary className="wallet-advanced-form-summary">
          ▸ カスタム還元ルールを追加 (上級)
        </summary>
        <p className="hint">
          例: ローソンでdポイントカード提示 → 200円ごとに1ptなど。
        </p>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            if (!lrPointCard || !lrStore) return;
            // 店舗 × ポイントカード提示還元を program + membership に変換して atomic 追加。
            // currencyId は addUserLoyaltyProgram が pointCard.currencyId で補完する。
            addUserLoyaltyProgram({
              storeId: lrStore,
              pointCardId: lrPointCard,
              rate: Number(lrRate),
              notes: lrNotes.trim() || undefined,
            });
            setLrPointCard("");
            setLrStore("");
            setLrRate("0.005");
            setLrNotes("");
          }}
        >
          <select value={lrPointCard} onChange={(e) => setLrPointCard(e.target.value)}>
            <option value="">ポイントカード</option>
            {pointCards.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select value={lrStore} onChange={(e) => setLrStore(e.target.value)}>
            <option value="">店舗</option>
            {storesByCategory.map((g) => (
              <optgroup key={g.key} label={g.key}>
                {g.items.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <input
            type="number"
            inputMode="decimal"
            step="0.001"
            min="0"
            placeholder="0.005 (=0.5%)"
            value={lrRate}
            onChange={(e) => setLrRate(e.target.value)}
          />
          <input
            placeholder="メモ (任意)"
            value={lrNotes}
            onChange={(e) => setLrNotes(e.target.value)}
          />
          <button type="submit">追加</button>
        </form>
      </details>

      <ResponsiveTable
        rows={userLoyaltyRows}
        columns={loyaltyColumns}
        onDelete={removeUserProgram}
        testId="loyalty-rules"
      />
    </div>
  );
}
