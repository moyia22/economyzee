import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, ArrowLeft, Send, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const email = emailRef.current?.value.trim() ?? "";
    if (!email) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSubmittedEmail(email);
      setSuccess(true);
      toast.success("E-mail de recuperação enviado!");
    } catch (error: any) {
      console.error("[Auth] Erro ao recuperar senha:", error);
      toast.error(error.message || "Erro ao tentar enviar o e-mail");
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
              <Send className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">E-mail Enviado!</h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              As instruções de recuperação foram enviadas para <span className="text-white font-bold">{submittedEmail}</span>.<br/><br/>
              Verifique sua caixa de entrada (ou pasta de spam) para redefinir sua senha.
            </p>
            <Button asChild className="w-full rounded-xl py-6 font-bold">
              <Link to="/login" search={{ redirect: undefined }}>Voltar para o Login</Link>
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
          <div className="inline-flex items-center justify-center mb-6">
            <div className="h-16 w-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Recuperar Senha
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-medium">
            Enviaremos um link seguro para você criar uma nova senha
          </p>
        </div>

        <div className="rounded-3xl border border-white/5 bg-[#141416] p-8 shadow-2xl overflow-hidden relative">
          <form onSubmit={handleReset} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="fp-email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="fp-email"
                  ref={emailRef}
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Seu e-mail cadastrado"
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
                "Enviar link de recuperação"
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <Link to="/login" search={{ redirect: undefined }} className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
