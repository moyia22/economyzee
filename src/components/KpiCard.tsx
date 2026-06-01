import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL, formatPercent } from "@/lib/format";
import { useEffect, useId, useRef, useState } from "react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";

interface KpiCardProps {
  label: string;
  value: number;
  delta?: number; // percentage
  deltaLabel?: string;
  accent?: "primary" | "success" | "warning" | "destructive" | "info";
  icon?: React.ReactNode;
  hint?: string;
  sparkline?: number[];
  delay?: number;
}

const accentMap = {
  primary: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  destructive: "text-destructive bg-destructive/10",
  info: "text-info bg-info/10",
};

const sparkColors: Record<string, string> = {
  primary: "oklch(0.78 0.18 152)",
  success: "oklch(0.78 0.18 152)",
  warning: "oklch(0.82 0.16 80)",
  destructive: "oklch(0.65 0.22 22)",
  info: "oklch(0.72 0.14 235)",
};

function useCountUp(target: number, duration = 800) {
  const [current, setCurrent] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const diff = target - start;
    if (diff === 0) return;

    const startTime = performance.now();
    let raf: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const val = Math.round(start + diff * eased);
      setCurrent(val);

      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      } else {
        prevRef.current = target;
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return current;
}

export function KpiCard({
  label,
  value,
  delta,
  deltaLabel = "vs mês anterior",
  accent = "primary",
  icon,
  hint,
  sparkline,
  delay = 0,
}: KpiCardProps) {
  const positive = (delta ?? 0) >= 0;
  const displayValue = useCountUp(value);
  const staggerClass = delay ? `stagger-${delay}` : "";
  const sparkColor = sparkColors[accent] || sparkColors.primary;
  const uid = useId();
  const gradientId = `spark-${accent}-${uid.replace(/:/g, '')}`;

  const sparkData = sparkline?.map((v, i) => ({ i, v })) || [];

  return (
    <div
      className={cn(
        "surface-card card-hover group animate-fade-in-up relative overflow-hidden rounded-xl border border-border/60 p-5 transition-all",
        positive && delta !== 0 ? "" : "",
        staggerClass
      )}
    >
      {/* Background sparkline */}
      {sparkData.length > 0 && (
        <div className="absolute inset-x-0 bottom-0 h-16 opacity-20 transition-opacity group-hover:opacity-30">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparkColor} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={sparkColor}
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                animationDuration={1200}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          {icon && (
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-shadow duration-300 group-hover:shadow-[0_0_12px_-2px_currentColor]",
              accentMap[accent]
            )}>
              {icon}
            </div>
          )}
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-[26px] font-semibold tracking-tight tabular-nums">
            {formatBRL(displayValue)}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs">
          {delta !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium tabular-nums",
                positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
              )}
            >
              {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {formatPercent(delta)}
            </span>
          )}
          <span className="text-muted-foreground">{hint ?? deltaLabel}</span>
        </div>
      </div>
    </div>
  );
}
