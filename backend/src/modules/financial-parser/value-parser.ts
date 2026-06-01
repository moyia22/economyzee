/**
 * Value Parser — Extrai valores monetários, tipo de transação e parcelas de texto.
 *
 * Suporta:
 * - Valores numéricos: R$ 123,45 / 123.45 / 123,45 / 100000
 * - Valores por extenso: "cento e vinte e três reais e quarenta e cinco centavos"
 * - Coloquiais: "dez conto", "meia", "um real e meio"
 * - Valores grandes: 100000 (R$ 100.000), 1000000 (R$ 1.000.000)
 * - Parcelas: "3x", "3 vezes", "parcelado em 3", "dividido em 3", "3 parcelas", "à vista"
 */

export function preprocessInput(text: string): string {
  return text.toLowerCase()
    // Only strip filler words that are truly irrelevant — use word boundaries to avoid corruption
    .replace(/\b(tipo|acho|mais ou menos|ne|ah|eh|então|aí)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ==================== INSTALLMENT EXTRACTION ====================

export function extractInstallments(text: string): number | null {
  const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // "parcelado em 3x", "parcelado em 3 vezes", "parcelei em 5x"
  const parceladoMatch = t.match(/parcel(?:ado|ei|amento)\s*(?:em\s*)?(\d+)\s*(?:x|vezes)?/i);
  if (parceladoMatch) return parseInt(parceladoMatch[1], 10);

  // "dividido em 3", "dividir em 4x"
  const divididoMatch = t.match(/divid(?:ido|ir|i)\s*(?:em\s*)?(\d+)\s*(?:x|vezes)?/i);
  if (divididoMatch) return parseInt(divididoMatch[1], 10);

  // "em 3 parcelas"
  const emParcelasMatch = t.match(/em\s*(\d+)\s*parcelas?/i);
  if (emParcelasMatch) return parseInt(emParcelasMatch[1], 10);

  // "3 vezes" (standalone)
  const vezesMatch = t.match(/(\d+)\s*vezes/i);
  if (vezesMatch) return parseInt(vezesMatch[1], 10);

  // "3x" (quick notation)
  const quickMatch = t.match(/\b(\d+)x\b/i);
  if (quickMatch) return parseInt(quickMatch[1], 10);

  // "a vista" / "à vista"
  if (/a\s*vista/i.test(t)) return 1;

  return null;
}

// ==================== MONEY EXTRACTION ====================

// Max amount: R$ 100,000,000 (100 million) = 10,000,000,000 cents
const MAX_AMOUNT_CENTS = 10_000_000_000;

export function extractMoneyAmount(text: string): number | null {
  const normalizedText = preprocessInput(text);
  const hasDigits = /\d/.test(normalizedText);

  // === STRATEGY ===
  // 1. Try explicit currency patterns first (R$, reais) — highest confidence
  // 2. Try digit-based extraction — very reliable when digits exist
  // 3. Try extenso (number words) ONLY if no digits found, or as low-priority fallback
  //    The extenso parser can match "um" (article "a/an") as number 1, causing false positives

  // ---- STEP 1: Explicit currency patterns (highest priority) ----

  // 1a. Brazilian format: "R$ 1.234,56" or "1.234,56 reais"
  const brFormat = normalizedText.match(
    /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+,\d{1,2})\s*(?:reais|real)?/i
  );
  if (brFormat) {
    const v = parseNumberString(brFormat[1]);
    if (v > 0 && v <= MAX_AMOUNT_CENTS) return v;
  }

  // 1b. "R$ 123,45" or "R$ 123.45" or "R$ 100000" (explicit R$ prefix)
  const explicitPrefix = normalizedText.match(
    /r\$\s*(\d+(?:[.,]\d{1,2})?)\b/i
  );
  if (explicitPrefix) {
    const v = parseNumberString(explicitPrefix[1]);
    if (v > 0 && v <= MAX_AMOUNT_CENTS) return v;
  }

  // 1c. "123,45 reais" or "100000 reais" (explicit reais suffix)
  const explicitSuffix = normalizedText.match(
    /(\d+(?:[.,]\d{1,2})?)\s*(?:reais|real)\b/i
  );
  if (explicitSuffix) {
    const v = parseNumberString(explicitSuffix[1]);
    if (v > 0 && v <= MAX_AMOUNT_CENTS) return v;
  }

  // ---- STEP 2: Digit-based extraction (when digits exist in text) ----
  if (hasDigits) {
    // Find ALL digit sequences and pick the largest reasonable one
    const allNumbers = [...normalizedText.matchAll(/\b(\d+(?:[.,]\d{1,2})?)\b/g)];
    let bestValue = 0;

    for (const numMatch of allNumbers) {
      const v = parseNumberString(numMatch[1]);
      if (v > 0 && v <= MAX_AMOUNT_CENTS && v > bestValue) {
        bestValue = v;
      }
    }

    if (bestValue > 0) return bestValue;
  }

  // ---- STEP 3: Extenso (number words) — only when NO digits found ----
  // This avoids "um" (article) being matched as 1 when digits like "100000" exist
  const extensoValue = extractExtensoValue(normalizedText);
  if (extensoValue !== null && extensoValue > 0) return extensoValue;

  return null;
}

// ==================== EXTENSO PARSER ====================

function extractExtensoValue(text: string): number | null {
  const units: Record<string, number> = {
    zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3,
    quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
    dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14,
    quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19,
  };
  const tens: Record<string, number> = {
    vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50,
    sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
  };
  const hundreds: Record<string, number> = {
    cem: 100, cento: 100, duzentos: 200, duzentas: 200,
    trezentos: 300, trezentas: 300, quatrocentos: 400, quatrocentas: 400,
    quinhentos: 500, quinhentas: 500, seiscentos: 600, seiscentas: 600,
    setecentos: 700, setecentas: 700, oitocentos: 800, oitocentas: 800,
    novecentos: 900, novecentas: 900,
  };

  const isNumberWord = (w: string) =>
    units[w] !== undefined || tens[w] !== undefined || hundreds[w] !== undefined || w === 'mil' || w === 'milhao' || w === 'milhoes';

  // Currency context words that validate an extenso number
  const currencyWords = new Set(['reais', 'real', 'centavos', 'conto', 'contos']);

  const words = text.split(/\s+/);

  let integerPart = 0;
  let centsPart = 0;
  let found = false;
  let inCents = false;
  let current = 0;
  let numberWordCount = 0;  // Track how many number words we found
  let hasCurrencyContext = false;  // Track if there's a currency word nearby

  for (let i = 0; i < words.length; i++) {
    const w = words[i];

    if (w === 'reais' || w === 'real') {
      hasCurrencyContext = true;
      if (found) {
        integerPart = current; current = 0;
        if (i + 1 < words.length && words[i + 1] === 'e') {
          inCents = true;
          i++;
        }
      }
      continue;
    }

    if (w === 'centavos') {
      hasCurrencyContext = true;
      if (inCents || found) { centsPart = current; current = 0; }
      continue;
    }

    if (w === 'conto' || w === 'contos') {
      hasCurrencyContext = true;
      if (found) { integerPart = current; current = 0; }
      continue;
    }

    if (units[w] !== undefined) { current += units[w]; found = true; numberWordCount++; }
    else if (tens[w] !== undefined) { current += tens[w]; found = true; numberWordCount++; }
    else if (hundreds[w] !== undefined) { current += hundreds[w]; found = true; numberWordCount++; }
    else if (w === 'mil') { current = (current || 1) * 1000; found = true; numberWordCount++; }
    else if (w === 'milhao' || w === 'milhoes') { current = (current || 1) * 1000000; found = true; numberWordCount++; }
    else if (w === 'e' && found && i + 1 < words.length && isNumberWord(words[i + 1])) {
      continue;
    }
    else if (w === 'meia' && (inCents || !found)) {
      current += 50; found = true; inCents = true; numberWordCount++;
    }
    else if (w === 'meio' && found) {
      centsPart = 50; numberWordCount++;
    }
    else if (found) {
      break;
    }
  }

  if (!found) return null;

  // CRITICAL: Require either:
  // - At least 2 number words (e.g., "vinte reais", "cinco mil"), OR
  // - A currency context word (reais, centavos, conto), OR
  // - The number is >= 2 (to exclude "um/uma" used as articles)
  // This prevents "um pix" from being interpreted as "1 real"
  if (numberWordCount < 2 && !hasCurrencyContext && current <= 1) {
    return null;
  }

  if (integerPart === 0 && !inCents) integerPart = current;
  else if (inCents && centsPart === 0) centsPart = current;

  const totalCents = integerPart * 100 + centsPart;
  return totalCents > 0 ? totalCents : null;
}

// ==================== NUMBER STRING PARSER ====================

function parseNumberString(numberStr: string): number {
  let str = numberStr.replace(/\s/g, '');
  if (str.includes(',') && str.includes('.')) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) str = str.replace(/\./g, '').replace(',', '.');
    else str = str.replace(/,/g, '');
  } else if (str.includes(',')) {
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length <= 2) str = str.replace(',', '.');
    else str = str.replace(/,/g, '');
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

