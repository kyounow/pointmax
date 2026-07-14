// PR-0c: オンライン / オフライン状態を購読する hook。
//
// 【背景】
//   「店頭で数秒」というコア利用場面は弱電波環境と重なりやすい。オフライン時に
//   同期系 UI (UpdateBanner / SyncUpdateModal) が出しゃばると邪魔になるため、
//   これらを navigator.onLine で抑制する。計算・閲覧系は元々ローカル完結なので
//   この hook の影響を受けない。
//
// 【設計】
//   navigator.onLine を初期スナップショットに、window の online/offline イベントを
//   useSyncExternalStore で購読する。navigator.onLine は同期プリミティブ (boolean)
//   なので getSnapshot は毎回同一値を返せる (無限 render にならない)。
//   非ブラウザ / 判定不能環境では true (オンライン扱い) にフォールバックし、
//   同期系 UI を不当に隠さない安全側に倒す。

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getSnapshot(): boolean {
  // navigator.onLine は仕様上 boolean だが、判定不能環境では未定義になりうる。
  // その場合は「オンライン」扱い (同期系 UI を隠しすぎない安全側)。
  return typeof navigator !== "undefined" && "onLine" in navigator
    ? navigator.onLine
    : true;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
