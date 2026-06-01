import { Injectable, Logger } from '@nestjs/common';
import { FinancialParserService, ParsedTransaction } from './financial-parser.service';

export enum Intent {
  CREATE_TRANSACTION = 'CREATE_TRANSACTION',
  GET_SUMMARY = 'GET_SUMMARY',
  GET_INSIGHTS = 'GET_INSIGHTS',
  SEARCH_TRANSACTIONS = 'SEARCH_TRANSACTIONS',
  HELP = 'HELP',
  UNKNOWN = 'UNKNOWN'
}

export interface QueryResult {
  intent: Intent;
  data: any;
  rawText: string;
}

@Injectable()
export class FinancialQueryParserService {
  private readonly logger = new Logger(FinancialQueryParserService.name);

  constructor(private parser: FinancialParserService) {}

  async parseQuery(text: string, chatId: string, userId: string, orgId: string): Promise<QueryResult> {
    const textLower = text.toLowerCase();

    // 1. Detect Intent
    if (this.isSummaryQuery(textLower)) {
      return { intent: Intent.GET_SUMMARY, data: this.parseSummaryParams(textLower), rawText: text };
    }

    if (this.isInsightsQuery(textLower)) {
      return { intent: Intent.GET_INSIGHTS, data: {}, rawText: text };
    }

    if (this.isSearchQuery(textLower)) {
      return { intent: Intent.SEARCH_TRANSACTIONS, data: this.parseSearchParams(textLower), rawText: text };
    }

    if (this.isHelpQuery(textLower)) {
      return { intent: Intent.HELP, data: {}, rawText: text };
    }

    // Default: Try to parse as transaction
    const parseResult = await this.parser.parse(text);
    
    // If it has amount or type, it's a transaction
    if (parseResult.amount !== null || parseResult.type !== 'unknown') {
      return { intent: Intent.CREATE_TRANSACTION, data: parseResult, rawText: text };
    }

    return { intent: Intent.UNKNOWN, data: {}, rawText: text };
  }

  private isSummaryQuery(text: string): boolean {
    const keywords = ['resumo', 'relatório', 'quanto gastei', 'quanto entrou', 'balanço', 'meu saldo', 'como estou'];
    return keywords.some(k => text.includes(k));
  }

  private isInsightsQuery(text: string): boolean {
    const keywords = ['insight', 'dica', 'análise', 'comportamento', 'padrão', 'estatística'];
    return keywords.some(k => text.includes(k));
  }

  private isSearchQuery(text: string): boolean {
    const keywords = ['buscar', 'procurar', 'onde gastei', 'quando paguei', 'gastos com', 'transações de'];
    return keywords.some(k => text.includes(k));
  }

  private isHelpQuery(text: string): boolean {
    const keywords = ['ajuda', 'help', 'como usar', 'o que você faz'];
    return keywords.some(k => text.includes(k));
  }

  private parseSummaryParams(text: string) {
    if (text.includes('hoje')) return { period: 'daily' };
    if (text.includes('semana')) return { period: 'weekly' };
    return { period: 'monthly' };
  }

  private parseSearchParams(text: string) {
    // Regex for "gastos com [termo]"
    const match = text.match(/(?:gastos com|buscar|procurar|transações de)\s+(.+)/i);
    return { query: match ? match[1].trim() : text };
  }
}
