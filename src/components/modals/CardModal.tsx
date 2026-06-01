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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCard } from "@/services/cards.service";
import { toast } from "sonner";

const cardSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  brand: z.string().min(1, "Selecione a bandeira"),
  cardType: z.string().min(1, "Selecione o tipo"),
  last4: z.string().length(4, "Informe os 4 últimos dígitos"),
  limit: z.coerce.number().min(0, "Limite nao pode ser negativo"),
  color: z.string().default("#6366f1"),
});

type CardFormValues = z.infer<typeof cardSchema>;

export function CardModal() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<CardFormValues>({
    resolver: zodResolver(cardSchema) as any,
    defaultValues: {
      name: "",
      brand: "VISA",
      cardType: "CREDIT",
      last4: "",
      limit: 0,
      color: "#6366f1",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CardFormValues) => {
      return createCard({
        name: values.name,
        brand: values.brand,
        cardType: values.cardType,
        last4: values.last4,
        limitInCents: Math.round(Math.max(0, values.limit || 0) * 100),
        color: values.color,
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
    },
  });

  const selectedCardType = form.watch("cardType");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Novo cartão
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Cartão</DialogTitle>
          <DialogDescription>
            Adicione um cartão para acompanhar gastos e faturas.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do cartão</FormLabel>
                  <FormControl><Input placeholder="Ex: Nubank Platinum" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Card Type: Credit / Debit */}
            <FormField
              control={form.control}
              name="cardType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo do cartão</FormLabel>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={field.value === "CREDIT" ? "default" : "outline"}
                      className={`flex-1 gap-2 transition-all ${
                        field.value === "CREDIT"
                          ? "ring-2 ring-primary/40 shadow-md"
                          : "opacity-70"
                      }`}
                      onClick={() => field.onChange("CREDIT")}
                    >
                      💳 Crédito
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "DEBIT" ? "default" : "outline"}
                      className={`flex-1 gap-2 transition-all ${
                        field.value === "DEBIT"
                          ? "ring-2 ring-blue-400/40 shadow-md"
                          : "opacity-70"
                      }`}
                      onClick={() => field.onChange("DEBIT")}
                    >
                      💳🔵 Débito
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {field.value === "CREDIT"
                      ? "Cartão de crédito permite parcelamentos via Telegram."
                      : "Cartão de débito registra pagamentos à vista automaticamente."}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bandeira</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="VISA">Visa</SelectItem>
                        <SelectItem value="MASTERCARD">Mastercard</SelectItem>
                        <SelectItem value="ELO">Elo</SelectItem>
                        <SelectItem value="AMEX">Amex</SelectItem>
                        <SelectItem value="HIPERCARD">Hipercard</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last4"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Últimos 4 dígitos</FormLabel>
                    <FormControl><Input placeholder="1234" maxLength={4} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limite (R$) opcional</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" placeholder="0,00" {...field} /></FormControl>
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
                {mutation.isPending ? "Salvando..." : "Criar Cartão"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
