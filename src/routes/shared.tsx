import { createFileRoute } from "@tanstack/react-router";
import { UserPlus, Shield, User as UserIcon, Eye, Link2, Copy, Trash2, Loader2, Plus, Building2, LogOut, Mail, X, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatBRL } from "@/lib/format";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTransactions } from "@/services/transactions.service";
import {
  getWorkspaces,
  getWorkspaceMembers,
  inviteMember,
  updateWorkspace,
  createWorkspace,
  generateInviteLink,
  getInviteLinks,
  revokeInviteLink,
  leaveWorkspace,
  removeWorkspaceMember,
  updateMemberRole,
  type InviteResponse,
  type WorkspaceRole,
} from "@/services/workspace.service";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit2 } from "lucide-react";
import { api } from "@/services/api-client";

export const Route = createFileRoute("/shared")({
  head: () => ({
    meta: [
      { title: "Workspace compartilhado — EconomyZee" },
      { name: "description", content: "Gerencie membros, papéis e veja quem gastou o quê." },
    ],
  }),
  component: SharedPage,
});

const roleConfig: Record<string, { label: string; icon: any; cls: string }> = {
  OWNER: { label: "Owner", icon: Shield, cls: "bg-success/15 text-success border-success/25" },
  ADMIN: { label: "Admin", icon: Shield, cls: "bg-primary/15 text-primary border-primary/25" },
  MEMBER: { label: "Membro", icon: UserIcon, cls: "bg-info/15 text-info border-info/25" },
  VIEWER: { label: "Visualizador", icon: Eye, cls: "bg-muted text-muted-foreground border-border" },
};

