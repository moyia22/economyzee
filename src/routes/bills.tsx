import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, CheckCircle2, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/badges";
import { formatBRL, formatDateLong } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBills, markBillPaid } from "@/services/bills.service";
import { BillModal } from "@/components/modals/BillModal";
import { toast } from "sonner";

export const Route = createFileRoute("/bills")({
  head: () => ({
    meta: [
      { title: "Contas a pagar — EconomyZee" },
      { name: "description", content: "Lista de vencimentos com status, calendário financeiro e ações rápidas." },
    ],
  }),
  component: BillsPage,
});

function BillsPage() {
  const queryClient = useQueryClient();

  const { data: bills = [], isLoading: loading } = useQuery({
    queryKey: ["bills"],
    queryFn: () => getBills().catch(() => []),
  });

  const payMutation = useMutation({
    mutationFn: (id: string) => markBillPaid(id),
    onSuccess: () => {
      toast.success("Conta marcada como paga!");
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => {
      toast.error("Erro ao marcar como paga.");
    },
  });

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando contas a pagar...</div>;
  }

  const sorted = [...bills].sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const totalPending = sorted.filter((b: any) => b.status !== "PAID" && b.status !== "paid").reduce((s: number, b: any) => s + (b.amountInCents || b.amount || 0), 0);
  const totalOverdue = sorted.filter((b: any) => b.status === "OVERDUE" || b.status === "overdue").reduce((s: number, b: any) => s + (b.amountInCents || b.amount || 0), 0);

  // Build calendar (current month)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const billsByDay = new Map<number, typeof sorted>();
  for (const b of sorted) {
    const dDate = new Date((b as any).dueDate);
    if (dDate.getMonth() === month && dDate.getFullYear() === year) {
      const d = dDate.getDate();
      if (!billsByDay.has(d)) billsByDay.set(d, []);
      billsByDay.get(d)!.push(b);
    }
  }

  return (
    <>
      <PageHeader
        title="Contas a pagar"
        description="Tudo o que vence neste mês — sem surpresas."
        actions={<BillModal />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total pendente</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{formatBRL(totalPending)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Em atraso</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-destructive">{formatBRL(totalOverdue)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Próximo vencimento</p>
          {(() => {
            const nextBill = sorted.find((b: any) => b.status === "PENDING" || b.status === "pending");
            return nextBill ? (
              <>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{formatBRL(nextBill.amountInCents || nextBill.amount || 0)}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{nextBill.name || nextBill.description}</p>
              </>
            ) : (
              <p className="mt-2 text-2xl font-semibold tabular-nums">—</p>
            );
          })()}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle title="Lista de vencimentos" />
          {sorted.length > 0 ? (
            <ul className="-mx-2 divide-y divide-border/60">
              {sorted.map((b: any) => {
                const cat = b.category;
                const isPaid = b.status === "PAID" || b.status === "paid";
                const isOverdue = b.status === "OVERDUE" || b.status === "overdue";
                return (
                  <li key={b.id} className="flex items-center gap-3 px-2 py-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      isOverdue ? "bg-destructive/10 text-destructive" :
                      isPaid ? "bg-success/10 text-success" :
                      "bg-warning/10 text-warning"
                    }`}>
                      {isPaid ? <CheckCircle2 className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{b.name || b.description}</p>
                        <StatusPill status={b.status} />
                        {b.recurring && <span className="text-[10px] text-muted-foreground">• Recorrente</span>}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{cat?.name} • {formatDateLong(new Date(b.dueDate))}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{formatBRL(b.amountInCents || b.amount || 0)}</span>
                    {!isPaid && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-2"
                        disabled={payMutation.isPending}
                        onClick={() => payMutation.mutate(b.id)}
                      >
                        {payMutation.isPending ? "..." : "Pagar"}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma conta encontrada</div>
          )}
        </Card>

        <Card>
          <CardTitle title="Calendário" description={now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} />
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
            {["D","S","T","Q","Q","S","S"].map((d, i) => <div key={i} className="py-1">{d}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              const dayBills = day ? billsByDay.get(day) ?? [] : [];
              const isToday = day === now.getDate();
              return (
                <div
                  key={i}
                  className={`relative flex aspect-square flex-col items-center justify-start rounded-md border text-xs transition-colors ${
                    !day ? "border-transparent" :
                    isToday ? "border-primary bg-primary/10 text-primary" :
                    dayBills.length ? "border-border bg-accent/40" :
                    "border-border/40"
                  }`}
                  title={dayBills.map((b: any) => b.name || b.description).join(", ")}
                >
                  {day && <span className="mt-1 font-medium">{day}</span>}
                  {dayBills.length > 0 && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-warning" />
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Pontos amarelos indicam vencimentos no dia.
          </p>
        </Card>
      </div>
    </>
  );
}
