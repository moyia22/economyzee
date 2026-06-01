import { r as reactExports, V as jsxRuntimeExports } from "./worker-entry-CMu_oXBf.js";
import { c as createLucideIcon, x as api, b as useQuery, P as PageHeader, B as Button, t as toast } from "./router-BxZ3CosB.js";
import { C as Card, a as CardTitle } from "./Card-DtSwldk7.js";
import { C as Calendar } from "./calendar-C5L3VQOq.js";
import { T as TrendingUp, F as FileText } from "./trending-up-pmHej_nl.js";
import { L as LoaderCircle } from "./loader-circle-B9yGKrE1.js";
import { D as Download } from "./download-DsgzDpub.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const __iconNode = [
  [
    "path",
    {
      d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      key: "1oefj6"
    }
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }],
  ["path", { d: "M8 13h2", key: "yr2amv" }],
  ["path", { d: "M14 13h2", key: "un5t4a" }],
  ["path", { d: "M8 17h2", key: "2yhykz" }],
  ["path", { d: "M14 17h2", key: "10kma7" }]
];
const FileSpreadsheet = createLucideIcon("file-spreadsheet", __iconNode);
async function getReportPreview() {
  return api.get("/reports/preview");
}
async function generateReport(type, format) {
  const API_URL = "https://improvise-climatic-frequency.ngrok-free.dev";
  try {
    const { data: { session } } = await (await import("./router-BxZ3CosB.js").then((n) => n.ar)).supabase.auth.getSession();
    const token = session?.access_token;
    const orgId = localStorage.getItem("economyzee_org_id");
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (orgId) headers["x-organization-id"] = orgId;
    const res = await fetch(`${API_URL}/api/reports/generate?type=${type}&format=${format}`, {
      headers
    });
    if (!res.ok) return null;
    return res.blob();
  } catch {
    return null;
  }
}
const reports = [{
  id: "monthly",
  title: "Resumo mensal",
  description: "Receitas, despesas e saldo do mês corrente.",
  icon: Calendar,
  accent: "text-primary bg-primary/10"
}, {
  id: "categories",
  title: "Análise de categorias",
  description: "Detalhamento de gastos por categoria nos últimos 90 dias.",
  icon: TrendingUp,
  accent: "text-info bg-info/10"
}, {
  id: "fiscal",
  title: "Ano fiscal",
  description: "Visão consolidada do ano para declaração de IR.",
  icon: FileText,
  accent: "text-warning bg-warning/10"
}, {
  id: "invoices",
  title: "Faturas de cartão",
  description: "Histórico completo de faturas dos seus cartões.",
  icon: FileSpreadsheet,
  accent: "text-chart-4 bg-[oklch(0.7_0.2_320/15%)]"
}];
function ReportsPage() {
  const [downloading, setDownloading] = reactExports.useState(null);
  const {
    data: preview
  } = useQuery({
    queryKey: ["report-preview"],
    queryFn: getReportPreview
  });
  const handleDownload = async (reportId, format) => {
    const key = `${reportId}-${format}`;
    setDownloading(key);
    try {
      const blob = await generateReport(reportId, format);
      if (!blob) {
        toast.error("Erro ao gerar relatório.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `economyzee-${reportId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Relatório ${format.toUpperCase()} baixado!`);
    } catch {
      toast.error("Erro ao gerar relatório.");
    } finally {
      setDownloading(null);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "Relatórios", description: "Exporte os dados do EconomyZee em poucos cliques." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-2", children: reports.map((r) => {
      const Icon = r.icon;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `flex h-11 w-11 items-center justify-center rounded-lg ${r.accent}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-5 w-5" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold", children: r.title }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: r.description })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", className: "gap-2 flex-1", disabled: downloading === `${r.id}-csv`, onClick: () => handleDownload(r.id, "csv"), children: [
            downloading === `${r.id}-csv` ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "h-4 w-4" }),
            "CSV"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", className: "gap-2 flex-1", disabled: downloading === `${r.id}-pdf`, onClick: () => handleDownload(r.id, "pdf"), children: [
            downloading === `${r.id}-pdf` ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "h-4 w-4" }),
            "PDF"
          ] })
        ] })
      ] }, r.id);
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "mt-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { title: "Pré-visualização", description: preview ? `Resumo mensal — ${preview.period}` : "Carregando..." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-background p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-between border-b border-border/60 pb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "EconomyZee" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "mt-1 text-lg font-semibold", children: [
            "Resumo mensal — ",
            preview?.period || "..."
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] uppercase tracking-wider text-muted-foreground", children: "Receitas" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xl font-semibold tabular-nums text-success", children: preview?.income != null ? `R$ ${preview.income.toLocaleString("pt-BR", {
              minimumFractionDigits: 2
            })}` : "—" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] uppercase tracking-wider text-muted-foreground", children: "Despesas" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xl font-semibold tabular-nums", children: preview?.expenses != null ? `R$ ${preview.expenses.toLocaleString("pt-BR", {
              minimumFractionDigits: 2
            })}` : "—" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] uppercase tracking-wider text-muted-foreground", children: "Saldo" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xl font-semibold tabular-nums text-primary", children: preview?.balance != null ? `R$ ${preview.balance.toLocaleString("pt-BR", {
              minimumFractionDigits: 2
            })}` : "—" })
          ] })
        ] }),
        preview?.topCategories && preview.topCategories.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 space-y-1.5 text-sm", children: preview.topCategories.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between border-b border-border/40 py-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: c.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-medium tabular-nums", children: [
            "R$ ",
            c.amount?.toLocaleString("pt-BR", {
              minimumFractionDigits: 2
            })
          ] })
        ] }, c.name)) })
      ] })
    ] })
  ] });
}
export {
  ReportsPage as component
};
