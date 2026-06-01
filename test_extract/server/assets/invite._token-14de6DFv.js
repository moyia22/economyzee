import { r as reactExports, V as jsxRuntimeExports } from "./worker-entry-CMu_oXBf.js";
import { c as createLucideIcon, am as useParams, a as useNavigate, an as useAuth, ao as validateInviteToken, B as Button, ap as Users, aq as acceptInvite, t as toast } from "./router-BxZ3CosB.js";
import { C as Card } from "./Card-DtSwldk7.js";
import { L as LoaderCircle } from "./loader-circle-B9yGKrE1.js";
import { C as CircleCheck } from "./circle-check-lFfqg3WV.js";
import { S as Shield, U as UserPlus } from "./user-plus-BRZKun7X.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const __iconNode = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m15 9-6 6", key: "1uzhvr" }],
  ["path", { d: "m9 9 6 6", key: "z0biqf" }]
];
const CircleX = createLucideIcon("circle-x", __iconNode);
function InvitePage() {
  const {
    token
  } = useParams({
    from: "/invite/$token"
  });
  const navigate = useNavigate();
  const {
    session,
    isLoading: authLoading
  } = useAuth();
  const [inviteData, setInviteData] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [accepting, setAccepting] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [accepted, setAccepted] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!authLoading && !session) {
      navigate({
        to: "/login",
        search: {
          redirect: `/invite/${token}`
        },
        replace: true
      });
    }
  }, [authLoading, session, token, navigate]);
  reactExports.useEffect(() => {
    if (!session) return;
    validateInviteToken(token).then((data) => {
      if (data.valid) {
        setInviteData(data);
      } else {
        setError(data.reason || "Link inválido");
      }
    }).catch((err) => {
      setError(err.message || "Erro ao validar link");
    }).finally(() => setLoading(false));
  }, [token, session]);
  const handleAccept = async () => {
    setAccepting(true);
    try {
      const result = await acceptInvite(token);
      setAccepted(true);
      if (result.alreadyMember) {
        toast.info("Você já faz parte deste workspace!");
      } else {
        toast.success(`Bem-vindo ao workspace "${result.orgName}"!`);
      }
      localStorage.setItem("economyzee_org_id", result.orgId);
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (err) {
      toast.error(err.message || "Erro ao aceitar convite");
      setAccepting(false);
    }
  };
  if (authLoading || !session) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-screen items-center justify-center bg-background", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground animate-pulse", children: "Verificando autenticação..." })
    ] }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full max-w-md", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-4 py-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-10 w-10 animate-spin text-primary" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Validando convite..." })
  ] }) }) : error ? /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-4 py-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "h-8 w-8 text-destructive" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold", children: "Convite inválido" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: error })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => navigate({
      to: "/"
    }), children: "Ir para o dashboard" })
  ] }) }) : accepted ? /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-4 py-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-scale-in flex h-16 w-16 items-center justify-center rounded-full bg-success/10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-8 w-8 text-success" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold", children: "Convite aceito!" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Redirecionando para o workspace..." })
    ] })
  ] }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-6 py-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "h-10 w-10 text-primary" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold", children: "Convite para workspace" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Você foi convidado para entrar em:" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-lg font-semibold text-primary", children: inviteData?.orgName })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-card px-6 py-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "h-3.5 w-3.5" }),
        "Cargo: ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-foreground", children: inviteData?.role === "ADMIN" ? "Administrador" : inviteData?.role === "VIEWER" ? "Visualizador" : "Membro" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(UserPlus, { className: "h-3.5 w-3.5" }),
        "Convidado por: ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-foreground", children: inviteData?.invitedBy })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex w-full gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", className: "flex-1", onClick: () => navigate({
        to: "/"
      }), children: "Recusar" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { className: "flex-1 gap-2", onClick: handleAccept, disabled: accepting, children: [
        accepting ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-4 w-4" }),
        "Entrar no workspace"
      ] })
    ] })
  ] }) }) }) });
}
export {
  InvitePage as component
};
