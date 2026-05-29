import { CurrencyNode } from "./CurrencyNode";

// React Flow に渡す nodeTypes マップ。CurrencyNode.tsx 本体から分離しているのは
// react-refresh/only-export-components を満たすため (1 ファイルが component と
// 非 component を両方 export すると fast refresh が壊れる)。型 (CurrencyNodeType 等)
// は type-only export のためルールに抵触せず CurrencyNode.tsx 側に残す。
export const nodeTypes = { currency: CurrencyNode };
