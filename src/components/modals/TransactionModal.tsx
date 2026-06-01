import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTransaction, updateTransaction } from "@/services/transactions.service";
import { getCards } from "@/services/cards.service";
import { toast } from "sonner";

const NONE_VALUE = "__none";

const transactionSchema = z.object({
  type: z.enum(["EXPENSE", "INCOME"]),
  description: z.string().min(2, "Descricao muito curta"),
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que 0"),
  categoryId: z.string().min(1, "Selecione uma categoria"),
  paymentMethod: z.enum([
    "ACCOUNT",
    "PIX",
    "CASH",
    "CREDIT_CARD",
    "DEBIT_CARD",
    "BANK_TRANSFER",
    "BOLETO",
    "OTHER",
  ]),
  accountId: z.string().optional(),
  cardId: z.string().optional(),
  date: z.string(),
}).superRefine((values, ctx) => {
  if (["CREDIT_CARD", "DEBIT_CARD"].includes(values.paymentMethod) && !values.cardId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cardId"],
      message: "Selecione o cartao correto.",
    });
  }
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

type TransactionModalProps = {
  categories: any[];
  accounts: any[];
  transaction?: any;
  trigger?: React.ReactNode;
};

const paymentLabels: Record<TransactionFormValues["paymentMethod"], string> = {
  ACCOUNT: "Conta",
  PIX: "PIX",
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartao de credito",
  DEBIT_CARD: "Cartao de debito",
  BANK_TRANSFER: "Transferencia",
  BOLETO: "Boleto",
  OTHER: "Outro",
};

function normalizePaymentMethod(value?: string | null): TransactionFormValues["paymentMethod"] {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");

  const aliases: Record<string, TransactionFormValues["paymentMethod"]> = {
    ACCOUNT: "ACCOUNT",
    CONTA: "ACCOUNT",
    PIX: "PIX",
    CASH: "CASH",
    DINHEIRO: "CASH",
    CREDIT: "CREDIT_CARD",
    CREDITO: "CREDIT_CARD",
    CREDIT_CARD: "CREDIT_CARD",
    CARTAO_CREDITO: "CREDIT_CARD",
    CARTAO_DE_CREDITO: "CREDIT_CARD",
    DEBIT: "DEBIT_CARD",
    DEBITO: "DEBIT_CARD",
    DEBIT_CARD: "DEBIT_CARD",
    CARTAO_DEBITO: "DEBIT_CARD",
    CARTAO_DE_DEBITO: "DEBIT_CARD",
    BANK_TRANSFER: "BANK_TRANSFER",
    TRANSFERENCIA: "BANK_TRANSFER",
    TRANSFERENCIA_BANCARIA: "BANK_TRANSFER",
    TED: "BANK_TRANSFER",
    DOC: "BANK_TRANSFER",
    BOLETO: "BOLETO",
    OTHER: "OTHER",
    OUTRO: "OTHER",
  };

  return aliases[normalized] || "ACCOUNT";
}

