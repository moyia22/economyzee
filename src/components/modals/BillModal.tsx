import { useState } from "react";
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
import { Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBill } from "@/services/bills.service";
import { toast } from "sonner";

const billSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que 0"),
  dueDate: z.string().min(1, "Selecione a data de vencimento"),
  category: z.string().optional(),
  recurring: z.boolean().default(false),
});

type BillFormValues = z.infer<typeof billSchema>;

export function BillModal() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billSchema) as any,
    defaultValues: {
      name: "",
      amount: 0,
      dueDate: "",
      category: "",
      recurring: false,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: BillFormValues) => {
      return createBill({
        name: values.name,
        amountInCents: Math.round(values.amount * 100),
        dueDate: values.dueDate,
        category: values.category || undefined,
        recurring: values.recurring,
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
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Nova conta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Conta a Pagar</DialogTitle>
          <DialogDescription>Registre um novo vencimento para acompanhar.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl><Input placeholder="Ex: Aluguel, Netflix..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="0,00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vencimento</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria (Opcional)</FormLabel>
                  <FormControl><Input placeholder="Ex: Moradia, Streaming..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recurring"
                checked={form.watch("recurring")}
                onChange={(e) => form.setValue("recurring", e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <label htmlFor="recurring" className="text-sm text-muted-foreground">Conta recorrente (mensal)</label>
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : "Criar Conta"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
