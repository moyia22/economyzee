import { AlertTriangle, Info, Sparkles } from "lucide-react";
import { Card, CardTitle } from "./Card";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getSmartAlerts } from "@/services/dashboard.service";
import { useQuery } from "@tanstack/react-query";

const config = {
  info: { icon: Info, cls: "bg-info/10 text-info border-info/25" },
  warning: { icon: AlertTriangle, cls: "bg-warning/10 text-warning border-warning/25" },
  critical: { icon: AlertTriangle, cls: "bg-destructive/10 text-destructive border-destructive/25" },
};

export function SmartAlerts() {
  const { data: alerts = [] } = useQuery({
    queryKey: ["dashboard", "smart-alerts"],
    queryFn: getSmartAlerts,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  return (
    <Card>
      <CardTitle
        title="Alertas inteligentes"
        description="Insights gerados pela IA"
        action={
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Gemini
          </span>
        }
      />
      {alerts.length > 0 ? (
        <ul className="space-y-2">
          {alerts.map((a) => {
            const level = String(a.level || "info").toLowerCase() as keyof typeof config;
            const C = config[level] || config.info;
            const Icon = C.icon;
            return (
              <li
                key={a.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                  C.cls
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight text-foreground">
                    {a.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.message}</p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="py-8 text-center text-sm text-muted-foreground">Nenhum alerta no momento.</div>
      )}
    </Card>
  );
}
