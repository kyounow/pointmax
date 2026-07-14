// location.hash ベースの極小ルータ (改善計画 PR-0d)。
//
// ルート文法 (後続 PR の契約 — ここで確定):
//   #<tab>[/<sub>][?<query>]
//   例) #calculator
//       #settings/history            → tab=settings, sub=history
//       #cards?highlight=epos-gold   → tab=cards, params.highlight=epos-gold
//       #wallet?highlight=family-epos
//
//   - <tab>  : 必須。画面 (タブ) の id。本モジュールは **未知 tab の妥当性判定をしない**
//              (TABS との突合と fallback は App 側の責務)。
//   - <sub>  : 任意。tab 配下のサブセクション (例: #settings/history)。
//   - <query>: 任意。URLSearchParams としてパース (例: highlight=family-epos)。
//   空 hash ("" / "#") は tab:"calculator" にフォールバックする。
//
// 各セグメントは encode/decode される (buildHash が encodeURIComponent、
// parseHash が decode)。malformed な percent-encoding では素の文字列に fallback。

import { useMemo, useSyncExternalStore } from "react";

export type Route = { tab: string; sub?: string; params: URLSearchParams };

// decodeURIComponent は不正な %XX で例外を投げるため、失敗時は生文字列に fallback。
function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

// hash 文字列 → Route。純関数 (副作用なし)。先頭 # は任意。
export function parseHash(hash: string): Route {
  let raw = hash.startsWith("#") ? hash.slice(1) : hash;

  // query 部を分離
  let params: URLSearchParams;
  const qIndex = raw.indexOf("?");
  if (qIndex >= 0) {
    params = new URLSearchParams(raw.slice(qIndex + 1));
    raw = raw.slice(0, qIndex);
  } else {
    params = new URLSearchParams();
  }

  // path 部を tab / sub に分解 (先頭・末尾・連続スラッシュは無視)
  const segments = raw.split("/").filter((s) => s.length > 0);
  const tab = segments.length > 0 ? safeDecode(segments[0]) : "calculator";
  const sub = segments.length > 1 ? safeDecode(segments[1]) : undefined;

  // 空文字 tab (例: "#/foo") も calculator に寄せる
  return { tab: tab || "calculator", sub, params };
}

// Route (の部分) → hash 文字列 (先頭 # は付けない)。parseHash と round-trip する。
export function buildHash(route: {
  tab: string;
  sub?: string;
  params?: Record<string, string>;
}): string {
  let path = encodeURIComponent(route.tab);
  if (route.sub) path += "/" + encodeURIComponent(route.sub);
  if (route.params) {
    const query = new URLSearchParams(route.params).toString();
    if (query) path += "?" + query;
  }
  return path;
}

// 履歴を積んで遷移 (通常のタブ切替)。先頭 # を正規化 (二重 # を防ぐ)。
export function navigate(path: string): void {
  location.hash = path.startsWith("#") ? path : "#" + path;
}

// 履歴を汚さず現在のエントリを置換 (初期正規化用)。
// 注意: replaceState は hashchange を発火しないため useRoute の購読者へは通知されない。
// 初期化 (空 hash → calculator 等、parse 結果が変わらない正規化) 専用に使う。
export function replaceRoute(path: string): void {
  const clean = path.startsWith("#") ? path.slice(1) : path;
  history.replaceState(null, "", "#" + clean);
}

// --- useRoute: hashchange を購読する hook ---
// useSyncExternalStore の getSnapshot は「毎回同じ値 (===) を返す」必要があるため、
// snapshot は生の hash 文字列 (プリミティブ) に留め、parse は useMemo 側で行う。
// (Route オブジェクトを snapshot にすると毎回新しい参照になり無限 render になる)
function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function getSnapshot(): string {
  return location.hash;
}

function getServerSnapshot(): string {
  return "";
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => parseHash(hash), [hash]);
}
