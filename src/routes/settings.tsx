import { createFileRoute } from "@tanstack/react-router";
import { Send, CheckCircle2, Bell, User, Tag, Wallet, Save, Loader2, Database, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getAccounts } from "@/services/accounts.service";
import { createSmartAlert, deleteSmartAlert, getCustomSmartAlerts } from "@/services/dashboard.service";
import { TelegramSettings } from "@/components/settings/TelegramSettings";
import { DataManagementSettings } from "@/components/settings/DataManagementSettings";
import { CategoriesSettings } from "@/components/settings/CategoriesSettings";
import { api } from "@/services/api-client";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Configurações — EconomyZee" },
      { name: "description", content: "Perfil, categorias, contas, notificações e integração com Telegram." },
    ],
  }),
  component: SettingsPage,
});

const defaultNotifications = {
  dailySummary: true,
  budgetAlert: true,
  dueDateAlert: true,
  highAmount: false,
  weeklyInsights: true,
};

function SettingsPage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState(defaultNotifications);
  const [aiNotificationPrompt, setAiNotificationPrompt] = useState("");

  // Categories are managed by the CategoriesSettings component

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => getAccounts().catch(() => []),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: customAlerts = [] } = useQuery({
    queryKey: ["custom-smart-alerts"],
    queryFn: () => getCustomSmartAlerts().catch(() => []),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const createAlertMut = useMutation({
    mutationFn: createSmartAlert,
    onSuccess: () => {
      setAiNotificationPrompt("");
      queryClient.invalidateQueries({ queryKey: ["custom-smart-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "smart-alerts"] });
      toast.success("Notificação inteligente criada!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao criar notificação inteligente."),
  });

  const deleteAlertMut = useMutation({
    mutationFn: deleteSmartAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-smart-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "smart-alerts"] });
      toast.success("Notificação removida.");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao remover notificação."),
  });

  useEffect(() => {
    api.get<any>('/auth/me')
      .then((profile) => {
        const localUser = {
          id: profile.id,
          email: profile.email,
          phone: profile.phone,
          user_metadata: { full_name: profile.name },
        };
        setUser(localUser);
        setProfileName(profile.name || profile.email?.split('@')[0] || "");
        setProfilePhone(profile.phone || "");
      })
      .catch(() => {});
    // Load saved notification preferences from localStorage
    const saved = localStorage.getItem('economyzee_notif_prefs');
    if (saved) {
      try { setNotifPrefs(JSON.parse(saved)); } catch {}
    }
  }, []);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Usuário";
  const userEmail = user?.email || "";
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const profile = await api.patch<any>('/auth/me', {
        name: profileName,
        phone: profilePhone || null,
      });
      setUser({
        id: profile.id,
        email: profile.email,
        phone: profile.phone,
        user_metadata: { full_name: profile.name },
      });
      toast.success("Perfil atualizado!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleNotif = (key: keyof typeof defaultNotifications) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('economyzee_notif_prefs', JSON.stringify(next));
      toast.success("Preferência salva!");
      return next;
    });
  };

  return (
    <>
      <PageHeader title="Configurações" description="Personalize seu workspace EconomyZee." />

      <Tabs defaultValue="telegram">
        <TabsList className="mb-4 flex w-full justify-start overflow-x-auto no-scrollbar pb-2 sm:pb-0 h-auto p-1 gap-1">
          <TabsTrigger value="profile" className="shrink-0 px-2.5 sm:px-3">
            <User className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="shrink-0 px-2.5 sm:px-3">
            <Tag className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Categorias</span>
          </TabsTrigger>
          <TabsTrigger value="accounts" className="shrink-0 px-2.5 sm:px-3">
            <Wallet className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Contas</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="shrink-0 px-2.5 sm:px-3">
            <Bell className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Notificações</span>
          </TabsTrigger>
          <TabsTrigger value="telegram" className="shrink-0 px-2.5 sm:px-3">
            <Send className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Telegram</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="shrink-0 px-2.5 sm:px-3">
            <Database className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Dados</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardTitle title="Perfil" description="Suas informações pessoais" />
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/15 text-lg font-bold text-primary">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">{userName}</p>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Nome completo</label>
                <input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-ring/60"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">E-mail</label>
                <input
                  value={userEmail}
                  disabled
                  className="mt-1 h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-muted-foreground outline-none cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Telefone</label>
                <input
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="+55 11 99999-9999"
                  className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring/60"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Fuso horário</label>
                <input
                  value="América/São Paulo"
                  disabled
                  className="mt-1 h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-muted-foreground outline-none cursor-not-allowed"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button size="sm" className="gap-2" onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar alterações
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <CategoriesSettings />
        </TabsContent>

        <TabsContent value="accounts">
          <Card>
            <CardTitle title="Contas conectadas" />
            {accounts.length > 0 ? (
              <ul className="-mx-2 divide-y divide-border/60">
                {accounts.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-2 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: a.color || 'var(--primary)' }}>
                      {(a.bank || a.name || "?")[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{a.name}</p>
                      <p className="text-[11px] text-muted-foreground">{a.bank || "Banco"}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-md border border-success/25 bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                      <CheckCircle2 className="h-3 w-3" /> Conectada
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma conta conectada</div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardTitle title="Notificações" description="Controle quais alertas você deseja receber" />
            <ul className="space-y-1">
              <NotifRow label="Resumo diário por e-mail" checked={notifPrefs.dailySummary} onToggle={() => toggleNotif('dailySummary')} />
              <NotifRow label="Alertas de orçamento estourado" checked={notifPrefs.budgetAlert} onToggle={() => toggleNotif('budgetAlert')} />
              <NotifRow label="Vencimentos próximos (3 dias antes)" checked={notifPrefs.dueDateAlert} onToggle={() => toggleNotif('dueDateAlert')} />
              <NotifRow label="Transações acima de R$ 500" checked={notifPrefs.highAmount} onToggle={() => toggleNotif('highAmount')} />
              <NotifRow label="Insights semanais da IA" checked={notifPrefs.weeklyInsights} onToggle={() => toggleNotif('weeklyInsights')} />
            </ul>

            <div className="mt-6 rounded-lg border border-border/60 bg-background/40 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" />
                Criar notificação com IA
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Descreva a regra em linguagem natural e a IA transforma em um alerta inteligente.
              </p>

              {/* Example prompts */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[
                  "Me avise quando mercado passar de R$ 800 no mês",
                  "Alertar se gastos com lazer subirem 50%",
                  "Notificar quando receitas ultrapassarem despesas",
                  "Avisar se algum cartão estiver acima de 80% do limite",
                ].map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setAiNotificationPrompt(example)}
                    className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-[10px] text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                  >
                    {example}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  value={aiNotificationPrompt}
                  onChange={(e) => setAiNotificationPrompt(e.target.value)}
                  placeholder="Ex: me avise quando mercado passar de R$ 800 no mês"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring/60"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && aiNotificationPrompt.trim() && !createAlertMut.isPending) {
                      createAlertMut.mutate(aiNotificationPrompt);
                    }
                  }}
                />
                <Button
                  className="gap-2"
                  onClick={() => createAlertMut.mutate(aiNotificationPrompt)}
                  disabled={createAlertMut.isPending || !aiNotificationPrompt.trim()}
                >
                  {createAlertMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Gerar
                </Button>
              </div>

              {customAlerts.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {customAlerts.map((alert: any) => (
                    <li key={alert.id} className="flex items-start gap-3 rounded-lg border border-border/50 p-3">
                      <span className={`mt-0.5 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        alert.level === 'CRITICAL' ? 'bg-destructive/10 text-destructive' :
                        alert.level === 'WARNING' ? 'bg-warning/10 text-warning' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {String(alert.level || "INFO").toLowerCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{alert.message}</p>
                      </div>
                      <button
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Remover"
                        onClick={() => deleteAlertMut.mutate(alert.id)}
                        disabled={deleteAlertMut.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="telegram">
          <TelegramSettings />
        </TabsContent>

        <TabsContent value="data">
          <DataManagementSettings />
        </TabsContent>

      </Tabs>
    </>
  );
}

function NotifRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <li className="flex items-center justify-between rounded-lg px-2 py-3 hover:bg-accent/40">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onToggle} />
    </li>
  );
}
