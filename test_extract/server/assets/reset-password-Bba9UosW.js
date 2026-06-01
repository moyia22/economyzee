import { r as reactExports, V as jsxRuntimeExports } from "./worker-entry-CMu_oXBf.js";
import { a as useNavigate, t as toast, B as Button, a5 as Link, a2 as supabase } from "./router-BxZ3CosB.js";
import { C as CircleCheck } from "./circle-check-lFfqg3WV.js";
import { L as Lock } from "./lock-Cmy_SNvc.js";
import { L as LoaderCircle } from "./loader-circle-B9yGKrE1.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
function ResetPasswordPage() {
  const [loading, setLoading] = reactExports.useState(false);
  const [password, setPassword] = reactExports.useState("");
  const [success, setSuccess] = reactExports.useState(false);
  const navigate = useNavigate();
  reactExports.useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("error_description")) {
      toast.error("O link de recuperação é inválido ou expirou.");
      navigate({
        to: "/forgot-password"
      });
    }
  }, [navigate]);
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (password.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const {
        error
      } = await supabase.auth.updateUser({
        password
      });
      if (error) throw error;
      setSuccess(true);
      toast.success("Senha atualizada com sucesso!");
    } catch (error) {
      console.error("[Auth] Erro ao atualizar senha:", error);
      toast.error(error.message || "Erro ao tentar atualizar a senha");
    } finally {
      setLoading(false);
    }
  };
  if (success) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative min-h-screen w-full overflow-hidden bg-[#0a0a0a] flex items-center justify-center p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative w-full max-w-[440px] text-center animate-in fade-in zoom-in duration-500", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-3xl border border-white/5 bg-white/[0.03] p-10 backdrop-blur-xl shadow-2xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 mb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-10 w-10 text-primary" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-white mb-4", children: "Senha Atualizada!" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground mb-8 leading-relaxed", children: "Sua senha foi redefinida com sucesso. Você já pode acessar sua conta com a nova senha." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, className: "w-full rounded-xl py-6 font-bold", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/", children: "Ir para o Dashboard" }) })
    ] }) }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative min-h-screen w-full overflow-hidden bg-[#0a0a0a] flex items-center justify-center p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-primary/20 blur-[120px] animate-pulse" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full max-w-[440px] animate-in fade-in zoom-in duration-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-8 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-3xl font-black tracking-tight text-white", children: "Nova Senha" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground font-medium", children: "Digite sua nova senha abaixo" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-3xl border border-white/5 bg-white/[0.03] p-8 backdrop-blur-xl shadow-2xl overflow-hidden relative", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleUpdate, className: "space-y-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1", children: "Nova Senha" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "password", required: true, placeholder: "Mínimo 6 caracteres", value: password, onChange: (e) => setPassword(e.target.value), className: "w-full rounded-xl border border-white/5 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "submit", disabled: loading, className: "w-full rounded-xl py-6 text-base font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.98]", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 h-5 w-5 animate-spin" }) : "Atualizar Senha" })
      ] }) })
    ] })
  ] });
}
export {
  ResetPasswordPage as component
};
