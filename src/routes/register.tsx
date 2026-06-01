import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { User, Mail, Lock, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { registerWithEmailCode } from "@/services/auth-verification.service";

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const redirectTarget = (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) ? redirect : '/';

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const name = nameRef.current?.value.trim() ?? "";
    const email = emailRef.current?.value.trim().toLowerCase() ?? "";
    const password = passwordRef.current?.value ?? "";
    const terms = !!termsRef.current?.checked;

    if (!terms) {
      toast.error("Voce precisa aceitar os termos de servico para continuar.");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const result = await registerWithEmailCode({ name, email, password });

      toast.success(result.message || "Cadastro realizado! Verifique seu email.");
      navigate({
        to: "/verify-email",
        search: {
          email: result.email,
          redirect: redirectTarget !== '/' ? redirectTarget : undefined,
        },
        replace: true,
      });
    } catch (error: any) {
      console.error("[Auth] Erro no cadastro:", error);
      toast.error(error.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="relative w-full max-w-[440px] [contain:layout_style]">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-black tracking-tight text-white">
            Criar <span className="text-primary">Conta</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-medium">
            Sua nova vida financeira comeca aqui
          </p>
        </div>

        <div className="rounded-3xl border border-white/5 bg-[#141416] p-8 shadow-2xl overflow-hidden relative">
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="reg-name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="reg-name"
                  ref={nameRef}
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Seu nome"
                  defaultValue=""
                  className="w-full rounded-xl border border-white/5 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="reg-email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="reg-email"
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
              <label htmlFor="reg-password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="reg-password"
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="Minimo de 6 caracteres"
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

            <div className="flex items-start space-x-3 pt-2">
              <input
                ref={termsRef}
                type="checkbox"
                id="terms"
                defaultChecked={false}
                className="mt-1 h-4 w-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/20"
              />
              <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed">
                Eu concordo com os <span className="text-white hover:underline cursor-pointer">Termos de Servico</span> e <span className="text-white hover:underline cursor-pointer">Politica de Privacidade</span> da EconomyZee.
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-6 text-base font-bold shadow-xl shadow-primary/20 mt-2"
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <>
                  Criar Conta
                  <CheckCircle2 className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Ja tem uma conta?{" "}
            <Link to="/login" search={{ redirect: undefined }} className="font-bold text-primary hover:text-primary/80">
              Fazer login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
