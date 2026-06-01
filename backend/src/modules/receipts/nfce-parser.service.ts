import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import jsQR from 'jsqr';
import axios from 'axios';

// ==================== INTERFACES ====================

export interface PaymentDetail {
  method: 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX' | 'CASH' | 'OTHER';
  label: string;
  amount: number;
  installments: number;
}

export interface NfceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface NfceResult {
  source: 'NFCE_QRCODE' | 'OCR_SMART' | 'OCR_FALLBACK';
  merchant: string;
  cnpj?: string;
  date: string;
  totalBruto: number;
  discount: number;
  amount: number;
  paymentDetails: PaymentDetail[];
  items: NfceItem[];
  itemsCount: number;
  category: string;
  description: string;
  confidence: number;
  hasSplitPayment: boolean;
  splitPaymentStatus: 'VALID' | 'NEEDS_CORRECTION' | 'NEEDS_USER_CONFIRMATION';
  warnings: string[];
  nfceKey?: string;
}

// ==================== PAYMENT CODE MAPPING ====================
const PAYMENT_METHOD_MAP: Record<string, { method: PaymentDetail['method']; label: string }> = {
  '01': { method: 'CASH', label: 'Dinheiro' },
  '02': { method: 'OTHER', label: 'Cheque' },
  '03': { method: 'CREDIT_CARD', label: 'Cartão de crédito' },
  '04': { method: 'DEBIT_CARD', label: 'Cartão de débito' },
  '05': { method: 'OTHER', label: 'Crédito loja' },
  '10': { method: 'OTHER', label: 'Vale alimentação' },
  '11': { method: 'OTHER', label: 'Vale refeição' },
  '12': { method: 'OTHER', label: 'Vale presente' },
  '13': { method: 'OTHER', label: 'Vale combustível' },
  '14': { method: 'OTHER', label: 'Duplicata' },
  '15': { method: 'OTHER', label: 'Boleto' },
  '16': { method: 'OTHER', label: 'Depósito bancário' },
  '17': { method: 'PIX', label: 'Pix' },
  '90': { method: 'OTHER', label: 'Sem pagamento' },
  '99': { method: 'OTHER', label: 'Outros' },
};

// ==================== CATEGORY MAPPING ====================
const MERCHANT_CATEGORIES: { pattern: RegExp; category: string }[] = [
  { pattern: /farm[aá]cia|drogaria|droga\s?sil|panvel|raia|catarinense|ultrafarma|medicament/i, category: 'Saúde' },
  { pattern: /mercado|supermercado|hipermercado|atacad[ãa]o|atacarejo|angeloni|big\b|carrefour|extra\b|p[ãa]o de a[cç]/i, category: 'Mercado' },
  { pattern: /posto|gasolina|combust[ií]vel|shell|ipiranga|br\b|petrob/i, category: 'Transporte' },
  { pattern: /restaurante|lanchonete|ifood|padaria|pizzaria|burger|mc\s?donald|subway/i, category: 'Alimentação' },
  { pattern: /pet\s?shop|veterin[aá]ri/i, category: 'Pet' },
  { pattern: /loja|magazine|americanas|casas bahia|renner|riachuelo|centauro/i, category: 'Compras' },
];

@Injectable()
export class NfceParserService {
  private readonly logger = new Logger(NfceParserService.name);

  // ==================== QR CODE DETECTION ====================

