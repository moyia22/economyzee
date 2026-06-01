import { cn } from "@/lib/utils";

export type Period = "today" | "week" | "month" | "year";

const periods: { value: Period; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
];

interface PeriodFilterProps {
  value: Period;
  onChange: (p: Period) => void;
  className?: string;
}

export function PeriodFilter({ value, onChange, className }: PeriodFilterProps) {
  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5", className)}>
      {periods.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={cn(
            "relative rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200",
            value === p.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
