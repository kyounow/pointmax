import { describe, it, expect } from "vitest";
import {
  DEFAULT_CHANNEL,
  PURCHASE_CHANNELS,
  defaultChannelForStore,
  effectiveChannel,
  isChannelMatch,
  isOnlineOnlyStore,
} from "./purchaseChannel";
import type { PurchaseChannel } from "./types";

describe("purchaseChannel 定数", () => {
  it("PURCHASE_CHANNELS は in-store / online の 2 値", () => {
    expect([...PURCHASE_CHANNELS]).toEqual(["in-store", "online"]);
  });
  it("DEFAULT_CHANNEL は店頭", () => {
    expect(DEFAULT_CHANNEL).toBe("in-store");
  });
});

describe("effectiveChannel", () => {
  it("membership.channel が program.channel より優先", () => {
    expect(effectiveChannel({ channel: "online" }, { channel: "in-store" })).toBe(
      "in-store",
    );
    expect(effectiveChannel({ channel: "in-store" }, { channel: "online" })).toBe(
      "online",
    );
  });
  it("membership.channel 未指定なら program.channel", () => {
    expect(effectiveChannel({ channel: "online" }, {})).toBe("online");
    expect(effectiveChannel({ channel: "online" }, undefined)).toBe("online");
  });
  it("双方 undefined なら undefined (= 両チャネル有効)", () => {
    expect(effectiveChannel({}, {})).toBeUndefined();
    expect(effectiveChannel({}, undefined)).toBeUndefined();
  });
});

describe("isChannelMatch", () => {
  const channels: PurchaseChannel[] = ["in-store", "online"];

  it("有効チャネル undefined (program / membership とも未指定) は両チャネルで true", () => {
    for (const ch of channels) {
      expect(isChannelMatch({}, undefined, ch)).toBe(true);
      expect(isChannelMatch({}, {}, ch)).toBe(true);
    }
  });

  it("program.channel=online: online のみ true", () => {
    expect(isChannelMatch({ channel: "online" }, undefined, "online")).toBe(true);
    expect(isChannelMatch({ channel: "online" }, undefined, "in-store")).toBe(false);
  });

  it("program.channel=in-store: in-store のみ true", () => {
    expect(isChannelMatch({ channel: "in-store" }, undefined, "in-store")).toBe(true);
    expect(isChannelMatch({ channel: "in-store" }, undefined, "online")).toBe(false);
  });

  it("membership.channel=online が program 未指定を上書き (online のみ true)", () => {
    expect(isChannelMatch({}, { channel: "online" }, "online")).toBe(true);
    expect(isChannelMatch({}, { channel: "online" }, "in-store")).toBe(false);
  });

  it("membership.channel=in-store が program.channel=online を上書き (in-store のみ true)", () => {
    expect(isChannelMatch({ channel: "online" }, { channel: "in-store" }, "in-store")).toBe(
      true,
    );
    expect(isChannelMatch({ channel: "online" }, { channel: "in-store" }, "online")).toBe(
      false,
    );
  });
});

describe("isOnlineOnlyStore / defaultChannelForStore", () => {
  it("カテゴリ『ネット通販』は純 EC 店 (online)", () => {
    const s = { id: "rakuten-ichiba", category: "ネット通販" };
    expect(isOnlineOnlyStore(s)).toBe(true);
    expect(defaultChannelForStore(s)).toBe("online");
  });

  it("ONLINE_ONLY_STORE_IDS (jalannet / hmv-books-online) はカテゴリに関係なく純 EC 店", () => {
    expect(isOnlineOnlyStore({ id: "jalannet", category: "旅行代理店" })).toBe(true);
    expect(isOnlineOnlyStore({ id: "hmv-books-online", category: "音楽・映像" })).toBe(
      true,
    );
    expect(defaultChannelForStore({ id: "jalannet", category: "旅行代理店" })).toBe(
      "online",
    );
  });

  it("物理店 (bic-camera / 家電量販店) は店頭", () => {
    const s = { id: "bic-camera", category: "家電量販店" };
    expect(isOnlineOnlyStore(s)).toBe(false);
    expect(defaultChannelForStore(s)).toBe("in-store");
  });

  it("category 無しの店は店頭", () => {
    const s = { id: "some-store" };
    expect(isOnlineOnlyStore(s)).toBe(false);
    expect(defaultChannelForStore(s)).toBe("in-store");
  });
});
