import { describe, it, expect } from "vitest";
import {
  DEFAULT_MAX_CHILDREN,
  MAX_CHILDREN_HARD_CAP,
  extractAnchors,
  mergeChildExtractions,
  normalizeChildUrls,
  parseIndexResponse,
  pathnameKey,
  registrableDomain,
  resolveMaxChildren,
  type ChildExtraction,
} from "./crawl-index";
import type { ExtractedSource } from "./types";

// ───────────────────────────────────────────────────────────────
// resolveMaxChildren
// ───────────────────────────────────────────────────────────────

describe("resolveMaxChildren", () => {
  it("未指定はデフォルト値", () => {
    expect(resolveMaxChildren(undefined)).toBe(DEFAULT_MAX_CHILDREN);
  });

  it("範囲内はそのまま (小数は切り捨て)", () => {
    expect(resolveMaxChildren(3)).toBe(3);
    expect(resolveMaxChildren(3.9)).toBe(3);
  });

  it("ハードキャップ超 / 0 以下はクランプ", () => {
    expect(resolveMaxChildren(99)).toBe(MAX_CHILDREN_HARD_CAP);
    expect(resolveMaxChildren(0)).toBe(1);
    expect(resolveMaxChildren(-5)).toBe(1);
  });

  it("NaN はデフォルト値", () => {
    expect(resolveMaxChildren(Number.NaN)).toBe(DEFAULT_MAX_CHILDREN);
  });
});

// ───────────────────────────────────────────────────────────────
// parseIndexResponse
// ───────────────────────────────────────────────────────────────

