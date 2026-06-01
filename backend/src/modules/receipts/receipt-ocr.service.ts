import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Tesseract from 'tesseract.js';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { AiOrchestratorService } from '../financial-parser/ai-orchestrator.service';
import { withTimeout } from '../../common/utils/promise-utils';
import { formatBRT } from '../../common/utils/date.utils';
import { NfceParserService, NfceResult, NfceItem, PaymentDetail } from './nfce-parser.service';

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice?: number;
  total: number;
}

export interface ExtractedReceiptData {
  type: string;
  amount: number | null;
  category: string;
  description: string;
  merchantName?: string;
  items: ReceiptItem[];
  itemsCount: number;
  date: string;
  confidence: number;
  needsConfirmation: boolean;
  warnings?: string[];
  text?: string;
  // New NFC-e fields
  nfceResult?: NfceResult;
}

@Injectable()
export class ReceiptOcrService implements OnModuleInit {
  private readonly logger = new Logger(ReceiptOcrService.name);
  private tessdataDir = path.join(process.cwd(), 'tessdata');

  constructor(
    private aiOrchestrator: AiOrchestratorService,
    private nfceParser: NfceParserService,
  ) {}

  onModuleInit() {
    if (!fs.existsSync(path.join(this.tessdataDir, 'por.traineddata'))) {
      this.logger.error('OCR não configurado corretamente. Arquivo por.traineddata não encontrado.');
    }
  }

