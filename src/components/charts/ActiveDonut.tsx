import { useState, useCallback } from "react";
import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from "recharts";
import { formatBRL, formatCompactBRL } from "@/lib/format";

interface ActiveDonutProps {
  data: { id: string; name: string; value: number; color: string }[];
  height?: number;
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value, percent } = props;

  return (
    <g>
      {/* Active segment - larger */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.1))" }}
      />
      {/* Inner glow ring */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={innerRadius - 2}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.3}
      />
      {/* Center text - category name */}
      <text x={cx} y={cy - 12} textAnchor="middle" fill="oklch(0.97 0.005 260)" fontSize={11} fontWeight={600}>
        {payload.name}
      </text>
      {/* Center text - value */}
      <text x={cx} y={cy + 6} textAnchor="middle" fill="oklch(0.97 0.005 260)" fontSize={14} fontWeight={700}>
        {formatCompactBRL(value)}
      </text>
      {/* Center text - percentage */}
      <text x={cx} y={cy + 22} textAnchor="middle" fill="oklch(0.68 0.02 260)" fontSize={10}>
        {(percent * 100).toFixed(1)}%
      </text>
    </g>
  );
};

export function ActiveDonut({ data, height = 260 }: ActiveDonutProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = useCallback((_: any, index: number) => {
    setActiveIndex(index);
  }, []);

  const slicedData = data.slice(0, 6);
  const total = slicedData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex h-full flex-col sm:flex-row items-center gap-4 sm:gap-0 pt-2 sm:pt-0">
      <div className="h-[140px] sm:h-full w-full sm:w-1/2 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={slicedData}
              dataKey="value"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={3}
              stroke="none"
              onMouseEnter={onPieEnter}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {slicedData.map((c, i) => (
                <Cell
                  key={i}
                  fill={c.color || "var(--primary)"}
                  opacity={i === activeIndex ? 1 : 0.6}
                  style={{ transition: "opacity 0.2s ease" }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 w-full space-y-2 text-xs">
        {slicedData.map((c, i) => {
          const pct = total > 0 ? (c.value / total) * 100 : 0;
          return (
            <li
              key={c.id}
              className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors cursor-pointer ${
                i === activeIndex ? "bg-accent/60" : "hover:bg-accent/30"
              }`}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span className="flex items-center gap-2 truncate">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: c.color || "var(--primary)" }}
                />
                <span className="truncate">{c.name || c.id}</span>
              </span>
              <span className="tabular-nums text-muted-foreground">
                {formatCompactBRL(c.value)}
                <span className="ml-1 text-[10px]">({pct.toFixed(0)}%)</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
