/**
 * Transcription Normalizer — Corrige erros comuns de transcrição de áudio
 * e converte números por extenso em dígitos.
 *
 * Cobertura: gírias brasileiras, erros de STT, nomes de estabelecimentos,
 * conectores regionais e valores coloquiais.
 */

// ==================== SPELLED NUMBER → DIGIT ====================

export function replaceSpelledNumbers(text: string): string {
  const units: Record<string, number> = {
    'zero': 0, 'um': 1, 'uma': 1, 'dois': 2, 'duas': 2,
    'tres': 3, 'três': 3, 'quatro': 4, 'cinco': 5, 'seis': 6,
    'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10, 'onze': 11,
    'doze': 12, 'treze': 13, 'quatorze': 14, 'catorze': 14,
    'quinze': 15, 'dezesseis': 16, 'dezessete': 17, 'dezoito': 18,
    'dezenove': 19,
  };
  const tens: Record<string, number> = {
    'vinte': 20, 'trinta': 30, 'quarenta': 40, 'cinquenta': 50,
    'sessenta': 60, 'setenta': 70, 'oitenta': 80, 'noventa': 90,
  };
  const hundreds: Record<string, number> = {
    'cem': 100, 'cento': 100, 'duzentos': 200, 'duzentas': 200,
    'trezentos': 300, 'trezentas': 300, 'quatrocentos': 400, 'quatrocentas': 400,
    'quinhentos': 500, 'quinhentas': 500, 'seiscentos': 600, 'seiscentas': 600,
    'setecentos': 700, 'setecentas': 700, 'oitocentos': 800, 'oitocentas': 800,
    'novecentos': 900, 'novecentas': 900,
  };

  const words = text.split(/\s+/);
  const out: string[] = [];
  let current = 0;
  let inNumber = false;

  for (let i = 0; i < words.length; i++) {
    const w = words[i].toLowerCase().replace(/[,.!?;:]/g, '');

    if (units[w] !== undefined) { current += units[w]; inNumber = true; }
    else if (tens[w] !== undefined) { current += tens[w]; inNumber = true; }
    else if (hundreds[w] !== undefined) { current += hundreds[w]; inNumber = true; }
    else if (w === 'mil') { current = (current || 1) * 1000; inNumber = true; }
    else if ((w === 'e' || w === 'com') && inNumber && i + 1 < words.length) {
      const nextW = words[i + 1].toLowerCase().replace(/[,.!?;:]/g, '');
      if (units[nextW] !== undefined || tens[nextW] !== undefined || hundreds[nextW] !== undefined || nextW === 'mil') {
        continue; // connector — skip
      } else {
        out.push(current.toString()); current = 0; inNumber = false;
        out.push(words[i]);
      }
    } else {
      if (inNumber) { out.push(current.toString()); current = 0; inNumber = false; }
      out.push(words[i]);
    }
  }

  if (inNumber) out.push(current.toString());
  return out.join(' ');
}

// ==================== COLLOQUIAL NORMALIZER ====================

const WORD_CORRECTIONS: [RegExp, string][] = [
  // --- STT Typos ---
  [/\bgrasso\b/gi, 'gasto'],
  [/\bgosto\b/gi, 'gasto'],
  [/\bgastamo\b/gi, 'gastamos'],
  [/\bpagei\b/gi, 'paguei'],
  [/\bcomprê\b/gi, 'comprei'],
  [/\bcomprêi\b/gi, 'comprei'],
  [/\bsentavos?\b/gi, 'centavos'],
  [/\breis\b/gi, 'reais'],
  [/\breias\b/gi, 'reais'],
  [/\breal\b/gi, 'reais'],
  [/\bdinhero\b/gi, 'dinheiro'],
  [/\bcartao\b/gi, 'cartão'],
  [/\bfarmacia\b/gi, 'farmácia'],
  [/\bmercado\b/gi, 'mercado'],
  [/\bgasto de\b/gi, 'gastei'],
  [/\bgastei de\b/gi, 'gastei'],
  [/\bpagei em\b/gi, 'paguei em'],
  [/\bparcelei em\b/gi, 'parcelado em'],
  [/\bdevido\b/gi, 'dividido'],

  // --- Colloquial values ---
  [/\bdez conto\b/gi, '10 reais'],
  [/\bvinte conto\b/gi, '20 reais'],
  [/\btrinta conto\b/gi, '30 reais'],
  [/\bquarenta conto\b/gi, '40 reais'],
  [/\bcinquenta conto\b/gi, '50 reais'],
  [/\bcem conto\b/gi, '100 reais'],
  [/\bduzentos conto\b/gi, '200 reais'],
  [/(\d+)\s*conto\b/gi, '$1 reais'],
  [/\bmeia\b(?!\s*(?:hora|noite|dia))/gi, '50 centavos'],  // "meia" = 50¢ in financial context
  [/\bum real e meio\b/gi, '1,50 reais'],
  [/\bdois reais e meio\b/gi, '2,50 reais'],

  // --- Installment variations ---
  [/\bà vista\b/gi, '1x'],
  [/\ba vista\b/gi, '1x'],
  [/\bdividido em\b/gi, 'parcelado em'],
  [/\bem (\d+) parcelas?\b/gi, 'parcelado em $1x'],
  [/\b(\d+) parcelas?\b/gi, '$1x'],

  // --- Common establishment names (STT errors) ---
  [/\bsefarma\b/gi, 'farmácia'],
  [/\bmc\s*donalds?\b/gi, 'mcdonalds'],
  [/\bburger\s*king\b/gi, 'bk'],
  [/\bi\s*food\b/gi, 'ifood'],
  [/\bnoventa\s*e\s*nove\b/gi, '99'],  // corrida de "noventa e nove" = 99 (app)
];

// ==================== MAIN NORMALIZER ====================

export function normalizeTranscription(text: string): { normalizedText: string; corrected: boolean } {
  let normalized = text.trim();
  let corrected = false;

  // Remove audio artifacts like [music], [noise], etc.
  normalized = normalized.replace(/\[.*?\]/g, '');

  // Apply word corrections
  for (const [pattern, replacement] of WORD_CORRECTIONS) {
    if (pattern.test(normalized)) {
      normalized = normalized.replace(pattern, replacement);
      corrected = true;
    }
  }

  // Replace spelled numbers → digits
  const beforeNumbers = normalized;
  normalized = replaceSpelledNumbers(normalized);
  if (normalized !== beforeNumbers) corrected = true;

  // Capitalize first letter
  if (normalized.length > 0) {
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  return { normalizedText: normalized, corrected };
}
