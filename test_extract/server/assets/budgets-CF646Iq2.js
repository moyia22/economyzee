import { r as reactExports, V as jsxRuntimeExports } from "./worker-entry-CMu_oXBf.js";
import { x as api, u as useQueryClient, a6 as useForm, a7 as a, d as useMutation, t as toast, D as Dialog, a8 as DialogTrigger, B as Button, z as Plus, h as DialogContent, i as DialogHeader, j as DialogTitle, C as DialogDescription, a9 as Form, aa as FormField, ab as FormItem, ac as FormLabel, o as Select, ad as FormControl, p as SelectTrigger, q as SelectValue, s as SelectContent, v as SelectItem, ae as FormMessage, I as Input, af as objectType, ag as coerce, ah as stringType, b as useQuery, P as PageHeader, T as Trash2 } from "./router-BxZ3CosB.js";
import { C as Card } from "./Card-DtSwldk7.js";
import { a as formatBRL } from "./format-CzmsyK3W.js";
import { g as getCategories } from "./categories.service-lBawr2rb.js";
import { T as TriangleAlert } from "./triangle-alert-WQmhNf6S.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
async function getBudgets() {
  return api.get("/budgets");
}
async function createBudget(data) {
  return api.post("/budgets", data);
}
async function deleteBudget(id) {
  return api.delete(`/budgets/${id}`);
}
const budgetSchema = objectType({
  categoryId: stringType().min(1, "Selecione uma categoria"),
  limit: coerce.number().min(1, "Limite deve ser maior que 0")
});
function BudgetModal({ categories }) {
  const [open, setOpen] = reactExports.useState(false);
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: a(budgetSchema),
    defaultValues: { categoryId: "", limit: 0 }
  });
  const mutation = useMutation({
    mutationFn: (values) => {
      return createBudget({
        categoryId: values.categoryId,
        amountInCents: Math.round(values.limit * 100)
      });
    },
    onSuccess: () => {
      toast.success("Orçamento criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast.error("Erro ao criar orçamento.");
    }
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", className: "gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
      " Novo orçamento"
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-[380px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Novo Orçamento" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Defina um limite mensal para uma categoria." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Form, { ...form, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: form.handleSubmit((v) => mutation.mutate(v)), className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormField,
          {
            control: form.control,
            name: "categoryId",
            render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { children: "Categoria" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { onValueChange: field.onChange, defaultValue: field.value, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Selecione..." }) }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: categories.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: c.id, children: c.name }, c.id)) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormField,
          {
            control: form.control,
            name: "limit",
            render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { children: "Limite mensal (R$)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", step: "0.01", placeholder: "0,00", ...field }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end pt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "submit", disabled: mutation.isPending, children: mutation.isPending ? "Salvando..." : "Criar Orçamento" }) })
      ] }) })
    ] })
  ] });
}
function BudgetsPage() {
  const queryClient = useQueryClient();
  const {
    data: budgets = [],
    isLoading: loading
  } = useQuery({
    queryKey: ["budgets"],
    queryFn: () => getBudgets().catch(() => [])
  });
  const {
    data: categories = []
  } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories().catch(() => [])
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteBudget(id),
    onSuccess: () => {
      toast.success("Orçamento removido!");
      queryClient.invalidateQueries({
        queryKey: ["budgets"]
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard"]
      });
    },
    onError: () => toast.error("Erro ao remover orçamento.")
  });
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-8 text-center text-muted-foreground", children: "Carregando orçamentos..." });
  }
  const totalLimit = budgets.reduce((s, b) => s + (b.limitInCents || b.amountInCents || b.limit || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spentInCents || b.spent || 0), 0);
  const overall = totalLimit > 0 ? totalSpent / totalLimit * 100 : 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "Orçamentos", description: "Este mês", actions: /* @__PURE__ */ jsxRuntimeExports.jsx(BudgetModal, { categories }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Orçamento total" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-2xl font-semibold tabular-nums", children: [
            formatBRL(totalSpent),
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-base text-muted-foreground", children: [
              "/ ",
              formatBRL(totalLimit)
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Restante" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-2xl font-semibold tabular-nums text-success", children: formatBRL(Math.max(0, totalLimit - totalSpent)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `h-full rounded-full transition-all ${overall > 90 ? "bg-destructive" : overall > 70 ? "bg-warning" : "bg-primary"}`, style: {
        width: `${Math.min(overall, 100)}%`
      } }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3", children: budgets.length > 0 ? budgets.map((b) => {
      const cat = b.category || {
        name: "Categoria"
      };
      const limit = b.limitInCents || b.amountInCents || b.limit || 1;
      const spent = b.spentInCents || b.spent || 0;
      const pct = spent / limit * 100;
      const over = pct > 100;
      const warn = pct > 80 && !over;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold", children: cat.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-[11px] text-muted-foreground", children: "Limite mensal" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
            over && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-md border border-destructive/25 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-3 w-3" }),
              " Estouro"
            ] }),
            warn && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-md border border-warning/25 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-3 w-3" }),
              " Atenção"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", className: "h-7 w-7 p-0 text-muted-foreground hover:text-destructive", onClick: () => deleteMutation.mutate(b.id), disabled: deleteMutation.isPending, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex items-baseline justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xl font-semibold tabular-nums", children: formatBRL(spent) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground tabular-nums", children: [
            "de ",
            formatBRL(limit)
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 h-2 w-full overflow-hidden rounded-full bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `h-full rounded-full transition-all ${over ? "bg-destructive" : warn ? "bg-warning" : "bg-primary"}`, style: {
          width: `${Math.min(pct, 100)}%`
        } }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex items-center justify-between text-[11px] text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            pct.toFixed(0),
            "% utilizado"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: over ? "text-destructive" : "", children: over ? `+${formatBRL(spent - limit)} acima` : `${formatBRL(limit - spent)} restantes` })
        ] })
      ] }, b.id);
    }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-full py-8 text-center text-sm text-muted-foreground", children: "Nenhum orçamento definido" }) })
  ] });
}
export {
  BudgetsPage as component
};
