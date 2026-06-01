import { createFileRoute } from "@tanstack/react-router";
import { Plus, AlertTriangle, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBudgets, deleteBudget } from "@/services/budgets.service";
import { getCategories } from "@/services/categories.service";
import { BudgetModal } from "@/components/modals/BudgetModal";
import { toast } from "sonner";

export const Route = createFileRoute("/budgets")({
  head: () => ({
    meta: [
      { title: "Orçamentos — EconomyZee" },
      { name: "description", content: "Defina limites por categoria e receba alertas antes do estouro." },
    ],
  }),
  component: BudgetsPage,
});

function BudgetsPage() {
  const queryClient = useQueryClient();

  const { data: budgets = [], isLoading: loading } = useQuery({
    queryKey: ["budgets"],
    queryFn: () => getBudgets().catch(() => []),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories().catch(() => []),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => {
      toast.success("Orçamento removido!");
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Erro ao remover orçamento."),
  });

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando orçamentos...</div>;
  }

  const totalLimit = budgets.reduce((s: number, b: any) => s + (b.limitInCents || b.amountInCents || b.limit || 0), 0);
  const totalSpent = budgets.reduce((s: number, b: any) => s + (b.spentInCents || b.spent || 0), 0);
  const overall = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

  return (
    <>
      <PageHeader
        title="Orçamentos"
        description="Este mês"
        actions={<BudgetModal categories={categories} />}
      />

      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Orçamento total</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatBRL(totalSpent)} <span className="text-base text-muted-foreground">/ {formatBRL(totalLimit)}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Restante</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-success">{formatBRL(Math.max(0, totalLimit - totalSpent))}</p>
          </div>
        </div>
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${overall > 90 ? "bg-destructive" : overall > 70 ? "bg-warning" : "bg-primary"}`}
            style={{ width: `${Math.min(overall, 100)}%` }}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {budgets.length > 0 ? budgets.map((b: any) => {
          const cat = b.category || { name: 'Categoria' };
          const limit = b.limitInCents || b.amountInCents || b.limit || 1;
          const spent = b.spentInCents || b.spent || 0;
          const pct = (spent / limit) * 100;
          const over = pct > 100;
          const warn = pct > 80 && !over;
          return (
            <Card key={b.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{cat.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Limite mensal</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {over && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-destructive/25 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                      <AlertTriangle className="h-3 w-3" /> Estouro
                    </span>
                  )}
                  {warn && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-warning/25 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                      <AlertTriangle className="h-3 w-3" /> Atenção
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(b.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-xl font-semibold tabular-nums">{formatBRL(spent)}</span>
                <span className="text-xs text-muted-foreground tabular-nums">de {formatBRL(limit)}</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${over ? "bg-destructive" : warn ? "bg-warning" : "bg-primary"}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{pct.toFixed(0)}% utilizado</span>
                <span className={over ? "text-destructive" : ""}>
                  {over
                    ? `+${formatBRL(spent - limit)} acima`
                    : `${formatBRL(limit - spent)} restantes`}
                </span>
              </div>
            </Card>
          );
        }) : (
          <div className="col-span-full py-8 text-center text-sm text-muted-foreground">Nenhum orçamento definido</div>
        )}
      </div>
    </>
  );
}
