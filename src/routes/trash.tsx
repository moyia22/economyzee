import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  RefreshCcw,
  ArrowLeft,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/Card";
import { OriginBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getTrash, restoreTransaction, restoreAllTrash, deletePermanentTransaction } from "@/services/transactions.service";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";

export const Route = createFileRoute("/trash")({
  head: () => ({
    meta: [
      { title: "Lixeira — EconomyZee" },
      { name: "description", content: "Gerencie suas transações excluídas." },
    ],
  }),
  component: TrashPage,
});

function TrashPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  const { data, isLoading: loading } = useQuery({
    queryKey: ["trash"],
    queryFn: () => getTrash(),
  });

  const transactions = Array.isArray(data) ? data : (data?.data || []);

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreTransaction(id),
    onSuccess: () => {
      toast.success("Transação restaurada com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Erro ao restaurar transação."),
  });

  const restoreAllMutation = useMutation({
    mutationFn: () => restoreAllTrash(),
    onSuccess: () => {
      toast.success("Todas as transações foram restauradas.");
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Erro ao restaurar transações."),
  });

  const deletePermanentMutation = useMutation({
    mutationFn: (id: string) => deletePermanentTransaction(id),
    onSuccess: () => {
      toast.success("Transação excluída permanentemente.");
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      setDeleteModalOpen(false);
    },
    onError: () => toast.error("Erro ao excluir transação."),
  });

  const confirmDelete = (id: string) => {
    setTransactionToDelete(id);
    setDeleteModalOpen(true);
  };

  const executeDelete = () => {
    if (transactionToDelete) {
      deletePermanentMutation.mutate(transactionToDelete);
    }
  };

  return (
    <>
      <PageHeader
        title="Lixeira"
        description={`${transactions.length} itens aguardando exclusão permanente`}
        actions={
          <div className="flex items-center gap-2">
            {transactions.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 text-primary hover:bg-primary/10" 
                onClick={() => {
                  if (confirm("Deseja restaurar todas as transações da lixeira?")) {
                    restoreAllMutation.mutate();
                  }
                }}
                disabled={restoreAllMutation.isPending}
              >
                <RefreshCcw className="h-4 w-4" /> Restaurar Todas
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate({ to: '/settings' })}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
          </div>
        }
      />

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">Data da exclusão</th>
                <th className="px-4 py-2.5 text-left font-medium">Data da transação</th>
                <th className="px-4 py-2.5 text-left font-medium">Descrição</th>
                <th className="px-4 py-2.5 text-left font-medium">Categoria</th>
                <th className="px-4 py-2.5 text-right font-medium">Valor</th>
                <th className="px-4 py-2.5 text-center font-medium w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Carregando lixeira...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Sua lixeira está vazia.</td></tr>
              ) : (
                transactions.map((tx: any) => {
                  const catName = tx.category?.name || "Sem categoria";
                  return (
                    <tr key={tx.id} className="border-b border-border/40 transition-colors hover:bg-destructive/5 group">
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {tx.deletedAt ? formatDate(new Date(tx.deletedAt)) : '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(new Date(tx.date))}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-md opacity-70",
                            tx.type === "INCOME" || tx.type === "income" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                          )}>
                            {tx.type === "INCOME" || tx.type === "income" ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                          </div>
                          <span className="font-medium line-through text-muted-foreground">{tx.description}</span>
                          <OriginBadge origin={tx.origin || 'MANUAL'} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{catName}</td>
                      <td className={cn(
                        "whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums opacity-70",
                        tx.type === "INCOME" || tx.type === "income" ? "text-success" : "text-foreground"
                      )}>
                        {tx.type === "INCOME" || tx.type === "income" ? "+" : "−"}{formatBRL(tx.amountInCents || tx.amount || 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-success"
                            onClick={() => restoreMutation.mutate(tx.id)}
                            disabled={restoreMutation.isPending}
                            title="Restaurar transação"
                          >
                            <RefreshCcw className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => confirmDelete(tx.id)}
                            disabled={deletePermanentMutation.isPending}
                            title="Excluir permanentemente"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px] border-destructive/20">
          <DialogHeader>
            <DialogTitle className="text-destructive">Excluir permanentemente?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-foreground mb-2">
              Esta ação não pode ser desfeita.
            </p>
            <p className="text-sm text-muted-foreground">
              A transação será removida do banco de dados definitivamente.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={executeDelete} 
              disabled={deletePermanentMutation.isPending}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
