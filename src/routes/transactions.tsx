import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  SlidersHorizontal,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Loader2,
  Pencil,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/Card";
import { OriginBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getTransactions, deleteTransaction, restoreTransaction } from "@/services/transactions.service";
import { api } from "@/services/api-client";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { toast } from "sonner";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Transações — EconomyZee" },
      {
        name: "description",
        content: "Lista completa de transações com filtros, busca e badges de origem.",
      },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [acc, setAcc] = useState<string>("all");
  const [origin, setOrigin] = useState<string>("all");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<any[]>('/categories').catch(() => []),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api.get<any[]>('/accounts').catch(() => []),
  });

  const { data, isLoading: loading } = useQuery({
    queryKey: ["transactions", { q, cat, acc, origin, page }],
    queryFn: () => getTransactions({
      search: q,
      category: cat !== 'all' ? cat : undefined,
      account: acc !== 'all' ? acc : undefined,
      origin: origin !== 'all' ? origin : undefined,
      page,
      limit: perPage,
    }),
  });

  const transactions = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreTransaction(id),
    onSuccess: () => {
      toast.success("Transação restaurada.");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Erro ao restaurar."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: (_, id) => {
      toast("Transação movida para a lixeira.", {
        action: {
          label: "Desfazer",
          onClick: () => restoreMutation.mutate(id),
        },
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Erro ao remover."),
  });

  const handleExport = () => {
    if (transactions.length === 0) return toast.error("Nenhuma transação para exportar.");
    const header = "Data,Descrição,Categoria,Conta,Tipo,Valor";
    const rows = transactions.map((tx: any) => {
      const d = new Date(tx.date).toLocaleDateString("pt-BR");
      const desc = (tx.description || "").replace(/,/g, ";");
      const catN = tx.category?.name || "";
      const accN = tx.account?.name || "";
      const type = tx.type === "INCOME" ? "Receita" : "Despesa";
      const val = ((tx.amountInCents ?? tx.amount ?? 0) / 100).toFixed(2).replace('.', ',');
      return `${d},${desc},${catN},${accN},${type},${val}`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "economyzee-transacoes.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  const renderTransactionActions = (tx: any) => (
    <div className="flex items-center justify-end gap-1">
      <TransactionModal
        categories={categories}
        accounts={accounts}
        transaction={tx}
        trigger={
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        }
      />
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        onClick={() => deleteMutation.mutate(tx.id)}
        disabled={deleteMutation.isPending}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Transações"
        description={`${transactions.length} de ${total} lançamentos`}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" /> Exportar
            </Button>
            <TransactionModal categories={categories} accounts={accounts} />
          </>
        }
      />

      <Card className="overflow-hidden p-0">
        {/* Filters bar */}
        <div className="grid grid-cols-1 gap-2 border-b border-border/60 p-4 sm:grid-cols-2 lg:flex lg:items-center">
          <div className="relative min-w-0 sm:col-span-2 lg:col-span-1 lg:flex-1 lg:min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Buscar descrição…"
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring/60"
            />
          </div>
          <Select value={cat} onValueChange={(v) => { setCat(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-full lg:w-[160px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={acc} onValueChange={(v) => { setAcc(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-full lg:w-[160px]"><SelectValue placeholder="Conta" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas contas</SelectItem>
              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={origin} onValueChange={(v) => { setOrigin(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-full lg:w-[140px]"><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas origens</SelectItem>
              <SelectItem value="TELEGRAM">Telegram</SelectItem>
              <SelectItem value="MANUAL">Manual</SelectItem>
              <SelectItem value="IMPORT">Import</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando transações...
            </div>
          ) : transactions.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nenhuma transação encontrada.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {transactions.map((tx: any) => {
                const catName = tx.category?.name || "Sem categoria";
                const accName = tx.account?.name || tx.card?.name || "Sem conta";
                const m = tx.member?.user ?? { name: "Membro" };
                const memberName = m.name || "Membro";
                const isIncome = tx.type === "INCOME" || tx.type === "income";

                return (
                  <div key={tx.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          isIncome ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                        )}>
                          {isIncome ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <p className="max-w-full truncate font-medium">{tx.description}</p>
                            <OriginBadge origin={tx.origin || "MANUAL"} />
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{formatDate(new Date(tx.date))}</p>
                        </div>
                      </div>
                      <div className={cn(
                        "shrink-0 text-right text-sm font-semibold tabular-nums",
                        isIncome ? "text-success" : "text-foreground"
                      )}>
                        {isIncome ? "+" : "-"}{formatBRL(tx.amountInCents || tx.amount || 0)}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-muted/20 p-3 text-xs">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Categoria</p>
                        <p className="truncate">{catName}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Conta</p>
                        <p className="truncate">{accName}</p>
                      </div>
                      <div className="col-span-2 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarFallback className="text-[10px] font-bold" style={{ background: `var(--primary)25`, color: "var(--primary)" }}>
                              {memberName.split(" ").filter(Boolean).map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate text-muted-foreground">{memberName}</span>
                        </div>
                        {renderTransactionActions(tx)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">Data</th>
                <th className="px-4 py-2.5 text-left font-medium">Descrição</th>
                <th className="px-4 py-2.5 text-left font-medium">Categoria</th>
                <th className="px-4 py-2.5 text-left font-medium">Conta</th>
                <th className="px-4 py-2.5 text-left font-medium">Membro</th>
                <th className="px-4 py-2.5 text-right font-medium">Valor</th>
                <th className="px-4 py-2.5 text-center font-medium w-12"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Carregando transações...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Nenhuma transação encontrada.</td></tr>
              ) : (
                transactions.map((tx: any) => {
                  const catName = tx.category?.name;
                  const accName = tx.account?.name || tx.card?.name;
                  const m = tx.member?.user ?? { name: 'Membro' };
                  const memberName = m.name || 'Membro';
                  return (
                    <tr key={tx.id} className="border-b border-border/40 transition-colors hover:bg-accent/40 group">
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(new Date(tx.date))}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-md",
                            tx.type === "INCOME" || tx.type === "income" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                          )}>
                            {tx.type === "INCOME" || tx.type === "income" ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                          </div>
                          <span className="font-medium">{tx.description}</span>
                          <OriginBadge origin={tx.origin || 'MANUAL'} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{catName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{accName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] font-bold" style={{ background: `var(--primary)25`, color: 'var(--primary)' }}>
                              {memberName.split(" ").filter(Boolean).map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">{memberName.split(" ")[0]}</span>
                        </div>
                      </td>
                      <td className={cn(
                        "whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums",
                        tx.type === "INCOME" || tx.type === "income" ? "text-success" : "text-foreground"
                      )}>
                        {tx.type === "INCOME" || tx.type === "income" ? "+" : "−"}{formatBRL(tx.amountInCents || tx.amount || 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          {renderTransactionActions(tx)}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/60 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Página {page} de {totalPages} — {total} transações</span>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-1">
            <Button className="w-full sm:w-auto" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <Button className="w-full sm:w-auto" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
