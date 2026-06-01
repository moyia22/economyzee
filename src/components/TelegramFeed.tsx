import { Send, Bot } from "lucide-react";
import { Card, CardTitle } from "./Card";
import { formatBRL, formatRelative } from "@/lib/format";
import { Mic, Image as ImageIcon, FileText, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getTelegramFeed } from "@/services/dashboard.service";

const kindIcon = {
  expense: ArrowUpRight,
  income: ArrowDownLeft,
  audio: Mic,
  image: ImageIcon,
  pdf: FileText,
};

const kindColor = {
  expense: "text-destructive bg-destructive/10",
  income: "text-success bg-success/10",
  audio: "text-info bg-info/10",
  image: "text-warning bg-warning/10",
  pdf: "text-muted-foreground bg-muted",
};

export function TelegramFeed() {
  const { data: feed = [] } = useQuery({
    queryKey: ["dashboard", "telegram-feed"],
    queryFn: getTelegramFeed,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  return (
    <Card>
      <CardTitle
        title="Feed do Telegram"
        description="Atualizações em tempo real do @EconomyZee_Bot"
        action={
          <span className="inline-flex items-center gap-1.5 rounded-md border border-info/25 bg-info/10 px-2 py-1 text-[10px] font-medium text-info">
            <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-info" />
            Ao vivo
          </span>
        }
      />
      {feed.length > 0 ? (
        <ul className="-mx-1 space-y-0.5">
          {feed.map((ev) => {
            const kind = ev.kind as keyof typeof kindIcon;
            const Icon = kindIcon[kind] || ArrowUpRight;
            const colorCls = kindColor[kind] || "text-muted-foreground bg-muted";
            return (
              <li
                key={ev.id}
                className="flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-accent/50"
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorCls}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{ev.text}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Send className="h-3 w-3 text-info" />
                    {formatRelative(new Date(ev.at || ev.createdAt))}
                    {ev.amount !== undefined && (
                      <span className="ml-auto font-medium tabular-nums text-foreground">
                        {formatBRL(ev.amount)}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma atividade no momento.</div>
      )}
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-border bg-card/50 p-3 text-xs text-muted-foreground">
        <Bot className="h-4 w-4 text-info" />
        Envie áudio, foto ou PDF para o bot — a IA categoriza automaticamente.
      </div>
    </Card>
  );
}
