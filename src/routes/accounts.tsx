import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Wallet, Trash2, ReceiptText, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDate } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAccounts, deleteAccount } from "@/services/accounts.service";
import { getCards, deleteCard, getCardLinks, setCardLink } from "@/services/cards.service";
import { getTransactions } from "@/services/transactions.service";
import { AccountModal } from "@/components/modals/AccountModal";
import { CardModal } from "@/components/modals/CardModal";
import { LinkedCardsModal } from "@/components/modals/LinkedCardsModal";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/accounts")({
  head: () => ({
    meta: [
      { title: "Contas & Cartões — EconomyZee" },
      { name: "description", content: "Saldos das contas, limites de cartão, faturas e parcelamentos." },
    ],
  }),
  component: AccountsPage,
});

function AccountsPage() {
  const queryClient = useQueryClient();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => getAccounts().catch(() => []),
  });

  const { data: cards = [], isLoading: loadingCards } = useQuery({
    queryKey: ["cards"],
    queryFn: () => getCards().catch(() => []),
  });

  const { data: linkState } = useQuery({
    queryKey: ["card-links"],
    queryFn: () => getCardLinks().catch(() => null),
  });
  const isWorkspaceContext = !!linkState && !linkState.isPersonalContext;

  const { data: txData } = useQuery({
    queryKey: ["transactions", { forAccounts: true }],
    queryFn: () => getTransactions({}).catch(() => ({ data: [] })),
  });

  const transactions = txData?.data || [];
  const loading = loadingAccounts || loadingCards;

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando contas...</div>;
  }

  return (
    <>
      <PageHeader
        title="Contas & Cartões"
        description="Saldos, limites e faturas em um só lugar."
        actions={
          <>
            <AccountModal />
            <CardModal />
          </>
        }
      />

      {/* Bank accounts */}
      <CardTitle title="Contas bancárias" description={`${accounts.length} contas conectadas`} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {accounts.length > 0 ? accounts.map((a: any) => (
          <Card key={a.id}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ background: a.color || 'var(--primary)' }}
                >
                  {(a.bank || a.name || "?")[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold">{a.name}</p>
                  <p className="text-[11px] text-muted-foreground">{a.bank || "Banco"}</p>
                </div>
              </div>
              <span className="rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                {a.type === "CHECKING" || a.type === "checking" ? "Corrente" : a.type === "SAVINGS" || a.type === "savings" ? "Poupança" : "Invest."}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Saldo</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums">{formatBRL(a.balanceInCents || a.balance || 0)}</p>
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <AccountModal
                account={a}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar saldo
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  if (confirm('Deseja remover esta conta?')) {
                    deleteAccount(a.id).then(() => {
                      toast.success('Conta removida!');
                      queryClient.invalidateQueries({ queryKey: ['accounts'] });
                      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                    }).catch(() => toast.error('Erro ao remover.'));
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remover
              </Button>
            </div>
          </Card>
        )) : (
          <div className="col-span-full py-8 text-center text-sm text-muted-foreground">Nenhuma conta cadastrada</div>
        )}
      </div>

      {/* Cards */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <CardTitle title="Cartões de crédito" />
        {isWorkspaceContext && <LinkedCardsModal />}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {cards.length > 0 ? cards.map((c: any) => {
          const rawLimit = c.limitInCents ?? c.limit ?? 0;
          const used = c.usedInCents || c.used || 0;
          const hasLimit = rawLimit > 0;
          const limit = hasLimit ? rawLimit : Math.max(used, 1);
          const pct = hasLimit ? Math.min((used / limit) * 100, 100) : 0;
          const isExpanded = expandedCard === c.id;

          // Filter transactions for this card
          const cardTxs = transactions.filter((tx: any) => tx.cardId === c.id);
          const installmentTxs = cardTxs.filter((tx: any) => tx.installments && tx.installments > 1);

          return (
            <Card key={c.id} className="overflow-hidden p-0">
              <div className="relative h-44 p-5 text-white" style={{ background: c.color || 'var(--primary)' }}>
                <div className="flex items-start justify-between">
                  <CreditCard className="h-6 w-6 opacity-80" />
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      c.cardType === 'DEBIT' 
                        ? 'bg-blue-500/30 text-blue-100' 
                        : 'bg-white/20 text-white/90'
                    }`}>
                      {c.cardType === 'DEBIT' ? 'Débito' : 'Crédito'}
                    </span>
                    <span className="text-xs font-medium tracking-wider opacity-90">{c.brand || "Cartão"}</span>
                    {c.isLinkedPersonal && (
                      <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                        Pessoal
                      </span>
                    )}
                  </div>
                </div>
                <div className="absolute bottom-5 left-5 right-5">
                  <p className="font-mono text-base tracking-[0.25em] opacity-90">•••• {c.last4 || "****"}</p>
                  <p className="mt-2 text-sm font-semibold">{c.name}</p>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Limite usado</span>
                    <span className="font-medium tabular-nums">
                      {formatBRL(used)} <span className="text-muted-foreground">/ {hasLimit ? formatBRL(rawLimit) : "Sem limite"}</span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${pct > 80 ? "bg-destructive" : pct > 60 ? "bg-warning" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{hasLimit ? `${pct.toFixed(0)}% do limite` : "Cartao sem limite definido"}</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/50 p-3">
                  <div className="flex items-center justify-between sm:gap-6">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Fatura atual</p>
                      <p className="mt-0.5 font-semibold tabular-nums">{formatBRL(used)}</p>
                    </div>
                    <div className="text-right sm:text-left">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Vencimento</p>
                      <p className="mt-0.5 text-sm font-medium">{c.invoiceDue ? formatDate(new Date(c.invoiceDue)) : "--"}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 justify-end mt-1 sm:mt-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExpandedCard(isExpanded ? null : c.id)}
                      className="text-xs"
                    >
                      <ReceiptText className="mr-1 h-3.5 w-3.5" />
                      {isExpanded ? 'Ocultar' : 'Ver gastos'}
                    </Button>
                    {c.isLinkedPersonal ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Desvincular este cartão pessoal deste workspace? Os gastos já lançados continuam existindo.')) {
                            setCardLink(c.id, false).then(() => {
                              toast.success('Cartão desvinculado!');
                              queryClient.invalidateQueries({ queryKey: ['cards'] });
                              queryClient.invalidateQueries({ queryKey: ['card-links'] });
                            }).catch(() => toast.error('Erro ao desvincular.'));
                          }
                        }}
                        className="text-warning hover:text-warning"
                      >Desvincular</Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Deseja remover este cartão?')) {
                            deleteCard(c.id).then(() => {
                              toast.success('Cartão removido!');
                              queryClient.invalidateQueries({ queryKey: ['cards'] });
                            }).catch(() => toast.error('Erro ao remover.'));
                          }
                        }}
                        className="text-destructive hover:text-destructive"
                      >Remover</Button>
                    )}
                  </div>
                </div>

                {/* Expanded: Card transactions */}
                {isExpanded && (
                  <div className="space-y-3 border-t border-border/40 pt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lançamentos deste cartão</p>
                    {cardTxs.length > 0 ? (
                      <ul className="divide-y divide-border/40">
                        {cardTxs.slice(0, 20).map((tx: any) => (
                          <li key={tx.id} className="flex items-center gap-3 py-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                              <Wallet className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{tx.description}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-[11px] text-muted-foreground">{formatDate(new Date(tx.date))}</p>
                                {tx.installments > 1 && (
                                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                    {tx.currentInstallment || '?'}/{tx.installments}x
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-sm font-semibold tabular-nums text-destructive">
                              -{formatBRL(tx.amountInCents || tx.amount || 0)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="py-4 text-center text-sm text-muted-foreground">Nenhum lançamento neste cartão</p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        }) : (
          <div className="col-span-full py-8 text-center text-sm text-muted-foreground">Nenhum cartão cadastrado</div>
        )}
      </div>

      {/* Recent transactions */}
      <Card className="mt-6">
        <CardTitle title="Últimos lançamentos" />
        <ul className="-mx-2 divide-y divide-border/60">
          {transactions.slice(0, 6).map((tx: any) => (
            <li key={tx.id} className="flex items-center gap-3 px-2 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Wallet className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{tx.description}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-muted-foreground">{formatDate(new Date(tx.date))}</p>
                  {tx.installments > 1 && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      {tx.currentInstallment || '?'}/{tx.installments}x
                    </span>
                  )}
                  {tx.card && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      💳 {tx.card.name}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-sm font-semibold tabular-nums">{formatBRL(tx.amountInCents || tx.amount || 0)}</span>
            </li>
          ))}
          {transactions.length === 0 && (
            <li className="px-2 py-8 text-center text-sm text-muted-foreground">Nenhum lançamento recente</li>
          )}
        </ul>
      </Card>
    </>
  );
}
