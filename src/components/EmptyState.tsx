import { Bot, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "./Card";

export function EmptyState({
  title = "Nada por aqui ainda",
  description = "Envie sua primeira transação para o @EconomyZee_Bot no Telegram e ela aparecerá aqui automaticamente.",
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center justify-center py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-info/10 text-info">
        <Bot className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ?? (
        <Button className="mt-5 gap-2" variant="outline">
          <Bot className="h-4 w-4" /> Conectar Telegram
        </Button>
      )}
    </Card>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <RefreshCw className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold">Algo deu errado</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        Não conseguimos carregar suas informações. Verifique sua conexão e tente
        novamente.
      </p>
      <div className="mt-5 flex gap-2">
        <Button onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Tentar novamente
        </Button>
        <Button variant="outline">Voltar</Button>
      </div>
    </Card>
  );
}
