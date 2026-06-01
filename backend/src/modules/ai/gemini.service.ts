import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../../database/prisma.service';

export interface GeminiTransactionResult {
  intent: 'register_expense' | 'register_income' | 'query' | 'unknown';
  type: 'income' | 'expense';
  amount: number; // in centavos
  description: string;
  category: string;
  date: string; // YYYY-MM-DD
  confidence: number;
  needs_confirmation: boolean;
  installments?: number;
}

const SYSTEM_PROMPT = `Você é o assistente financeiro do EconomyZee. Analise a mensagem do usuário e extraia informações financeiras.

Categorias disponíveis: Alimentação, Transporte, Moradia, Saúde, Cuidados pessoais, Lazer, Educação, Compras, Renda, Investimentos, Outros.

Responda SOMENTE com JSON válido neste formato:
{
  "intent": "register_expense" | "register_income" | "query" | "unknown",
  "type": "income" | "expense",
  "amount": <valor em centavos (inteiro)>,
  "description": "<descrição curta e limpa>",
  "category": "<categoria mais adequada>",
  "date": "<YYYY-MM-DD, use hoje se não especificado>",
  "confidence": <0.0 a 1.0>,
  "needs_confirmation": <true se confidence < 0.75>,
  "installments": <número de parcelas ou null>
}

Regras:
- Valores SEMPRE em centavos (R$ 50 = 5000)
- "Gastei", "comprei", "paguei" = expense
- "Recebi", "ganhei", "entrou" = income
- Limpeza: a "description" deve remover verbos ("gastei"), remover valores e preposições ("no", "na", "em") e iniciar com letra maiúscula.
- Timezone: America/Sao_Paulo
- Se não conseguir determinar, confidence = 0 e intent = "unknown"`;

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private model: any;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    }
  }

  async parseText(text: string): Promise<GeminiTransactionResult> {
    const start = Date.now();
    if (!this.model) {
      this.logger.warn('Gemini API key not configured — returning mock result');
      return this.fallbackParse(text);
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const prompt = `${SYSTEM_PROMPT}\n\nData de hoje: ${today}\n\nMensagem do usuário: "${text}"`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed: GeminiTransactionResult = JSON.parse(jsonStr);

      if (parsed.confidence < 0.75) parsed.needs_confirmation = true;

      await this.logProcessing(text, jsonStr, parsed.confidence, Date.now() - start);
      return parsed;
    } catch (error) {
      this.logger.error('Gemini parsing error', error);
      await this.logProcessing(text, JSON.stringify({ error: String(error) }), 0, Date.now() - start);
      return this.fallbackParse(text);
    }
  }

  async parseImage(imageBuffer: Buffer, mimeType: string): Promise<GeminiTransactionResult> {
    const start = Date.now();
    if (!this.model) return this.fallbackParse('image');

    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await this.model.generateContent([
        `${SYSTEM_PROMPT}\n\nData de hoje: ${today}\n\nAnalise a imagem (cupom/recibo/nota fiscal) e extraia as informações financeiras.`,
        { inlineData: { data: imageBuffer.toString('base64'), mimeType } },
      ]);
      const response = result.response.text();
      const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      if (parsed.confidence < 0.75) parsed.needs_confirmation = true;
      await this.logProcessing('[IMAGE]', jsonStr, parsed.confidence, Date.now() - start);
      return parsed;
    } catch (error) {
      this.logger.error('Gemini image parsing error', error);
      return this.fallbackParse('image');
    }
  }

  async parsePdfText(text: string): Promise<GeminiTransactionResult> {
    return this.parseText(`Conteúdo extraído de PDF de fatura:\n${text}`);
  }

  private fallbackParse(text: string): GeminiTransactionResult {
    const textLower = text.toLowerCase();
    const amountMatch = text.match(/(\d+[.,]?\d*)/);
    const amount = amountMatch ? Math.round(parseFloat(amountMatch[1].replace(',', '.')) * 100) : 0;
    const isIncome = /receb|salário|ganhe|entrou|freelance/i.test(textLower);

    let category = isIncome ? 'Salário' : 'Outros';
    if (!isIncome) {
      if (/mercado|ifood|lanche|comida|pizza|restaurante/i.test(textLower)) category = 'Alimentação';
      else if (/uber|ônibus|gasolina|99|transporte|metrô/i.test(textLower)) category = 'Transporte';
      else if (/barbearia|cabelo|remédio|farmácia|saúde|médico/i.test(textLower)) category = 'Saúde';
      else if (/cinema|bar|festa|lazer|show/i.test(textLower)) category = 'Lazer';
      else if (/roupa|tênis|compras|shopping/i.test(textLower)) category = 'Compras';
    }

    return {
      intent: amount > 0 ? (isIncome ? 'register_income' : 'register_expense') : 'unknown',
      type: isIncome ? 'income' : 'expense',
      amount,
      description: text.slice(0, 50),
      category,
      date: new Date().toISOString().split('T')[0],
      confidence: 0.9,
      needs_confirmation: false,
    };
  }

  private async logProcessing(input: string, output: string, confidence: number, timeMs: number) {
    try {
      await this.prisma.aIProcessingLog.create({
        data: { input, output, confidence, processingTimeMs: timeMs, model: 'gemini-2.0-flash' },
      });
    } catch (e) {
      this.logger.error('Failed to log AI processing', e);
    }
  }
}