describe("parseIndexResponse", () => {
  it("正常な JSON を parse する", () => {
    const r = parseIndexResponse(
      JSON.stringify({
        promptVersion: "campaign-index-v1.0",
        urls: [{ url: "https://example.com/c/1", title: "+5%還元" }],
        notes: "2 件カット",
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.urls).toEqual([{ url: "https://example.com/c/1", title: "+5%還元" }]);
      expect(r.droppedEntries).toBe(0);
      expect(r.notes).toBe("2 件カット");
    }
  });

  it("コードフェンスでラップされていても parse できる", () => {
    const r = parseIndexResponse(
      '```json\n{"urls":[{"url":"https://example.com/c/2"}]}\n```',
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.urls).toHaveLength(1);
  });

  it("配列ラップは先頭要素を採用する (fetch-source 本流と同じ保険)", () => {
    const r = parseIndexResponse('[{"urls":[{"url":"https://example.com/c/3"}]}]');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.urls[0].url).toBe("https://example.com/c/3");
  });

  it("型不正なエントリは drop して残りを救済する", () => {
    const r = parseIndexResponse(
      JSON.stringify({
        urls: [
          { url: "https://example.com/ok" },
          { url: 123 },
          "not-an-object",
          { title: "url なし" },
          { url: "   " },
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.urls).toEqual([{ url: "https://example.com/ok" }]);
      expect(r.droppedEntries).toBe(4);
    }
  });

  it("JSON でない散文は ok:false", () => {
    const r = parseIndexResponse("このページは索引ハブで抽出できませんでした。");
    expect(r.ok).toBe(false);
  });

  it("urls[] 欠落は ok:false", () => {
    const r = parseIndexResponse('{"promptVersion":"campaign-index-v1.0"}');
    expect(r.ok).toBe(false);
  });

  it("空文字は ok:false", () => {
    expect(parseIndexResponse("").ok).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────
// registrableDomain
// ───────────────────────────────────────────────────────────────

describe("registrableDomain", () => {
  it("複合 TLD (.co.jp / .ne.jp) はラベル 3 つで判定", () => {
    expect(registrableDomain("cash.rakuten.co.jp")).toBe("rakuten.co.jp");
    expect(registrableDomain("pay.rakuten.co.jp")).toBe("rakuten.co.jp");
    expect(registrableDomain("www.jal.co.jp")).toBe("jal.co.jp");
    expect(registrableDomain("paypay.ne.jp")).toBe("paypay.ne.jp");
    expect(registrableDomain("service.smt.docomo.ne.jp")).toBe("docomo.ne.jp");
  });

  it("単純 TLD はラベル 2 つで判定", () => {
    expect(registrableDomain("www.jrepoint.jp")).toBe("jrepoint.jp");
    expect(registrableDomain("jrepoint.jp")).toBe("jrepoint.jp");
    expect(registrableDomain("sub.example.com")).toBe("example.com");
  });

  it("大文字は小文字に正規化", () => {
    expect(registrableDomain("WWW.Rakuten.CO.JP")).toBe("rakuten.co.jp");
  });
});

// ───────────────────────────────────────────────────────────────
// normalizeChildUrls
// ───────────────────────────────────────────────────────────────

describe("normalizeChildUrls", () => {
  const INDEX = "https://cash.rakuten.co.jp/campaign/?l-id=header";

  it("相対 URL を index 基準で絶対化する", () => {
    const r = normalizeChildUrls(INDEX, [{ url: "/campaign/detail/123" }], 5);
    expect(r.accepted).toEqual([
      { url: "https://cash.rakuten.co.jp/campaign/detail/123" },
    ]);
  });

  it("同一 registrableDomain の別サブドメインは許可、他社ドメインは crossDomain で除外", () => {
    const r = normalizeChildUrls(
      INDEX,
      [
        { url: "https://pay.rakuten.co.jp/campaign/abc", title: "OK" },
        { url: "https://evil.example.com/campaign", title: "NG" },
        { url: "https://other.co.jp/campaign", title: "NG2" },
      ],
      5,
    );
    expect(r.accepted.map((a) => a.url)).toEqual([
      "https://pay.rakuten.co.jp/campaign/abc",
    ]);
    expect(r.rejected.map((x) => x.reason)).toEqual(["crossDomain", "crossDomain"]);
  });

  it("非 http(s) / 不正 URL を除外する", () => {
    const r = normalizeChildUrls(
      INDEX,
      [
        { url: "javascript:void(0)" },
        { url: "mailto:a@example.com" },
        { url: "https://cash.rakuten.co.jp/ok" },
      ],
      5,
    );
    expect(r.accepted).toHaveLength(1);
    expect(r.rejected.map((x) => x.reason)).toEqual(["nonHttp", "nonHttp"]);
  });

  it("重複 (hash 違い含む) を除去し、index 自身も除外する", () => {
    const r = normalizeChildUrls(
      INDEX,
      [
        { url: "https://cash.rakuten.co.jp/c/1" },
        { url: "https://cash.rakuten.co.jp/c/1#section" },
        { url: INDEX },
      ],
      5,
    );
    expect(r.accepted).toHaveLength(1);
    expect(r.rejected.map((x) => x.reason)).toEqual(["duplicate", "indexItself"]);
  });

  it("maxChildren 超過分は overCap で除外する", () => {
    const entries = Array.from({ length: 4 }, (_, i) => ({
      url: `https://cash.rakuten.co.jp/c/${i}`,
    }));
    const r = normalizeChildUrls(INDEX, entries, 2);
    expect(r.accepted).toHaveLength(2);
    expect(r.rejected.filter((x) => x.reason === "overCap")).toHaveLength(2);
  });

  it("title を保持する", () => {
    const r = normalizeChildUrls(
      INDEX,
      [{ url: "/c/9", title: "ビックカメラ +5%" }],
      5,
    );
    expect(r.accepted[0].title).toBe("ビックカメラ +5%");
  });

  it("抽選系タイトルは excludedTitle で除外する (RPM 節約)", () => {
    const r = normalizeChildUrls(
      INDEX,
      [
        { url: "/c/1", title: "全額還元！抽選で1万名様にポイントプレゼント" },
        { url: "/c/2", title: "300万ポイント山分けキャンペーン" },
        { url: "/c/3", title: "ビックカメラで楽天ペイ +5%" },
        { url: "/c/4" }, // title 無しは通す
      ],
      5,
    );
    expect(r.accepted.map((a) => a.url)).toEqual([
      "https://cash.rakuten.co.jp/c/3",
      "https://cash.rakuten.co.jp/c/4",
    ]);
    expect(r.rejected.map((x) => x.reason)).toEqual([
      "excludedTitle",
      "excludedTitle",
    ]);
  });

  describe("candidates (ground truth) 照合", () => {
    const CANDIDATES = [
      { url: "https://pay.rakuten.co.jp/campaign/pay-5and0day/?scid=wi_cash_cpn", title: "5と0のつく日" },
      { url: "https://pay.rakuten.co.jp/campaign/tokyo-gogo/?scid=wi_cash_cpn", title: "東京GOGO" },
    ];

    it("一覧に無い URL (捏造) は notInPage で除外する", () => {
      const r = normalizeChildUrls(
        INDEX,
        [
          // 2026-06-10 実 fetch で観測した Gemini の捏造 URL パターン
          { url: "https://cash.rakuten.co.jp/campaign/detail/2026/0601-pay-lottery/", title: "本物風" },
          { url: "https://pay.rakuten.co.jp/campaign/tokyo-gogo/?scid=wi_cash_cpn", title: "東京GOGO" },
        ],
        5,
        { candidates: CANDIDATES },
      );
      expect(r.accepted.map((a) => a.url)).toEqual([
        "https://pay.rakuten.co.jp/campaign/tokyo-gogo/?scid=wi_cash_cpn",
      ]);
      expect(r.rejected[0].reason).toBe("notInPage");
    });

    it("Gemini がクエリを落としても pathnameKey 照合で実在側の完全 URL に復元する", () => {
      const r = normalizeChildUrls(
        INDEX,
        [{ url: "https://pay.rakuten.co.jp/campaign/pay-5and0day", title: "5と0のつく日" }],
        5,
        { candidates: CANDIDATES },
      );
      expect(r.accepted[0].url).toBe(
        "https://pay.rakuten.co.jp/campaign/pay-5and0day/?scid=wi_cash_cpn",
      );
    });

    it("candidates が空配列なら全件 notInPage (prefetch 成功 + リンク 0 の保守動作)", () => {
      const r = normalizeChildUrls(
        INDEX,
        [{ url: "https://cash.rakuten.co.jp/c/1" }],
        5,
        { candidates: [] },
      );
      expect(r.accepted).toHaveLength(0);
      expect(r.rejected[0].reason).toBe("notInPage");
    });
  });
});

// ───────────────────────────────────────────────────────────────
// pathnameKey
// ───────────────────────────────────────────────────────────────

describe("pathnameKey", () => {
  it("クエリと hash を無視し、trailing slash を正規化する", () => {
    expect(pathnameKey("https://pay.rakuten.co.jp/campaign/x/?scid=abc")).toBe(
      "https://pay.rakuten.co.jp/campaign/x",
    );
    expect(pathnameKey("https://pay.rakuten.co.jp/campaign/x")).toBe(
      "https://pay.rakuten.co.jp/campaign/x",
    );
  });

  it("不正 URL は null", () => {
    expect(pathnameKey("not-a-url")).toBeNull();
  });
});

// ───────────────────────────────────────────────────────────────
// extractAnchors
// ───────────────────────────────────────────────────────────────

describe("extractAnchors", () => {
  const BASE = "https://cash.rakuten.co.jp/campaign/";

  it("href とリンクテキストを抽出し、相対 URL を絶対化する", () => {
    const html = `
      <div><a href="https://pay.rakuten.co.jp/campaign/abc/?scid=x">ビックカメラ <b>+5%</b></a></div>
      <a href='/campaign/local/'>ローカル</a>
    `;
    const anchors = extractAnchors(html, BASE);
    expect(anchors).toEqual([
      { url: "https://pay.rakuten.co.jp/campaign/abc/?scid=x", title: "ビックカメラ +5%" },
      { url: "https://cash.rakuten.co.jp/campaign/local/", title: "ローカル" },
    ]);
  });

  it("画像のみリンクは alt をタイトルに使う", () => {
    const html = `<a href="/c/1"><img src="banner.png" alt="d払い祭"></a>`;
    const anchors = extractAnchors(html, BASE);
    expect(anchors[0].title).toBe("d払い祭");
  });

  it("fragment / javascript / mailto / 重複は除外する", () => {
    const html = `
      <a href="#section">ページ内</a>
      <a href="javascript:void(0)">JS</a>
      <a href="mailto:a@example.com">メール</a>
      <a href="/c/1">A</a>
      <a href="/c/1">A 再掲</a>
    `;
    const anchors = extractAnchors(html, BASE);
    expect(anchors).toHaveLength(1);
    expect(anchors[0].url).toBe("https://cash.rakuten.co.jp/c/1");
  });

  it("maxAnchors で打ち切る", () => {
    const html = Array.from({ length: 10 }, (_, i) => `<a href="/c/${i}">c${i}</a>`).join("");
    expect(extractAnchors(html, BASE, 3)).toHaveLength(3);
  });

  it("不正な baseUrl は空配列", () => {
    expect(extractAnchors('<a href="/x">x</a>', "not-a-url")).toEqual([]);
  });
});

// ───────────────────────────────────────────────────────────────
// mergeChildExtractions
// ───────────────────────────────────────────────────────────────

const SOURCE = {
  id: "rakuten-pay-campaigns",
  url: "https://cash.rakuten.co.jp/campaign/",
  extractor: "campaign" as const,
};

function childData(over: Partial<ExtractedSource>): ExtractedSource {
  return {
    sourceId: SOURCE.id,
    sourceUrl: "https://cash.rakuten.co.jp/c/x",
    fetchedAt: "2026-06-10T00:00:00.000Z",
    promptVersion: "campaign-v3.1",
    extractor: "campaign",
    geminiModel: "gemini-2.5-flash",
    ...over,
  };
}

const prog = (id: string, evidenceUrl?: string) => ({
  programId: id,
  rate: 0.05,
  currencyId: "rakuten-pt",
  paymentAppId: "pa-rakuten-pay",
  validFrom: "2026-06-01",
  validTo: "2026-06-30",
  evidenceQuote: "期間：2026年6月1日〜30日、+5%",
  explicitness: 0.9,
  ambiguity: 0.1,
  ...(evidenceUrl ? { evidenceUrl } : {}),
});

const member = (programId: string, storeId: string) => ({
  programId,
  storeId,
  evidenceQuote: "対象店舗",
  explicitness: 0.9,
  ambiguity: 0.1,
});

describe("mergeChildExtractions", () => {
  it("複数の子ページの programs/memberships/stores を統合する", () => {
    const children: ChildExtraction[] = [
      {
        url: "https://cash.rakuten.co.jp/c/1",
        status: "success",
        data: childData({
          programs: [prog("prog-a")],
          memberships: [member("prog-a", "bic-camera")],
        }),
      },
      {
        url: "https://cash.rakuten.co.jp/c/2",
        status: "success",
        data: childData({
          programs: [prog("prog-b")],
          memberships: [member("prog-b", "joshin")],
          stores: [
            {
              storeId: "joshin",
              name: "ジョーシン",
              category: "家電量販店",
              evidenceQuote: "対象店舗 ジョーシン",
              explicitness: 0.9,
              ambiguity: 0.1,
            },
          ],
        }),
      },
    ];
    const merged = mergeChildExtractions({
      source: SOURCE,
      geminiModel: "gemini-2.5-flash",
      fetchedAt: "2026-06-10T01:00:00.000Z",
      children,
    });
    expect(merged.sourceId).toBe(SOURCE.id);
    expect(merged.sourceUrl).toBe(SOURCE.url); // 索引 URL を維持
    expect(merged.programs?.map((p) => p.programId)).toEqual(["prog-a", "prog-b"]);
    expect(merged.memberships).toHaveLength(2);
    expect(merged.stores).toHaveLength(1);
    expect(merged.promptVersion).toBe("campaign-v3.1");
  });

  it("子ページ間の重複 (同 programId / 同 programId|storeId) は先勝ちで dedupe", () => {
    const children: ChildExtraction[] = [
      {
        url: "https://cash.rakuten.co.jp/c/1",
        status: "success",
        data: childData({
          programs: [prog("prog-a")],
          memberships: [member("prog-a", "bic-camera")],
        }),
      },
      {
        url: "https://cash.rakuten.co.jp/c/1-alias",
        status: "success",
        data: childData({
          programs: [prog("prog-a")],
          memberships: [member("prog-a", "bic-camera"), member("prog-a", "kojima")],
        }),
      },
    ];
    const merged = mergeChildExtractions({
      source: SOURCE,
      geminiModel: "gemini-2.5-flash",
      fetchedAt: "2026-06-10T01:00:00.000Z",
      children,
    });
    expect(merged.programs).toHaveLength(1);
    expect(merged.memberships?.map((m) => m.storeId)).toEqual([
      "bic-camera",
      "kojima",
    ]);
    expect(merged.notes).toContain("重複除去");
  });

  it("evidenceUrl が無いアイテムには子ページ URL を補完、既存は維持", () => {
    const children: ChildExtraction[] = [
      {
        url: "https://cash.rakuten.co.jp/c/1",
        status: "success",
        data: childData({
          programs: [
            prog("prog-no-url"),
            prog("prog-with-url", "https://cash.rakuten.co.jp/original"),
          ],
        }),
      },
    ];
    const merged = mergeChildExtractions({
      source: SOURCE,
      geminiModel: "gemini-2.5-flash",
      fetchedAt: "2026-06-10T01:00:00.000Z",
      children,
    });
    expect(merged.programs?.[0].evidenceUrl).toBe("https://cash.rakuten.co.jp/c/1");
    expect(merged.programs?.[1].evidenceUrl).toBe(
      "https://cash.rakuten.co.jp/original",
    );
  });

  it("失敗した子は notes に理由付きで記録され、配列には影響しない", () => {
    const children: ChildExtraction[] = [
      {
        url: "https://cash.rakuten.co.jp/c/ok",
        status: "success",
        data: childData({ programs: [prog("prog-a")] }),
      },
      {
        url: "https://cash.rakuten.co.jp/c/broken",
        title: "壊れたページ",
        status: "failed",
        failReason: "nonJson",
      },
    ];
    const merged = mergeChildExtractions({
      source: SOURCE,
      geminiModel: "gemini-2.5-flash",
      fetchedAt: "2026-06-10T01:00:00.000Z",
      children,
    });
    expect(merged.programs).toHaveLength(1);
    expect(merged.notes).toContain("成功 1 / 失敗 1");
    expect(merged.notes).toContain("✗ https://cash.rakuten.co.jp/c/broken");
    expect(merged.notes).toContain("nonJson");
  });

  it("子ゼロ (採用 URL なし) でも有効な空 ExtractedSource を返す", () => {
    const merged = mergeChildExtractions({
      source: SOURCE,
      geminiModel: "gemini-2.5-flash",
      fetchedAt: "2026-06-10T01:00:00.000Z",
      children: [],
      indexNotes: "索引に詳細リンクなし",
    });
    expect(merged.programs).toBeUndefined();
    expect(merged.promptVersion).toBe("campaign-vUnknown");
    expect(merged.notes).toContain("子ページ 0 件");
    expect(merged.notes).toContain("索引に詳細リンクなし");
  });
});
