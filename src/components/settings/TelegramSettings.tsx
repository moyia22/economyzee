import { useState, useEffect } from "react";
import { Send, Bot, RefreshCw, Unlink, ExternalLink, ShieldCheck, Loader2, Calendar, Clock } from "lucide-react";
import { Card, CardTitle } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTelegramStatus, generateLinkToken, unlinkTelegram } from "@/services/telegram.service";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function TelegramSettings() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [tokenData, setTokenData] = useState<{ token: string; expiresAt: string; deepLink: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const {
    data: status,
    isError: isStatusError,
    isLoading: isLoadingStatus,
    isFetching: isFetchingStatus,
    error: statusError,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ["telegram-status"],
    queryFn: getTelegramStatus,
    enabled: Boolean(session?.access_token),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    refetchInterval: (query) => {
      // Poll every 3 seconds if we have a token and are not linked yet
      const isLinked = query.state.data?.linked;
      return tokenData && !isLinked ? 3000 : false;
    },
    refetchIntervalInBackground: false,
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      console.log("[Telegram] Solicitando token de vinculação...");
      return generateLinkToken();
    },
    onSuccess: (data) => {
      console.log("[Telegram] Token gerado:", data);
      setTokenData(data);
      const expires = new Date(data.expiresAt).getTime();
      const now = new Date().getTime();
      setTimeLeft(Math.max(0, Math.floor((expires - now) / 1000)));
      queryClient.invalidateQueries({ queryKey: ["telegram-status"] });
      toast.success("Código de vinculação gerado!");
    },
    onError: (error: any) => {
      console.error("[Telegram] Erro ao gerar token:", error);
      const msg = error.message || "Erro ao gerar codigo. Verifique se o backend esta rodando.";
      toast.error(msg);
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: unlinkTelegram,
    onSuccess: () => {
      console.log("[Telegram] Desvinculado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["telegram-status"] });
      setTokenData(null);
      toast.success("Telegram desconectado com sucesso.");
    },
    onError: (error: any) => {
      console.error("[Telegram] Erro ao desvincular:", error);
      toast.error("Erro ao desconectar.");
    },
  });

  useEffect(() => {
    if (!tokenData) return;

    const timer = setInterval(() => {
      const expires = new Date(tokenData.expiresAt).getTime();
      const now = new Date().getTime();
      const remaining = Math.max(0, Math.floor((expires - now) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        setTokenData(null);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [tokenData]);

  // If status changes to linked, clear token data
  useEffect(() => {
    if (status?.linked && tokenData) {
      setTokenData(null);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "telegram-feed"] });
      toast.success("Conectado com sucesso!");
    }
  }, [queryClient, status?.linked, tokenData]);

  if (isLoadingStatus) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const botUsername = status?.botUsername || "EconomyZee_Bot";
  const statusErrorMessage =
    statusError instanceof Error
      ? statusError.message
      : "Nao foi possivel carregar o status do Telegram.";

  const handleConnectTelegram = () => {
    // Just generate the token — the deep link will be shown in the UI as a clickable <a>
    if (!status?.linked && !tokenData && !linkMutation.isPending) {
      linkMutation.mutate();
    }
  };

  const handleCopyCode = () => {
    if (tokenData?.token) {
      navigator.clipboard.writeText(tokenData.token).then(() => {
        toast.success("Código copiado!");
      });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2 overflow-hidden border-none shadow-2xl bg-gradient-to-br from-card to-card/50 backdrop-blur-xl">
        <div className="relative p-6">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
          
          <CardTitle
            title="Bot do Telegram"
            description="Registre gastos e consulte seu saldo via chat com IA."
            action={
              status?.linked ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-[11px] font-medium text-success animate-in fade-in zoom-in duration-500">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                  </span>
                  Conectado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-muted bg-muted/30 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                  Pendente
                </span>
              )
            }
          />

          {isStatusError && (
            <div className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-medium">Nao foi possivel verificar o Telegram.</p>
              <p className="mt-1 text-xs opacity-90">{statusErrorMessage}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-2"
                onClick={() => refetchStatus()}
                disabled={isFetchingStatus}
              >
                {isFetchingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Tentar novamente
              </Button>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-background/40 p-4 backdrop-blur-md transition-all hover:bg-background/60 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                  <Bot className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">@{botUsername}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {status?.linked 
                      ? `${status.telegramFirstName || status.telegramUsername}` 
                      : "Aguardando vinculação..."}
                  </p>
                </div>
              </div>
              {status?.linked ? (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-center text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
                  onClick={() => {
                    if (confirm("Tem certeza que deseja desvincular seu Telegram?")) {
                      unlinkMutation.mutate();
                    }
                  }}
                  disabled={unlinkMutation.isPending}
                >
                  {unlinkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="mr-2 h-4 w-4" />}
                  Desvincular
                </Button>
              ) : !tokenData ? (
                <Button 
                  size="lg" 
                  className="w-full rounded-xl px-8 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 sm:w-auto"
                  onClick={handleConnectTelegram}
                  disabled={linkMutation.isPending}
                >
                  {linkMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Conectar Telegram
                </Button>
              ) : (
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  <a
                    href={tokenData.deepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] hover:bg-primary/90 active:scale-95"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir no Telegram
                  </a>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    Expira em {formatTime(timeLeft)}
                  </span>
                </div>
              )}
            </div>

            {status?.linked && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/20 p-3">
                  <Calendar className="h-4 w-4 text-primary/60" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Vinculado em</p>
                    <p className="text-xs font-medium">
                      {status.telegramLinkedAt ? format(new Date(status.telegramLinkedAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/20 p-3">
                  <Clock className="h-4 w-4 text-primary/60" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Último uso</p>
                    <p className="text-xs font-medium">
                      {status.telegramLastSeenAt ? format(new Date(status.telegramLastSeenAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "Sem registros"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { cmd: "/resumo", desc: "Ver o balanço do seu mês atual" },
                { cmd: "/gastos", desc: "Lista as últimas 5 despesas" },
                { cmd: "🎤 Áudio", desc: "Grave um áudio e a IA processa" },
                { cmd: "📷 Foto", desc: "Envie foto de um cupom fiscal" },
              ].map((item) => (
                <div key={item.cmd} className="flex flex-col gap-1 rounded-xl border border-border/40 bg-muted/20 p-3 transition-all hover:bg-muted/40">
                  <code className="w-fit rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                    {item.cmd}
                  </code>
                  <span className="text-xs text-muted-foreground">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-none shadow-xl bg-gradient-to-b from-primary/5 to-transparent backdrop-blur-md">
        <CardTitle title="Como Vincular" />
        
        {tokenData ? (
          <div className="flex flex-col items-center justify-center p-4 text-center animate-in slide-in-from-bottom duration-500">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <p className="text-sm font-medium">Use este código no bot</p>
            <div className="my-6 rounded-2xl bg-card border-2 border-primary/20 p-6 shadow-2xl shadow-primary/10">
              <span className="font-mono text-4xl font-black tracking-widest text-primary">
                {tokenData.token}
              </span>
            </div>
            {timeLeft > 0 ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3 animate-spin-slow" />
                Expira em <span className="font-bold text-foreground">{formatTime(timeLeft)}</span>
              </div>
            ) : (
              <div className="text-xs font-bold text-destructive">Código expirado</div>
            )}
            
            <a 
              href={tokenData.deepLink} 
              target="_blank" 
              rel="noreferrer"
              className="mt-8 w-full"
            >
              <Button className="w-full rounded-xl py-6 text-base font-bold shadow-lg shadow-primary/20">
                Abrir Telegram <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <p className="mt-4 text-[10px] text-muted-foreground">
              O dashboard atualizará automaticamente após o envio no Telegram.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ol className="space-y-4 text-sm">
              {[
                { title: "Abra o Bot", text: `Busque por @${botUsername} no Telegram` },
                { title: "Gere o Código", text: "Clique no botão azul ao lado" },
                { title: "Envie no Chat", text: "Envie apenas o código ou clique no botão acima" },
                { title: "Aproveite", text: "Suas transações agora estão sincronizadas!" },
              ].map((step, i) => (
                <li key={i} className="flex gap-4 group">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary transition-all group-hover:scale-110 group-hover:bg-primary group-hover:text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-bold text-foreground/90">{step.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            
            {!status?.linked && (
              <div className="mt-4 p-4 rounded-xl bg-info/5 border border-info/20">
                <p className="text-[10px] leading-relaxed text-info font-medium italic">
                  * Vincular seu Telegram permite registrar gastos em segundos via chat.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
