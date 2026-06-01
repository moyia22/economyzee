import { useState } from "react";
import { Link2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCardLinks, setAutoLinkDefault, setCardLink } from "@/services/cards.service";
import { toast } from "sonner";

export function LinkedCardsModal() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["card-links"],
    queryFn: () => getCardLinks().catch(() => null),
    enabled: open,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["card-links"] });
    queryClient.invalidateQueries({ queryKey: ["cards"] });
  };

  const autoMutation = useMutation({
    mutationFn: (enabled: boolean) => setAutoLinkDefault(enabled),
    onSuccess: (_res, enabled) => {
      toast.success(enabled ? "Todos os cartões pessoais vinculados!" : "Cartões pessoais desvinculados.");
      invalidate();
    },
    onError: () => toast.error("Erro ao atualizar vínculo."),
  });

  const cardMutation = useMutation({
    mutationFn: ({ cardId, linked }: { cardId: string; linked: boolean }) => setCardLink(cardId, linked),
    onSuccess: () => invalidate(),
    onError: () => toast.error("Erro ao atualizar cartão."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Link2 className="h-4 w-4" /> Cartões pessoais
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Cartões pessoais neste workspace</DialogTitle>
          <DialogDescription>
            Vincule seus cartões pessoais para usá-los aqui. Os gastos contam no mesmo limite/fatura do cartão.
            Apenas você vê e usa estes cartões neste workspace.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                disabled={autoMutation.isPending}
                onClick={() => autoMutation.mutate(true)}
              >
                Definir cartões padrão (vincular todos)
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={autoMutation.isPending}
                onClick={() => autoMutation.mutate(false)}
              >
                Desvincular todos
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {data.autoLink
                ? "Auto-vínculo ativo: novos cartões pessoais entram automaticamente neste workspace."
                : "Auto-vínculo inativo: adicione cartões individualmente abaixo."}
            </p>

            <div className="divide-y divide-border/60 rounded-lg border border-border/60">
              {data.cards.length > 0 ? data.cards.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">{c.brand} •••• {c.last4}</p>
                  </div>
                  <Switch
                    checked={c.linked}
                    disabled={cardMutation.isPending}
                    onCheckedChange={(checked) => cardMutation.mutate({ cardId: c.id, linked: checked })}
                  />
                </div>
              )) : (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Você não tem cartões pessoais cadastrados.
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
