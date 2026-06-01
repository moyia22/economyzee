import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { formatBRT } from '../../common/utils/date.utils';

export interface AiParserResult {
  type: 'expense' | 'income' | 'transfer' | 'unknown';
  amount: number | null;
  description: string;
  category: string;
  date: string;
  paymentMethod: string;
  installments?: number | null;
  confidence: number;
  needsConfirmation: boolean;
  missingFields: string[];
  paymentDetails?: { amount: number; method: string; label: string }[];
}

@Injectable()
export class AiParserService {
  private readonly logger = new Logger(AiParserService.name);
  private model: any;

  constructor(private config: ConfigService) {
    const aiProvider = this.config.get<string>('AI_PROVIDER');
    
    if (aiProvider !== 'openrouter') {
      const apiKey = this.config.get<string>('GEMINI_API_KEY');
      if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey);
        this.model = genAI.getGenerativeModel({
          model: 'gemini-2.0-flash',
          generationConfig: { responseMimeType: 'application/json' }
        });
      }
    }
  }

  async parse(
    rawText: string, 
    normalizedText: string, 
    localAmount: number | null, 
    localType: string, 
    localCategory: string,
    forcedProvider?: 'gemini' | 'openrouter'
  ): Promise<AiParserResult | null> {
    const aiProvider = forcedProvider || this.config.get<string>('AI_PROVIDER');
    const openRouterApiKey = this.config.get<string>('OPENROUTER_API_KEY');
    
    const today = formatBRT(new Date(), 'yyyy-MM-dd');

    const prompt = [
      'Você é um sistema avançado de interpretação de transações financeiras em linguagem natural brasileiro (PT-BR).',
      'Extraia informações com ALTA PRECISÃO mesmo quando o texto for informal, coloquial ou com erros.',
      '',
      '🎯 REGRAS OBRIGATÓRIAS:',
      '',
      '1. TIPO (MUITO IMPORTANTE):',
      '   - "income" → quando o usuário RECEBEU dinheiro: recebi, ganhei, vendi, me pagaram, caiu na conta, depositaram, faturei, entrou, entrada',
      '   - "expense" → quando o usuário GASTOU dinheiro: gastei, paguei, comprei, saiu, parcela, boleto',
      '   - "transfer" → quando o usuário TRANSFERIU: transferi, enviei, mandei pix',
      '   ⚠️ ATENÇÃO: "recebi um pix de X" é SEMPRE income, NÃO é expense!',
      '',
      '2. CATEGORIA — use o contexto semântico:',
      '   RECEITAS (income):',
      '   - salário, pagamento, remuneração, holerite → "Salário"',
      '   - venda, vendi, recebi de cliente → "Venda"',
      '   - freelance, bico, serviço prestado → "Freelance"',
      '   - investimento, rendimento, dividendo, juros → "Investimento"',
      '   - recebi, ganhei, reembolso, bônus, prêmio, mesada → "Receita"',
      '   DESPESAS (expense):',
      '   - roupa, vestido, calça, tênis, moda → "Vestuário"',
      '   - farmácia, remédio, médico, hospital → "Saúde"',
      '   - mercado, supermercado, ifood, restaurante → "Alimentação"',
      '   - uber, táxi, gasolina, combustível → "Transporte"',
      '   - aluguel, luz, água, internet → "Moradia"',
      '   - shopee, shein, amazon → "Compras"',
      '   - netflix, spotify, cinema → "Lazer"',
      '',
      '3. MEIO DE PAGAMENTO:',
      '   - Se citar "pix" → "pix"',
      '   - Se citar "dinheiro" ou "em espécie" → "dinheiro"',
      '   - Se citar nome de banco/cartão (nubank, inter, itaú, bradesco, santander, etc.) → retorne o nome exato',
      '   - Se citar "cartão" genérico (sem nome) → "cartão"',
      '   - Se NÃO citar meio de pagamento → "unknown" (NUNCA invente uma forma de pagamento)',
      '',
      '4. VALOR (IMPORTANTE):',
      '   - Retorne número decimal em REAIS (ex: 960.00, 100000.00)',
      '   - Números inteiros sem decimal são REAIS inteiros: "100000" = 100000.00 (cem mil reais)',
      '   - "1500" = 1500.00 (mil e quinhentos reais)',
      '   - NUNCA retorne null se há um número no texto',
      '',
      '5. PARCELAS: Só retorne número se o texto explicitamente disser "parcelado em Nx", "em N vezes", "Nx", "N parcelas", "dividido em N". Caso contrário, retorne null (NUNCA assuma parcelamento por uso de cartão).',
      '',
      '6. DESCRIÇÃO:',
      '   - Para DESPESAS: limpe o texto, ex: "gastei 960 com roupa" → "Compra de roupa"',
      '   - Para RECEITAS: extraia a origem, ex: "recebi pix de 100000 da venda do carro" → "Venda do carro"',
      '',
      '7. PAGAMENTOS MÚLTIPLOS: Se dividido entre formas de pagamento, retorne "paymentDetails".',
      '',
      '8. missingFields: retorne [] (array vazio) sempre que conseguir extrair tipo e valor do texto.',
      '',
      '9. RETORNE APENAS JSON válido. Exemplos:',
      '',
      'Exemplo DESPESA (sem meio de pagamento citado):',
      `{"type":"expense","amount":960.00,"description":"Compra de roupa","category":"Vestuário","date":"${today}","paymentMethod":"unknown","installments":null,"confidence":95,"needsConfirmation":false,"missingFields":[],"paymentDetails":[]}`,
      '',
      'Exemplo DESPESA com cartão citado e parcelamento explícito:',
      `{"type":"expense","amount":1200.00,"description":"Notebook","category":"Compras","date":"${today}","paymentMethod":"Nubank","installments":10,"confidence":95,"needsConfirmation":false,"missingFields":[],"paymentDetails":[]}`,
      '',
      'Exemplo RECEITA:',
      `{"type":"income","amount":100000.00,"description":"Venda do carro","category":"Venda","date":"${today}","paymentMethod":"pix","installments":null,"confidence":95,"needsConfirmation":false,"missingFields":[],"paymentDetails":[]}`,
      '',
      `Texto: "${rawText}"`,
      `Sugestão local (pode estar errada): Valor=${localAmount ? localAmount / 100 : 'N/A'}, Tipo=${localType}, Categoria=${localCategory}`,
    ].join('\n');

    try {
      let jsonStr = '';

      if (aiProvider === 'openrouter' && openRouterApiKey) {
        const modelName = this.config.get<string>('OPENROUTER_MODEL') || 'qwen/qwen-2.5-7b-instruct';
        
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: modelName,
            messages: [{ role: 'user', content: prompt }]
          },
          {
            headers: {
              Authorization: `Bearer ${openRouterApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 8000
          }
        );
        jsonStr = response.data.choices[0].message.content;
      } else if (this.model) {
        const result = await this.model.generateContent(prompt);
        jsonStr = result.response.text();
      } else {
        return null;
      }

      jsonStr = jsonStr.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
      return JSON.parse(jsonStr) as AiParserResult;

    } catch (e: any) {
      this.logger.warn(`[AI] Falha no provedor ${aiProvider}: ${e.message}`);
      return null;
    }
  }
}
