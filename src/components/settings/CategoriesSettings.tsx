import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardTitle } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Pencil, Trash2, Loader2, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getCategories, createCategory, updateCategory, deleteCategory, restoreDefaultCategories,
  type Category,
} from "@/services/categories.service";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
  "#d946ef", "#ec4899", "#f43f5e", "#64748b",
];

export function CategoriesSettings() {
  const qc = useQueryClient();
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories().catch(() => []),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState(PRESET_COLORS[4]);

  const activeCount = categories.filter(c => c.active !== false).length;
  const inactiveCount = categories.filter(c => c.active === false).length;

  // Mutations
  const createMut = useMutation({
    mutationFn: (data: { name: string; color: string }) => createCategory(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Categoria criada!"); closeDialog(); },
    onError: (e: any) => toast.error(e.message || "Erro ao criar categoria"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateCategory>[1] }) => updateCategory(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Categoria atualizada!"); closeDialog(); },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Categoria excluída!"); setDeleteDialogOpen(false); setDeletingCategory(null); },
    onError: (e: any) => toast.error(e.message || "Erro ao excluir"),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateCategory(id, { active }),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ["categories"] }); toast.success(vars.active ? "Categoria ativada" : "Categoria desativada"); },
    onError: (e: any) => toast.error(e.message || "Erro ao alterar status"),
  });

  const restoreMut = useMutation({
    mutationFn: restoreDefaultCategories,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categorias padrão adicionadas!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao adicionar categorias padrão"),
  });

  function openCreate() {
    setEditingCategory(null);
    setFormName("");
    setFormColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setDialogOpen(true);
  }

  function openEdit(cat: Category) {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormColor(cat.color || PRESET_COLORS[0]);
    setDialogOpen(true);
  }

  function openDelete(cat: Category) {
    setDeletingCategory(cat);
    setDeleteDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingCategory(null);
    setFormName("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = formName.trim();
    if (!name) return toast.error("Nome obrigatório");

    if (editingCategory) {
      updateMut.mutate({ id: editingCategory.id, data: { name, color: formColor } });
    } else {
      createMut.mutate({ name, color: formColor });
    }
  }

  const isSaving = createMut.isPending || updateMut.isPending;

  // Sort: active first, then alphabetical
  const sorted = [...categories].sort((a, b) => {
    if ((a.active !== false) !== (b.active !== false)) return a.active !== false ? -1 : 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });

  return (
    <Card>
      <CardTitle
        title="Categorias"
        description={`${activeCount} ativa${activeCount !== 1 ? "s" : ""}${inactiveCount > 0 ? ` · ${inactiveCount} inativa${inactiveCount !== 1 ? "s" : ""}` : ""}`}
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => restoreMut.mutate()}
              disabled={restoreMut.isPending}
            >
              {restoreMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Padrão
            </Button>
            <Button size="sm" className="gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Nova
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma categoria encontrada</p>
          <div className="mt-3 flex justify-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => restoreMut.mutate()} disabled={restoreMut.isPending}>
              {restoreMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Adicionar padrão
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Criar primeira categoria
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {sorted.map((cat) => {
            const isActive = cat.active !== false;
            return (
              <div
                key={cat.id}
                className={`group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all ${
                  isActive
                    ? "border-border/60 hover:border-border"
                    : "border-border/30 opacity-50 hover:opacity-70"
                }`}
              >
                {/* Color dot */}
                <span
                  className="h-3 w-3 shrink-0 rounded-full ring-2 ring-offset-1 ring-offset-background transition-shadow"
                  style={{
                    background: cat.color || "var(--primary)",
                    boxShadow: isActive ? `0 0 8px ${cat.color || "var(--primary)"}40` : "none",
                  }}
                />

                {/* Name */}
                <span className={`flex-1 text-sm font-medium truncate ${!isActive ? "line-through text-muted-foreground" : ""}`}>
                  {cat.name}
                </span>

                {/* Toggle */}
                <Switch
                  checked={isActive}
                  onCheckedChange={(checked) => toggleMut.mutate({ id: cat.id, active: checked })}
                  className="data-[state=checked]:bg-primary"
                />

                {/* Actions (visible on hover) */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(cat)}
                    className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => openDelete(cat)}
                    className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Altere o nome ou a cor da categoria." : "Crie uma nova categoria para organizar seus lançamentos."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Nome</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Alimentação"
                autoFocus
                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-ring/60 placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Cor</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormColor(color)}
                    className={`h-7 w-7 rounded-full border-2 transition-all ${
                      formColor === color
                        ? "border-white scale-110 shadow-lg"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ background: color, boxShadow: formColor === color ? `0 0 12px ${color}80` : undefined }}
                  />
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" disabled={isSaving} className="gap-1.5">
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editingCategory ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Excluir Categoria
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>"{deletingCategory?.name}"</strong>?
              Transações vinculadas podem perder a referência da categoria.
              <br /><br />
              <span className="text-xs text-muted-foreground">
                💡 Dica: Considere <strong>desativar</strong> a categoria em vez de excluí-la.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeletingCategory(null); }}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              className="gap-1.5"
              onClick={() => deletingCategory && deleteMut.mutate(deletingCategory.id)}
            >
              {deleteMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
