import { createFileRoute } from "@tanstack/react-router";
import { FileText, Download, FileSpreadsheet, Calendar, TrendingUp, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardTitle } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getReportPreview, generateReport, type ReportFormat } from "@/services/reports.service";
import { formatBRL } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Relatórios — EconomyZee" },
      { name: "description", content: "Relatórios prontos para baixar em PDF ou CSV." },
    ],
  }),
  component: ReportsPage,
});

const reports = [
  { id: "monthly", title: "Resumo mensal", description: "Receitas, despesas e saldo do mês corrente.", icon: Calendar, accent: "text-primary bg-primary/10" },
  { id: "categories", title: "Análise de categorias", description: "Detalhamento de gastos por categoria nos últimos 90 dias.", icon: TrendingUp, accent: "text-info bg-info/10" },
  { id: "fiscal", title: "Ano fiscal", description: "Visão consolidada do ano para declaração de IR.", icon: FileText, accent: "text-warning bg-warning/10" },
  { id: "invoices", title: "Faturas de cartão", description: "Histórico completo de faturas dos seus cartões.", icon: FileSpreadsheet, accent: "text-chart-4 bg-[oklch(0.7_0.2_320/15%)]" },
];

function ReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: preview } = useQuery({
    queryKey: ["report-preview"],
    queryFn: getReportPreview,
  });

  const handleDownload = async (reportId: string, format: ReportFormat) => {
    const key = `${reportId}-${format}`;
    setDownloading(key);
    try {
      const blob = await generateReport(reportId, format);
      if (!blob) {
        toast.error("Erro ao gerar relatório.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `economyzee-${reportId}.${format === 'xls' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Relatório ${format.toUpperCase()} baixado!`);
    } catch {
      toast.error("Erro ao gerar relatório.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Exporte os dados do EconomyZee em poucos cliques."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <Card key={r.id}>
              <div className="flex items-start gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${r.accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{r.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.description}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  disabled={downloading === `${r.id}-csv`}
                  onClick={() => handleDownload(r.id, 'csv')}
                >
                  {downloading === `${r.id}-csv` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  disabled={downloading === `${r.id}-xls`}
                  onClick={() => handleDownload(r.id, 'xls')}
                >
                  {downloading === `${r.id}-xls` ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                  Excel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  disabled={downloading === `${r.id}-pdf`}
                  onClick={() => handleDownload(r.id, 'pdf')}
                >
                  {downloading === `${r.id}-pdf` ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  PDF
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardTitle title="Pré-visualização" description={preview ? `Resumo mensal — ${preview.period}` : "Carregando..."} />
        <div className="rounded-xl border border-border/60 bg-background p-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">EconomyZee</p>
              <h3 className="mt-1 text-lg font-semibold">
                Resumo mensal — {preview?.period || "..."}
              </h3>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Receitas</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-success">
                {preview?.income != null ? `R$ ${preview.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Despesas</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {preview?.expenses != null ? `R$ ${preview.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Saldo</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-primary">
                {preview?.balance != null ? `R$ ${preview.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "—"}
              </p>
            </div>
          </div>
          {preview?.topCategories && preview.topCategories.length > 0 && (
            <div className="mt-6 space-y-1.5 text-sm">
              {preview.topCategories.map((c: any) => (
                <div key={c.name} className="flex items-center justify-between border-b border-border/40 py-1.5">
                  <span className="text-muted-foreground">{c.name}</span>
                  <span className="font-medium tabular-nums">
                    R$ {c.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
