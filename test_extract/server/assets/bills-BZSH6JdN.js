import { r as reactExports, V as jsxRuntimeExports } from "./worker-entry-CMu_oXBf.js";
import { x as api, u as useQueryClient, a6 as useForm, a7 as a, d as useMutation, t as toast, D as Dialog, a8 as DialogTrigger, B as Button, z as Plus, h as DialogContent, i as DialogHeader, j as DialogTitle, C as DialogDescription, a9 as Form, aa as FormField, ab as FormItem, ac as FormLabel, ad as FormControl, I as Input, ae as FormMessage, af as objectType, ai as booleanType, ah as stringType, ag as coerce, b as useQuery, P as PageHeader, aj as CalendarClock } from "./router-BxZ3CosB.js";
import { C as Card, a as CardTitle } from "./Card-DtSwldk7.js";
import { S as StatusPill } from "./badges-DzZeikUR.js";
import { a as formatBRL, b as formatDateLong } from "./format-CzmsyK3W.js";
import { C as CircleCheck } from "./circle-check-lFfqg3WV.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./pencil-DU1eWLO_.js";
import "./send-Bgn39PPm.js";
async function getBills() {
  return api.get("/bills");
}
async function createBill(data) {
  return api.post("/bills", data);
}
async function markBillPaid(id) {
  return api.post(`/bills/${id}/mark-paid`);
}
const billSchema = objectType({
  name: stringType().min(2, "Nome muito curto"),
  amount: coerce.number().min(0.01, "Valor deve ser maior que 0"),
  dueDate: stringType().min(1, "Selecione a data de vencimento"),
  category: stringType().optional(),
  recurring: booleanType().default(false)
});
function BillModal() {
  const [open, setOpen] = reactExports.useState(false);
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: a(billSchema),
    defaultValues: {
      name: "",
      amount: 0,
      dueDate: "",
      category: "",
      recurring: false
    }
  });
  const mutation = useMutation({
    mutationFn: (values) => {
      return createBill({
        name: values.name,
        amountInCents: Math.round(values.amount * 100),
        dueDate: values.dueDate,
        category: values.category || void 0,
        recurring: values.recurring
      });
    },
    onSuccess: () => {
      toast.success("Conta a pagar criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast.error("Erro ao criar conta a pagar.");
    }
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", className: "gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
      " Nova conta"
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-[425px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Nova Conta a Pagar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Registre um novo vencimento para acompanhar." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Form, { ...form, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: form.handleSubmit((v) => mutation.mutate(v)), className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormField,
          {
            control: form.control,
            name: "name",
            render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { children: "Nome" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { placeholder: "Ex: Aluguel, Netflix...", ...field }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            FormField,
            {
              control: form.control,
              name: "amount",
              render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { children: "Valor (R$)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", step: "0.01", placeholder: "0,00", ...field }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
              ] })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            FormField,
            {
              control: form.control,
              name: "dueDate",
              render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { children: "Vencimento" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "date", ...field }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
              ] })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormField,
          {
            control: form.control,
            name: "category",
            render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { children: "Categoria (Opcional)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { placeholder: "Ex: Moradia, Streaming...", ...field }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              id: "recurring",
              checked: form.watch("recurring"),
              onChange: (e) => form.setValue("recurring", e.target.checked),
              className: "h-4 w-4 rounded border-border"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "recurring", className: "text-sm text-muted-foreground", children: "Conta recorrente (mensal)" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end pt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "submit", disabled: mutation.isPending, children: mutation.isPending ? "Salvando..." : "Criar Conta" }) })
      ] }) })
    ] })
  ] });
}
function BillsPage() {
  const queryClient = useQueryClient();
  const {
    data: bills = [],
    isLoading: loading
  } = useQuery({
    queryKey: ["bills"],
    queryFn: () => getBills().catch(() => [])
  });
  const payMutation = useMutation({
    mutationFn: (id) => markBillPaid(id),
    onSuccess: () => {
      toast.success("Conta marcada como paga!");
      queryClient.invalidateQueries({
        queryKey: ["bills"]
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard"]
      });
    },
    onError: () => {
      toast.error("Erro ao marcar como paga.");
    }
  });
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-8 text-center text-muted-foreground", children: "Carregando contas a pagar..." });
  }
  const sorted = [...bills].sort((a2, b) => new Date(a2.dueDate).getTime() - new Date(b.dueDate).getTime());
  const totalPending = sorted.filter((b) => b.status !== "PAID" && b.status !== "paid").reduce((s, b) => s + (b.amountInCents || b.amount || 0), 0);
  const totalOverdue = sorted.filter((b) => b.status === "OVERDUE" || b.status === "overdue").reduce((s, b) => s + (b.amountInCents || b.amount || 0), 0);
  const now = /* @__PURE__ */ new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const cells = [...Array.from({
    length: firstDay
  }, () => null), ...Array.from({
    length: daysInMonth
  }, (_, i) => i + 1)];
  const billsByDay = /* @__PURE__ */ new Map();
  for (const b of sorted) {
    const dDate = new Date(b.dueDate);
    if (dDate.getMonth() === month && dDate.getFullYear() === year) {
      const d = dDate.getDate();
      if (!billsByDay.has(d)) billsByDay.set(d, []);
      billsByDay.get(d).push(b);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "Contas a pagar", description: "Tudo o que vence neste mês — sem surpresas.", actions: /* @__PURE__ */ jsxRuntimeExports.jsx(BillModal, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Total pendente" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-2xl font-semibold tabular-nums", children: formatBRL(totalPending) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Em atraso" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-2xl font-semibold tabular-nums text-destructive", children: formatBRL(totalOverdue) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Próximo vencimento" }),
        (() => {
          const nextBill = sorted.find((b) => b.status === "PENDING" || b.status === "pending");
          return nextBill ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-2xl font-semibold tabular-nums", children: formatBRL(nextBill.amountInCents || nextBill.amount || 0) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] text-muted-foreground", children: nextBill.name || nextBill.description })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-2xl font-semibold tabular-nums", children: "—" });
        })()
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "lg:col-span-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { title: "Lista de vencimentos" }),
        sorted.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "-mx-2 divide-y divide-border/60", children: sorted.map((b) => {
          const cat = b.category;
          const isPaid = b.status === "PAID" || b.status === "paid";
          const isOverdue = b.status === "OVERDUE" || b.status === "overdue";
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-3 px-2 py-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isOverdue ? "bg-destructive/10 text-destructive" : isPaid ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`, children: isPaid ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-5 w-5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarClock, { className: "h-5 w-5" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-sm font-medium", children: b.name || b.description }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { status: b.status }),
                b.recurring && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: "• Recorrente" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-muted-foreground", children: [
                cat?.name,
                " • ",
                formatDateLong(new Date(b.dueDate))
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold tabular-nums", children: formatBRL(b.amountInCents || b.amount || 0) }),
            !isPaid && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", className: "ml-2", disabled: payMutation.isPending, onClick: () => payMutation.mutate(b.id), children: payMutation.isPending ? "..." : "Pagar" })
          ] }, b.id);
        }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-8 text-center text-sm text-muted-foreground", children: "Nenhuma conta encontrada" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { title: "Calendário", description: now.toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric"
        }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground", children: ["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-1", children: d }, i)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 grid grid-cols-7 gap-1", children: cells.map((day, i) => {
          const dayBills = day ? billsByDay.get(day) ?? [] : [];
          const isToday = day === now.getDate();
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `relative flex aspect-square flex-col items-center justify-start rounded-md border text-xs transition-colors ${!day ? "border-transparent" : isToday ? "border-primary bg-primary/10 text-primary" : dayBills.length ? "border-border bg-accent/40" : "border-border/40"}`, title: dayBills.map((b) => b.name || b.description).join(", "), children: [
            day && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-1 font-medium", children: day }),
            dayBills.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute bottom-1 h-1 w-1 rounded-full bg-warning" })
          ] }, i);
        }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-[11px] text-muted-foreground", children: "Pontos amarelos indicam vencimentos no dia." })
      ] })
    ] })
  ] });
}
export {
  BillsPage as component
};
