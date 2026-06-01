import { r as reactExports, V as jsxRuntimeExports } from "./worker-entry-CMu_oXBf.js";
import { c as createLucideIcon, u as useQueryClient, a as useNavigate, b as useQuery, d as useMutation, t as toast, r as restoreTransaction, e as restoreAllTrash, f as deletePermanentTransaction, P as PageHeader, B as Button, g as cn, T as Trash2, D as Dialog, h as DialogContent, i as DialogHeader, j as DialogTitle, k as DialogFooter, l as getTrash } from "./router-BxZ3CosB.js";
import { C as Card } from "./Card-DtSwldk7.js";
import { O as OriginBadge } from "./badges-DzZeikUR.js";
import { f as formatDate, a as formatBRL } from "./format-CzmsyK3W.js";
import { A as ArrowLeft } from "./arrow-left-Ulf0FFlO.js";
import { A as ArrowDownLeft, a as ArrowUpRight } from "./arrow-up-right-D9TqRPyH.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./pencil-DU1eWLO_.js";
import "./send-Bgn39PPm.js";
const __iconNode = [
  ["path", { d: "M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "14sxne" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }],
  ["path", { d: "M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16", key: "1hlbsb" }],
  ["path", { d: "M16 16h5v5", key: "ccwih5" }]
];
const RefreshCcw = createLucideIcon("refresh-ccw", __iconNode);
function TrashPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [deleteModalOpen, setDeleteModalOpen] = reactExports.useState(false);
  const [transactionToDelete, setTransactionToDelete] = reactExports.useState(null);
  const {
    data,
    isLoading: loading
  } = useQuery({
    queryKey: ["trash"],
    queryFn: () => getTrash()
  });
  const transactions = Array.isArray(data) ? data : data?.data || [];
  const restoreMutation = useMutation({
    mutationFn: (id) => restoreTransaction(id),
    onSuccess: () => {
      toast.success("Transação restaurada com sucesso.");
      queryClient.invalidateQueries({
        queryKey: ["trash"]
      });
      queryClient.invalidateQueries({
        queryKey: ["transactions"]
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard"]
      });
    },
    onError: () => toast.error("Erro ao restaurar transação.")
  });
  const restoreAllMutation = useMutation({
    mutationFn: () => restoreAllTrash(),
    onSuccess: () => {
      toast.success("Todas as transações foram restauradas.");
      queryClient.invalidateQueries({
        queryKey: ["trash"]
      });
      queryClient.invalidateQueries({
        queryKey: ["transactions"]
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard"]
      });
    },
    onError: () => toast.error("Erro ao restaurar transações.")
  });
  const deletePermanentMutation = useMutation({
    mutationFn: (id) => deletePermanentTransaction(id),
    onSuccess: () => {
      toast.success("Transação excluída permanentemente.");
      queryClient.invalidateQueries({
        queryKey: ["trash"]
      });
      setDeleteModalOpen(false);
    },
    onError: () => toast.error("Erro ao excluir transação.")
  });
  const confirmDelete = (id) => {
    setTransactionToDelete(id);
    setDeleteModalOpen(true);
  };
  const executeDelete = () => {
    if (transactionToDelete) {
      deletePermanentMutation.mutate(transactionToDelete);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "Lixeira", description: `${transactions.length} itens aguardando exclusão permanente`, actions: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      transactions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", className: "gap-2 text-primary hover:bg-primary/10", onClick: () => {
        if (confirm("Deseja restaurar todas as transações da lixeira?")) {
          restoreAllMutation.mutate();
        }
      }, disabled: restoreAllMutation.isPending, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCcw, { className: "h-4 w-4" }),
        " Restaurar Todas"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", className: "gap-2", onClick: () => navigate({
        to: "/settings"
      }), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "h-4 w-4" }),
        " Voltar"
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "p-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-2.5 text-left font-medium", children: "Data da exclusão" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-2.5 text-left font-medium", children: "Data da transação" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-2.5 text-left font-medium", children: "Descrição" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-2.5 text-left font-medium", children: "Categoria" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-2.5 text-right font-medium", children: "Valor" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-2.5 text-center font-medium w-24", children: "Ações" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, className: "py-8 text-center text-muted-foreground", children: "Carregando lixeira..." }) }) : transactions.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, className: "py-8 text-center text-muted-foreground", children: "Sua lixeira está vazia." }) }) : transactions.map((tx) => {
        const catName = tx.category?.name || "Sem categoria";
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/40 transition-colors hover:bg-destructive/5 group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "whitespace-nowrap px-4 py-3 text-muted-foreground", children: tx.deletedAt ? formatDate(new Date(tx.deletedAt)) : "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "whitespace-nowrap px-4 py-3 text-muted-foreground", children: formatDate(new Date(tx.date)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("flex h-7 w-7 items-center justify-center rounded-md opacity-70", tx.type === "INCOME" || tx.type === "income" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"), children: tx.type === "INCOME" || tx.type === "income" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDownLeft, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpRight, { className: "h-3.5 w-3.5" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium line-through text-muted-foreground", children: tx.description }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(OriginBadge, { origin: tx.origin || "MANUAL" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-muted-foreground", children: catName }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: cn("whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums opacity-70", tx.type === "INCOME" || tx.type === "income" ? "text-success" : "text-foreground"), children: [
            tx.type === "INCOME" || tx.type === "income" ? "+" : "−",
            formatBRL(tx.amountInCents || tx.amount || 0)
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", className: "h-7 w-7 p-0 text-muted-foreground hover:text-success", onClick: () => restoreMutation.mutate(tx.id), disabled: restoreMutation.isPending, title: "Restaurar transação", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCcw, { className: "h-3.5 w-3.5" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", className: "h-7 w-7 p-0 text-muted-foreground hover:text-destructive", onClick: () => confirmDelete(tx.id), disabled: deletePermanentMutation.isPending, title: "Excluir permanentemente", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" }) })
          ] }) })
        ] }, tx.id);
      }) })
    ] }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: deleteModalOpen, onOpenChange: setDeleteModalOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-[425px] border-destructive/20", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "text-destructive", children: "Excluir permanentemente?" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "py-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-foreground mb-2", children: "Esta ação não pode ser desfeita." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "A transação será removida do banco de dados definitivamente." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setDeleteModalOpen(false), children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "destructive", onClick: executeDelete, disabled: deletePermanentMutation.isPending, children: "Excluir" })
      ] })
    ] }) })
  ] });
}
export {
  TrashPage as component
};
