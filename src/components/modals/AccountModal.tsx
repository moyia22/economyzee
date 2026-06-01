import { type ReactNode, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAccount, updateAccount } from "@/services/accounts.service";
import { toast } from "sonner";

const accountSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  bank: z.string().min(1, "Informe o banco"),
  type: z.enum(["CHECKING", "SAVINGS", "INVESTMENT"]),
  balance: z.coerce.number().default(0),
  color: z.string().default("#6366f1"),
});

type AccountFormValues = z.infer<typeof accountSchema>;

type AccountModalProps = {
  account?: {
    id: string;
    name?: string | null;
    bank?: string | null;
    type?: "CHECKING" | "SAVINGS" | "INVESTMENT" | string | null;
    balance?: number | null;
    balanceInCents?: number | null;
    color?: string | null;
  };
  trigger?: ReactNode;
};

function getInitialValues(account?: AccountModalProps["account"]): AccountFormValues {
  const balanceInCents = account?.balanceInCents ?? account?.balance ?? 0;

  return {
    name: account?.name || "",
    bank: account?.bank || "",
    type:
      account?.type === "SAVINGS" || account?.type === "INVESTMENT"
        ? account.type
        : "CHECKING",
    balance: Number(balanceInCents || 0) / 100,
    color: account?.color || "#6366f1",
  };
}

export function AccountModal({ account, trigger }: AccountModalProps = {}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const isEditing = !!account?.id;

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema) as any,
    defaultValues: getInitialValues(account),
  });

  useEffect(() => {
    if (open) {
      form.reset(getInitialValues(account));
    }
  }, [account, form, open]);

  const mutation = useMutation({
    mutationFn: (values: AccountFormValues) => {
      const payload = {
        name: values.name,
        bank: values.bank,
        type: values.type,
        balanceInCents: Math.round(values.balance * 100),
        color: values.color,
      };

      return isEditing ? updateAccount(account!.id, payload) : createAccount(payload);
    },
    onSuccess: () => {
      toast.success(isEditing ? "Conta atualizada com sucesso!" : "Conta criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setOpen(false);
      form.reset(getInitialValues(account));
    },
    onError: (error: any) => {
      toast.error(error.message || (isEditing ? "Erro ao atualizar conta." : "Erro ao criar conta."));
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Nova conta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar conta" : "Nova conta bancaria"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize o saldo e os dados desta conta."
              : "Adicione uma conta para acompanhar seu saldo."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da conta</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Conta Principal, Carteira Digital (PIX)..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bank"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banco</FormLabel>
                    <FormControl><Input placeholder="Ex: Nubank, PIX..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="CHECKING">Corrente</SelectItem>
                        <SelectItem value="SAVINGS">Poupanca</SelectItem>
                        <SelectItem value="INVESTMENT">Investimento</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isEditing ? "Saldo atual (R$)" : "Saldo inicial (R$)"}</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="0,00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <FormControl><Input type="color" {...field} className="h-9 w-full cursor-pointer" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending
                  ? "Salvando..."
                  : isEditing
                    ? "Salvar alteracoes"
                    : "Criar conta"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
