import { r as reactExports, V as jsxRuntimeExports } from "./worker-entry-CMu_oXBf.js";
import { a as useNavigate, a5 as Link, B as Button, a2 as supabase, t as toast } from "./router-BxZ3CosB.js";
import { M as Mail } from "./mail-62HDH1Af.js";
import { L as Lock } from "./lock-Cmy_SNvc.js";
import { L as LoaderCircle } from "./loader-circle-B9yGKrE1.js";
import { A as ArrowRight, S as Sparkles } from "./sparkles-Cm9DJ8gU.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
function LoginPage() {
  const [loading, setLoading] = reactExports.useState(false);
  const [email, setEmail] = reactExports.useState("");
  const [password, setPassword] = reactExports.useState("");
  const navigate = useNavigate();
  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const {
        error
      } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        if (error.message.includes("Email not confirmed")) {
          throw new Error("📧 Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada!");
        }
        throw new Error("E-mail ou senha incorretos.");
      }
      toast.success("Bem-vindo de volta!");
      navigate({
        to: "/"
      });
    } catch (error) {
      console.error("[Auth] Erro:", error);
      toast.error(error.message || "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative min-h-screen w-full overflow-hidden bg-[#0a0a0a] flex items-center justify-center p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-primary/20 blur-[120px] animate-pulse" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-blue-500/10 blur-[120px]" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full max-w-[440px] animate-in fade-in zoom-in duration-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-8 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "inline-flex items-center justify-center mb-8 transition-all duration-500 hover:scale-110", children: /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: "/logo.png", alt: "EconomyZee Logo", className: "h-48 w-48 object-contain drop-shadow-[0_0_35px_rgba(34,197,94,0.4)]" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-3xl font-black tracking-tight text-white", children: [
          "Economy",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-primary", children: "Zee" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground font-medium", children: "Sua central de inteligência financeira" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-3xl border border-white/5 bg-white/[0.03] p-8 backdrop-blur-xl shadow-2xl overflow-hidden relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-white mb-6 text-center", children: "Fazer Login" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleLogin, className: "space-y-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1", children: "E-mail" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { className: "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "email", required: true, placeholder: "exemplo@email.com", value: email, onChange: (e) => setEmail(e.target.value), className: "w-full rounded-xl border border-white/5 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between ml-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold uppercase tracking-widest text-muted-foreground", children: "Senha" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/forgot-password", className: "text-xs font-medium text-primary hover:text-primary/80 transition-colors", children: "Esqueceu a senha?" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "password", required: true, placeholder: "••••••••", value: password, onChange: (e) => setPassword(e.target.value), className: "w-full rounded-xl border border-white/5 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "submit", disabled: loading, className: "w-full rounded-xl py-6 text-base font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.98]", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 h-5 w-5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            "Entrar agora",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "ml-2 h-5 w-5" })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8 text-center text-sm text-muted-foreground", children: [
          "Ainda não tem conta?",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/register", className: "font-bold text-primary hover:text-primary/80 transition-colors", children: "Criar agora" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8 flex flex-col items-center gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex w-full items-center gap-4 py-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-[1px] flex-1 bg-white/5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50", children: "Segurança de nível bancário" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-[1px] flex-1 bg-white/5" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-[11px] text-muted-foreground/60", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-3 w-3 text-primary/60" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Protegido por criptografia militar de ponta a ponta" })
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  LoginPage as component
};
