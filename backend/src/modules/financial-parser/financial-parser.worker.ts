import { parentPort } from 'worker_threads';
import { findCategoryByKeyword } from './category-rules';
import { extractMoneyAmount, parseType } from './value-parser';
import { cleanDescription } from './description-cleaner';
import { normalizeTranscription } from './transcription-normalizer';

if (parentPort) {
  parentPort.on('message', (data: { rawText: string; text?: string }) => {
    const rawText = data.rawText;
    const normResult = normalizeTranscription(rawText);
    const text = data.text || normResult.normalizedText;
    
    const amount = extractMoneyAmount(text);
    const typeFromInput = parseType(text);
    const ruleMatch = findCategoryByKeyword(text);
    
    const type = ruleMatch?.type || typeFromInput || 'unknown';
    const category = ruleMatch?.category || 'Outros';
    const cleanedDesc = (ruleMatch?.description || cleanDescription(text)).slice(0, 100);

    const calculateConfidence = (amt: number | null, t: string, c: string): number => {
      let score = 0;
      const lowerRaw = text.toLowerCase();

      if (amt !== null) {
        if (/(reais e \d+ centavos|reais com \d+ centavos)/i.test(lowerRaw)) score += 45;
        else if (/(reais)/i.test(lowerRaw)) score += 35;
        else if (/(centavos)/i.test(lowerRaw)) score += 25;
        else if (/(r\$|conto|prata)/i.test(lowerRaw)) score += 40;
        else score += 20;
      }

      if (/(gastei|paguei|comprei|recebi|ganhei)/i.test(lowerRaw)) score += 30;
      else if (t !== 'unknown') score += 15;

      if (/(farmácia|farmacia|mercado|supermercado|uber|99|ifood|restaurante)/i.test(lowerRaw)) score += 20;
      else if (c && c !== 'Outros') score += 10;

      if (lowerRaw.split(' ').length >= 3) score += 10;
      if (normResult.corrected) score += 10;

      if (amt !== null && t !== 'unknown' && c !== 'Outros') score = Math.max(score, 90);
      else if (amt !== null && t !== 'unknown') score = Math.max(score, 75);
      else if (amt === null) score = Math.min(score, 50);

      return Math.min(Math.max(score, 0), 98);
    };

    const confidence = calculateConfidence(amount, type, category);

    parentPort!.postMessage({
      amount,
      type,
      category,
      description: cleanedDesc,
      confidence,
      corrected: normResult.corrected,
      normalizedText: text
    });
  });
}
