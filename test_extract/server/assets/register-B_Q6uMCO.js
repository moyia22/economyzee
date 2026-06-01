import { r as reactExports, V as jsxRuntimeExports } from "./worker-entry-CMu_oXBf.js";
import { B as Button, a5 as Link, t as toast, a2 as supabase } from "./router-BxZ3CosB.js";
import { M as Mail } from "./mail-62HDH1Af.js";
import { U as User } from "./user-D3Vt109S.js";
import { L as Lock } from "./lock-Cmy_SNvc.js";
import { L as LoaderCircle } from "./loader-circle-B9yGKrE1.js";
import { C as CircleCheck } from "./circle-check-lFfqg3WV.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
function RegisterPage() {
  const [loading, setLoading] = reactExports.useState(false);
  const [regSuccess, setRegSuccess] = reactExports.useState(false);
  const [name, setName] = reactExports.useState("");
  const [email, setEmail] = reactExports.useState("");
  const [password, setPassword] = reactExports.useState("");
  const [terms, setTerms] = reactExports.useState(false);
  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!terms) {
      toast.error("Você precisa aceitar os termos de serviço para continuar.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name || email.split("@")[0]
          }
        }
      });
      if (error) throw error;
      if (data.user && data.session === null) {
        setRegSuccess(true);
        toast.success("Cadastro realizado! Verifique seu e-mail.");
      } else {
        toast.success("Conta criada com sucesso!");
      }
    } catch (error) {
      console.error("[Auth] Erro no cadastro:", error);
      toast.error(error.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };
  if (regSuccess) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative min-h-screen w-full overflow-hidden bg-[#0a0a0a] flex items-center justify-center p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative w-full max-w-[440px] text-center animate-in fade-in zoom-in duration-500", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-3xl border border-white/5 bg-white/[0.03] p-10 backdrop-blur-xl shadow-2xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 mb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { className: "h-10 w-10 text-primary animate-bounce" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-white mb-4", children: "Verifique seu E-mail!" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-muted-foreground mb-8 leading-relaxed", children: [
        "Enviamos um link de confirmação para ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white font-bold", children: email }),
        ".",
        /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
        "Acesse sua caixa de entrada e clique no link para ativar sua conta EconomyZee."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, className: "w-full rounded-xl py-6 font-bold", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/login", children: "Voltar para o Login" }) })
    ] }) }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative min-h-screen w-full overflow-hidden bg-[#0a0a0a] flex items-center justify-center p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-primary/20 blur-[120px] animate-pulse" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-blue-500/10 blur-[120px]" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full max-w-[440px] animate-in fade-in zoom-in duration-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-6 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-3xl font-black tracking-tight text-white", children: [
          "Criar ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-primary", children: "Conta" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground font-medium", children: "Sua nova vida financeira começa aqui" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-3xl border border-white/5 bg-white/[0.03] p-8 backdrop-blur-xl shadow-2xl overflow-hidden relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleRegister, className: "space-y-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1", children: "Nome Completo" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", required: true, placeholder: "Seu nome", value: name, onChange: (e) => setName(e.target.value), className: "w-full rounded-xl border border-white/5 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1", children: "E-mail" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { className: "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "email", required: true, placeholder: "exemplo@email.com", value: email, onChange: (e) => setEmail(e.target.value), className: "w-full rounded-xl border border-white/5 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1", children: "Senha" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "password", required: true, placeholder: "Mínimo de 6 caracteres", value: password, onChange: (e) => setPassword(e.target.value), className: "w-full rounded-xl border border-white/5 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start space-x-3 pt-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", id: "terms", checked: terms, onChange: (e) => setTerms(e.target.checked), className: "mt-1 h-4 w-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/20" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { htmlFor: "terms", className: "text-xs text-muted-foreground leading-relaxed", children: [
              "Eu concordo com os ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white hover:underline cursor-pointer", children: "Termos de Serviço" }),
              " e ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-white hover:underline cursor-pointer", children: "Política de Privacidade" }),
              " da EconomyZee."
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { type: "submit", disabled: loading, className: "w-full rounded-xl py-6 text-base font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.98] mt-2", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 h-5 w-5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            "Criar Conta",
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "ml-2 h-5 w-5" })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8 text-center text-sm text-muted-foreground", children: [
          "Já tem uma conta?",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/login", className: "font-bold text-primary hover:text-primary/80 transition-colors", children: "Fazer login" })
        ] })
      ] })
    ] })
  ] });
}
export {
  RegisterPage as component
};
