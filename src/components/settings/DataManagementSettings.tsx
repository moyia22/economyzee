import { useState } from "react";
import { Card, CardTitle } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Trash2, Loader2, Database } from "lucide-react";
import { resetTransactions } from "@/services/transactions.service";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

export function DataManagementSettings() {
  const [modalOpen, setModalOpen] = useState(false);
  const [resetPeriod, setResetPeriod] = useState<'day' | 'week' | 'month' | 'all'>('day');
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const labels = {
    day: "Reset do Dia",
    week: "Reset da Semana",
    month: "Reset do Mês",
    all: "Reset Total",
  };

  const descriptions = {
    day: "Isso enviará todas as transações de hoje para a lixeira.",
    week: "Isso enviará todas as transações desta semana para a lixeira.",
    month: "Isso enviará todas as transações deste mês para a lixeira.",
    all: "Atenção! Isso enviará TODAS as suas transações para a lixeira.",
  };

  const handleOpenModal = (period: 'day' | 'week' | 'month' | 'all') => {
    setResetPeriod(period);
    setConfirmText("");
    setModalOpen(true);
  };

  const handleConfirmReset = async () => {
    if (resetPeriod === 'all' && confirmText !== "CONFIRMAR") {
      toast.error("Digite CONFIRMAR para prosseguir com o Reset Total.");
      return;
    }

    setLoading(true);
    try {
      const result = await resetTransactions(resetPeriod) as { success?: boolean; count?: number; period?: string };
      const count = typeof result?.count === 'number' ? result.count : 0;

      if (count === 0) {
        toast.warning(`${labels[resetPeriod]}: nenhuma transação encontrada neste período.`);
      } else {
        const plural = count === 1 ? 'transação movida' : 'transações movidas';
        toast.success(`${labels[resetPeriod]}: ${count} ${plural} para a lixeira.`);
      }

      setModalOpen(false);

      // Invalidação ampla — qualquer view que consuma transações precisa refazer
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["analytics"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["budgets"] }),
        queryClient.invalidateQueries({ queryKey: ["bills"] }),
        queryClient.invalidateQueries({ queryKey: ["cards"] }),
        queryClient.invalidateQueries({ queryKey: ["trash"] }),
        queryClient.invalidateQueries({ queryKey: ["reports"] }),
      ]);
    } catch (error: any) {
      console.error('[Reset] Falha:', error);
      toast.error(error?.message || "Erro ao realizar reset de dados.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <CardTitle title="⚠️ Gerenciamento de Dados" description="Área de perigo: Reset de transações" />
        <Button variant="outline" size="sm" onClick={() => navigate({ to: '/trash' })} className="gap-2">
          <Trash2 className="h-4 w-4" />
          Ver Lixeira
        </Button>
      </div>

      <div className="space-y-4 border rounded-xl border-destructive/20 bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <Database className="h-5 w-5 text-destructive mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-destructive">Controle de Transações</h4>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Use as opções abaixo para mover transações em massa para a Lixeira. Os dados não serão deletados permanentemente até que você esvazie a Lixeira.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button variant="outline" className="border-border hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => handleOpenModal('day')}>
                Reset do Dia
              </Button>
              <Button variant="outline" className="border-border hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => handleOpenModal('week')}>
                Reset da Semana
              </Button>
              <Button variant="outline" className="border-border hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => handleOpenModal('month')}>
                Reset do Mês
              </Button>
              <Button variant="destructive" className="font-bold" onClick={() => handleOpenModal('all')}>
                Reset Total
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[425px] border-destructive/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Tem certeza?
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-foreground font-medium mb-2">
              Você está prestes a realizar o <span className="font-bold">{labels[resetPeriod]}</span>.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {descriptions[resetPeriod]}
            </p>

            {resetPeriod === 'all' && (
              <div className="space-y-2 mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <label className="text-xs font-bold uppercase tracking-widest text-destructive">Confirmação Obrigatória</label>
                <p className="text-xs text-muted-foreground mb-2">Digite <strong className="text-foreground">CONFIRMAR</strong> no campo abaixo para habilitar a ação.</p>
                <input
                  type="text"
                  placeholder="CONFIRMAR"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-destructive/60 focus:ring-1 focus:ring-destructive/30"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmReset} 
              disabled={loading || (resetPeriod === 'all' && confirmText !== 'CONFIRMAR')}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
