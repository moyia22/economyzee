import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { validateInviteToken, acceptInvite } from "@/services/workspace.service";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/Card";
import { Users, CheckCircle2, XCircle, Loader2, Shield, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [
      { title: "Convite — EconomyZee" },
      { name: "description", content: "Aceite o convite para entrar em um workspace." },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = useParams({ from: "/invite/$token" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session, isLoading: authLoading } = useAuth();

  const [inviteData, setInviteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [acceptedOrgName, setAcceptedOrgName] = useState<string>("");
  const [wasAlreadyMember, setWasAlreadyMember] = useState(false);

  // If not authenticated, redirect to login with return URL
  useEffect(() => {
    if (!authLoading && !session) {
      navigate({
        to: "/login",
        search: { redirect: `/invite/${token}` },
        replace: true,
      });
    }
  }, [authLoading, session, token, navigate]);

  // Validate the token
  useEffect(() => {
    if (!session) return;

    setLoading(true);
    setError(null);
    validateInviteToken(token)
      .then((data) => {
        if (data.valid) {
          setInviteData(data);
        } else {
          setError(data.reason || "Link inválido");
        }
      })
      .catch((err) => {
        setError(err.message || "Erro ao validar link");
      })
      .finally(() => setLoading(false));
  }, [token, session]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const result = await acceptInvite(token);
      setAcceptedOrgName(result.orgName);
      setWasAlreadyMember(result.alreadyMember);
      setAccepted(true);
      localStorage.setItem("economyzee_org_id", result.orgId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workspaces"] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-members"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      ]);

      if (result.alreadyMember) {
        toast.info(`Voce ja faz parte de "${result.orgName}".`);
      } else {
        toast.success(`Convite aceito! Voce entrou no workspace ${result.orgName}.`);
      }

      setTimeout(() => {
        navigate({ to: "/", replace: true });
      }, 1400);
    } catch (err: any) {
      const message = err.message || "Erro ao aceitar convite";
      if (/verifique seu email/i.test(message)) {
        toast.error("Verifique seu email antes de aceitar o convite.");
        navigate({
          to: "/verify-email",
          search: {
            email: session.user?.email || undefined,
            redirect: `/invite/${token}`,
          },
          replace: true,
        });
        return;
      }

      toast.error(message);
      setAccepting(false);
    }
  };

  if (authLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {loading ? (
          <Card className="text-center">
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Validando convite...</p>
            </div>
          </Card>
        ) : error ? (
          <Card className="text-center">
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Convite inválido</h2>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" onClick={() => navigate({ to: "/" })}>
                Ir para o dashboard
              </Button>
            </div>
          </Card>
        ) : accepted ? (
          <Card className="text-center overflow-hidden relative">
            {/* Confetti / sparkles de fundo */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {[...Array(14)].map((_, i) => (
                <span
                  key={i}
                  className="absolute h-1.5 w-1.5 rounded-full opacity-0 animate-confetti"
                  style={{
                    left: `${(i * 7 + 5) % 95}%`,
                    top: '-10px',
                    background: ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899'][i % 5],
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              ))}
            </div>

            <div className="relative flex flex-col items-center gap-5 py-10">
              <div className="relative">
                {/* Anel pulsando atrás */}
                <span className="absolute inset-0 rounded-full bg-success/30 animate-ping-slow" />
                <div className="animate-scale-in relative flex h-20 w-20 items-center justify-center rounded-full bg-success/20 border-2 border-success/40 shadow-lg shadow-success/30">
                  <CheckCircle2 className="h-10 w-10 text-success" strokeWidth={2.5} />
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  {wasAlreadyMember ? 'Voce ja e membro!' : 'Convite aceito!'}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {wasAlreadyMember
                    ? <>Trocando para o workspace <strong className="text-foreground">"{acceptedOrgName}"</strong>...</>
                    : <>Voce entrou no workspace <strong className="text-foreground">"{acceptedOrgName}"</strong>.</>
                  }
                </p>
                <p className="mt-3 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Redirecionando para o dashboard…
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                <Users className="h-10 w-10 text-primary" />
              </div>
              
              <div className="text-center">
                <h2 className="text-xl font-bold">Convite para workspace</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Voce deseja entrar no workspace <strong className="text-foreground">{inviteData?.orgName}</strong> de <strong className="text-foreground">{inviteData?.invitedBy}</strong>?
                </p>
              </div>

              <div className="flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-card px-6 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  Cargo: <span className="font-medium text-foreground">{inviteData?.roleLabel || (inviteData?.role === "ADMIN" ? "Admin" : "Membro")}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <UserPlus className="h-3.5 w-3.5" />
                  Convidado por: <span className="font-medium text-foreground">{inviteData?.invitedBy}</span>
                </div>
                {inviteData?.invitedEmailMasked && (
                  <div className="text-xs text-muted-foreground">
                    Enviado para <span className="font-medium text-foreground">{inviteData.invitedEmailMasked}</span>
                  </div>
                )}
              </div>

              <div className="flex w-full gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate({ to: "/" })}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleAccept}
                  disabled={accepting}
                >
                  {accepting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Aceitar convite
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