  async processReceiptFromUrl(fileUrl: string): Promise<ExtractedReceiptData | null> {
    const tempDir = path.join(process.cwd(), '..', 'economyzee-temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const tempPath = path.join(tempDir, `receipt-${Date.now()}.png`);
    
    try {
      this.logger.log(`[OCR] Baixando imagem do comprovante...`);
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer', timeout: 30000 });
      const imageBuffer = Buffer.from(response.data);
      await fs.promises.writeFile(tempPath, imageBuffer);

      // ===== STEP 1: Try QR Code first (PRIORITY) =====
      this.logger.log('[Receipt] 🔍 STEP 1: Tentando QR Code NFC-e...');
      const qrData = await this.nfceParser.detectAndDecodeQrCode(imageBuffer);

      if (qrData && this.nfceParser.isNfceUrl(qrData)) {
        this.logger.log('[Receipt] ✅ QR Code NFC-e detectado! Consultando SEFAZ...');
        const html = await this.nfceParser.fetchNfceData(qrData);

        if (html) {
          const nfceResult = this.nfceParser.parseNfceHtml(html) as NfceResult;

          // Validate split payment
          if (nfceResult.paymentDetails.length > 1) {
            const validation = this.nfceParser.validatePaymentSplit(nfceResult.amount, nfceResult.paymentDetails);
            nfceResult.splitPaymentStatus = validation === 'VALID' ? 'NEEDS_USER_CONFIRMATION' : 'NEEDS_CORRECTION';
          }

          this.logger.log(`[Receipt] 🎯 NFC-e OK: ${nfceResult.merchant} — R$ ${nfceResult.amount.toFixed(2)} (${nfceResult.source})`);

          return {
            type: 'expense',
            amount: Math.round(nfceResult.amount * 100),
            category: nfceResult.category,
            description: nfceResult.description,
            merchantName: nfceResult.merchant,
            items: nfceResult.items.map(i => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
            itemsCount: nfceResult.itemsCount,
            date: nfceResult.date || formatBRT(new Date(), 'yyyy-MM-dd'),
            confidence: nfceResult.confidence,
            needsConfirmation: true,
            nfceResult,
          };
        }
        this.logger.warn('[Receipt] ⚠️ SEFAZ falhou, fallback para OCR inteligente');
      } else if (qrData) {
        this.logger.log(`[Receipt] QR Code detectado mas não é NFC-e: ${qrData.substring(0, 60)}`);
      }

      // ===== STEP 2: Smart OCR Fallback =====
      this.logger.log('[Receipt] 🔍 STEP 2: OCR inteligente...');
      return await this.extractDataFromImage(tempPath);
    } catch (e: any) {
      this.logger.error(`[OCR] Falha ao processar comprovante da URL: ${e.message}`);
      throw e;
    } finally {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
  }

  async preprocessImage(imagePath: string): Promise<string> {
    const tempDir = path.join(process.cwd(), '..', 'economyzee-temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const outputPath = path.join(tempDir, `preprocessed-${Date.now()}.png`);
    
    await sharp(imagePath)
      .grayscale()
      .normalize()
      .sharpen()
      .resize({ width: 1200, withoutEnlargement: true })
      .toFile(outputPath);
      
    return outputPath;
  }

  // ==================== SMART TEXT CLEANING ====================

  private cleanText(text: string): string {
    const lines = text.split('\n');
    return lines.map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  // ==================== MERCHANT NAME ====================

  private extractMerchantName(text: string): string | null {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i];
      if (/(\.com|\.br|http|www|cnpj|sat|sef|qrcode|protocolo|chave|autoriza|extrato)/i.test(line)) continue;
      if (line === line.toUpperCase() || /(LTDA|ME|EIRELI|COM[ÉE]RCIO|MERCADO|FARM[ÁA]CIA|DROGARIA|RESTAURANTE)/i.test(line)) {
        return line.replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '').trim();
      }
    }
    return null;
  }

  // ==================== SMART ITEM EXTRACTION ====================

  private extractReceiptItems(text: string): ReceiptItem[] {
    const lines = text.split('\n').map(l => l.trim());
    const items: ReceiptItem[] = [];
    
    // Skip lines that are totals, payments, or metadata
    const skipPatterns = /(TOTAL|PAGO|TROCO|CART[AÃ]O|DINHEIRO|DESCONTO|VALOR|PAGAMENTO|CNPJ|CHAVE|PROTOCOLO|S[EÉ]RIE|SAT|TRIBUT)/i;
    
    for (const line of lines) {
      if (skipPatterns.test(line)) continue;
      const match = line.match(/^(.+?)\s+R?\$?\s*([\d]+[,.]\d{2})$/);
      if (match) {
        const name = match[1].replace(/^[0-9]+\s*(?:un|x|kg|l)\s*/i, '').trim();
        const total = parseFloat(match[2].replace(',', '.'));
        if (name.length > 2 && total > 0) items.push({ name, quantity: 1, total });
      }
    }
    return items;
  }

  // ==================== SMART AMOUNT EXTRACTION ====================

  /**
   * extractAmountSmart — Classifica cada valor encontrado no OCR em um bucket específico.
   * 
   * NUNCA soma valores de buckets diferentes.
   * A resolução final é delegada a resolveFinalReceiptAmount (única fonte de verdade).
   * 
   * Buckets: grossTotal, discount, paidAmount, amountToPay, liquidAmount, payment, tax (ignorado), item (ignorado)
   */
  private extractAmountSmart(text: string): { amount: number | null; isFallback: boolean; reason: string; payments: PaymentDetail[] } {
    const lines = text.split('\n').map(l => l.trim());
    const payments: PaymentDetail[] = [];
    
    // ---- Classified value buckets (ONLY ONE value per bucket) ----
    let grossTotal: number = 0;
    let discount: number = 0;
    let paidAmount: number | null = null;
    let amountToPay: number | null = null;
    let liquidAmount: number | null = null;
    
    // For logging
    const itemValues: number[] = [];
    const taxValues: number[] = [];
    const ignoredValues: { value: number; line: string; reason: string }[] = [];
    
    // Noise filter: lines to COMPLETELY ignore (metadata, not monetary)
    const metadataPattern = /^(CNPJ|CPF|CHAVE|PROTOCOLO|S[EÉ]RIE|SAT|INSCRI|C[OÓ]D|N[UÚ]MERO|VERS[AÃ]O|DATA|HORA|CUPOM|\d{44})/i;

    for (const line of lines) {
      if (metadataPattern.test(line)) continue;
      if (line.length < 3) continue;

      // Extract monetary value from this line
      const valMatch = line.match(/R?\$?\s*(\d{1,3}(?:[.,]?\d{3})*[.,]\d{2})/);
      if (!valMatch) continue;

      const valStr = valMatch[1].replace(/\s/g, '');
      let numStr = '';
      if (valStr.includes(',') && valStr.includes('.')) {
        numStr = valStr.replace(/\./g, '').replace(',', '.');
      } else if (valStr.includes(',')) {
        numStr = valStr.replace(',', '.');
      } else {
        numStr = valStr;
      }
      const num = parseFloat(numStr);
      if (isNaN(num) || num <= 0) continue;

      const lineLower = line.toLowerCase();

      // ---- CLASSIFY THIS LINE INTO EXACTLY ONE BUCKET ----

      // 1. TAX — ignore completely
      if (/tribut|federal|estadual|ibpt|icms|pis|cofins|aprox/i.test(lineLower)) {
        taxValues.push(num);
        ignoredValues.push({ value: num, line: line.substring(0, 60), reason: 'TRIBUTO' });
        continue;
      }

      // 2. DISCOUNT
      if (/desconto|descontos/i.test(lineLower)) {
        discount = num;
        continue;
      }

      // 3. VALOR PAGO / A PAGAR — when both appear on the same line, it's the paid amount
      //    e.g. "VALOR PAGO / A PAGAR R$ 124,39" → paidAmount
      if (/valor\s*pago/i.test(lineLower) && /a\s*pagar/i.test(lineLower)) {
        paidAmount = num;
        continue;
      }

      // 4. VALOR PAGO (standalone)
      if (/valor\s*pago|v\.?\s*pago/i.test(lineLower)) {
        paidAmount = num;
        continue;
      }

      // 5. A PAGAR / VALOR A PAGAR (standalone)
      if (/a\s*pagar|valor\s*a\s*pagar/i.test(lineLower)) {
        amountToPay = num;
        continue;
      }

      // 5. VALOR LÍQUIDO (not "líquido do item")
      if (/l[ií]quido/i.test(lineLower) && !/item|prod/i.test(lineLower)) {
        liquidAmount = num;
        continue;
      }

      // 6. PAYMENT METHOD — goes to payments array (will be SUMMED between themselves only)
      if (/cart[aã]o\s*(?:de\s*)?cr[eé]dito/i.test(lineLower)) {
        payments.push({ method: 'CREDIT_CARD', label: 'Cartão de crédito', amount: num, installments: 1 });
        continue;
      }
      if (/cart[aã]o\s*(?:de\s*)?d[eé]bito/i.test(lineLower)) {
        payments.push({ method: 'DEBIT_CARD', label: 'Cartão de débito', amount: num, installments: 1 });
        continue;
      }
      if (/\bpix\b/i.test(lineLower)) {
        payments.push({ method: 'PIX', label: 'Pix', amount: num, installments: 1 });
        continue;
      }
      if (/\bdinheiro\b/i.test(lineLower)) {
        payments.push({ method: 'CASH', label: 'Dinheiro', amount: num, installments: 1 });
        continue;
      }

      // 7. TROCO (change) — ignore, not a transaction value
      if (/troco/i.test(lineLower)) {
        ignoredValues.push({ value: num, line: line.substring(0, 60), reason: 'TROCO' });
        continue;
      }

      // 8. TOTAL (but not subtotal, total itens, total produtos)
      if (/\btotal\b/i.test(lineLower) && !/sub\s*total|total\s*(?:iten|prod|item)/i.test(lineLower)) {
        grossTotal = num;
        continue;
      }

      // 9. SUBTOTAL — use as grossTotal if no total found yet
      if (/sub\s*total/i.test(lineLower)) {
        if (grossTotal === 0) grossTotal = num;
        continue;
      }

      // 10. Everything else is classified as ITEM VALUE (ignored for total calculation)
      itemValues.push(num);
      // Don't log every item to keep logs clean
    }

    // ---- LOG: Classification results ----
    this.logger.log(`[ReceiptParser] Valores classificados:`);
    this.logger.log(`  • grossTotal: ${grossTotal}`);
    this.logger.log(`  • discount: ${discount}`);
    this.logger.log(`  • paidAmount: ${paidAmount}`);
    this.logger.log(`  • amountToPay: ${amountToPay}`);
    this.logger.log(`  • liquidAmount: ${liquidAmount}`);
    this.logger.log(`  • paymentDetails: ${payments.map(p => `${p.method} ${p.amount.toFixed(2)}`).join(', ') || 'nenhum'}`);
    this.logger.log(`[ReceiptParser] Valores ignorados:`);
    this.logger.log(`  • itemValues: ${itemValues.map(v => v.toFixed(2)).join(', ') || 'nenhum'}`);
    this.logger.log(`  • taxes: ${taxValues.map(v => v.toFixed(2)).join(', ') || 'nenhum'}`);
    if (ignoredValues.length > 0) {
      ignoredValues.forEach(v => this.logger.log(`  • ignorado: ${v.reason} ${v.value.toFixed(2)} "${v.line}"`));
    }

    // ---- RESOLVE using the single source of truth ----
    const resolution = this.nfceParser.resolveFinalReceiptAmount({
      grossTotal,
      discount,
      paidAmount,
      amountToPay,
      liquidAmount,
      paymentDetails: payments,
    });

    this.logger.log(`[ReceiptParser] ✅ Valor final: R$ ${resolution.amount.toFixed(2)} | Razão: ${resolution.reason}`);

    if (resolution.amount <= 0) {
      return { amount: null, isFallback: true, reason: resolution.reason, payments };
    }

    const amountCents = Math.round(resolution.amount * 100);
    return {
      amount: amountCents,
      isFallback: resolution.needsCorrection,
      reason: resolution.reason,
      payments,
    };
  }

  // ==================== CATEGORY ====================

  private categorize(text: string): string {
    const t = text.toLowerCase();
    if (/farm[aá]cia|drogaria|medicament/i.test(t)) return 'Saúde';
    if (/mercado|supermercado/i.test(t)) return 'Mercado';
    if (/posto|gasolina|combust/i.test(t)) return 'Transporte';
    if (/restaurante|ifood|padaria|lanchonete/i.test(t)) return 'Alimentação';
    if (/pet\s?shop|veterin/i.test(t)) return 'Pet';
    return 'Compras';
  }

  // ==================== MAIN OCR PROCESSING ====================

  async extractDataFromImage(imagePath: string): Promise<ExtractedReceiptData | null> {
    const startTime = Date.now();
    this.logger.log(`[OCR] Processando imagem ${imagePath}`);
    let worker: Tesseract.Worker | null = null;
    let preprocessedPath: string | null = null;

    try {
      preprocessedPath = await this.preprocessImage(imagePath);
      worker = await Tesseract.createWorker('por', 1, { langPath: this.tessdataDir, gzip: false });

      const { data: { text } } = await withTimeout(worker.recognize(preprocessedPath), 30000, 'OCR_TIMEOUT');
      const cleanedText = this.cleanText(text);

      this.logger.log(`[OCR] Texto extraído (${cleanedText.length} chars)`);

      // Smart extraction
      const amountRes = this.extractAmountSmart(cleanedText);
      const merchant = this.extractMerchantName(cleanedText);
      const items = this.extractReceiptItems(cleanedText);
      
      this.logger.log(`[OCR] Valor: R$ ${amountRes.amount ? (amountRes.amount / 100).toFixed(2) : 'N/A'} (${amountRes.reason})`);
      this.logger.log(`[OCR] Estabelecimento: ${merchant || 'N/A'}`);
      this.logger.log(`[OCR] Itens: ${items.length}, Pagamentos: ${amountRes.payments.length}`);

      // NOTE: We do NOT override the amount here. The value was already
      // resolved by resolveFinalReceiptAmount (single source of truth).
      // Never sum items/totals/payments together — they represent the SAME value.
      
      let confidence = 0.4;
      if (!amountRes.isFallback) confidence += 0.3;
      if (merchant) confidence += 0.15;
      if (items.length > 0) confidence += 0.1;

      // Build NfceResult for consistency
      // NOTE: amount is already the final resolved value (in cents), NOT totalBruto
      const hasSplit = amountRes.payments.length > 1;
      const nfceResult: NfceResult = {
        source: amountRes.isFallback ? 'OCR_FALLBACK' : 'OCR_SMART',
        merchant: merchant || 'Estabelecimento',
        date: formatBRT(new Date(), 'yyyy-MM-dd'),
        totalBruto: 0, // We don't know the gross total from OCR classification here
        discount: 0,
        amount: amountRes.amount ? amountRes.amount / 100 : 0,
        paymentDetails: amountRes.payments,
        items: items.map(i => ({ name: i.name, quantity: i.quantity, unitPrice: i.total, total: i.total })),
        itemsCount: items.length,
        category: this.categorize(cleanedText),
        description: merchant ? this.nfceParser.buildDescription(merchant) : 'Cupom fiscal',
        confidence,
        hasSplitPayment: hasSplit,
        splitPaymentStatus: hasSplit ? 'NEEDS_USER_CONFIRMATION' : 'VALID',
        warnings: [],
      };

      // Try AI enhancement for description/category
      let parsedData: ExtractedReceiptData;
      try {
        const aiResult: any = await withTimeout(
          this.aiOrchestrator.parse(text, cleanedText, { 
            amount: amountRes.amount, 
            type: 'expense', 
            category: this.categorize(cleanedText) 
          }),
          15000,
          'AI_TIMEOUT'
        );
        if (aiResult) {
          // AI can improve description/category but NOT override amount (our smart extraction is better)
          parsedData = {
            type: aiResult.type === 'unknown' ? 'expense' : aiResult.type,
            amount: amountRes.amount, // Keep our smart amount
            category: aiResult.category || nfceResult.category,
            description: merchant ? this.nfceParser.buildDescription(merchant) : (aiResult.description || 'Cupom fiscal'),
            merchantName: merchant || undefined,
            itemsCount: items.length,
            items,
            date: aiResult.date || formatBRT(new Date(), 'yyyy-MM-dd'),
            confidence: Math.max(confidence, (aiResult.confidence || 50) / 100),
            needsConfirmation: true,
            text: cleanedText,
            nfceResult,
          };
        } else {
          parsedData = this.buildLocalResult(cleanedText, merchant, amountRes.amount, items, confidence, nfceResult);
        }
      } catch (e: any) {
        this.logger.warn(`[OCR] IA falhou, usando dados locais: ${e.message}`);
        parsedData = this.buildLocalResult(cleanedText, merchant, amountRes.amount, items, confidence, nfceResult);
      }

      this.logger.log(`[OCR] ✅ Processado em ${Date.now() - startTime}ms`);
      return parsedData;
    } catch (e: any) {
      this.logger.error(`[OCR] Erro: ${e.message}`);
      throw e;
    } finally {
      if (worker) await worker.terminate();
      if (preprocessedPath && fs.existsSync(preprocessedPath)) fs.unlinkSync(preprocessedPath);
    }
  }

  private buildLocalResult(text: string, merchant: string | null, amount: number | null, items: ReceiptItem[], confidence: number, nfceResult: NfceResult): ExtractedReceiptData {
    return {
      type: 'expense',
      amount,
      category: nfceResult.category,
      description: merchant ? this.nfceParser.buildDescription(merchant) : 'Cupom fiscal',
      merchantName: merchant || undefined,
      itemsCount: items.length,
      items,
      date: formatBRT(new Date(), 'yyyy-MM-dd'),
      confidence,
      needsConfirmation: true,
      text,
      nfceResult,
    };
  }
}
