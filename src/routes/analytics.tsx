import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, Legend,
} from "recharts";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/Card";
import { formatBRL, formatCompactBRL, formatDate } from "@/lib/format";
import { OriginBadge } from "@/components/badges";
import { useQuery } from "@tanstack/react-query";
import { getAnalytics } from "@/services/analytics.service";
import { CustomTooltip, CategoryTooltip } from "@/components/charts/CustomTooltip";
import { DashboardSkeleton } from "@/components/Skeleton";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Análises — EconomyZee" },
      { name: "description", content: "Análise profunda das suas finanças: tendências, comparativos e top categorias." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data, isLoading: loading, error } = useQuery({
    queryKey: ["analytics"],
    queryFn: getAnalytics,
  });

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return <div className="p-8 text-center text-muted-foreground">Erro ao carregar dados.</div>;
  }

  const { evolution = [], breakdown = [], topExpenses: top = [] } = data;
  const compare = evolution.slice(-2);

  return (
    <>
      <PageHeader
        title="Análises"
        description="Entenda para onde está indo o seu dinheiro."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card delay={1}>
          <CardTitle title="Gastos por categoria" description="Este mês — ranking horizontal" />
          <div className="h-[280px]">
            {breakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={breakdown.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="bar-gradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="oklch(0.78 0.18 152)" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="oklch(0.72 0.14 235)" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.012 260)" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="oklch(0.6 0.02 260)"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickFormatter={(v) => formatCompactBRL(v as number)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="oklch(0.6 0.02 260)"
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                    width={90}
                  />
                  <Tooltip content={<CategoryTooltip />} cursor={{ fill: "oklch(1 0 0 / 3%)" }} />
                  <Bar
                    dataKey="value"
                    fill="url(#bar-gradient)"
                    radius={[0, 6, 6, 0]}
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem dados suficientes</div>
            )}
          </div>
        </Card>

        <Card delay={2}>
          <CardTitle title="Tendência mensal" description="Receitas vs despesas — com área preenchida" />
          <div className="h-[280px]">
            {evolution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolution} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="analytics-income" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.78 0.18 152)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.78 0.18 152)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="analytics-expense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.7 0.16 25)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="oklch(0.7 0.16 25)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.012 260)" vertical={false} />
                  <XAxis dataKey="month" stroke="oklch(0.6 0.02 260)" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis stroke="oklch(0.6 0.02 260)" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => formatCompactBRL(v as number)} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: "oklch(0.5 0.02 260)", strokeDasharray: "4 4" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="Receita"
                    stroke="oklch(0.78 0.18 152)"
                    strokeWidth={2.5}
                    fill="url(#analytics-income)"
                    dot={{ r: 3, fill: "oklch(0.78 0.18 152)" }}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="Despesa"
                    stroke="oklch(0.7 0.16 25)"
                    strokeWidth={2.5}
                    fill="url(#analytics-expense)"
                    dot={{ r: 3, fill: "oklch(0.7 0.16 25)" }}
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
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card delay={3}>
          <CardTitle title="Comparativo de meses" description="Anterior × Atual" />
          <div className="space-y-4">
            {compare.length === 2 ? (
              <>
                <CompareRow label="Receita" prev={compare[0].income} curr={compare[1].income} positive />
                <CompareRow label="Despesa" prev={compare[0].expense} curr={compare[1].expense} />
                <CompareRow label="Saldo" prev={compare[0].income - compare[0].expense} curr={compare[1].income - compare[1].expense} positive />
              </>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">Poucos dados</div>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2" delay={4}>
          <CardTitle title="Top categorias" description="Onde você mais gastou neste mês" />
          {breakdown.length > 0 ? (() => {
              const total = breakdown.reduce((s: number, x: any) => s + x.value, 0);
              return (
            <ul className="space-y-2.5">
              {breakdown.slice(0, 5).map((c: any, i: number) => {
                const pct = total > 0 ? (c.value / total) * 100 : 0;
                return (
                  <li
                    key={c.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${i * 0.06}s` }}
                  >
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-medium">
                        <span className="h-2 w-2 rounded-full" style={{ background: c.color || 'var(--primary)' }} />
                        {c.name}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatBRL(c.value)} <span className="ml-1 text-[10px]">({pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${pct}%`, background: c.color || 'var(--primary)' }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
              );
            })()
          : (
            <div className="py-8 text-center text-sm text-muted-foreground">Sem categorias para listar</div>
          )}
        </Card>
      </div>

      <Card className="mt-4" delay={5}>
        <CardTitle title="Top gastos" description="Maiores transações registradas" />
        {top.length > 0 ? (
          <ul className="-mx-2 divide-y divide-border/60">
            {top.map((tx: any, i: number) => {
              const cat = tx.category;
              const acc = tx.account;
              return (
                <li
                  key={tx.id}
                  className="animate-fade-in-up flex items-center gap-3 px-2 py-2.5"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{tx.description}</p>
                      <OriginBadge origin={tx.origin || 'MANUAL'} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">{cat?.name} • {acc?.name} • {formatDate(new Date(tx.date))}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{formatBRL(tx.amountInCents || tx.amount || 0)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma transação encontrada</div>
        )}
      </Card>
    </>
  );
}

function CompareRow({ label, prev, curr, positive }: { label: string; prev: number; curr: number; positive?: boolean }) {
  const diff = curr - prev;
  const pct = prev !== 0 ? (diff / prev) * 100 : 0;
  const good = positive ? diff >= 0 : diff <= 0;
  return (
    <div className="animate-fade-in-up rounded-lg border border-border/60 p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${good ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
          {diff >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
          {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
        </span>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-lg font-semibold tabular-nums">{formatBRL(curr)}</span>
        <span className="text-[11px] text-muted-foreground line-through">{formatBRL(prev)}</span>
      </div>
    </div>
  );
}