  async detectAndDecodeQrCode(imageBuffer: Buffer): Promise<string | null> {
    try {
      this.logger.log('[NFC-e] Tentando detectar QR Code na imagem...');

      // Convert to raw RGBA pixels using sharp
      const { data, info } = await sharp(imageBuffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .grayscale()
        .normalize()
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });

      const qrResult = jsQR(
        new Uint8ClampedArray(data.buffer),
        info.width,
        info.height,
      );

      if (qrResult && qrResult.data) {
        this.logger.log(`[NFC-e] ✅ QR Code encontrado: ${qrResult.data.substring(0, 80)}...`);
        return qrResult.data;
      }

      // Try with different processing - higher contrast
      const { data: data2, info: info2 } = await sharp(imageBuffer)
        .resize({ width: 800, withoutEnlargement: true })
        .threshold(128)
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });

      const qrResult2 = jsQR(
        new Uint8ClampedArray(data2.buffer),
        info2.width,
        info2.height,
      );

      if (qrResult2 && qrResult2.data) {
        this.logger.log(`[NFC-e] ✅ QR Code encontrado (2ª tentativa): ${qrResult2.data.substring(0, 80)}...`);
        return qrResult2.data;
      }

      this.logger.log('[NFC-e] ❌ Nenhum QR Code detectado na imagem');
      return null;
    } catch (err: any) {
      this.logger.warn(`[NFC-e] Erro ao detectar QR Code: ${err.message}`);
      return null;
    }
  }

  // ==================== NFC-e URL VALIDATION ====================

  isNfceUrl(url: string): boolean {
    const nfcePatterns = [
      /nfce/i,
      /sef\.\w+\.gov\.br/i,
      /fazenda\.\w+\.gov\.br/i,
      /nfe\.sefaz/i,
      /sat\.sef/i,
      /\?p=/i,
      /chNFe=/i,
    ];
    return nfcePatterns.some(p => p.test(url));
  }

  // ==================== SEFAZ CONSULTATION ====================

  async fetchNfceData(url: string): Promise<string | null> {
    try {
      this.logger.log(`[NFC-e] 🌐 Consultando SEFAZ: ${url.substring(0, 100)}...`);

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
        maxRedirects: 5,
        validateStatus: (s) => s < 400,
      });

      if (typeof response.data === 'string' && response.data.length > 500) {
        this.logger.log(`[NFC-e] ✅ Página da SEFAZ obtida (${response.data.length} bytes)`);
        return response.data;
      }

      this.logger.warn('[NFC-e] ⚠️ Resposta da SEFAZ vazia ou muito curta');
      return null;
    } catch (err: any) {
      this.logger.warn(`[NFC-e] ❌ Falha na consulta SEFAZ: ${err.message}`);
      return null;
    }
  }

  // ==================== HTML PARSING ====================

  parseNfceHtml(html: string): Partial<NfceResult> {
    const warnings: string[] = [];
    this.logger.log('[NFC-e] 📄 Parseando HTML da NFC-e...');

    // --- Merchant / CNPJ ---
    const merchantMatch = html.match(/class="?txtTopo"?[^>]*>([^<]+)/i)
      || html.match(/<div[^>]*razaosocial[^>]*>([^<]+)/i)
      || html.match(/<span[^>]*>([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ\s]{5,}(?:\s+(?:LTDA|ME|EIRELI|S\.?A\.?))?)<\/span>/);
    const merchant = merchantMatch ? merchantMatch[1].trim() : 'Estabelecimento';

    const cnpjMatch = html.match(/CNPJ[:\s]*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i);
    const cnpj = cnpjMatch ? cnpjMatch[1] : undefined;

    // --- Date ---
    const dateMatch = html.match(/(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2}(?::\d{2})?)/);
    let date = '';
    if (dateMatch) {
      const [, d, t] = dateMatch;
      const [day, month, year] = d.split('/');
      date = `${year}-${month}-${day}T${t}`;
    }

    // --- Items ---
    const items: NfceItem[] = [];
    // Pattern for product rows in NFC-e HTML
    const itemRegex = /<span[^>]*txtTit[^>]*>([^<]+)<\/span>[\s\S]*?Qtde\.?[:\s]*<span[^>]*>(\d+[,.]?\d*)<\/span>[\s\S]*?(?:Vl\.\s*Unit|UN)[:\s]*<span[^>]*>(\d+[,.]?\d{2})<\/span>[\s\S]*?(?:Vl\.\s*Total|Total)[:\s]*<span[^>]*>(\d+[,.]?\d{2})<\/span>/gi;
    let itemMatch: RegExpExecArray | null;
    while ((itemMatch = itemRegex.exec(html)) !== null) {
      items.push({
        name: itemMatch[1].trim(),
        quantity: parseFloat(itemMatch[2].replace(',', '.')),
        unitPrice: parseFloat(itemMatch[3].replace(',', '.')),
        total: parseFloat(itemMatch[4].replace(',', '.')),
      });
    }

    // Fallback: try simpler pattern
    if (items.length === 0) {
      const simpleItemRegex = /class="?txtTit2?"?[^>]*>([^<]+)[\s\S]*?(\d+[,.]?\d{2})/gi;
      let simpleMatch: RegExpExecArray | null;
      while ((simpleMatch = simpleItemRegex.exec(html)) !== null) {
        const name = simpleMatch[1].trim();
        const total = parseFloat(simpleMatch[2].replace(',', '.'));
        if (name.length > 2 && total > 0) {
          items.push({ name, quantity: 1, unitPrice: total, total });
        }
      }
    }

    // --- Values (Total, Discount, Paid) ---
    const extractBrlValue = (pattern: RegExp): number | null => {
      const match = html.match(pattern);
      if (!match) return null;
      return parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
    };

    const totalBruto = extractBrlValue(/(?:Valor total|Total dos Produtos)[^<]*R?\$?\s*(\d+[.,]?\d*[.,]\d{2})/i)
      || extractBrlValue(/totalNota[^>]*>[^<]*R?\$?\s*(\d+[.,]?\d*[.,]\d{2})/i)
      || 0;

    const discount = extractBrlValue(/(?:Desconto|Descontos)[^<]*R?\$?\s*(\d+[.,]?\d*[.,]\d{2})/i) || 0;

    const valorPago = extractBrlValue(/(?:Valor Pago|Valor a Pagar|Valor pago|A Pagar)[^<]*R?\$?\s*(\d+[.,]?\d*[.,]\d{2})/i);

    // --- Payment methods ---
    const paymentDetails = this.extractPaymentMethodsFromHtml(html);

    // --- Resolve final amount ---
    const amount = this.resolveFinalAmount({
      valorPago,
      totalBruto,
      discount,
      paymentDetails,
      items,
    });

    this.logger.log(`[NFC-e] 📊 Valores: Total=${totalBruto}, Desconto=${discount}, Pago=${valorPago}, Final=${amount}`);
    this.logger.log(`[NFC-e] 📦 Itens: ${items.length}, Pagamentos: ${paymentDetails.length}`);

    // --- NFC-e key ---
    const keyMatch = html.match(/(?:Chave de acesso|chNFe)[:\s]*(\d{44})/i);
    const nfceKey = keyMatch ? keyMatch[1] : undefined;

    return {
      source: 'NFCE_QRCODE',
      merchant,
      cnpj,
      date,
      totalBruto,
      discount,
      amount,
      paymentDetails,
      items,
      itemsCount: items.length,
      category: this.categorizeByMerchant(merchant, items),
      description: this.buildDescription(merchant),
      confidence: 0.95,
      hasSplitPayment: paymentDetails.length > 1,
      splitPaymentStatus: paymentDetails.length > 1 ? 'NEEDS_USER_CONFIRMATION' : 'VALID',
      warnings,
      nfceKey,
    };
  }

  // ==================== PAYMENT EXTRACTION FROM HTML ====================

  private extractPaymentMethodsFromHtml(html: string): PaymentDetail[] {
    const payments: PaymentDetail[] = [];

    // NFC-e standard: "Forma de pagamento: Cartão de Crédito  Valor: 90,00"
    const payRegex = /(?:Forma de pagamento|Tipo)[:\s]*([^<\n]+?)[\s]*(?:Valor|R\$)[:\s]*(\d+[.,]?\d*[.,]\d{2})/gi;
    let payMatch: RegExpExecArray | null;
    while ((payMatch = payRegex.exec(html)) !== null) {
      const label = payMatch[1].trim();
      const amount = parseFloat(payMatch[2].replace(/\./g, '').replace(',', '.'));
      if (amount > 0) {
        payments.push({
          method: this.resolvePaymentMethod(label),
          label: this.cleanPaymentLabel(label),
          amount,
          installments: 1,
        });
      }
    }

    // Fallback: look for payment code patterns (tPag)
    if (payments.length === 0) {
      const codeRegex = /tPag[^>]*>(\d{2})<[\s\S]*?vPag[^>]*>(\d+[.,]\d{2})</gi;
      let codeMatch: RegExpExecArray | null;
      while ((codeMatch = codeRegex.exec(html)) !== null) {
        const code = codeMatch[1];
        const amount = parseFloat(codeMatch[2].replace(',', '.'));
        const mapped = PAYMENT_METHOD_MAP[code] || { method: 'OTHER' as const, label: `Código ${code}` };
        if (amount > 0) {
          payments.push({ ...mapped, amount, installments: 1 });
        }
      }
    }

    // Fallback: text-based detection
    if (payments.length === 0) {
      const textPatterns: { pattern: RegExp; method: PaymentDetail['method']; label: string }[] = [
        { pattern: /cart[aã]o\s*(?:de\s*)?cr[eé]dito[^<\n]*R?\$?\s*(\d+[.,]?\d*[.,]\d{2})/gi, method: 'CREDIT_CARD', label: 'Cartão de crédito' },
        { pattern: /cart[aã]o\s*(?:de\s*)?d[eé]bito[^<\n]*R?\$?\s*(\d+[.,]?\d*[.,]\d{2})/gi, method: 'DEBIT_CARD', label: 'Cartão de débito' },
        { pattern: /pix[^<\n]*R?\$?\s*(\d+[.,]?\d*[.,]\d{2})/gi, method: 'PIX', label: 'Pix' },
        { pattern: /dinheiro[^<\n]*R?\$?\s*(\d+[.,]?\d*[.,]\d{2})/gi, method: 'CASH', label: 'Dinheiro' },
      ];

      for (const { pattern, method, label } of textPatterns) {
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(html)) !== null) {
          const amount = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
          if (amount > 0) payments.push({ method, label, amount, installments: 1 });
        }
      }
    }

    return payments;
  }

  // ==================== VALUE RESOLUTION (SINGLE SOURCE OF TRUTH) ====================

  /**
   * isClose — compara dois valores com tolerância de R$ 0,02
   * Usado para validar que a soma dos pagamentos bate com o total da nota.
   */
  isClose(a: number | null | undefined, b: number | null | undefined): boolean {
    if (!a || !b) return false;
    return Math.abs(a - b) <= 0.02;
  }

  /**
   * resolveFinalReceiptAmount — ÚNICA FONTE DE VERDADE para o valor final.
   * 
   * REGRA: Nunca somar campos diferentes (total + pagamentos + desconto).
   * Cada campo representa o MESMO valor de formas diferentes.
   * 
   * PRIORIDADE:
   * 1. Soma dos pagamentos (se validada contra outro campo)
   * 2. Valor Pago
   * 3. Valor A Pagar
   * 4. Valor Líquido
   * 5. Total Bruto - Desconto
   * 6. Total Bruto
   * 7. Soma dos pagamentos (sem validação, último recurso)
   */
  resolveFinalReceiptAmount(data: {
    grossTotal: number;
    discount: number;
    paidAmount: number | null;
    amountToPay: number | null;
    liquidAmount: number | null;
    paymentDetails: PaymentDetail[];
    items?: NfceItem[];
  }): { amount: number; reason: string; needsCorrection: boolean; correctionReason?: string } {
    const { grossTotal, discount, paidAmount, amountToPay, liquidAmount, paymentDetails, items } = data;

    const paymentSum = paymentDetails.length > 0
      ? Math.round(paymentDetails.reduce((s, p) => s + p.amount, 0) * 100) / 100
      : 0;
    const calculatedNetTotal = (grossTotal > 0 && discount > 0)
      ? Math.round((grossTotal - discount) * 100) / 100
      : null;

    // ---- LOG: Valores classificados ----
    this.logger.log(`[ReceiptParser] Valores classificados:`);
    this.logger.log(`  • grossTotal: ${grossTotal}`);
    this.logger.log(`  • discount: ${discount}`);
    this.logger.log(`  • paidAmount: ${paidAmount}`);
    this.logger.log(`  • amountToPay: ${amountToPay}`);
    this.logger.log(`  • liquidAmount: ${liquidAmount}`);
    this.logger.log(`  • paymentDetails: ${paymentDetails.map(p => `${p.method} ${p.amount.toFixed(2)}`).join(', ') || 'nenhum'}`);
    this.logger.log(`  • paymentSum: ${paymentSum}`);
    this.logger.log(`  • calculatedNetTotal: ${calculatedNetTotal}`);

    // ---- PRIORITY 1: Soma dos pagamentos (VALIDADA) ----
    if (paymentSum > 0) {
      if (this.isClose(paymentSum, paidAmount)) {
        this.logger.log(`[ReceiptParser] ✅ chosenFinalAmount: ${paymentSum} | reason: "Soma dos pagamentos bate com Valor Pago"`);
        return { amount: paymentSum, reason: 'Soma dos pagamentos bate com Valor Pago', needsCorrection: false };
      }
      if (this.isClose(paymentSum, amountToPay)) {
        this.logger.log(`[ReceiptParser] ✅ chosenFinalAmount: ${paymentSum} | reason: "Soma dos pagamentos bate com A Pagar"`);
        return { amount: paymentSum, reason: 'Soma dos pagamentos bate com A Pagar', needsCorrection: false };
      }
      if (this.isClose(paymentSum, liquidAmount)) {
        this.logger.log(`[ReceiptParser] ✅ chosenFinalAmount: ${paymentSum} | reason: "Soma dos pagamentos bate com Valor Líquido"`);
        return { amount: paymentSum, reason: 'Soma dos pagamentos bate com Valor Líquido', needsCorrection: false };
      }
      if (calculatedNetTotal !== null && this.isClose(paymentSum, calculatedNetTotal)) {
        this.logger.log(`[ReceiptParser] ✅ chosenFinalAmount: ${paymentSum} | reason: "Soma dos pagamentos bate com Total - Desconto"`);
        return { amount: paymentSum, reason: 'Soma dos pagamentos bate com Total - Desconto', needsCorrection: false };
      }
      if (this.isClose(paymentSum, grossTotal)) {
        this.logger.log(`[ReceiptParser] ✅ chosenFinalAmount: ${paymentSum} | reason: "Soma dos pagamentos bate com Total Bruto"`);
        return { amount: paymentSum, reason: 'Soma dos pagamentos bate com Total Bruto', needsCorrection: false };
      }

      // Payment sum exists but doesn't match any other field
      // Still prefer paymentSum if we have nothing else to compare
      if (!paidAmount && !amountToPay && !liquidAmount && grossTotal === 0) {
        this.logger.log(`[ReceiptParser] ⚠️ chosenFinalAmount: ${paymentSum} | reason: "Soma dos pagamentos (sem validação, único dado)"`);
        return { amount: paymentSum, reason: 'Soma dos pagamentos (sem validação, único dado)', needsCorrection: false };
      }

      // Log mismatch but DON'T use a wrong value — fall through to other fields
      this.logger.warn(`[ReceiptParser] ⚠️ Soma dos pagamentos (${paymentSum}) NÃO bate com nenhum campo. Verificando outros campos...`);
    }

    // ---- PRIORITY 2: Valor Pago ----
    if (paidAmount && paidAmount > 0) {
      this.logger.log(`[ReceiptParser] ✅ chosenFinalAmount: ${paidAmount} | reason: "Valor Pago"`);
      return { amount: paidAmount, reason: 'Valor Pago', needsCorrection: paymentSum > 0 && !this.isClose(paymentSum, paidAmount) };
    }

    // ---- PRIORITY 3: A Pagar ----
    if (amountToPay && amountToPay > 0) {
      this.logger.log(`[ReceiptParser] ✅ chosenFinalAmount: ${amountToPay} | reason: "Valor A Pagar"`);
      return { amount: amountToPay, reason: 'Valor A Pagar', needsCorrection: false };
    }

    // ---- PRIORITY 4: Valor Líquido ----
    if (liquidAmount && liquidAmount > 0) {
      this.logger.log(`[ReceiptParser] ✅ chosenFinalAmount: ${liquidAmount} | reason: "Valor Líquido"`);
      return { amount: liquidAmount, reason: 'Valor Líquido', needsCorrection: false };
    }

    // ---- PRIORITY 5: Total - Desconto ----
    if (calculatedNetTotal !== null && calculatedNetTotal > 0) {
      this.logger.log(`[ReceiptParser] ✅ chosenFinalAmount: ${calculatedNetTotal} | reason: "Total Bruto - Desconto = ${grossTotal} - ${discount}"`);
      return { amount: calculatedNetTotal, reason: `Total - Desconto (${grossTotal} - ${discount})`, needsCorrection: false };
    }

    // ---- PRIORITY 6: Total bruto ----
    if (grossTotal > 0) {
      this.logger.log(`[ReceiptParser] ✅ chosenFinalAmount: ${grossTotal} | reason: "Total Bruto"`);
      return { amount: grossTotal, reason: 'Total Bruto', needsCorrection: false };
    }

    // ---- PRIORITY 7: Soma dos pagamentos (último recurso, sem validação) ----
    if (paymentSum > 0) {
      this.logger.log(`[ReceiptParser] ⚠️ chosenFinalAmount: ${paymentSum} | reason: "Soma dos pagamentos (último recurso)"`);
      return { amount: paymentSum, reason: 'Soma dos pagamentos (último recurso)', needsCorrection: true, correctionReason: 'Nenhum campo de total encontrado para validar' };
    }

    // ---- PRIORITY 8: Soma dos itens ----
    if (items && items.length > 0) {
      const itemSum = Math.round(items.reduce((s, i) => s + i.total, 0) * 100) / 100;
      this.logger.log(`[ReceiptParser] ⚠️ chosenFinalAmount: ${itemSum} | reason: "Soma dos itens (último recurso)"`);
      return { amount: itemSum, reason: 'Soma dos itens', needsCorrection: true, correctionReason: 'Nenhum total/pagamento encontrado' };
    }

    this.logger.error(`[ReceiptParser] ❌ Nenhum valor encontrado`);
    return { amount: 0, reason: 'Nenhum valor encontrado', needsCorrection: true, correctionReason: 'Nenhum valor monetário identificado' };
  }

  /**
   * @deprecated Use resolveFinalReceiptAmount instead
   */
  resolveFinalAmount(data: {
    valorPago: number | null;
    totalBruto: number;
    discount: number;
    paymentDetails: PaymentDetail[];
    items: NfceItem[];
  }): number {
    const result = this.resolveFinalReceiptAmount({
      grossTotal: data.totalBruto,
      discount: data.discount,
      paidAmount: data.valorPago,
      amountToPay: null,
      liquidAmount: null,
      paymentDetails: data.paymentDetails,
      items: data.items,
    });
    return result.amount;
  }

  // ==================== VALIDATION ====================

  validatePaymentSplit(totalAmount: number, payments: PaymentDetail[]): 'VALID' | 'NEEDS_CORRECTION' {
    if (payments.length <= 1) return 'VALID';

    const sum = Math.round(payments.reduce((s, p) => s + p.amount, 0) * 100) / 100;
    const diff = Math.abs(sum - totalAmount);

    this.logger.log(`[NFC-e] 🔍 Validação split: Total=${totalAmount}, Soma=${sum}, Diff=${diff.toFixed(2)}`);

    if (diff <= 0.02) {
      this.logger.log('[NFC-e] ✅ Pagamento dividido VÁLIDO (tolerância R$ 0,02)');
      return 'VALID';
    }

    this.logger.warn(`[NFC-e] ⚠️ INCONSISTÊNCIA: Soma dos pagamentos R$ ${sum.toFixed(2)} ≠ Total R$ ${totalAmount.toFixed(2)}`);
    return 'NEEDS_CORRECTION';
  }

  // ==================== HELPERS ====================

  private resolvePaymentMethod(label: string): PaymentDetail['method'] {
    const l = label.toLowerCase();
    if (/cr[eé]dito/.test(l)) return 'CREDIT_CARD';
    if (/d[eé]bito/.test(l)) return 'DEBIT_CARD';
    if (/pix/.test(l)) return 'PIX';
    if (/dinheiro|espécie/.test(l)) return 'CASH';
    return 'OTHER';
  }

  private cleanPaymentLabel(label: string): string {
    const l = label.toLowerCase().trim();
    if (/cr[eé]dito/.test(l)) return 'Cartão de crédito';
    if (/d[eé]bito/.test(l)) return 'Cartão de débito';
    if (/pix/.test(l)) return 'Pix';
    if (/dinheiro/.test(l)) return 'Dinheiro';
    return label.trim();
  }

  categorizeByMerchant(merchantName: string, items: NfceItem[] = []): string {
    const allText = `${merchantName} ${items.map(i => i.name).join(' ')}`;
    for (const { pattern, category } of MERCHANT_CATEGORIES) {
      if (pattern.test(allText)) return category;
    }
    return 'Compras';
  }

  buildDescription(merchant: string): string {
    // Clean up merchant name
    let clean = merchant
      .replace(/\s+(LTDA|ME|EIRELI|S\.?A\.?|EPP|CNPJ.*)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Capitalize
    clean = clean.split(' ')
      .map(w => w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())
      .join(' ');

    return clean || 'Cupom fiscal';
  }
}
