import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("error_description")) {
      toast.error("O link de recuperação é inválido ou expirou.");
      navigate({ to: "/forgot-password" });
    }
  }, [navigate]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const password = passwordRef.current?.value ?? "";
    if (password.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccess(true);
      toast.success("Senha atualizada com sucesso!");
    } catch (error: any) {
      console.error("[Auth] Erro ao atualizar senha:", error);
      toast.error(error.message || "Erro ao tentar atualizar a senha");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="relative w-full max-w-[440px] text-center">
          <div className="rounded-3xl border border-white/5 bg-[#141416] p-10 shadow-2xl">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 mb-6">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Senha Atualizada!</h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Sua senha foi redefinida com sucesso. Você já pode acessar sua conta com a nova senha.
            </p>
            <Button asChild className="w-full rounded-xl py-6 font-bold">
              <Link to="/">Ir para o Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="relative w-full max-w-[440px] [contain:layout_style]">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black tracking-tight text-white">
            Nova Senha
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-medium">
            Digite sua nova senha abaixo
          </p>
        </div>

        <div className="rounded-3xl border border-white/5 bg-[#141416] p-8 shadow-2xl overflow-hidden relative">
          <form onSubmit={handleUpdate} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="rp-password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="rp-password"
                  ref={passwordRef}
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  defaultValue=""
                  className="w-full rounded-xl border border-white/5 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
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
                "Atualizar Senha"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
