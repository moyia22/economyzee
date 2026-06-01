import { r as reactExports, V as jsxRuntimeExports } from "./worker-entry-CMu_oXBf.js";
import { B as Button, a5 as Link, a2 as supabase, t as toast } from "./router-BxZ3CosB.js";
import { S as Send } from "./send-Bgn39PPm.js";
import { M as Mail } from "./mail-62HDH1Af.js";
import { L as LoaderCircle } from "./loader-circle-B9yGKrE1.js";
import { A as ArrowLeft } from "./arrow-left-Ulf0FFlO.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
function ForgotPasswordPage() {
  const [loading, setLoading] = reactExports.useState(false);
  const [email, setEmail] = reactExports.useState("");
  const [success, setSuccess] = reactExports.useState(false);
  const handleReset = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const {
        error
      } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
      setSuccess(true);
      toast.success("E-mail de recuperação enviado!");
    } catch (error) {
      console.error("[Auth] Erro ao recuperar senha:", error);
      toast.error(error.message || "Erro ao tentar enviar o e-mail");
    } finally {
      setLoading(false);
    }
  };
  if (success) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative min-h-screen w-full overflow-hidden bg-[#0a0a0a] flex items-center justify-center p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative w-full max-w-[440px] text-center animate-in fade-in zoom-in duration-500", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-3xl border border-white/5 bg-white/[0.03] p-10 backdrop-blur-xl shadow-2xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 mb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "h-10 w-10 text-primary animate-bounce" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-white mb-4", children: "E-mail Enviado!" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-muted-foreground mb-8 leading-relaxed", children: [
        "As instruções de recuperação foram enviadas para ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white font-bold", children: email }),
        ".",
        /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
        "Verifique sua caixa de entrada (ou pasta de spam) para redefinir sua senha."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, className: "w-full rounded-xl py-6 font-bold", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/login", children: "Voltar para o Login" }) })
    ] }) }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative min-h-screen w-full overflow-hidden bg-[#0a0a0a] flex items-center justify-center p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-primary/20 blur-[120px] animate-pulse" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full max-w-[440px] animate-in fade-in zoom-in duration-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-8 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "inline-flex items-center justify-center mb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-16 w-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "h-8 w-8 text-muted-foreground" }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-3xl font-black tracking-tight text-white", children: "Recuperar Senha" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground font-medium", children: "Enviaremos um link seguro para você criar uma nova senha" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-3xl border border-white/5 bg-white/[0.03] p-8 backdrop-blur-xl shadow-2xl overflow-hidden relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleReset, className: "space-y-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1", children: "E-mail" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { className: "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "email", required: true, placeholder: "Seu e-mail cadastrado", value: email, onChange: (e) => setEmail(e.target.value), className: "w-full rounded-xl border border-white/5 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "submit", disabled: loading, className: "w-full rounded-xl py-6 text-base font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.98]", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 h-5 w-5 animate-spin" }) : "Enviar link de recuperação" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-8 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/login", className: "inline-flex items-center text-sm font-bold text-muted-foreground hover:text-white transition-colors", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "mr-2 h-4 w-4" }),
          "Voltar ao login"
        ] }) })
      ] })
    ] })
  ] });
}
export {
  ForgotPasswordPage as component
};
