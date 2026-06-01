import { formatBRL } from "@/lib/format";

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  previousData?: Record<string, { income: number; expense: number }>;
}

export function CustomTooltip({ active, payload, label, previousData }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="glass-tooltip rounded-xl px-4 py-3 shadow-xl">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry: any, i: number) => {
          const prevValue = previousData?.[label || ""]?.[entry.dataKey as "income" | "expense"];
          const delta = prevValue ? ((entry.value - prevValue) / prevValue) * 100 : null;
          
          return (
            <div key={i} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: entry.color }}
                />
                <span className="text-xs text-muted-foreground">
                  {entry.dataKey === "income" ? "Receita" : "Despesa"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {formatBRL(entry.value)}
                </span>
                {delta !== null && (
                  <span
                    className={`text-[10px] font-medium tabular-nums ${
                      delta >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface CategoryTooltipProps {
  active?: boolean;
  payload?: any[];
}

export function CategoryTooltip({ active, payload }: CategoryTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];

  return (
    <div className="glass-tooltip rounded-xl px-4 py-3 shadow-xl">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: entry.payload.color || entry.color }}
        />
        <span className="text-xs font-medium text-foreground">
          {entry.payload.name || entry.name}
        </span>
      </div>
      <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
        {formatBRL(entry.value)}
      </p>
    </div>
  );
}