function SharedPage() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<WorkspaceRole, 'OWNER'>>('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [lastInvite, setLastInvite] = useState<InviteResponse | null>(null);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkRole, setLinkRole] = useState<Exclude<WorkspaceRole, 'OWNER'>>("MEMBER");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeOrgIdx, setActiveOrgIdx] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Get current user id (to disable self-remove and identify own membership)
  useEffect(() => {
    api.get<any>('/auth/me')
      .then((profile) => setCurrentUserId(profile.id || null))
      .catch(() => setCurrentUserId(null));
  }, []);

  const { data: workspaces = [], refetch: refetchWorkspaces } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => getWorkspaces().catch(() => []),
  });

  const activeOrg = workspaces[activeOrgIdx] || workspaces[0];
  const isPersonalWorkspace = activeOrg?.type === 'PERSONAL';

  useEffect(() => {
    if (workspaces.length === 0) return;

    const storedOrgId = localStorage.getItem('economyzee_org_id');
    const storedIdx = workspaces.findIndex((ws: any) => ws.id === storedOrgId);

    if (storedIdx >= 0 && storedIdx !== activeOrgIdx) {
      setActiveOrgIdx(storedIdx);
      return;
    }

    if (activeOrgIdx >= workspaces.length) {
      setActiveOrgIdx(0);
    }
  }, [activeOrgIdx, workspaces]);

  // Sync active organization to localStorage so api-client sends the correct header
  useEffect(() => {
    const storedOrgId = localStorage.getItem('economyzee_org_id');
    if (storedOrgId && workspaces.some((ws: any) => ws.id === storedOrgId) && storedOrgId !== activeOrg?.id) {
      return;
    }

    if (activeOrg?.id) {
      localStorage.setItem('economyzee_org_id', activeOrg.id);
    }
  }, [activeOrg?.id, workspaces]);

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
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar workspace.");
    } finally {
      setCreating(false);
    }
  };

  const { data: inviteLinks = [], refetch: refetchLinks } = useQuery({
    queryKey: ["invite-links", activeOrg?.id],
    queryFn: () => activeOrg ? getInviteLinks(activeOrg.id).catch(() => []) : Promise.resolve([]),
    enabled: !!activeOrg?.id,
  });

  const handleRename = async () => {
    if (!activeOrg || !newName.trim()) return;
    setRenaming(true);
    try {
      await updateWorkspace(activeOrg.id, newName);
      toast.success("Workspace renomeado!");
      setRenameModalOpen(false);
      refetchWorkspaces();
    } catch (e: any) {
      toast.error(e.message || "Erro ao renomear workspace.");
    } finally {
      setRenaming(false);
    }
  };

  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ["workspace-members", activeOrg?.id],
    queryFn: () => activeOrg ? getWorkspaceMembers(activeOrg.id).catch(() => []) : Promise.resolve([]),
    enabled: !!activeOrg?.id,
  });

  // Identify current user's membership and role in active workspace
  const myMembership = members.find((m: any) => m.user?.id === currentUserId);
  const isOwner = myMembership?.role === 'OWNER';
  const isAdmin = myMembership?.role === 'OWNER' || myMembership?.role === 'ADMIN';

  const { data: txData } = useQuery({
    queryKey: ["transactions", { forShared: true, orgId: activeOrg?.id }],
    queryFn: () => getTransactions({}).catch(() => ({ data: [] })),
    enabled: !!activeOrg?.id,
  });

  const transactions = txData?.data || [];

  const memberSpend = members.map((m: any) => {
    const total = transactions
      .filter((t: any) => (t.memberId === m.id) && (t.type === "EXPENSE"))
      .reduce((s: number, t: any) => s + (t.amountInCents || t.amount || 0), 0);
    return { member: m, total };
  });
  const grand = memberSpend.reduce((s: number, x: any) => s + x.total, 0);

  const handleInvite = async () => {
    if (!inviteEmail || !activeOrg) return;
    setInviting(true);
    setLastInvite(null);
    try {
      const result = await inviteMember(activeOrg.id, inviteEmail, inviteRole);
      setLastInvite(result);

      if (result.alreadyMember) {
        toast.info(result.message);
      } else if (result.emailSent) {
        toast.success(result.message);
        setInviteEmail("");
      } else {
        // Email não foi enviado — mas o link está pronto pra copiar
        toast.warning(result.message);
      }
      refetchMembers();
      refetchLinks();
    } catch (e: any) {
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
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar link.");
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const handleRevokeLink = async (linkId: string) => {
    if (!activeOrg) return;
    try {
      await revokeInviteLink(activeOrg.id, linkId);
      toast.success("Link revogado!");
      refetchLinks();
    } catch (e: any) {
      toast.error(e.message || "Erro ao revogar.");
    }
  };

  const handleLeave = async () => {
    if (!activeOrg) return;
    if (!confirm("Tem certeza que deseja sair deste workspace?")) return;
    setLeaving(true);
    try {
      const result = await leaveWorkspace(activeOrg.id);
      toast.success(`Voce saiu de "${activeOrg.name}".`);
      if (result.nextOrgId) localStorage.setItem('economyzee_org_id', result.nextOrgId);
      else localStorage.removeItem('economyzee_org_id');
      setActiveOrgIdx(0);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workspaces"] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-members"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      ]);
    } catch (e: any) {
      toast.error(e.message || "Erro ao sair do workspace.");
    } finally {
      setLeaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string, name: string) => {
    if (!activeOrg) return;
    if (!confirm(`Remover ${name} do workspace?`)) return;
    try {
      await removeWorkspaceMember(activeOrg.id, memberId);
      toast.success(`${name} foi removido(a).`);
      await Promise.all([
        refetchMembers(),
        refetchWorkspaces(),
        queryClient.invalidateQueries({ queryKey: ["workspace-members"] }),
      ]);
    } catch (e: any) {
      toast.error(e.message || "Erro ao remover membro.");
    }
  };

  const handleChangeRole = async (memberId: string, role: WorkspaceRole) => {
    if (!activeOrg) return;
    try {
      await updateMemberRole(activeOrg.id, memberId, role);
      toast.success("Cargo atualizado.");
      await Promise.all([
        refetchMembers(),
        refetchWorkspaces(),
        queryClient.invalidateQueries({ queryKey: ["workspace-members"] }),
      ]);
    } catch (e: any) {
      toast.error(e.message || "Erro ao alterar cargo.");
    }
  };

  return (
    <>
      <PageHeader
        title={
          <div className="flex items-center gap-2 group flex-wrap">
            <span>Workspace compartilhado</span>
            {activeOrg && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => { setNewName(activeOrg.name); setRenameModalOpen(true); }}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        }
        description={
          activeOrg
            ? `${activeOrg.name}${isPersonalWorkspace ? ' • Pessoal' : ''}`
            : 'Selecione um workspace'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {workspaces.length > 1 && (
              <select
                value={activeOrgIdx}
                onChange={(e) => setActiveOrgIdx(Number(e.target.value))}
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-ring/60"
              >
                {workspaces.map((ws: any, idx: number) => (
                  <option key={ws.id} value={idx}>{ws.name}</option>
                ))}
              </select>
            )}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo</span> Workspace
            </Button>
            {activeOrg && !isPersonalWorkspace && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleLeave}
                disabled={leaving}
              >
                {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Sair do workspace
              </Button>
            )}
          </div>
        }
      />

      <Dialog open={renameModalOpen} onOpenChange={setRenameModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Workspace</DialogTitle>
            <DialogDescription>Escolha um novo nome para o seu workspace.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do Workspace"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleRename} disabled={renaming || !newName.trim()}>
              {renaming ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== INVITE BY EMAIL CARD ===== */}
      <Card className="mb-4">
        <CardTitle
          title="Convidar por email"
          description={isAdmin
            ? "A pessoa receberá um email com o link para aceitar o convite."
            : "Apenas Owner ou Admin podem convidar membros."
          }
        />
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@exemplo.com"
              disabled={!isAdmin}
              className="h-10 flex-1 min-w-0 rounded-lg border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring/60 disabled:opacity-50"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
              disabled={!isAdmin}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-ring/60 disabled:opacity-50"
            >
              <option value="MEMBER">Membro</option>
              <option value="ADMIN">Admin</option>
            </select>
            <Button
              className="gap-2"
              disabled={!isAdmin || inviting || !inviteEmail.trim()}
              onClick={handleInvite}
            >
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Enviar convite
            </Button>
          </div>

          {lastInvite && !lastInvite.alreadyMember && lastInvite.inviteUrl && (
            <div className={`rounded-lg border p-3 animate-fade-in-up ${lastInvite.emailSent ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'}`}>
              <div className="flex items-start gap-3">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${lastInvite.emailSent ? 'bg-success/15 text-success animate-scale-in' : 'bg-warning/15 text-warning'}`}>
                  <Mail className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {lastInvite.emailSent ? '✓ Convite enviado por email!' : 'Convite criado (email não enviado)'}
                  </p>
                  {!lastInvite.emailSent && lastInvite.emailError && (
                    <p className="mt-1 text-[11px] text-warning leading-relaxed">
                      <strong>Motivo:</strong> {lastInvite.emailError}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {lastInvite.emailSent
                      ? 'Você também pode copiar o link e enviar manualmente, se preferir:'
                      : 'Copie este link e envie manualmente pra pessoa:'}
                  </p>
                  <div className="mt-2 flex items-center gap-2 rounded-md bg-background border border-border/60 px-2 py-1.5">
                    <code className="flex-1 truncate text-[11px] text-muted-foreground">{lastInvite.inviteUrl}</code>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(lastInvite.inviteUrl!);
                        toast.success('Link copiado!');
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <button
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setLastInvite(null)}
                  aria-label="Fechar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Members list */}
        <Card className="lg:col-span-2">
          <CardTitle title="Membros" description={`${members.length} pessoa(s) neste workspace`} />
          <ul className="-mx-2 divide-y divide-border/60">
            {members.length > 0 ? members.map((m: any) => {
              const r = roleConfig[m.role] || roleConfig.MEMBER;
              const Icon = r.icon;
              const name = m.user?.name || "Usuário";
              const email = m.user?.email || "";
              const color = m.avatarColor || "var(--primary)";
              const isSelf = m.user?.id === currentUserId;
              const memberIsOwner = m.role === 'OWNER';
              const canManage = isAdmin && !isSelf;
              const canManageThisMember = canManage && (!memberIsOwner || isOwner);
              return (
                <li key={m.id} className="flex items-center gap-3 px-2 py-3 transition-colors hover:bg-accent/30">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback style={{ background: `${color}25`, color }} className="font-bold">
                      {name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {name}
                      {isSelf && <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">(você)</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{email}</p>
                  </div>
                  {canManageThisMember ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium ${r.cls} hover:opacity-80`}>
                          <Icon className="h-3 w-3" /> {r.label} <ChevronDown className="h-3 w-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        {isOwner && (
                          <DropdownMenuItem onClick={() => handleChangeRole(m.id, 'OWNER')}>
                            <Shield className="h-3.5 w-3.5 mr-2" /> Owner
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleChangeRole(m.id, 'ADMIN')}>
                          <Shield className="h-3.5 w-3.5 mr-2" /> Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangeRole(m.id, 'MEMBER')}>
                          <UserIcon className="h-3.5 w-3.5 mr-2" /> Membro
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium ${r.cls}`}>
                      <Icon className="h-3 w-3" /> {r.label}
                    </span>
                  )}
                  {canManageThisMember && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleRemoveMember(m.id, name)}
                      title="Remover do workspace"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              );
            }) : (
              <li className="px-2 py-8 text-center text-sm text-muted-foreground">Nenhum membro no workspace</li>
            )}
          </ul>
        </Card>

        {/* Spend breakdown */}
        <Card>
          <CardTitle title="Quem gastou o quê" description="Este mês" />
          <ul className="space-y-3">
            {memberSpend.sort((a: any, b: any) => b.total - a.total).map(({ member, total }: any) => {
              const name = member.user?.name || "Usuário";
              const color = member.avatarColor || "var(--primary)";
              const pct = grand ? (total / grand) * 100 : 0;
              return (
                <li key={member.id}>
                  <div className="mb-1 flex items-center gap-2 text-xs">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback style={{ background: `${color}25`, color }} className="text-[10px] font-bold">
                        {name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium truncate">{name.split(" ")[0]}</span>
                    <span className="ml-auto tabular-nums text-muted-foreground shrink-0">{formatBRL(total)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {/* === INVITE LINK SECTION === */}
      {isAdmin && (
        <Card className="mt-4">
          <CardTitle title="Convite por link" description="Gere um link reutilizável para convidar pessoas sem precisar do email" />

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <select
              value={linkRole}
              onChange={(e) => setLinkRole(e.target.value as any)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-ring/60"
            >
              <option value="MEMBER">Membro</option>
              <option value="ADMIN">Admin</option>
            </select>
            <Button size="sm" className="gap-2" onClick={handleGenerateLink} disabled={generatingLink || !activeOrg}>
              {generatingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Gerar link
            </Button>
          </div>

          {inviteLinks.length > 0 ? (
            <ul className="-mx-2 divide-y divide-border/60">
              {inviteLinks.map((link: any) => {
                const expiresAt = new Date(link.expiresAt);
                const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86400000));
                const url = `${window.location.origin}/invite/${link.token}`;

                return (
                  <li key={link.id} className="flex items-center gap-3 px-2 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Link2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-mono text-muted-foreground">{url.replace(window.location.origin, '...')}</p>
                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                          link.role === 'ADMIN' ? 'bg-primary/15 text-primary' : 'bg-info/15 text-info'
                        }`}>
                          {link.role === 'ADMIN' ? 'Admin' : 'Membro'}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {daysLeft > 0 ? `Expira em ${daysLeft} dia(s)` : 'Expirado'} • {link.usedCount || 0} uso(s)
                        {link.createdBy?.name && ` • por ${link.createdBy.name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyLink(link.token)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRevokeLink(link.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Nenhum link ativo. Gere um acima para convidar pessoas.
            </div>
          )}
        </Card>
      )}

      {/* Recent activity */}
      <Card className="mt-4">
        <CardTitle title="Atividade recente do time" />
        <ul className="-mx-2 divide-y divide-border/60">
          {transactions.slice(0, 8).map((tx: any) => {
            const m = members.find((mem: any) => mem.id === tx.memberId) || members[0];
            const name = m?.user?.name || "Membro";
            const color = m?.avatarColor || "var(--primary)";
            return (
              <li key={tx.id} className="flex items-center gap-3 px-2 py-2.5 transition-colors hover:bg-accent/30">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback style={{ background: `${color}25`, color }} className="text-[10px] font-bold">
                    {name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-medium">{name.split(" ")[0]}</span>
                    <span className="text-muted-foreground"> {tx.type === "INCOME" ? "recebeu" : "gastou"} em </span>
                    <span className="font-medium">{tx.description}</span>
                  </p>
                </div>
                <span className={`text-sm font-semibold tabular-nums shrink-0 ${tx.type === "INCOME" ? "text-success" : ""}`}>
                  {tx.type === "INCOME" ? "+" : "−"}{formatBRL(tx.amountInCents || tx.amount || 0)}
                </span>
              </li>
            );
          })}
          {transactions.length === 0 && (
            <li className="px-2 py-8 text-center text-sm text-muted-foreground">Nenhuma atividade recente</li>
          )}
        </ul>
      </Card>

      {/* Create Workspace Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> Criar novo workspace
            </DialogTitle>
            <DialogDescription>
              Crie um workspace separado para organizar finanças de diferentes contextos (pessoal, empresa, família, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Nome do workspace</label>
            <Input
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Ex: Empresa, Família, Investimentos..."
              onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancelar</Button>
            <Button disabled={!newWorkspaceName.trim() || creating} onClick={handleCreateWorkspace} className="gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
