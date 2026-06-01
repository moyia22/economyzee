import { r as reactExports, V as jsxRuntimeExports } from "./worker-entry-CMu_oXBf.js";
import { u as useQueryClient, b as useQuery, d as useMutation, t as toast, r as restoreTransaction, m as deleteTransaction, P as PageHeader, B as Button, n as TransactionModal, S as Search, o as Select, p as SelectTrigger, q as SelectValue, s as SelectContent, v as SelectItem, g as cn, A as Avatar, w as AvatarFallback, T as Trash2, x as api, y as getTransactions } from "./router-BxZ3CosB.js";
import { C as Card } from "./Card-DtSwldk7.js";
import { O as OriginBadge } from "./badges-DzZeikUR.js";
import { f as formatDate, a as formatBRL } from "./format-CzmsyK3W.js";
import { D as Download } from "./download-DsgzDpub.js";
import { A as ArrowDownLeft, a as ArrowUpRight } from "./arrow-up-right-D9TqRPyH.js";
import { P as Pencil } from "./pencil-DU1eWLO_.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./send-Bgn39PPm.js";
function TransactionsPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = reactExports.useState("");
  const [cat, setCat] = reactExports.useState("all");
  const [acc, setAcc] = reactExports.useState("all");
  const [origin, setOrigin] = reactExports.useState("all");
  const [page, setPage] = reactExports.useState(1);
  const perPage = 20;
  const {
    data: categories = []
  } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories").catch(() => [])
  });
  const {
    data: accounts = []
  } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api.get("/accounts").catch(() => [])
  });
  const {
    data,
    isLoading: loading
  } = useQuery({
    queryKey: ["transactions", {
      q,
      cat,
      acc,
      origin,
      page
    }],
    queryFn: () => getTransactions({
      search: q,
      category: cat !== "all" ? cat : void 0,
      account: acc !== "all" ? acc : void 0,
      origin: origin !== "all" ? origin : void 0,
      page,
      limit: perPage
    })
  });
  const transactions = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const restoreMutation = useMutation({
    mutationFn: (id) => restoreTransaction(id),
    onSuccess: () => {
      toast.success("Transação restaurada.");
      queryClient.invalidateQueries({
        queryKey: ["transactions"]
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard"]
      });
    },
    onError: () => toast.error("Erro ao restaurar.")
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteTransaction(id),
    onSuccess: (_, id) => {
      toast("Transação movida para a lixeira.", {
        action: {
          label: "Desfazer",
          onClick: () => restoreMutation.mutate(id)
        },
        duration: 5e3
      });
      queryClient.invalidateQueries({
        queryKey: ["transactions"]
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard"]
      });
    },
    onError: () => toast.error("Erro ao remover.")
  });
  const handleExport = () => {
    if (transactions.length === 0) return toast.error("Nenhuma transação para exportar.");
    const header = "Data,Descrição,Categoria,Conta,Tipo,Valor";
    const rows = transactions.map((tx) => {
      const d = new Date(tx.date).toLocaleDateString("pt-BR");
      const desc = (tx.description || "").replace(/,/g, ";");
      const catN = tx.category?.name || "";
      const accN = tx.account?.name || "";
      const type = tx.type === "INCOME" ? "Receita" : "Despesa";
      const val = ((tx.amountInCents ?? tx.amount ?? 0) / 100).toFixed(2).replace(".", ",");
      return `${d},${desc},${catN},${accN},${type},${val}`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;"
    });
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "Transações", description: `${transactions.length} de ${total} lançamentos`, actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", className: "gap-2", onClick: handleExport, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "h-4 w-4" }),
        " Exportar"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TransactionModal, { categories, accounts })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "p-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2 border-b border-border/60 p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1 min-w-[220px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: q, onChange: (e) => {
            setQ(e.target.value);
            setPage(1);
          }, placeholder: "Buscar descrição…", className: "h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring/60" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: cat, onValueChange: (v) => {
          setCat(v);
          setPage(1);
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 w-[160px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Categoria" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: "Todas categorias" }),
            categories.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: c.id, children: c.name }, c.id))
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: acc, onValueChange: (v) => {
          setAcc(v);
          setPage(1);
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 w-[160px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Conta" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: "Todas contas" }),
            accounts.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: a.id, children: a.name }, a.id))
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: origin, onValueChange: (v) => {
          setOrigin(v);
          setPage(1);
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "h-9 w-[140px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Origem" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: "Todas origens" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "TELEGRAM", children: "Telegram" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "MANUAL", children: "Manual" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "IMPORT", children: "Import" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-2.5 text-left font-medium", children: "Data" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-2.5 text-left font-medium", children: "Descrição" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-2.5 text-left font-medium", children: "Categoria" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-2.5 text-left font-medium", children: "Conta" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-2.5 text-left font-medium", children: "Membro" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-2.5 text-right font-medium", children: "Valor" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-2.5 text-center font-medium w-12" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, className: "py-8 text-center text-muted-foreground", children: "Carregando transações..." }) }) : transactions.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, className: "py-8 text-center text-muted-foreground", children: "Nenhuma transação encontrada." }) }) : transactions.map((tx) => {
          const catName = tx.category?.name;
          const accName = tx.account?.name || tx.card?.name;
          const m = tx.member?.user ?? {
            name: "Membro"
          };
          const memberName = m.name || "Membro";
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/40 transition-colors hover:bg-accent/40 group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "whitespace-nowrap px-4 py-3 text-muted-foreground", children: formatDate(new Date(tx.date)) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("flex h-7 w-7 items-center justify-center rounded-md", tx.type === "INCOME" || tx.type === "income" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"), children: tx.type === "INCOME" || tx.type === "income" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDownLeft, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpRight, { className: "h-3.5 w-3.5" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: tx.description }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(OriginBadge, { origin: tx.origin || "MANUAL" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-muted-foreground", children: catName }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-muted-foreground", children: accName }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { className: "h-6 w-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarFallback, { className: "text-[10px] font-bold", style: {
                background: `var(--primary)25`,
                color: "var(--primary)"
              }, children: memberName.split(" ").filter(Boolean).map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "?" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: memberName.split(" ")[0] })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: cn("whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums", tx.type === "INCOME" || tx.type === "income" ? "text-success" : "text-foreground"), children: [
              tx.type === "INCOME" || tx.type === "income" ? "+" : "−",
              formatBRL(tx.amountInCents || tx.amount || 0)
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TransactionModal, { categories, accounts, transaction: tx, trigger: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", className: "h-7 w-7 p-0 text-muted-foreground hover:text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "h-3.5 w-3.5" }) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", className: "h-7 w-7 p-0 text-muted-foreground hover:text-destructive", onClick: () => deleteMutation.mutate(tx.id), disabled: deleteMutation.isPending, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" }) })
            ] }) })
          ] }, tx.id);
        }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between border-t border-border/60 px-4 py-3 text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "Página ",
          page,
          " de ",
          totalPages,
          " — ",
          total,
          " transações"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", disabled: page <= 1, onClick: () => setPage((p) => p - 1), children: "Anterior" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", disabled: page >= totalPages, onClick: () => setPage((p) => p + 1), children: "Próxima" })
        ] })
      ] })
    ] })
  ] });
}
export {
  TransactionsPage as component
};
