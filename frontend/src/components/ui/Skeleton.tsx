import type { CSSProperties } from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  style?: CSSProperties;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 4,
  style,
}: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: "rgba(255,255,255,0.04)",
        backgroundImage: `linear-gradient(
          90deg,
          rgba(255,255,255,0.0) 0%,
          rgba(255,255,255,0.06) 50%,
          rgba(255,255,255,0.0) 100%
        )`,
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s ease infinite",
        ...style,
      }}
    />
  );
}
