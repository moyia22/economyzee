import { Send, Pencil, FileDown } from "lucide-react";
export type Origin = 'TELEGRAM' | 'MANUAL' | 'IMPORT';
import { cn } from "@/lib/utils";

export function OriginBadge({ origin, className }: { origin: Origin; className?: string }) {
  const config = {
    TELEGRAM: {
      label: "Telegram",
      icon: Send,
      cls: "bg-info/15 text-info border-info/25",
    },
    MANUAL: {
      label: "Manual",
      icon: Pencil,
      cls: "bg-muted text-muted-foreground border-border",
    },
    IMPORT: {
      label: "Importação",
      icon: FileDown,
      cls: "bg-warning/15 text-warning border-warning/25",
    },
  }[origin?.toUpperCase() as Origin || 'MANUAL'];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-md border px-1.5 text-[10px] font-medium",
        config.cls,
        className
      )}
    >
      <Icon className="h-2.5 w-2.5" strokeWidth={2.5} />
      {config.label}
    </span>
  );
}

export function StatusPill({ status }: { status?: string }) {
  const map = {
    PAID: { label: "Pago", cls: "bg-success/15 text-success border-success/25" },
    PENDING: { label: "Pendente", cls: "bg-warning/15 text-warning border-warning/25" },
    OVERDUE: { label: "Atrasado", cls: "bg-destructive/15 text-destructive border-destructive/25" },
  }[status?.toUpperCase() as "PAID" | "PENDING" | "OVERDUE" || 'PENDING'];
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-md border px-1.5 text-[10px] font-medium",
        map.cls
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {map.label}
    </span>
  );
}
