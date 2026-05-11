import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

// ID 由来の単純ハッシュ。同じ ID なら毎回同じ位置になる
function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ラベル位置を 25%〜75% に分散
// クロスするエッジでもラベル位置が違うので、どれがどれか判別しやすくなる
function labelOffsetFromId(id: string): number {
  const h = simpleHash(id);
  // 0〜50% の幅で散らす（0.25 + 0..0.5）
  return 0.25 + (h % 51) / 100;
}

export function PointMaxEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    label,
    style,
    markerEnd,
    labelStyle,
    labelBgStyle,
  } = props;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const t = labelOffsetFromId(id);
  const lx = sourceX + (targetX - sourceX) * t;
  const ly = sourceY + (targetY - sourceY) * t;

  const labelBgFill =
    (labelBgStyle as { fill?: string } | undefined)?.fill ?? "#181b22";
  const labelFill =
    (labelStyle as { fill?: string } | undefined)?.fill ?? "#e6e6e6";

  return (
    <>
      <BaseEdge path={edgePath} style={style} markerEnd={markerEnd} />
      {label != null && label !== "" && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)`,
              pointerEvents: "all",
              background: labelBgFill,
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "2px 6px",
              fontSize: 11,
              fontWeight: 600,
              color: labelFill,
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.4)",
              whiteSpace: "nowrap",
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const edgeTypes = { pointmax: PointMaxEdge };
