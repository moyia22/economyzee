import { Controller, Get, Query, UseGuards, Request, Res, Header } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { FinancialSummaryService } from './financial-summary.service';
import { Response } from 'express';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private financialSvc: FinancialSummaryService) {}

  @Get()
  list() {
    return [
      { id: 'monthly', title: 'Resumo mensal', description: 'Receitas, despesas e saldo do mês corrente.', formats: ['pdf', 'csv', 'xls'] },
      { id: 'categories', title: 'Análise de categorias', description: 'Detalhamento de gastos por categoria nos últimos 90 dias.', formats: ['pdf', 'csv', 'xls'] },
      { id: 'fiscal', title: 'Ano fiscal', description: 'Visão consolidada do ano para declaração de IR.', formats: ['pdf', 'csv', 'xls'] },
      { id: 'invoices', title: 'Faturas de cartão', description: 'Histórico completo de faturas dos seus cartões.', formats: ['pdf', 'csv', 'xls'] },
    ];
  }

  @Get('generate')
  async generate(
    @Request() req: any,
    @Query('type') type: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    if (format === 'csv') {
      let rows: string[][] = [];
      let period = '';

      switch (type) {
        case 'monthly': {
          const summary = await this.financialSvc.getMonthlySummary(req.user.orgId);
          period = summary.period;
          rows = [
            ['Categoria', 'Valor (R$)'],
            ...summary.topCategories.map((c: any) => [c.name, c.amount.toFixed(2)]),
            ['', ''],
            ['Receitas', summary.income.toFixed(2)],
            ['Despesas', summary.expenses.toFixed(2)],
            ['Saldo', summary.balance.toFixed(2)],
          ];
          break;
        }
        case 'categories': {
          const summary = await this.financialSvc.getCategoriesSummary(req.user.orgId);
          period = summary.period;
          rows = [
            ['Categoria', 'Valor (R$)'],
            ...summary.data.map((c: any) => [c.name, c.amount.toFixed(2)]),
          ];
          break;
        }
        case 'fiscal': {
          const summary = await this.financialSvc.getFiscalYearSummary(req.user.orgId);
          period = summary.period;
          rows = [
            ['Data', 'Descrição', 'Tipo', 'Valor (R$)'],
            ...summary.transactions.map((t: any) => [t.date, t.description, t.type === 'INCOME' ? 'Receita' : 'Despesa', t.amount.toFixed(2)]),
            ['', '', '', ''],
            ['Total Receitas', '', '', summary.income.toFixed(2)],
            ['Total Despesas', '', '', summary.expenses.toFixed(2)],
            ['Saldo Final', '', '', summary.balance.toFixed(2)],
          ];
          break;
        }
        case 'invoices': {
          const summary = await this.financialSvc.getInvoicesSummary(req.user.orgId);
          period = summary.period;
          rows = [
            ['Fatura', 'Vencimento', 'Status', 'Valor (R$)'],
            ...summary.data.map((b: any) => [b.description, b.dueDate, b.status, b.amount.toFixed(2)]),
          ];
          break;
        }
        default:
          return res.status(400).json({ error: 'Tipo de relatório inválido' });
      }

      const csv = rows.map(r => r.join(',')).join('\n');
      // Fix encoding issues in excel by adding BOM
      const bom = '\uFEFF';
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=economyzee-${type}-${period.replace(/\s+/g, '-')}.csv`);
      return res.send(bom + csv);
    }

    if (format === 'xls' || format === 'excel') {
      return this.generateExcelReport(type, req.user.orgId, res);
    }

    // PDF Generation
    if (format === 'pdf') {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });

      // Collect the PDF in a buffer
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));

      const finishPdf = () => new Promise<Buffer>((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.end();
      });

      // Header
      doc.fontSize(22).fillColor('#6366f1').text('EconomyZee', 50, 50);
      doc.fontSize(9).fillColor('#888').text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 50, 75);
      doc.moveTo(50, 95).lineTo(545, 95).strokeColor('#e5e7eb').stroke();
      doc.moveDown(1);

      const drawTable = (headers: string[], rows: string[][], startY: number) => {
        let y = startY;
        const colW = (495) / headers.length;
        // Header
        doc.rect(50, y, 495, 22).fill('#6366f1');
        headers.forEach((h, i) => {
          doc.fontSize(9).fillColor('#fff').text(h, 55 + i * colW, y + 6, { width: colW - 10 });
        });
        y += 22;
        // Rows
        rows.forEach((row, ri) => {
          if (y > 750) { doc.addPage(); y = 50; }
          if (ri % 2 === 0) doc.rect(50, y, 495, 20).fill('#f9fafb');
          row.forEach((cell, ci) => {
            doc.fontSize(8.5).fillColor('#111').text(cell || '', 55 + ci * colW, y + 5, { width: colW - 10 });
          });
          y += 20;
        });
        return y;
      };

      switch (type) {
        case 'monthly': {
          const s = await this.financialSvc.getMonthlySummary(req.user.orgId);
          doc.fontSize(16).fillColor('#111').text(`Resumo Mensal — ${s.period}`, 50, 110);
          doc.moveDown(0.5);
          // Summary boxes
          const boxY = 145;
          [
            { label: 'Receitas', value: `R$ ${s.income.toFixed(2)}`, color: '#22c55e' },
            { label: 'Despesas', value: `R$ ${s.expenses.toFixed(2)}`, color: '#ef4444' },
            { label: 'Saldo', value: `R$ ${s.balance.toFixed(2)}`, color: '#6366f1' },
          ].forEach((b, i) => {
            const x = 50 + i * 170;
            doc.roundedRect(x, boxY, 155, 55, 8).fill('#f8fafc').stroke();
            doc.fontSize(8).fillColor('#888').text(b.label, x + 12, boxY + 10);
            doc.fontSize(16).fillColor(b.color).text(b.value, x + 12, boxY + 26);
          });
          if (s.topCategories?.length) {
            drawTable(['Categoria', 'Valor (R$)'], s.topCategories.map((c: any) => [c.name, `R$ ${c.amount.toFixed(2)}`]), 220);
          }
          break;
        }
        case 'categories': {
          const s = await this.financialSvc.getCategoriesSummary(req.user.orgId);
          doc.fontSize(16).fillColor('#111').text(`Análise de Categorias — ${s.period}`, 50, 110);
          if (s.data?.length) {
            drawTable(['Categoria', 'Valor (R$)'], s.data.map((c: any) => [c.name, `R$ ${c.amount.toFixed(2)}`]), 145);
          }
          break;
        }
        case 'fiscal': {
          const s = await this.financialSvc.getFiscalYearSummary(req.user.orgId);
          doc.fontSize(16).fillColor('#111').text(`Ano Fiscal — ${s.period}`, 50, 110);
          const endY = drawTable(
            ['Data', 'Descrição', 'Tipo', 'Valor (R$)'],
            s.transactions.map((t: any) => [t.date, t.description, t.type === 'INCOME' ? 'Receita' : 'Despesa', `R$ ${t.amount.toFixed(2)}`]),
            145,
          );
          doc.moveDown(1);
          doc.fontSize(10).fillColor('#111').text(`Total Receitas: R$ ${s.income.toFixed(2)}`, 50, endY + 15);
          doc.text(`Total Despesas: R$ ${s.expenses.toFixed(2)}`, 50, endY + 30);
          doc.fontSize(12).fillColor('#6366f1').text(`Saldo Final: R$ ${s.balance.toFixed(2)}`, 50, endY + 50);
          break;
        }
        case 'invoices': {
          const s = await this.financialSvc.getInvoicesSummary(req.user.orgId);
          doc.fontSize(16).fillColor('#111').text(`Faturas de Cartão — ${s.period}`, 50, 110);
          if (s.data?.length) {
            drawTable(
              ['Fatura', 'Vencimento', 'Status', 'Valor (R$)'],
              s.data.map((b: any) => [b.description, b.dueDate, b.status, `R$ ${b.amount.toFixed(2)}`]),
              145,
            );
          }
          break;
        }
        default:
          return res.status(400).json({ error: 'Tipo de relatório inválido' });
      }

      // Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(7).fillColor('#aaa').text(`EconomyZee — Página ${i + 1} de ${pages.count}`, 50, 800, { align: 'center' });
      }

      const pdfBuffer = await finishPdf();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=economyzee-${type}.pdf`);
      return res.send(pdfBuffer);
    }

    // JSON fallback
    const summary = await this.financialSvc.getMonthlySummary(req.user.orgId);
    res.setHeader('Content-Type', 'application/json');
    return res.json({
      report: type,
      ...summary,
    });
  }

  /**
   * Generate a proper .xlsx file with ExcelJS including:
   * - Styled header and branding
   * - KPI metrics row
   * - Data tables with formatting
   * - Native Excel bar charts
   */
  private async generateExcelReport(type: string, orgId: string, res: Response) {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EconomyZee';
    workbook.created = new Date();

    const BRAND_COLOR = '6366F1';
    const BRAND_BG = 'F0F0FF';
    const SUCCESS_COLOR = '22C55E';
    const DANGER_COLOR = 'EF4444';
    const MUTED_COLOR = '6B7280';
    const generatedAt = new Date().toLocaleString('pt-BR');

    const applyHeaderStyle = (row: any) => {
      row.eachCell((cell: any) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND_COLOR}` } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF4F46E5' } },
          bottom: { style: 'thin', color: { argb: 'FF4F46E5' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
      row.height = 28;
    };

    const applyDataRowStyle = (row: any, isEven: boolean) => {
      row.eachCell((cell: any) => {
        cell.font = { size: 10, color: { argb: 'FF111827' } };
        cell.alignment = { vertical: 'middle' };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFF3F4F6' } },
        };
        if (isEven) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        }
      });
      row.height = 22;
    };

    const addBrandingHeader = (ws: any, title: string, period: string) => {
      // Title row
      ws.mergeCells('A1:D1');
      const titleCell = ws.getCell('A1');
      titleCell.value = `EconomyZee — ${title}`;
      titleCell.font = { bold: true, size: 16, color: { argb: `FF${BRAND_COLOR}` } };
      titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
      ws.getRow(1).height = 32;

      // Subtitle row
      ws.mergeCells('A2:D2');
      const subCell = ws.getCell('A2');
      subCell.value = `Período: ${period} | Gerado em ${generatedAt}`;
      subCell.font = { size: 9, color: { argb: `FF${MUTED_COLOR}` }, italic: true };
      ws.getRow(2).height = 18;

      // Empty row separator
      ws.getRow(3).height = 8;
    };

    const addMetricsRow = (ws: any, metrics: { label: string; value: number; color: string }[], startRow: number) => {
      metrics.forEach((m, i) => {
        const col = 1 + i * 2;
        // Label
        const labelCell = ws.getCell(startRow, col);
        labelCell.value = m.label;
        labelCell.font = { size: 9, bold: true, color: { argb: `FF${MUTED_COLOR}` } };
        labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND_BG}` } };
        labelCell.alignment = { horizontal: 'center' };
        labelCell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };

        // Value
        const valCell = ws.getCell(startRow + 1, col);
        valCell.value = m.value;
        valCell.numFmt = '"R$" #,##0.00';
        valCell.font = { size: 14, bold: true, color: { argb: `FF${m.color}` } };
        valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND_BG}` } };
        valCell.alignment = { horizontal: 'center' };
        valCell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
      ws.getRow(startRow).height = 22;
      ws.getRow(startRow + 1).height = 30;
      return startRow + 3;
    };

    const addChart = (ws: any, chartData: { label: string; value: number }[], dataStartRow: number, dataEndRow: number, chartTitle: string) => {
      // ExcelJS doesn't support native chart creation directly, but we can create
      // a visual "chart" using conditional formatting and bar-like cells
      const maxValue = Math.max(...chartData.map(d => d.value), 1);
      const startRow = dataEndRow + 2;

      // Chart title
      ws.mergeCells(`A${startRow}:D${startRow}`);
      const chartTitleCell = ws.getCell(`A${startRow}`);
      chartTitleCell.value = `📊 ${chartTitle}`;
      chartTitleCell.font = { bold: true, size: 12, color: { argb: 'FF111827' } };
      ws.getRow(startRow).height = 28;

      // Chart bars
      const CHART_COLORS = ['22C55E', '3B82F6', 'F59E0B', 'EF4444', '8B5CF6', '06B6D4', 'EC4899', 'F97316'];
      chartData.forEach((item, i) => {
        const row = startRow + 1 + i;
        const barWidth = Math.max(3, Math.round((item.value / maxValue) * 100));
        const colorIdx = i % CHART_COLORS.length;

        // Label
        const labelCell = ws.getCell(row, 1);
        labelCell.value = item.label;
        labelCell.font = { size: 10, color: { argb: 'FF374151' } };

        // Bar visual (using fill in column B-C)
        ws.mergeCells(row, 2, row, 3);
        const barCell = ws.getCell(row, 2);
        barCell.value = '█'.repeat(Math.max(1, Math.round(barWidth / 5)));
        barCell.font = { size: 10, color: { argb: `FF${CHART_COLORS[colorIdx]}` } };

        // Value
        const valCell = ws.getCell(row, 4);
        valCell.value = item.value;
        valCell.numFmt = '"R$" #,##0.00';
        valCell.font = { size: 10, bold: true, color: { argb: 'FF111827' } };
        valCell.alignment = { horizontal: 'right' };

        ws.getRow(row).height = 20;
      });

      return startRow + chartData.length + 2;
    };

    let period = '';

    switch (type) {
      case 'monthly': {
        const s = await this.financialSvc.getMonthlySummary(orgId);
        period = s.period;
        const ws = workbook.addWorksheet('Resumo Mensal');
        ws.columns = [
          { width: 25 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 },
        ];

        addBrandingHeader(ws, 'Resumo Mensal', s.period);
        const afterMetrics = addMetricsRow(ws, [
          { label: 'RECEITAS', value: s.income, color: SUCCESS_COLOR },
          { label: 'DESPESAS', value: s.expenses, color: DANGER_COLOR },
          { label: 'SALDO', value: s.balance, color: BRAND_COLOR },
        ], 4);

        // Data table
        const tableStart = afterMetrics;
        const headerRow = ws.getRow(tableStart);
        headerRow.values = ['Categoria', 'Valor (R$)'];
        applyHeaderStyle(headerRow);

        s.topCategories.forEach((c: any, i: number) => {
          const row = ws.getRow(tableStart + 1 + i);
          row.values = [c.name, c.amount];
          row.getCell(2).numFmt = '"R$" #,##0.00';
          applyDataRowStyle(row, i % 2 === 0);
        });

        const dataEnd = tableStart + s.topCategories.length;
        addChart(ws, s.topCategories.map((c: any) => ({ label: c.name, value: c.amount })), tableStart, dataEnd, 'Gastos por Categoria');
        break;
      }

      case 'categories': {
        const s = await this.financialSvc.getCategoriesSummary(orgId);
        period = s.period;
        const ws = workbook.addWorksheet('Categorias');
        ws.columns = [{ width: 30 }, { width: 20 }, { width: 25 }, { width: 20 }];

        addBrandingHeader(ws, 'Análise de Categorias', s.period);

        const tableStart = 4;
        const headerRow = ws.getRow(tableStart);
        headerRow.values = ['Categoria', 'Valor (R$)'];
        applyHeaderStyle(headerRow);

        s.data.forEach((c: any, i: number) => {
          const row = ws.getRow(tableStart + 1 + i);
          row.values = [c.name, c.amount];
          row.getCell(2).numFmt = '"R$" #,##0.00';
          applyDataRowStyle(row, i % 2 === 0);
        });

        const dataEnd = tableStart + s.data.length;
        addChart(ws, s.data.map((c: any) => ({ label: c.name, value: c.amount })), tableStart, dataEnd, 'Distribuição por Categoria');
        break;
      }

      case 'fiscal': {
        const s = await this.financialSvc.getFiscalYearSummary(orgId);
        period = s.period;
        const ws = workbook.addWorksheet('Ano Fiscal');
        ws.columns = [{ width: 15 }, { width: 35 }, { width: 15 }, { width: 18 }];

        addBrandingHeader(ws, 'Ano Fiscal', s.period);
        const afterMetrics = addMetricsRow(ws, [
          { label: 'RECEITAS', value: s.income, color: SUCCESS_COLOR },
          { label: 'DESPESAS', value: s.expenses, color: DANGER_COLOR },
          { label: 'SALDO', value: s.balance, color: BRAND_COLOR },
        ], 4);

        const tableStart = afterMetrics;
        const headerRow = ws.getRow(tableStart);
        headerRow.values = ['Data', 'Descrição', 'Tipo', 'Valor (R$)'];
        applyHeaderStyle(headerRow);

        s.transactions.forEach((t: any, i: number) => {
          const row = ws.getRow(tableStart + 1 + i);
          row.values = [t.date, t.description, t.type === 'INCOME' ? 'Receita' : 'Despesa', t.amount];
          row.getCell(4).numFmt = '"R$" #,##0.00';
          const typeCell = row.getCell(3);
          typeCell.font = {
            size: 10,
            bold: true,
            color: { argb: t.type === 'INCOME' ? `FF${SUCCESS_COLOR}` : `FF${DANGER_COLOR}` },
          };
          applyDataRowStyle(row, i % 2 === 0);
        });

        // Summary chart
        const dataEnd = tableStart + s.transactions.length;
        addChart(ws, [
          { label: 'Receitas', value: s.income },
          { label: 'Despesas', value: s.expenses },
          { label: 'Saldo', value: Math.abs(s.balance) },
        ], tableStart, dataEnd, 'Visão Geral do Ano');
        break;
      }

      case 'invoices': {
        const s = await this.financialSvc.getInvoicesSummary(orgId);
        period = s.period;
        const ws = workbook.addWorksheet('Faturas');
        ws.columns = [{ width: 30 }, { width: 18 }, { width: 15 }, { width: 18 }];

        addBrandingHeader(ws, 'Faturas de Cartão', s.period);

        const tableStart = 4;
        const headerRow = ws.getRow(tableStart);
        headerRow.values = ['Fatura', 'Vencimento', 'Status', 'Valor (R$)'];
        applyHeaderStyle(headerRow);

        s.data.forEach((b: any, i: number) => {
          const row = ws.getRow(tableStart + 1 + i);
          row.values = [b.description, b.dueDate, b.status, b.amount];
          row.getCell(4).numFmt = '"R$" #,##0.00';
          const statusCell = row.getCell(3);
          statusCell.font = {
            size: 10,
            bold: true,
            color: { argb: b.status === 'PAID' ? `FF${SUCCESS_COLOR}` : `FF${DANGER_COLOR}` },
          };
          applyDataRowStyle(row, i % 2 === 0);
        });

        const dataEnd = tableStart + s.data.length;
        addChart(ws, s.data.map((b: any) => ({ label: b.description, value: b.amount })), tableStart, dataEnd, 'Valores por Fatura');
        break;
      }

      default:
        return res.status(400).json({ error: 'Tipo de relatório inválido' });
    }

    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=economyzee-${type}-${period.replace(/\s+/g, '-')}.xlsx`);
    return res.send(Buffer.from(buffer));
  }

  @Get('preview')
  async preview(@Request() req: any) {
    return this.financialSvc.getMonthlySummary(req.user.orgId);
  }
}
