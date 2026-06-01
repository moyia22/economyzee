import { r as reactExports, V as jsxRuntimeExports } from "./worker-entry-CMu_oXBf.js";
import { c as createLucideIcon, u as useQueryClient, b as useQuery, P as PageHeader, B as Button, z as Plus, D as Dialog, h as DialogContent, i as DialogHeader, j as DialogTitle, C as DialogDescription, I as Input, k as DialogFooter, A as Avatar, w as AvatarFallback, T as Trash2, E as inviteMember, t as toast, F as updateWorkspace, G as generateInviteLink, H as revokeInviteLink, J as createWorkspace, K as getWorkspaces, L as getInviteLinks, M as getWorkspaceMembers, y as getTransactions } from "./router-BxZ3CosB.js";
import { C as Card, a as CardTitle } from "./Card-DtSwldk7.js";
import { a as formatBRL } from "./format-CzmsyK3W.js";
import { U as UserPlus, S as Shield } from "./user-plus-BRZKun7X.js";
import { U as User } from "./user-D3Vt109S.js";
import { L as LoaderCircle } from "./loader-circle-B9yGKrE1.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const __iconNode$4 = [
  ["path", { d: "M10 12h4", key: "a56b0p" }],
  ["path", { d: "M10 8h4", key: "1sr2af" }],
  ["path", { d: "M14 21v-3a2 2 0 0 0-4 0v3", key: "1rgiei" }],
  [
    "path",
    {
      d: "M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2",
      key: "secmi2"
    }
  ],
  ["path", { d: "M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16", key: "16ra0t" }]
];
const Building2 = createLucideIcon("building-2", __iconNode$4);
const __iconNode$3 = [
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
];
const Copy = createLucideIcon("copy", __iconNode$3);
const __iconNode$2 = [
  [
    "path",
    {
      d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
      key: "1nclc0"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
];
const Eye = createLucideIcon("eye", __iconNode$2);
const __iconNode$1 = [
  ["path", { d: "M9 17H7A5 5 0 0 1 7 7h2", key: "8i5ue5" }],
  ["path", { d: "M15 7h2a5 5 0 1 1 0 10h-2", key: "1b9ql8" }],
  ["line", { x1: "8", x2: "16", y1: "12", y2: "12", key: "1jonct" }]
];
const Link2 = createLucideIcon("link-2", __iconNode$1);
const __iconNode = [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      key: "1a8usu"
    }
  ]
];
const Pen = createLucideIcon("pen", __iconNode);
const roleConfig = {
  ADMIN: {
    label: "Admin",
    icon: Shield,
    cls: "bg-primary/15 text-primary border-primary/25"
  },
  MEMBER: {
    label: "Membro",
    icon: User,
    cls: "bg-info/15 text-info border-info/25"
  },
  VIEWER: {
    label: "Visualizador",
    icon: Eye,
    cls: "bg-muted text-muted-foreground border-border"
  }
};
function SharedPage() {
  const [inviteEmail, setInviteEmail] = reactExports.useState("");
  const [inviting, setInviting] = reactExports.useState(false);
  const [renameModalOpen, setRenameModalOpen] = reactExports.useState(false);
  const [newName, setNewName] = reactExports.useState("");
  const [renaming, setRenaming] = reactExports.useState(false);
  const [generatingLink, setGeneratingLink] = reactExports.useState(false);
  const [linkRole, setLinkRole] = reactExports.useState("MEMBER");
  const [createModalOpen, setCreateModalOpen] = reactExports.useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = reactExports.useState("");
  const [creating, setCreating] = reactExports.useState(false);
  const [activeOrgIdx, setActiveOrgIdx] = reactExports.useState(0);
  useQueryClient();
  const {
    data: workspaces = [],
    refetch: refetchWorkspaces
  } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => getWorkspaces().catch(() => [])
  });
  const activeOrg = workspaces[activeOrgIdx] || workspaces[0];
  reactExports.useEffect(() => {
    if (activeOrg?.id) {
      localStorage.setItem("economyzee_org_id", activeOrg.id);
    }
  }, [activeOrg?.id]);
  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    setCreating(true);
    try {
      await createWorkspace(newWorkspaceName.trim());
      toast.success(`Workspace "${newWorkspaceName}" criado!`);
      setNewWorkspaceName("");
      setCreateModalOpen(false);
      const refreshed = await refetchWorkspaces();
      if (refreshed.data) setActiveOrgIdx(refreshed.data.length - 1);
    } catch (e) {
      toast.error(e.message || "Erro ao criar workspace.");
    } finally {
      setCreating(false);
    }
  };
  const {
    data: inviteLinks = [],
    refetch: refetchLinks
  } = useQuery({
    queryKey: ["invite-links", activeOrg?.id],
    queryFn: () => activeOrg ? getInviteLinks(activeOrg.id).catch(() => []) : Promise.resolve([]),
    enabled: !!activeOrg?.id
  });
  const handleRename = async () => {
    if (!activeOrg || !newName.trim()) return;
    setRenaming(true);
    try {
      await updateWorkspace(activeOrg.id, newName);
      toast.success("Workspace renomeado!");
      setRenameModalOpen(false);
      refetchWorkspaces();
    } catch (e) {
      toast.error(e.message || "Erro ao renomear workspace.");
    } finally {
      setRenaming(false);
    }
  };
  const {
    data: members = [],
    refetch: refetchMembers
  } = useQuery({
    queryKey: ["workspace-members", activeOrg?.id],
    queryFn: () => activeOrg ? getWorkspaceMembers(activeOrg.id).catch(() => []) : Promise.resolve([]),
    enabled: !!activeOrg?.id
  });
  const {
    data: txData
  } = useQuery({
    queryKey: ["transactions", {
      forShared: true
    }],
    queryFn: () => getTransactions({}).catch(() => ({
      data: []
    }))
  });
  const transactions = txData?.data || [];
  const memberSpend = members.map((m) => {
    const total = transactions.filter((t) => t.memberId === m.id && t.type === "EXPENSE").reduce((s, t) => s + (t.amountInCents || t.amount || 0), 0);
    return {
      member: m,
      total
    };
  });
  const grand = memberSpend.reduce((s, x) => s + x.total, 0);
  const handleInvite = async () => {
    if (!inviteEmail || !activeOrg) return;
    setInviting(true);
    try {
      await inviteMember(activeOrg.id, inviteEmail, "MEMBER");
      toast.success("Membro convidado!");
      setInviteEmail("");
      refetchMembers();
    } catch (e) {
      toast.error(e.message || "Erro ao convidar.");
    } finally {
      setInviting(false);
    }
  };
  const handleGenerateLink = async () => {
    if (!activeOrg) return;
    setGeneratingLink(true);
    try {
      await generateInviteLink(activeOrg.id, linkRole, 7);
      toast.success("Link de convite gerado!");
      refetchLinks();
    } catch (e) {
      toast.error(e.message || "Erro ao gerar link.");
    } finally {
      setGeneratingLink(false);
    }
  };
  const handleCopyLink = (token) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };
  const handleRevokeLink = async (linkId) => {
    if (!activeOrg) return;
    try {
      await revokeInviteLink(activeOrg.id, linkId);
      toast.success("Link revogado!");
      refetchLinks();
    } catch (e) {
      toast.error(e.message || "Erro ao revogar.");
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 group", children: [
      "Workspace compartilhado",
      activeOrg && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", className: "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity", onClick: () => {
        setNewName(activeOrg.name);
        setRenameModalOpen(true);
      }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pen, { className: "h-3.5 w-3.5" }) })
    ] }), description: activeOrg?.name || "Meu Workspace", actions: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      workspaces.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: activeOrgIdx, onChange: (e) => setActiveOrgIdx(Number(e.target.value)), className: "h-9 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-ring/60", children: workspaces.map((ws, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: idx, children: ws.name }, ws.id)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", className: "gap-1.5", onClick: () => setCreateModalOpen(true), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
        " Novo Workspace"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "email", value: inviteEmail, onChange: (e) => setInviteEmail(e.target.value), placeholder: "email@exemplo.com", className: "h-9 w-48 rounded-lg border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring/60" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", className: "gap-2", disabled: inviting || !inviteEmail, onClick: handleInvite, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(UserPlus, { className: "h-4 w-4" }),
        " ",
        inviting ? "..." : "Convidar"
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: renameModalOpen, onOpenChange: setRenameModalOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Renomear Workspace" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Escolha um novo nome para o seu workspace." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: newName, onChange: (e) => setNewName(e.target.value), placeholder: "Nome do Workspace" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setRenameModalOpen(false), children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: handleRename, disabled: renaming || !newName.trim(), children: renaming ? "Salvando..." : "Salvar" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-4 lg:grid-cols-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "lg:col-span-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { title: "Membros", description: `${members.length} pessoa(s) neste workspace` }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "-mx-2 divide-y divide-border/60", children: members.length > 0 ? members.map((m) => {
          const r = roleConfig[m.role] || roleConfig.MEMBER;
          const Icon = r.icon;
          const name = m.user?.name || "Usuário";
          const email = m.user?.email || "";
          const color = m.avatarColor || "var(--primary)";
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-3 px-2 py-3 transition-colors hover:bg-accent/30", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { className: "h-10 w-10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarFallback, { style: {
              background: `${color}25`,
              color
            }, className: "font-bold", children: name.split(" ").map((n) => n[0]).slice(0, 2).join("") }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium", children: name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: email })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium ${r.cls}`, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-3 w-3" }),
              " ",
              r.label
            ] })
          ] }, m.id);
        }) : /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "px-2 py-8 text-center text-sm text-muted-foreground", children: "Nenhum membro no workspace" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { title: "Quem gastou o quê", description: "Este mês" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-3", children: memberSpend.sort((a, b) => b.total - a.total).map(({
          member,
          total
        }) => {
          const name = member.user?.name || "Usuário";
          const color = member.avatarColor || "var(--primary)";
          const pct = grand ? total / grand * 100 : 0;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-1 flex items-center gap-2 text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { className: "h-6 w-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarFallback, { style: {
                background: `${color}25`,
                color
              }, className: "text-[10px] font-bold", children: name.split(" ").map((n) => n[0]).slice(0, 2).join("") }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: name.split(" ")[0] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto tabular-nums text-muted-foreground", children: formatBRL(total) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-1.5 w-full overflow-hidden rounded-full bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full rounded-full bg-primary transition-all duration-700", style: {
              width: `${pct}%`
            } }) })
          ] }, member.id);
        }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "mt-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { title: "Convite por link", description: "Gere um link para convidar pessoas sem precisar do e-mail" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-3 mb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: linkRole, onChange: (e) => setLinkRole(e.target.value), className: "h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-ring/60", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "MEMBER", children: "Membro" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "VIEWER", children: "Visualizador" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", className: "gap-2", onClick: handleGenerateLink, disabled: generatingLink || !activeOrg, children: [
          generatingLink ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Link2, { className: "h-4 w-4" }),
          "Gerar link"
        ] })
      ] }),
      inviteLinks.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "-mx-2 divide-y divide-border/60", children: inviteLinks.map((link) => {
        const expiresAt = new Date(link.expiresAt);
        const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 864e5));
        const url = `${window.location.origin}/invite/${link.token}`;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-3 px-2 py-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link2, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-sm font-mono text-muted-foreground", children: url.replace(window.location.origin, "...") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${link.role === "VIEWER" ? "bg-muted text-muted-foreground" : "bg-info/15 text-info"}`, children: link.role === "VIEWER" ? "Visualizador" : "Membro" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-muted-foreground", children: [
              daysLeft > 0 ? `Expira em ${daysLeft} dia(s)` : "Expirado",
              " • ",
              link.usedCount || 0,
              " uso(s)",
              link.createdBy?.name && ` • por ${link.createdBy.name}`
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", className: "h-8 w-8", onClick: () => handleCopyLink(link.token), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "h-3.5 w-3.5" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "icon", className: "h-8 w-8 text-destructive hover:text-destructive", onClick: () => handleRevokeLink(link.id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" }) })
          ] })
        ] }, link.id);
      }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-4 text-center text-sm text-muted-foreground", children: "Nenhum link ativo. Gere um acima para convidar pessoas." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "mt-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { title: "Atividade recente do time" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "-mx-2 divide-y divide-border/60", children: [
        transactions.slice(0, 8).map((tx) => {
          const m = members.find((mem) => mem.id === tx.memberId) || members[0];
          const name = m?.user?.name || "Membro";
          const color = m?.avatarColor || "var(--primary)";
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-3 px-2 py-2.5 transition-colors hover:bg-accent/30", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { className: "h-8 w-8", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AvatarFallback, { style: {
              background: `${color}25`,
              color
            }, className: "text-[10px] font-bold", children: name.split(" ").map((n) => n[0]).slice(0, 2).join("") }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0 flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "truncate text-sm", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: name.split(" ")[0] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
                " ",
                tx.type === "INCOME" ? "recebeu" : "gastou",
                " em "
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: tx.description })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `text-sm font-semibold tabular-nums ${tx.type === "INCOME" ? "text-success" : ""}`, children: [
              tx.type === "INCOME" ? "+" : "−",
              formatBRL(tx.amountInCents || tx.amount || 0)
            ] })
          ] }, tx.id);
        }),
        transactions.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "px-2 py-8 text-center text-sm text-muted-foreground", children: "Nenhuma atividade recente" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open: createModalOpen, onOpenChange: setCreateModalOpen, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Building2, { className: "h-5 w-5 text-primary" }),
          " Criar novo workspace"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { children: "Crie um workspace separado para organizar finanças de diferentes contextos (pessoal, empresa, família, etc.)" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 py-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-[11px] uppercase tracking-wider text-muted-foreground", children: "Nome do workspace" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: newWorkspaceName, onChange: (e) => setNewWorkspaceName(e.target.value), placeholder: "Ex: Empresa, Família, Investimentos...", onKeyDown: (e) => e.key === "Enter" && handleCreateWorkspace(), autoFocus: true })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => setCreateModalOpen(false), children: "Cancelar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { disabled: !newWorkspaceName.trim() || creating, onClick: handleCreateWorkspace, className: "gap-2", children: [
          creating ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
          "Criar workspace"
        ] })
      ] })
    ] }) })
  ] });
}
export {
  SharedPage as component
};