// ==================== TYPE DETECTION ====================

export function parseType(text: string): 'expense' | 'income' | 'transfer' | 'unknown' {
  const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Transfer keywords (check first — most specific)
  const transferKw = ['transferi', 'transferencia', 'enviei', 'mandei pix'];

  // Income keywords — comprehensive list for PT-BR
  const incomeKw = [
    // Verbs indicating RECEIVING money
    'recebi', 'ganhei', 'vendi', 'faturei', 'cobrei',
    'me pagaram', 'me deram', 'me devolveram', 'me mandaram',
    // Nouns indicating income
    'salario', 'entrou', 'entrada', 'venda', 'vendas',
    'lucro', 'rendimento', 'dividendo', 'juros',
    'reembolso', 'restituicao', 'devolucao',
    'freelance', 'bico', 'renda extra', 'renda',
    'comissao', 'bonus', 'premio', 'gratificacao',
    'aluguel recebido', 'mesada', 'pensao',
    // Pix/deposit received
    'pix recebido', 'recebi um pix', 'recebi pix', 'recebi via pix',
    'caiu na conta', 'depositaram', 'deposito recebido',
    'transferencia recebida',
  ];

  // Expense keywords
  const expenseKw = [
    'gastei', 'paguei', 'comprei', 'compra', 'debito', 'pix pago',
    'saiu', 'saida', 'despesa', 'mercado', 'uber', 'ifood', 'gasto',
    'parcela', 'parcelei', 'parcelado', 'conta de', 'boleto',
    'farmacia', 'gasolina', 'restaurante', 'lanche', 'pizza',
    'aluguel', 'luz', 'agua', 'internet', 'assinatura',
    'paguei de', 'paguei no', 'paguei na',
  ];

  for (const kw of transferKw) if (t.includes(kw)) return 'transfer';
  for (const kw of incomeKw) if (t.includes(kw)) return 'income';
  for (const kw of expenseKw) if (t.includes(kw)) return 'expense';

  // Default: if there's a money value mentioned, assume expense
  if (/\d+[.,]\d{2}|\breais\b|\br\$/.test(t)) return 'expense';

  return 'unknown';
}
