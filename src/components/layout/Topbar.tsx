import { Bell, Search, Plus, Command, Trash2, Menu, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Link, useNavigate } from "@tanstack/react-router";
import { getWorkspaces, deleteWorkspace, leaveWorkspace } from "@/services/workspace.service";
import { useAuth } from "@/hooks/useAuth";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { api } from "@/services/api-client";
import { toast } from "sonner";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const [user, setUser] = useState<any>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();

  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => getWorkspaces().catch(() => []),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<any[]>('/categories').catch(() => []),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api.get<any[]>('/accounts').catch(() => []),
  });

  const activeWsId = localStorage.getItem('economyzee_org_id');
  const activeWs = workspaces.find((w: any) => w.id === activeWsId) || workspaces[0] || { id: 'default', name: 'Pessoal', initials: 'P' };

  // Atualizar localStorage se não estiver setado mas tiver workspaces
  useEffect(() => {
    if (!activeWsId && workspaces.length > 0) {
      localStorage.setItem('economyzee_org_id', workspaces[0].id);
      queryClient.invalidateQueries();
    }
  }, [workspaces, activeWsId, queryClient]);

  useEffect(() => {
    api.get<any>('/auth/me')
      .then((profile) => {
        const localUser = {
          id: profile.id,
          email: profile.email,
          user_metadata: { full_name: profile.name },
        };
        setUser(localUser);
        setCurrentUserId(profile.id || null);
      })
      .catch(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
          setUser(user);
          setCurrentUserId(user?.id || null);
        });
      });
  }, []);

  /**
   * Em cada workspace, identifica o dono e o role do usuário corrente.
   * Fallback para o admin mais antigo so existe para dados antigos antes do role OWNER.
   */
  const wsRolesInfo = useMemo(() => {
    const map = new Map<string, { isOwner: boolean; isAdmin: boolean; isPersonal: boolean }>();
    workspaces.forEach((w: any) => {
      const sortedMembers = [...(w.members || [])].sort(
        (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const owner =
        sortedMembers.find((m: any) => m.role === 'OWNER') ||
        sortedMembers.find((m: any) => m.role === 'ADMIN');
      const mine = sortedMembers.find((m: any) => (m.user?.id || m.userId) === currentUserId);
      map.set(w.id, {
        isOwner: !!owner && !!mine && (owner.user?.id || owner.userId) === currentUserId,
        isAdmin: mine?.role === 'OWNER' || mine?.role === 'ADMIN',
        isPersonal: w.type === 'PERSONAL',
      });
    });
    return map;
  }, [workspaces, currentUserId]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login", search: { redirect: undefined }, replace: true });
  };

  const handleSwitchWorkspace = (id: string) => {
    localStorage.setItem('economyzee_org_id', id);
    toast.success("Workspace alterado com sucesso!");
    // Recarregar a página para garantir que todos os contextos e queries usem o novo orgId
    window.location.reload();
  };

  const handleDeleteWorkspace = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (workspaces.length <= 1) {
      toast.error("Você não pode excluir seu único workspace.");
      return;
    }

    if (!confirm(`Excluir o workspace "${name}"? Todas as transações e dados serão perdidos permanentemente.`)) {
      return;
    }

    try {
      await deleteWorkspace(id);
      toast.success("Workspace excluído!");

      if (activeWsId === id) {
        localStorage.removeItem('economyzee_org_id');
      }

      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir workspace");
    }
  };

  const handleLeaveWorkspace = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Sair do workspace "${name}"? Você perderá acesso às transações deste workspace.`)) {
      return;
    }
    try {
      const result = await leaveWorkspace(id);
      toast.success(`Você saiu de "${name}".`);

      if (activeWsId === id) {
        if (result.nextOrgId) {
          localStorage.setItem('economyzee_org_id', result.nextOrgId);
        } else {
          localStorage.removeItem('economyzee_org_id');
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workspaces"] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-members"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      ]);
      // Recarregar pra trocar pro workspace padrão
      setTimeout(() => window.location.reload(), 400);
    } catch (err: any) {
      toast.error(err.message || "Erro ao sair do workspace");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQ.trim()) {
      navigate({ to: '/transactions', search: { q: searchQ.trim() } });
      setSearchOpen(false);
      setSearchQ("");
    }
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Usuário";
  const userEmail = user?.email || "";
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur md:px-6">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-accent lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>
      {/* Workspace switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="group flex h-9 items-center gap-2.5 rounded-lg border border-border bg-card px-2.5 text-sm font-medium transition-colors hover:bg-accent">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-[10px] font-bold text-primary">
              {activeWs.name?.[0]?.toUpperCase() || 'P'}
            </span>
            <span className="hidden sm:inline">{activeWs.name}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="flex items-center justify-between">
            Workspaces
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => navigate({ to: '/settings' })}>
              <Plus className="h-3 w-3" />
            </Button>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((w: any) => {
            const roles = wsRolesInfo.get(w.id) || { isOwner: false, isAdmin: false, isPersonal: false };
            return (
              <DropdownMenuItem
                key={w.id}
                className="group flex items-center gap-2.5"
                onClick={() => handleSwitchWorkspace(w.id)}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-xs font-bold text-primary shrink-0">
                  {w.name?.[0]?.toUpperCase() || '?'}
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{w.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {w.members?.length || 1} membro(s)
                    {roles.isOwner && ' • dono'}
                    {!roles.isOwner && roles.isAdmin && ' • admin'}
                  </span>
                </div>

                <div className="ml-auto flex items-center gap-1 shrink-0">
                  {w.id === activeWs.id && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                  {/* Sair: aparece quando NÃO é dono nem o workspace pessoal — convidado em compartilhado */}
                  {!roles.isPersonal && (
                    <button
                      onClick={(e) => handleLeaveWorkspace(e, w.id, w.name)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-warning"
                      title="Sair deste workspace"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {/* Excluir: só o dono pode excluir o workspace */}
                  {roles.isOwner && (
                    <button
                      onClick={(e) => handleDeleteWorkspace(e, w.id, w.name)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
                      title="Excluir workspace"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </DropdownMenuItem>
            );
          })}
          {workspaces.length === 0 && (
            <DropdownMenuItem disabled className="text-muted-foreground">
              Nenhum workspace
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Search */}
      <div className="relative ml-2 hidden flex-1 max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar transações, contas, categorias…"
          className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-16 text-sm outline-none placeholder:text-muted-foreground focus:border-ring/60"
          onFocus={() => setSearchOpen(true)}
          readOnly
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden h-5 -translate-y-1/2 items-center gap-1 rounded border border-border bg-background px-1.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
          <Command className="h-3 w-3" />K
        </kbd>
      </div>

      {/* Search Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-[480px] p-0">
          <form onSubmit={handleSearch} className="flex items-center border-b border-border px-4">
            <Search className="h-5 w-5 text-muted-foreground mr-3" />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Buscar em transações..."
              className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <kbd className="h-5 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">ESC</kbd>
          </form>
          <div className="px-4 py-3 text-xs text-muted-foreground">
            <p>Pressione Enter para buscar nas transações.</p>
          </div>
        </DialogContent>
      </Dialog>

      <div className="ml-auto flex items-center gap-1.5">
        <TransactionModal categories={categories} accounts={accounts} />

        <button
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-accent"
          )}
          aria-label="Notificações"
          onClick={() => navigate({ to: '/settings' })}
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-accent">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback className="bg-primary/15 text-xs font-bold text-primary">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{userName}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {userEmail}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">Perfil</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings">Configurações</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Suporte</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={handleLogout}
            >
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
