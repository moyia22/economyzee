import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  ArrowRight,
  CalendarClock,
  CreditCard,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { PageHeader } from "@/components/layout/AppShell";
import { KpiCard } from "@/components/KpiCard";
import { Card, CardTitle } from "@/components/Card";
import { TelegramFeed } from "@/components/TelegramFeed";
import { SmartAlerts } from "@/components/SmartAlerts";
import { OriginBadge, StatusPill } from "@/components/badges";
import { formatBRL, formatCompactBRL, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/Skeleton";
import { CustomTooltip } from "@/components/charts/CustomTooltip";
import { ActiveDonut } from "@/components/charts/ActiveDonut";
import { PeriodFilter, type Period } from "@/components/PeriodFilter";

import { useState, useMemo } from "react";
import { getDashboardSummary } from "@/services/dashboard.service";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/")(
  {
  head: () => ({
    meta: [
      { title: "Visão geral — EconomyZee" },
      {
        name: "description",
        content:
          "Painel principal com saldo total, receitas, despesas, gráficos e atividade recente.",
      },
    ],
  }),
  component: DashboardPage,
});

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Boa madrugada 🌙";
  if (h < 12) return "Bom dia ☀️";
  if (h < 18) return "Boa tarde 🌤️";
  return "Boa noite 🌙";
}

