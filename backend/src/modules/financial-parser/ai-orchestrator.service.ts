import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiParserService, AiParserResult } from './ai-parser.service';
import axios from 'axios';
import { formatBRT } from '../../common/utils/date.utils';

@Injectable()
export class AiOrchestratorService {
  private readonly logger = new Logger(AiOrchestratorService.name);

  constructor(
    private config: ConfigService,
    private aiParser: AiParserService,
  ) {}

  async parse(rawText: string, normalizedText: string, localData: { amount: number | null, type: string, category: string }): Promise<AiParserResult | null> {
    // 1. Try Local Ollama if enabled
    if (this.config.get('OLLAMA_ENABLED') === 'true') {
      try {
        const ollamaResult = await this.parseWithOllama(rawText, normalizedText, localData);
        if (ollamaResult) {
          this.logger.log('[AI] Processado via Ollama (Local)');
          return ollamaResult;
        }
      } catch (e: any) {
        this.logger.warn(`[AI] Falha no Ollama: ${e.message}`);
      }
    }

    // 2. Try OpenRouter if key exists
    if (this.config.get('OPENROUTER_API_KEY')) {
      try {
        const orResult = await this.aiParser.parse(rawText, normalizedText, localData.amount, localData.type, localData.category, 'openrouter');
        if (orResult) {
          this.logger.log('[AI] Processado via OpenRouter');
          return orResult;
        }
      } catch (e: any) {
        this.logger.warn(`[AI] Falha no OpenRouter: ${e.message}`);
      }
    }

    // 3. Try Gemini as final fallback
    try {
      const geminiResult = await this.aiParser.parse(rawText, normalizedText, localData.amount, localData.type, localData.category, 'gemini');
      if (geminiResult) {
        this.logger.log('[AI] Processado via Gemini');
        return geminiResult;
      }
    } catch (e: any) {
      this.logger.warn(`[AI] Falha no Gemini: ${e.message}`);
    }

    return null;
  }

  private async parseWithOllama(rawText: string, normalizedText: string, localData: any): Promise<AiParserResult | null> {
    const url = this.config.get('OLLAMA_URL') || 'http://localhost:11434/api/generate';
    const model = this.config.get('OLLAMA_MODEL') || 'mistral';
    
    const prompt = this.getPrompt(rawText, normalizedText, localData);

    try {
      const response = await axios.post(url, {
        model,
        prompt,
        stream: false,
        format: 'json'
      }, { timeout: 10000 });

      const jsonStr = response.data.response;
      return JSON.parse(jsonStr) as AiParserResult;
    } catch (e) {
      throw e;
    }
  }

  private getPrompt(rawText: string, normalizedText: string, localData: any): string {
    const today = formatBRT(new Date(), 'yyyy-MM-dd');
    const amountReais = localData.amount ? (localData.amount / 100).toFixed(2) : 'N/A';
    return `Atue como um Revisor Financeiro brasileiro.
Texto: "${rawText}"
Heurística local: Valor R$ ${amountReais}, Tipo ${localData.type}, Categoria ${localData.category}.
IMPORTANTE: "recebi" = income, "gastei/paguei/comprei" = expense.
Valor deve ser em REAIS (ex: 100000 no texto = 100000.00 reais).
Corrija se necessário e retorne JSON:
{
  "type": "expense" | "income" | "transfer",
  "amount": <numero_em_reais>,
  "description": "<string>",
  "category": "<string>",
  "date": "${today}",
  "paymentMethod": "unknown",
  "installments": null,
  "confidence": 95,
  "needsConfirmation": false,
  "missingFields": [],
  "paymentDetails": []
}`;
  }
}