function detectPaymentMethod(description: string): TransactionFormValues["paymentMethod"] | null {
  const text = description
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/\bpix\b/.test(text)) return "PIX";
  if (/dinheiro|especie/.test(text)) return "CASH";
  if (/boleto/.test(text)) return "BOLETO";
  if (/transferencia|ted|doc/.test(text)) return "BANK_TRANSFER";
  if (/credito|cartao de credito/.test(text)) return "CREDIT_CARD";
  if (/debito|cartao de debito/.test(text)) return "DEBIT_CARD";
  return null;
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildDefaultValues(transaction?: any): TransactionFormValues {
  const type = transaction?.type === "INCOME" || transaction?.type === "income" ? "INCOME" : "EXPENSE";
  const cardPayment = transaction?.cardId
    ? transaction?.card?.cardType === "DEBIT"
      ? "DEBIT_CARD"
      : "CREDIT_CARD"
    : undefined;

  return {
    type,
    description: transaction?.description || "",
    amount: (transaction?.amountInCents || transaction?.amount || 0) / 100,
    categoryId: transaction?.categoryId || "",
    paymentMethod: cardPayment || normalizePaymentMethod(transaction?.paymentMethod),
    accountId: transaction?.accountId || undefined,
    cardId: transaction?.cardId || undefined,
    date: transaction?.date
      ? new Date(transaction.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  };
}

export function TransactionModal({ categories, accounts, transaction, trigger }: TransactionModalProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: cards = [] } = useQuery({
    queryKey: ["cards"],
    queryFn: () => getCards().catch(() => []),
    enabled: open,
  });

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: buildDefaultValues(transaction),
  });

  const type = form.watch("type");
  const paymentMethod = form.watch("paymentMethod");
  const description = form.watch("description");
  const isCardPayment = paymentMethod === "CREDIT_CARD" || paymentMethod === "DEBIT_CARD";
  const expectedCardType = paymentMethod === "DEBIT_CARD" ? "DEBIT" : "CREDIT";

  const availablePaymentMethods = useMemo(() => {
    const base: TransactionFormValues["paymentMethod"][] = [
      "ACCOUNT",
      "PIX",
      "CASH",
      "BANK_TRANSFER",
      "BOLETO",
      "OTHER",
    ];

    if (type === "EXPENSE") {
      return ["ACCOUNT", "PIX", "CASH", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "BOLETO", "OTHER"] as TransactionFormValues["paymentMethod"][];
    }

    return base;
  }, [type]);

  const filteredCards = useMemo(
    () => cards.filter((card: any) => card.cardType === expectedCardType),
    [cards, expectedCardType],
  );

  useEffect(() => {
    if (!open || transaction) return;
    const detected = detectPaymentMethod(description || "");
    if (detected && availablePaymentMethods.includes(detected) && form.getValues("paymentMethod") === "ACCOUNT") {
      form.setValue("paymentMethod", detected, { shouldValidate: true });
    }
  }, [availablePaymentMethods, description, form, open, transaction]);

  useEffect(() => {
    if (!open || transaction || type !== "EXPENSE" || cards.length === 0 || !description) return;

    const detected = detectPaymentMethod(description);
    if (detected && detected !== "CREDIT_CARD" && detected !== "DEBIT_CARD") return;

    const text = normalizeSearchText(description);
    const matchedCard = cards.find((card: any) => {
      const name = normalizeSearchText(card.name || "");
      return (name.length > 2 && text.includes(name)) || (card.last4 && text.includes(String(card.last4)));
    });

    if (!matchedCard) return;

    const method = matchedCard.cardType === "DEBIT" ? "DEBIT_CARD" : "CREDIT_CARD";
    form.setValue("paymentMethod", method, { shouldValidate: true });
    form.setValue("cardId", matchedCard.id, { shouldValidate: true });
  }, [cards, description, form, open, transaction, type]);

  useEffect(() => {
    if (type === "INCOME" && isCardPayment) {
      form.setValue("paymentMethod", "ACCOUNT", { shouldValidate: true });
      form.setValue("cardId", undefined);
    }
  }, [form, isCardPayment, type]);

  useEffect(() => {
    if (!isCardPayment) {
      form.setValue("cardId", undefined);
      return;
    }

    const selectedCardId = form.getValues("cardId");
    const selectedStillValid = filteredCards.some((card: any) => card.id === selectedCardId);
    if (!selectedStillValid) {
      form.setValue("cardId", filteredCards[0]?.id, { shouldValidate: true });
    }
  }, [filteredCards, form, isCardPayment]);

  const mutation = useMutation({
    mutationFn: (values: TransactionFormValues) => {
      const finalPaymentMethod =
        values.paymentMethod === "ACCOUNT"
          ? detectPaymentMethod(values.description) || values.paymentMethod
          : values.paymentMethod;
      const usesCard = finalPaymentMethod === "CREDIT_CARD" || finalPaymentMethod === "DEBIT_CARD";

      const payload = {
        type: values.type,
        description: values.description,
        amountInCents: Math.round(values.amount * 100),
        categoryId: values.categoryId,
        paymentMethod: finalPaymentMethod,
        accountId: usesCard ? null : values.accountId || null,
        cardId: usesCard ? values.cardId : null,
        date: values.date,
      };

      if (transaction?.id) {
        return updateTransaction(transaction.id, payload);
      }
      return createTransaction(payload);
    },
    onSuccess: () => {
      toast.success(transaction ? "Transacao atualizada!" : "Transacao salva com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      setOpen(false);
      form.reset(buildDefaultValues(transaction));
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao salvar transacao.");
    },
  });

  const onSubmit = (values: TransactionFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) form.reset(buildDefaultValues(transaction));
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Nova
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{transaction ? "Editar transacao" : "Nova transacao"}</DialogTitle>
          <DialogDescription>
            {transaction ? "Altere os dados do lancamento." : "Adicione uma despesa ou receita manualmente."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EXPENSE">Despesa</SelectItem>
                        <SelectItem value="INCOME">Receita</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0.01" placeholder="0,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descricao</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Mercado no pix, Uber no credito..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de pagamento</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue("cardId", undefined);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Como foi pago?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availablePaymentMethods.map((method) => (
                        <SelectItem key={method} value={method}>
                          {paymentLabels[method]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isCardPayment ? (
              <FormField
                control={form.control}
                name="cardId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{paymentMethod === "CREDIT_CARD" ? "Cartao de credito" : "Cartao de debito"}</FormLabel>
                    <Select
                      value={field.value || NONE_VALUE}
                      onValueChange={(value) => field.onChange(value === NONE_VALUE ? undefined : value)}
                      disabled={filteredCards.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={filteredCards.length ? "Selecione o cartao" : "Nenhum cartao deste tipo"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE} disabled>Selecione o cartao</SelectItem>
                        {filteredCards.map((card: any) => (
                          <SelectItem key={card.id} value={card.id}>
                            {card.name} {card.last4 ? `- ${card.last4}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conta</FormLabel>
                    <Select
                      value={field.value || NONE_VALUE}
                      onValueChange={(value) => field.onChange(value === NONE_VALUE ? undefined : value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Conta opcional" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>Sem conta</SelectItem>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : transaction ? "Salvar alteracoes" : "Salvar transacao"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
