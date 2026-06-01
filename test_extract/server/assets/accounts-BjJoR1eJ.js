import { r as reactExports, V as jsxRuntimeExports } from "./worker-entry-CMu_oXBf.js";
import { c as createLucideIcon, x as api, u as useQueryClient, a6 as useForm, a7 as a, d as useMutation, t as toast, D as Dialog, a8 as DialogTrigger, B as Button, z as Plus, h as DialogContent, i as DialogHeader, j as DialogTitle, C as DialogDescription, a9 as Form, aa as FormField, ab as FormItem, ac as FormLabel, ad as FormControl, I as Input, ae as FormMessage, o as Select, p as SelectTrigger, q as SelectValue, s as SelectContent, v as SelectItem, af as objectType, ah as stringType, ag as coerce, ak as enumType, b as useQuery, P as PageHeader, T as Trash2, a3 as Wallet, y as getTransactions } from "./router-BxZ3CosB.js";
import { a as CardTitle, C as Card } from "./Card-DtSwldk7.js";
import { a as formatBRL, f as formatDate } from "./format-CzmsyK3W.js";
import { c as createAccount, d as deleteAccount, g as getAccounts } from "./accounts.service-BQofFA9N.js";
import { C as CreditCard } from "./credit-card-D6ssxOlZ.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const __iconNode = [
  ["path", { d: "M13 16H8", key: "wsln4y" }],
  ["path", { d: "M14 8H8", key: "1l3xfs" }],
  ["path", { d: "M16 12H8", key: "1fr5h0" }],
  [
    "path",
    {
      d: "M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z",
      key: "ycz6yz"
    }
  ]
];
const ReceiptText = createLucideIcon("receipt-text", __iconNode);
async function getCards() {
  return api.get("/cards");
}
async function createCard(data) {
  return api.post("/cards", data);
}
async function deleteCard(id) {
  return api.delete(`/cards/${id}`);
}
const accountSchema = objectType({
  name: stringType().min(2, "Nome muito curto"),
  bank: stringType().min(1, "Informe o banco"),
  type: enumType(["CHECKING", "SAVINGS", "INVESTMENT"]),
  balance: coerce.number().default(0),
  color: stringType().default("#6366f1")
});
function AccountModal() {
  const [open, setOpen] = reactExports.useState(false);
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: a(accountSchema),
    defaultValues: {
      name: "",
      bank: "",
      type: "CHECKING",
      balance: 0,
      color: "#6366f1"
    }
  });
  const mutation = useMutation({
    mutationFn: (values) => {
      return createAccount({
        name: values.name,
        bank: values.bank,
        type: values.type,
        balanceInCents: Math.round(values.balance * 100),
        color: values.color
      });
    },
    onSuccess: () => {
      toast.success("Conta criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast.error("Erro ao criar conta.");
    }
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", className: "gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
      " Nova conta"
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-[425px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Nova Conta Bancária" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Adicione uma conta para acompanhar seu saldo." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Form, { ...form, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: form.handleSubmit((v) => mutation.mutate(v)), className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormField,
          {
            control: form.control,
            name: "name",
            render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { children: "Nome da conta" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { placeholder: "Ex: Conta Principal, Poupança...", ...field }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            FormField,
            {
              control: form.control,
              name: "bank",
              render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { children: "Banco" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { placeholder: "Ex: Nubank, Itaú...", ...field }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
              ] })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            FormField,
            {
              control: form.control,
              name: "type",
              render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { children: "Tipo" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { onValueChange: field.onChange, defaultValue: field.value, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "CHECKING", children: "Corrente" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "SAVINGS", children: "Poupança" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "INVESTMENT", children: "Investimento" })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
              ] })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            FormField,
            {
              control: form.control,
              name: "balance",
              render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { children: "Saldo inicial (R$)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", step: "0.01", placeholder: "0,00", ...field }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
              ] })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            FormField,
            {
              control: form.control,
              name: "color",
              render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { children: "Cor" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "color", ...field, className: "h-9 w-full cursor-pointer" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
              ] })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end pt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "submit", disabled: mutation.isPending, children: mutation.isPending ? "Salvando..." : "Criar Conta" }) })
      ] }) })
    ] })
  ] });
}
const cardSchema = objectType({
  name: stringType().min(2, "Nome muito curto"),
  brand: stringType().min(1, "Selecione a bandeira"),
  cardType: stringType().min(1, "Selecione o tipo"),
  last4: stringType().length(4, "Informe os 4 últimos dígitos"),
  limit: coerce.number().min(0.01, "Limite deve ser maior que 0"),
  color: stringType().default("#6366f1")
});
function CardModal() {
  const [open, setOpen] = reactExports.useState(false);
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: a(cardSchema),
    defaultValues: {
      name: "",
      brand: "VISA",
      cardType: "CREDIT",
      last4: "",
      limit: 0,
      color: "#6366f1"
    }
  });
  const mutation = useMutation({
    mutationFn: (values) => {
      return createCard({
        name: values.name,
        brand: values.brand,
        cardType: values.cardType,
        last4: values.last4,
        limitInCents: Math.round(values.limit * 100),
        color: values.color
      });
    },
    onSuccess: () => {
      toast.success("Cartão criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast.error("Erro ao criar cartão.");
    }
  });
  form.watch("cardType");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", className: "gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
      " Novo cartão"
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "sm:max-w-[425px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Novo Cartão" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Adicione um cartão para acompanhar gastos e faturas." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Form, { ...form, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: form.handleSubmit((v) => mutation.mutate(v)), className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormField,
          {
            control: form.control,
            name: "name",
            render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { children: "Nome do cartão" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { placeholder: "Ex: Nubank Platinum", ...field }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FormField,
          {
            control: form.control,
            name: "cardType",
            render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { children: "Tipo do cartão" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    type: "button",
                    variant: field.value === "CREDIT" ? "default" : "outline",
                    className: `flex-1 gap-2 transition-all ${field.value === "CREDIT" ? "ring-2 ring-primary/40 shadow-md" : "opacity-70"}`,
                    onClick: () => field.onChange("CREDIT"),
                    children: "💳 Crédito"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    type: "button",
                    variant: field.value === "DEBIT" ? "default" : "outline",
                    className: `flex-1 gap-2 transition-all ${field.value === "DEBIT" ? "ring-2 ring-blue-400/40 shadow-md" : "opacity-70"}`,
                    onClick: () => field.onChange("DEBIT"),
                    children: "💳🔵 Débito"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground mt-1", children: field.value === "CREDIT" ? "Cartão de crédito permite parcelamentos via Telegram." : "Cartão de débito registra pagamentos à vista automaticamente." }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            FormField,
            {
              control: form.control,
              name: "brand",
              render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { children: "Bandeira" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { onValueChange: field.onChange, defaultValue: field.value, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "VISA", children: "Visa" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "MASTERCARD", children: "Mastercard" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "ELO", children: "Elo" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "AMEX", children: "Amex" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "HIPERCARD", children: "Hipercard" })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
              ] })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            FormField,
            {
              control: form.control,
              name: "last4",
              render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { children: "Últimos 4 dígitos" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { placeholder: "1234", maxLength: 4, ...field }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
              ] })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            FormField,
            {
              control: form.control,
              name: "limit",
              render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { children: "Limite (R$)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "number", step: "0.01", placeholder: "0,00", ...field }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
              ] })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            FormField,
            {
              control: form.control,
              name: "color",
              render: ({ field }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(FormItem, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormLabel, { children: "Cor" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "color", ...field, className: "h-9 w-full cursor-pointer" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(FormMessage, {})
              ] })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end pt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "submit", disabled: mutation.isPending, children: mutation.isPending ? "Salvando..." : "Criar Cartão" }) })
      ] }) })
    ] })
  ] });
}
function AccountsPage() {
  const queryClient = useQueryClient();
  const [expandedCard, setExpandedCard] = reactExports.useState(null);
  const {
    data: accounts = [],
    isLoading: loadingAccounts
  } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => getAccounts().catch(() => [])
  });
  const {
    data: cards = [],
    isLoading: loadingCards
  } = useQuery({
    queryKey: ["cards"],
    queryFn: () => getCards().catch(() => [])
  });
  const {
    data: txData
  } = useQuery({
    queryKey: ["transactions", {
      forAccounts: true
    }],
    queryFn: () => getTransactions({}).catch(() => ({
      data: []
    }))
  });
  const transactions = txData?.data || [];
  const loading = loadingAccounts || loadingCards;
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-8 text-center text-muted-foreground", children: "Carregando contas..." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "Contas & Cartões", description: "Saldos, limites e faturas em um só lugar.", actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AccountModal, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardModal, {})
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { title: "Contas bancárias", description: `${accounts.length} contas conectadas` }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4", children: accounts.length > 0 ? accounts.map((a2) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white", style: {
            background: a2.color || "var(--primary)"
          }, children: (a2.bank || a2.name || "?")[0] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold", children: a2.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: a2.bank || "Banco" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground", children: a2.type === "CHECKING" || a2.type === "checking" ? "Corrente" : a2.type === "SAVINGS" || a2.type === "savings" ? "Poupança" : "Invest." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] uppercase tracking-wider text-muted-foreground", children: "Saldo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xl font-semibold tabular-nums", children: formatBRL(a2.balanceInCents || a2.balance || 0) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "ghost", size: "sm", className: "h-7 gap-1 text-muted-foreground hover:text-destructive", onClick: () => {
        if (confirm("Deseja remover esta conta?")) {
          deleteAccount(a2.id).then(() => {
            toast.success("Conta removida!");
            queryClient.invalidateQueries({
              queryKey: ["accounts"]
            });
            queryClient.invalidateQueries({
              queryKey: ["dashboard"]
            });
          }).catch(() => toast.error("Erro ao remover."));
        }
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" }),
        " Remover"
      ] }) })
    ] }, a2.id)) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-full py-8 text-center text-sm text-muted-foreground", children: "Nenhuma conta cadastrada" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { title: "Cartões de crédito" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-4 lg:grid-cols-2", children: cards.length > 0 ? cards.map((c) => {
      const limit = c.limitInCents || c.limit || 1;
      const used = c.usedInCents || c.used || 0;
      const pct = Math.min(used / limit * 100, 100);
      const isExpanded = expandedCard === c.id;
      const cardTxs = transactions.filter((tx) => tx.cardId === c.id);
      cardTxs.filter((tx) => tx.installments && tx.installments > 1);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "overflow-hidden p-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative h-44 p-5 text-white", style: {
          background: c.color || "var(--primary)"
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CreditCard, { className: "h-6 w-6 opacity-80" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${c.cardType === "DEBIT" ? "bg-blue-500/30 text-blue-100" : "bg-white/20 text-white/90"}`, children: c.cardType === "DEBIT" ? "Débito" : "Crédito" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium tracking-wider opacity-90", children: c.brand || "Cartão" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute bottom-5 left-5 right-5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-mono text-base tracking-[0.25em] opacity-90", children: [
              "•••• ",
              c.last4 || "****"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm font-semibold", children: c.name })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 p-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-1.5 flex items-center justify-between text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Limite usado" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-medium tabular-nums", children: [
                formatBRL(used),
                " ",
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
                  "/ ",
                  formatBRL(limit)
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-2 w-full overflow-hidden rounded-full bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `h-full rounded-full transition-all duration-500 ${pct > 80 ? "bg-destructive" : pct > 60 ? "bg-warning" : "bg-primary"}`, style: {
              width: `${pct}%`
            } }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-[11px] text-muted-foreground", children: [
              pct.toFixed(0),
              "% do limite"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/50 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between sm:gap-6", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] uppercase tracking-wider text-muted-foreground", children: "Fatura atual" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 font-semibold tabular-nums", children: formatBRL(used) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right sm:text-left", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] uppercase tracking-wider text-muted-foreground", children: "Vencimento" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-sm font-medium", children: c.invoiceDue ? formatDate(new Date(c.invoiceDue)) : "--" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1 justify-end mt-1 sm:mt-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", onClick: () => setExpandedCard(isExpanded ? null : c.id), className: "text-xs", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ReceiptText, { className: "mr-1 h-3.5 w-3.5" }),
                isExpanded ? "Ocultar" : "Ver gastos"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", onClick: () => {
                if (confirm("Deseja remover este cartão?")) {
                  deleteCard(c.id).then(() => {
                    toast.success("Cartão removido!");
                    queryClient.invalidateQueries({
                      queryKey: ["cards"]
                    });
                  }).catch(() => toast.error("Erro ao remover."));
                }
              }, className: "text-destructive hover:text-destructive", children: "Remover" })
            ] })
          ] }),
          isExpanded && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 border-t border-border/40 pt-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wider", children: "Lançamentos deste cartão" }),
            cardTxs.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "divide-y divide-border/40", children: cardTxs.slice(0, 20).map((tx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-3 py-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Wallet, { className: "h-3.5 w-3.5" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-sm font-medium", children: tx.description }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: formatDate(new Date(tx.date)) }),
                  tx.installments > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary", children: [
                    tx.currentInstallment || "?",
                    "/",
                    tx.installments,
                    "x"
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm font-semibold tabular-nums text-destructive", children: [
                "-",
                formatBRL(tx.amountInCents || tx.amount || 0)
              ] })
            ] }, tx.id)) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "py-4 text-center text-sm text-muted-foreground", children: "Nenhum lançamento neste cartão" })
          ] })
        ] })
      ] }, c.id);
    }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-full py-8 text-center text-sm text-muted-foreground", children: "Nenhum cartão cadastrado" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "mt-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { title: "Últimos lançamentos" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "-mx-2 divide-y divide-border/60", children: [
        transactions.slice(0, 6).map((tx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-3 px-2 py-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Wallet, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-sm font-medium", children: tx.description }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: formatDate(new Date(tx.date)) }),
              tx.installments > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary", children: [
                tx.currentInstallment || "?",
                "/",
                tx.installments,
                "x"
              ] }),
              tx.card && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground", children: [
                "💳 ",
                tx.card.name
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold tabular-nums", children: formatBRL(tx.amountInCents || tx.amount || 0) })
        ] }, tx.id)),
        transactions.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "px-2 py-8 text-center text-sm text-muted-foreground", children: "Nenhum lançamento recente" })
      ] })
    ] })
  ] });
}
export {
  AccountsPage as component
};
