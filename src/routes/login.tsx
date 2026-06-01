import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Loader2, Sparkles, ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { loginWithEmailPassword } from "@/services/auth-verification.service";
import { setToken } from "@/services/api-client";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  const safeRedirectTarget = (() => {
    if (!redirect) return '/';
    if (!redirect.startsWith('/')) return '/';
    if (redirect.startsWith('//')) return '/';
    return redirect;
  })();

  const goToVerification = (email: string) => {
    navigate({
      to: "/verify-email",
      search: {
        email,
        redirect: safeRedirectTarget !== '/' ? safeRedirectTarget : undefined,
      },
      replace: true,
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const email = (emailRef.current?.value.trim() ?? "").toLowerCase();
    const password = passwordRef.current?.value ?? "";
    if (!email || !password) return;

    setLoading(true);
    try {
      const result = await loginWithEmailPassword(email, password);
      setToken(result.accessToken);
      localStorage.setItem('economyzee_org_id', result.orgId);

      toast.success("Bem-vindo de volta!");
      window.location.href = safeRedirectTarget;
    } catch (error: any) {
      console.error("[Auth] Erro:", error);
      if (/verifique seu email/i.test(error.message || "")) {
        toast.error("Verifique seu email antes de entrar.");
        goToVerification(email);
        return;
      }
      toast.error(error.message || "Erro na autenticacao");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="relative w-full max-w-[440px] [contain:layout_style]">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center mb-8">
            <img src="/logo.png" alt="EconomyZee Logo" className="h-48 w-48 object-contain" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Economy<span className="text-primary">Zee</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-medium">
            Sua central de inteligencia financeira
          </p>
        </div>

        <div className="rounded-3xl border border-white/5 bg-[#141416] p-8 shadow-2xl overflow-hidden relative">
          <h2 className="text-xl font-bold text-white mb-6 text-center">Fazer Login</h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="login-email"
                  ref={emailRef}
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="exemplo@email.com"
                  defaultValue=""
                  className="w-full rounded-xl border border-white/5 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label htmlFor="login-password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Senha</label>
                <Link to="/forgot-password" className="text-xs font-medium text-primary hover:text-primary/80">
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="login-password"
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="********"
                  defaultValue=""
                  className="w-full rounded-xl border border-white/5 bg-white/5 py-3 pl-11 pr-12 text-sm text-white placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-6 text-base font-bold shadow-xl shadow-primary/20"
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <>
                  Entrar agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Ainda nao tem conta?{" "}
            <Link
              to="/register"
              search={{ redirect }}
              className="font-bold text-primary hover:text-primary/80"
            >
              Criar agora
            </Link>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex w-full items-center gap-4 py-2">
              <div className="h-[1px] flex-1 bg-white/5" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Seguranca de nivel bancario</span>
              <div className="h-[1px] flex-1 bg-white/5" />
            </div>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
              <Sparkles className="h-3 w-3 text-primary/60" />
              <span>Protegido por criptografia de ponta a ponta</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
