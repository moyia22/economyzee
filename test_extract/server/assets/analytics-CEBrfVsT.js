import { V as jsxRuntimeExports } from "./worker-entry-CMu_oXBf.js";
import { x as api, b as useQuery, P as PageHeader } from "./router-BxZ3CosB.js";
import { C as Card, a as CardTitle } from "./Card-DtSwldk7.js";
import { c as formatCompactBRL, a as formatBRL, f as formatDate } from "./format-CzmsyK3W.js";
import { O as OriginBadge } from "./badges-DzZeikUR.js";
import { g as generateCategoricalChart, B as Bar, X as XAxis, Y as YAxis, f as formatAxisMap, D as DashboardSkeleton, R as ResponsiveContainer, C as CartesianGrid, T as Tooltip, a as CategoryTooltip, A as AreaChart, b as CustomTooltip, L as Legend, c as Area } from "./Skeleton-D4tjvQ4f.js";
import { a as ArrowUpRight, A as ArrowDownLeft } from "./arrow-up-right-D9TqRPyH.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./pencil-DU1eWLO_.js";
import "./send-Bgn39PPm.js";
var BarChart = generateCategoricalChart({
  chartName: "BarChart",
  GraphicalChild: Bar,
  defaultTooltipEventType: "axis",
  validateTooltipEventTypes: ["axis", "item"],
  axisComponents: [{
    axisType: "xAxis",
    AxisComp: XAxis
  }, {
    axisType: "yAxis",
    AxisComp: YAxis
  }],
  formatAxisMap
});
async function getMonthlyEvolution() {
  return api.get("/analytics/monthly-evolution");
}
async function getCategoryBreakdown() {
  return api.get("/analytics/category-breakdown");
}
async function getTopExpenses(limit = 10) {
  return api.get(`/analytics/top-expenses?limit=${limit}`);
}
async function getAnalytics() {
  const [evolutionReq, breakdownReq, topExpensesReq] = await Promise.all([
    getMonthlyEvolution().catch(() => []),
    getCategoryBreakdown().catch(() => []),
    getTopExpenses(8).catch(() => [])
  ]);
  return {
    evolution: evolutionReq || [],
    breakdown: breakdownReq || [],
    topExpenses: topExpensesReq || []
  };
}
function AnalyticsPage() {
  const {
    data,
    isLoading: loading,
    error
  } = useQuery({
    queryKey: ["analytics"],
    queryFn: getAnalytics
  });
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardSkeleton, {});
  }
  if (error || !data) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-8 text-center text-muted-foreground", children: "Erro ao carregar dados." });
  }
  const {
    evolution = [],
    breakdown = [],
    topExpenses: top = []
  } = data;
  const compare = evolution.slice(-2);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "Análises", description: "Entenda para onde está indo o seu dinheiro." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-4 lg:grid-cols-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { delay: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { title: "Gastos por categoria", description: "Este mês — ranking horizontal" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-[280px]", children: breakdown.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(BarChart, { data: breakdown.slice(0, 8), layout: "vertical", margin: {
          top: 4,
          right: 16,
          left: 0,
          bottom: 0
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("defs", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("linearGradient", { id: "bar-gradient", x1: "0", y1: "0", x2: "1", y2: "0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("stop", { offset: "0%", stopColor: "oklch(0.78 0.18 152)", stopOpacity: 0.8 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("stop", { offset: "100%", stopColor: "oklch(0.72 0.14 235)", stopOpacity: 0.9 })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "oklch(0.28 0.012 260)", horizontal: false }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, { type: "number", stroke: "oklch(0.6 0.02 260)", tickLine: false, axisLine: false, fontSize: 11, tickFormatter: (v) => formatCompactBRL(v) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, { type: "category", dataKey: "name", stroke: "oklch(0.6 0.02 260)", tickLine: false, axisLine: false, fontSize: 10, width: 90 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { content: /* @__PURE__ */ jsxRuntimeExports.jsx(CategoryTooltip, {}), cursor: {
            fill: "oklch(1 0 0 / 3%)"
          } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, { dataKey: "value", fill: "url(#bar-gradient)", radius: [0, 6, 6, 0], animationBegin: 0, animationDuration: 800, animationEasing: "ease-out" })
        ] }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-full items-center justify-center text-sm text-muted-foreground", children: "Sem dados suficientes" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { delay: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { title: "Tendência mensal", description: "Receitas vs despesas — com área preenchida" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-[280px]", children: evolution.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AreaChart, { data: evolution, margin: {
          top: 4,
          right: 8,
          left: -12,
          bottom: 0
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("defs", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("linearGradient", { id: "analytics-income", x1: "0", y1: "0", x2: "0", y2: "1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("stop", { offset: "0%", stopColor: "oklch(0.78 0.18 152)", stopOpacity: 0.4 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("stop", { offset: "100%", stopColor: "oklch(0.78 0.18 152)", stopOpacity: 0 })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("linearGradient", { id: "analytics-expense", x1: "0", y1: "0", x2: "0", y2: "1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("stop", { offset: "0%", stopColor: "oklch(0.7 0.16 25)", stopOpacity: 0.3 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("stop", { offset: "100%", stopColor: "oklch(0.7 0.16 25)", stopOpacity: 0 })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "oklch(0.28 0.012 260)", vertical: false }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, { dataKey: "month", stroke: "oklch(0.6 0.02 260)", tickLine: false, axisLine: false, fontSize: 11 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, { stroke: "oklch(0.6 0.02 260)", tickLine: false, axisLine: false, fontSize: 11, tickFormatter: (v) => formatCompactBRL(v) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { content: /* @__PURE__ */ jsxRuntimeExports.jsx(CustomTooltip, {}), cursor: {
            stroke: "oklch(0.5 0.02 260)",
            strokeDasharray: "4 4"
          } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Legend, { wrapperStyle: {
            fontSize: 11
          } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Area, { type: "monotone", dataKey: "income", name: "Receita", stroke: "oklch(0.78 0.18 152)", strokeWidth: 2.5, fill: "url(#analytics-income)", dot: {
            r: 3,
            fill: "oklch(0.78 0.18 152)"
          }, animationDuration: 800, animationEasing: "ease-out" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Area, { type: "monotone", dataKey: "expense", name: "Despesa", stroke: "oklch(0.7 0.16 25)", strokeWidth: 2.5, fill: "url(#analytics-expense)", dot: {
            r: 3,
            fill: "oklch(0.7 0.16 25)"
          }, animationBegin: 200, animationDuration: 800, animationEasing: "ease-out" })
        ] }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-full items-center justify-center text-sm text-muted-foreground", children: "Sem dados suficientes" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { delay: 3, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { title: "Comparativo de meses", description: "Anterior × Atual" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4", children: compare.length === 2 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CompareRow, { label: "Receita", prev: compare[0].income, curr: compare[1].income, positive: true }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CompareRow, { label: "Despesa", prev: compare[0].expense, curr: compare[1].expense }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CompareRow, { label: "Saldo", prev: compare[0].income - compare[0].expense, curr: compare[1].income - compare[1].expense, positive: true })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-8 text-center text-sm text-muted-foreground", children: "Poucos dados" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "lg:col-span-2", delay: 4, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { title: "Top categorias", description: "Onde você mais gastou neste mês" }),
        breakdown.length > 0 ? (() => {
          const total = breakdown.reduce((s, x) => s + x.value, 0);
          return /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2.5", children: breakdown.slice(0, 5).map((c, i) => {
            const pct = total > 0 ? c.value / total * 100 : 0;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "animate-fade-in-up", style: {
              animationDelay: `${i * 0.06}s`
            }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-1 flex items-center justify-between text-xs", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2 font-medium", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-2 w-2 rounded-full", style: {
                    background: c.color || "var(--primary)"
                  } }),
                  c.name
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "tabular-nums text-muted-foreground", children: [
                  formatBRL(c.value),
                  " ",
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-1 text-[10px]", children: [
                    "(",
                    pct.toFixed(1),
                    "%)"
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-1.5 w-full overflow-hidden rounded-full bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full rounded-full transition-all duration-700 ease-out", style: {
                width: `${pct}%`,
                background: c.color || "var(--primary)"
              } }) })
            ] }, c.id);
          }) });
        })() : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-8 text-center text-sm text-muted-foreground", children: "Sem categorias para listar" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "mt-4", delay: 5, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { title: "Top gastos", description: "Maiores transações registradas" }),
      top.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "-mx-2 divide-y divide-border/60", children: top.map((tx, i) => {
        const cat = tx.category;
        const acc = tx.account;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "animate-fade-in-up flex items-center gap-3 px-2 py-2.5", style: {
          animationDelay: `${i * 0.04}s`
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpRight, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-sm font-medium", children: tx.description }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(OriginBadge, { origin: tx.origin || "MANUAL" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-muted-foreground", children: [
              cat?.name,
              " • ",
              acc?.name,
              " • ",
              formatDate(new Date(tx.date))
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold tabular-nums", children: formatBRL(tx.amountInCents || tx.amount || 0) })
        ] }, tx.id);
      }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-8 text-center text-sm text-muted-foreground", children: "Nenhuma transação encontrada" })
    ] })
  ] });
}
function CompareRow({
  label,
  prev,
  curr,
  positive
}) {
  const diff = curr - prev;
  const pct = prev !== 0 ? diff / prev * 100 : 0;
  const good = positive ? diff >= 0 : diff <= 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "animate-fade-in-up rounded-lg border border-border/60 p-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-xs text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: label }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${good ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`, children: [
        diff >= 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpRight, { className: "h-3 w-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDownLeft, { className: "h-3 w-3" }),
        pct >= 0 ? "+" : "",
        pct.toFixed(1),
        "%"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex items-baseline gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg font-semibold tabular-nums", children: formatBRL(curr) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground line-through", children: formatBRL(prev) })
    ] })
  ] });
}
export {
  AnalyticsPage as component
};
