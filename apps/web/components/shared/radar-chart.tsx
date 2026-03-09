"use client";

type RadarChartProps = {
  labels: string[];
  values: number[]; // Values between 0 and 20
  size?: number;
  maxValue?: number;
};

export function RadarChart({ labels, values, size = 320, maxValue = 20 }: RadarChartProps) {
  const center = size / 2;
  const radius = size * 0.32;
  const levels = 5;
  const numAxes = labels.length;

  function getPoint(index: number, r: number): [number, number] {
    const angle = (Math.PI * 2 * index) / numAxes - Math.PI / 2;
    return [
      center + r * Math.cos(angle),
      center + r * Math.sin(angle),
    ];
  }

  function polygonPoints(r: number): string {
    return Array.from({ length: numAxes }, (_, i) =>
      getPoint(i, r).join(",")
    ).join(" ");
  }

  const dataPoints = values.map((v, i) => {
    const r = (Math.min(Math.max(v, 0), maxValue) / maxValue) * radius;
    return getPoint(i, r);
  });

  const dataPolygon = dataPoints.map((p) => p.join(",")).join(" ");

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      overflow="visible"
      className="w-full max-w-[380px] mx-auto select-none"
    >
      {/* Background rings */}
      {Array.from({ length: levels }, (_, i) => {
        const r = (radius / levels) * (i + 1);
        return (
          <polygon
            key={`ring-${i}`}
            points={polygonPoints(r)}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        );
      })}

      {/* Axis lines */}
      {Array.from({ length: numAxes }, (_, i) => {
        const [x, y] = getPoint(i, radius);
        return (
          <line
            key={`axis-${i}`}
            x1={center}
            y1={center}
            x2={x}
            y2={y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygon fill */}
      <polygon
        points={dataPolygon}
        fill="rgba(59, 130, 246, 0.12)"
        stroke="none"
      />

      {/* Data polygon outline */}
      <polygon
        points={dataPolygon}
        fill="none"
        stroke="rgba(96, 165, 250, 0.7)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {dataPoints.map(([x, y], i) => (
        <g key={`point-${i}`}>
          <circle
            cx={x}
            cy={y}
            r="5"
            fill="rgba(59, 130, 246, 0.3)"
            stroke="none"
          />
          <circle
            cx={x}
            cy={y}
            r="3"
            fill="rgb(96, 165, 250)"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1"
          />
        </g>
      ))}

      {/* Axis labels */}
      {labels.map((label, i) => {
        const [x, y] = getPoint(i, radius + 28);
        // Adjust text anchor based on position
        let anchor: "start" | "middle" | "end" = "middle";
        if (x < center - 10) anchor = "end";
        else if (x > center + 10) anchor = "start";

        return (
          <text
            key={`label-${i}`}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-white/50 font-medium"
            style={{ fontSize: "10px" }}
          >
            {label}
          </text>
        );
      })}

      {/* Value labels on data points */}
      {dataPoints.map(([x, y], i) => (
        <text
          key={`val-${i}`}
          x={x}
          y={y - 10}
          textAnchor="middle"
          dominantBaseline="auto"
          className="fill-red-300/70 font-semibold"
          style={{ fontSize: "9px" }}
        >
          {values[i]}
        </text>
      ))}
    </svg>
  );
}
