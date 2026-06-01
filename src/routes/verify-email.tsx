import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Mail, Loader2, CheckCircle2, RefreshCcw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { resendEmailCode, verifyEmailCode } from "@/services/auth-verification.service";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === 'string' ? search.email : undefined,
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const { email: emailFromSearch, redirect } = Route.useSearch();
  const redirectTarget = useMemo(() => {
    if (!redirect) return '/';
    if (!redirect.startsWith('/') || redirect.startsWith('//')) return '/';
    return redirect;
  }, [redirect]);

  const [email, setEmail] = useState(emailFromSearch || "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(emailFromSearch ? 60 : 0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const cleanEmail = email.trim().toLowerCase();
  const canSubmit = /^\S+@\S+\.\S+$/.test(cleanEmail) && /^\d{6}$/.test(code);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    try {
      const result = await verifyEmailCode(cleanEmail, code);
      toast.success(result.message || "Email verificado com sucesso.");

      navigate({
        to: "/login",
        search: {
          redirect: redirectTarget !== '/' ? redirectTarget : undefined,
        },
        replace: true,
      });
    } catch (error: any) {
      toast.error(error.message || "Erro ao verificar codigo.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail) || resending || cooldown > 0) return;

    setResending(true);
    try {
      const result = await resendEmailCode(cleanEmail);
      toast.success(result.message || "Novo codigo enviado.");
      setCooldown(60);
    } catch (error: any) {
      toast.error(error.message || "Erro ao reenviar codigo.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#0a0a0a] p-4">
      <div className="w-full max-w-[460px]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Mail className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Verifique seu email</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Enviamos um codigo para <span className="font-semibold text-white">{cleanEmail || "seu email"}</span>.
          </p>
        </div>

        <div className="rounded-3xl border border-white/5 bg-[#141416] p-8 shadow-2xl">
          <form onSubmit={handleVerify} className="space-y-5">
            {!emailFromSearch && (
              <div className="space-y-2">
                <label htmlFor="verify-email" className="ml-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Email
                </label>
                <input
                  id="verify-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="verification-code" className="ml-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Codigo de 6 digitos
              </label>
              <input
                id="verification-code"
                ref={inputRef}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-4 text-center font-mono text-3xl font-black tracking-[0.35em] text-white placeholder:text-muted-foreground/30 focus:border-primary/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <Button
              type="submit"
              disabled={!canSubmit || loading}
              className="w-full rounded-xl py-6 text-base font-bold shadow-xl shadow-primary/20"
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
              Verificar codigo
            </Button>
          </form>

          <div className="mt-5 flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={resending || cooldown > 0 || !/^\S+@\S+\.\S+$/.test(cleanEmail)}
              onClick={handleResend}
              className="w-full rounded-xl py-5"
            >
              {resending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar codigo"}
            </Button>

            <Button asChild variant="ghost" className="w-full rounded-xl">
              <Link to="/login" search={{ redirect: redirectTarget !== '/' ? redirectTarget : undefined }}>
                Ir para login <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
