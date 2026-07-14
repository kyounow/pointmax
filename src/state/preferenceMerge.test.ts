import { describe, it, expect } from "vitest";
import { preservePreferences } from "./preferenceMerge";

type Rec = { id: string; name: string; enabled?: boolean; userModifiedAt?: string };

describe("preservePreferences", () => {
  it("取込にキーが無く、ローカルに enabled=false → ローカル値を保持 (公式 master 取込)", () => {
    const incoming: Rec[] = [{ id: "a", name: "A" }]; // enabled キー無し
    const local: Rec[] = [{ id: "a", name: "A(local)", enabled: false }];
    const out = preservePreferences(incoming, local, ["enabled"]);
    expect(out[0].enabled).toBe(false);
    expect(out[0].name).toBe("A"); // name は取込側 (データは置換)
  });

  it("v7: 取込にキーが無く、ローカルに enabled=true → ユーザーの「使う」ON を保持 (全 OFF master 取込後も維持)", () => {
    // v7 では master は enabled を出荷せず全 OFF 起点。ユーザーが ON にしたカード (enabled:true) が
    // 公式 master 全置換取込 (incoming にキー無し) で巻き戻らないことを構造的に保証する。
    const incoming: Rec[] = [{ id: "a", name: "A" }]; // 公式 master = enabled キー無し
    const local: Rec[] = [{ id: "a", name: "A(local)", enabled: true }];
    const out = preservePreferences(incoming, local, ["enabled"]);
    expect(out[0].enabled).toBe(true);
  });

  it("取込に enabled=false が明示 → リモート優先 (クロスデバイス export)", () => {
    const incoming: Rec[] = [{ id: "a", name: "A", enabled: false }];
    const local: Rec[] = [{ id: "a", name: "A", enabled: true }];
    const out = preservePreferences(incoming, local, ["enabled"]);
    expect(out[0].enabled).toBe(false);
  });

  it("取込に enabled=true が明示 → リモート優先 (ローカル false を上書き)", () => {
    const incoming: Rec[] = [{ id: "a", name: "A", enabled: true }];
    const local: Rec[] = [{ id: "a", name: "A", enabled: false }];
    const out = preservePreferences(incoming, local, ["enabled"]);
    expect(out[0].enabled).toBe(true);
  });

  it("ローカルに存在しない id はそのまま (新規レコード)", () => {
    const incoming: Rec[] = [{ id: "new", name: "New" }];
    const out = preservePreferences(incoming, [], ["enabled"]);
    expect(out[0]).toEqual({ id: "new", name: "New" });
  });

  it("userModifiedAt も同様に保持される", () => {
    const incoming: Rec[] = [{ id: "a", name: "A" }];
    const local: Rec[] = [{ id: "a", name: "A", userModifiedAt: "2026-01-01" }];
    const out = preservePreferences(incoming, local, ["enabled", "userModifiedAt"]);
    expect(out[0].userModifiedAt).toBe("2026-01-01");
  });

  it("ローカルも値が無ければ何も足さない (undefined のまま)", () => {
    const incoming: Rec[] = [{ id: "a", name: "A" }];
    const local: Rec[] = [{ id: "a", name: "A" }]; // enabled 無し
    const out = preservePreferences(incoming, local, ["enabled"]);
    expect("enabled" in out[0]).toBe(false);
  });

  it("prefKeys に含まれないフィールドは引き継がない", () => {
    const incoming: Rec[] = [{ id: "a", name: "A" }];
    const local: Rec[] = [{ id: "a", name: "A", userModifiedAt: "x" }];
    // prefKeys に userModifiedAt を入れない → 保持されない
    const out = preservePreferences(incoming, local, ["enabled"]);
    expect(out[0].userModifiedAt).toBeUndefined();
  });
});
