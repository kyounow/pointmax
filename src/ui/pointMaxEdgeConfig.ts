import { PointMaxEdge } from "./PointMaxEdge";

// React Flow に渡す edgeTypes マップ。PointMaxEdge.tsx 本体から分離しているのは
// react-refresh/only-export-components を満たすため (1 ファイルが component と
// 非 component を両方 export すると fast refresh が壊れる)。
export const edgeTypes = { pointmax: PointMaxEdge };