function DashboardPage() {
  const [period, setPeriod] = useState<Period>("month");

  const { data, isLoading: loading, error } = useQuery({
    queryKey: ["dashboard", period],
    queryFn: () => getDashboardSummary(period),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Conecte-se ao Telegram</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Para começar a usar o EconomyZee, conecte sua conta ao nosso bot do Telegram e adicione suas primeiras transações.
          </p>
        </div>
        <Link
          to="/settings"
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Ir para Configurações
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const { summary: t = {}, evolution = [], breakdown = [], recentTransactions: recent = [], upcomingBills: nextBills = [], cards = [] } = data;

  // Generate sparkline data from evolution
  const incomeSparkline = evolution.map((e: any) => e.income || 0);
  const expenseSparkline = evolution.map((e: any) => e.expense || 0);
  const balanceSparkline = evolution.map((e: any) => (e.income || 0) - (e.expense || 0));

  return (
    <>
      <PageHeader
        title={getGreeting()}
        description="Aqui está um resumo das suas finanças."
        actions={
          <PeriodFilter value={period} onChange={setPeriod} />
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Saldo total"
          value={t.totalBalance || 0}
          delta={t.balanceDelta || 0}
          accent="primary"
          icon={<Wallet className="h-4 w-4" />}
          sparkline={balanceSparkline}
          delay={1}
        />
        <KpiCard
          label="Receitas do mês"
          value={t.income || 0}
          delta={t.incomeDelta || 0}
          accent="success"
          icon={<ArrowDownLeft className="h-4 w-4" />}
          sparkline={incomeSparkline}
          delay={2}
        />
        <KpiCard
          label="Despesas do mês"
          value={t.expenses || 0}
          delta={t.expenseDelta || 0}
          accent="destructive"
          icon={<ArrowUpRight className="h-4 w-4" />}
          sparkline={expenseSparkline}
          delay={3}
        />
        <KpiCard
          label="Saldo projetado"
          value={t.projected || 0}
          delta={0}
          deltaLabel="estimativa fim do mês"
          accent="info"
          icon={<TrendingUp className="h-4 w-4" />}
          delay={4}
        />
      </div>

      {/* Charts row */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" delay={1}>
          <CardTitle
            title="Evolução financeira"
            description="Receitas vs despesas — últimos 6 meses"
            action={
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--chart-1)]" /> Receita
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--chart-5)]" /> Despesa
                </span>
              </div>
            }
          />
          <div className="h-[260px]">
            {evolution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolution} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g-income" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.78 0.18 152)" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="oklch(0.78 0.18 152)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g-expense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.7 0.16 25)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.7 0.16 25)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.012 260)" vertical={false} />
                  <XAxis dataKey="month" stroke="oklch(0.6 0.02 260)" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis
                    stroke="oklch(0.6 0.02 260)"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickFormatter={(v) => formatCompactBRL(v as number)}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: "oklch(0.5 0.02 260)", strokeDasharray: "4 4" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="oklch(0.78 0.18 152)"
                    strokeWidth={2.5}
                    fill="url(#g-income)"
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="oklch(0.7 0.16 25)"
                    strokeWidth={2.5}
                    fill="url(#g-expense)"
                    animationBegin={200}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem dados suficientes</div>
            )}
          </div>
        </Card>

        <Card delay={2}>
          <CardTitle title="Despesas por categoria" description="Este mês" />
          <div className="h-[260px]">
            {breakdown.length > 0 ? (
              <ActiveDonut data={breakdown} />
            ) : (
              <div className="flex w-full h-full items-center justify-center text-sm text-muted-foreground">Sem despesas registradas</div>
            )}
          </div>
        </Card>
      </div>

      {/* Cards usage */}
      {cards.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((c: any, i: number) => {
            const used = c.usedInCents || 0;
            const rawLimit = c.limitInCents || 0;
            const hasLimit = rawLimit > 0;
            const limit = hasLimit ? rawLimit : Math.max(used, 1);
            const pct = hasLimit ? Math.min((used / limit) * 100, 100) : 0;
            const available = hasLimit ? Math.max(rawLimit - used, 0) : 0;
            return (
              <Card
                key={c.id}
                className="relative overflow-hidden"
                delay={i + 1}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ background: c.color || 'var(--primary)' }}
                  >
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{c.name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                        c.cardType === 'DEBIT'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {c.cardType === 'DEBIT' ? 'Débito' : 'Crédito'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">•••• {c.last4 || '****'}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Usado</span>
                    <span className="font-medium tabular-nums">
                      {formatBRL(used)} <span className="text-muted-foreground">/ {hasLimit ? formatBRL(rawLimit) : "Sem limite"}</span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        pct > 90 ? 'bg-destructive' : pct > 70 ? 'bg-warning' : 'bg-primary'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{hasLimit ? `${pct.toFixed(0)}% usado` : "Sem limite"}</span>
                    <span className="font-medium text-success">Disponível: {formatBRL(available)}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bottom rows */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" delay={3}>
          <CardTitle
            title="Últimas transações"
            action={
              <Link
                to="/transactions"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Ver todas <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          {recent.length > 0 ? (
            <ul className="-mx-2 divide-y divide-border/60">
              {recent.map((tx: any, i: number) => {
                const catName = tx.category?.name || "Desconhecida";
                return (
                  <li
                    key={tx.id}
                    className="animate-fade-in-up flex items-center gap-3 px-2 py-2.5 transition-colors hover:bg-accent/40"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        tx.type === "INCOME" || tx.type === "income" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {tx.type === "INCOME" || tx.type === "income" ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{tx.description}</p>
                        <OriginBadge origin={tx.origin || 'MANUAL'} />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {catName} • {formatDate(new Date(tx.date))}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        tx.type === "INCOME" || tx.type === "income" ? "text-success" : "text-foreground"
                      }`}
                    >
                      {tx.type === "INCOME" || tx.type === "income" ? "+" : "−"}
                      {formatBRL(tx.amountInCents || tx.amount || 0)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma transação encontrada</div>
          )}
        </Card>

        <SmartAlerts />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" delay={4}>
          <CardTitle
            title="Próximas contas a pagar"
            action={
              <Link
                to="/bills"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Ver todas <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          {nextBills.length > 0 ? (
            <ul className="-mx-2 divide-y divide-border/60">
              {nextBills.map((b: any, i: number) => {
                const dueDate = new Date(b.dueDate);
                const days = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
                return (
                  <li
                    key={b.id}
                    className="animate-fade-in-up flex items-center gap-3 px-2 py-2.5 transition-colors hover:bg-accent/40"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
                      <CalendarClock className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{b.name || b.description}</p>
                        <StatusPill status={b.status} />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {b.category?.name} • Vence em {days >= 0 ? `${days}d` : `${Math.abs(days)}d atrás`}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatBRL(b.amountInCents || b.amount || 0)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma conta agendada</div>
          )}
        </Card>

        <TelegramFeed />
      </div>
    </>
  );
}
