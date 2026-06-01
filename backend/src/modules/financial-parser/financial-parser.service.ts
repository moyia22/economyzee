import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { findCategoryByKeyword, enhanceDescription } from './category-rules';
import { extractMoneyAmount, parseType, preprocessInput, extractInstallments } from './value-parser';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { formatBRT } from '../../common/utils/date.utils';

export type TransactionType = 'expense' | 'income' | 'transfer' | 'unknown';

export interface ParsedTransaction {
  type: TransactionType;
  amount: number | null;
  description: string | null;
  category: string | null;
  confidence: number;
  missingFields: string[];
  rawText: string;
  source: 'local' | 'ai' | 'ocr' | 'audio';
  date?: string | null;
  paymentMethod?: string | null;
  installments?: number | null;
  paymentDetails?: { amount: number; method: string; label: string }[];
}

@Injectable()
export class FinancialParserService {
  private readonly logger = new Logger(FinancialParserService.name);

  constructor(
    private aiOrchestrator: AiOrchestratorService,
    private config: ConfigService
  ) {}

  async parse(input: string, options: { source: 'text' | 'audio' | 'ocr' } = { source: 'text' }): Promise<ParsedTransaction> {
    const rawText = input;
    const normalized = preprocessInput(rawText);

    // 1. RULE-BASED ENGINE (PRIORITY)
    const ruleMatch = findCategoryByKeyword(normalized);
    const amountCents = extractMoneyAmount(normalized);
    const typeFromInput = parseType(normalized);
    const installments = extractInstallments(normalized);
    
    // Convert cents to reais (null-safe)
    const amountReais = amountCents !== null ? amountCents / 100 : null;

    this.logger.log(`[Parser] Input: "${rawText}"`);
    this.logger.log(`[Parser] Normalized: "${normalized}"`);
    this.logger.log(`[Parser] Rule: ${ruleMatch ? JSON.stringify(ruleMatch) : 'none'}`);
    this.logger.log(`[Parser] Amount: ${amountCents} cents = R$ ${amountReais}`);
    this.logger.log(`[Parser] Type: ${typeFromInput}, Installments: ${installments}`);

    // Determine Type (Rule > Parser > Unknown)
    const finalType = ruleMatch?.type || typeFromInput || 'unknown';
    
    // Determine Category
    const finalCategory = ruleMatch?.category || 'Outros';
    
    // Enhance Description
    const enhancedDesc = enhanceDescription(rawText, finalCategory);

    // Initial result based on Rules
    const missingFields: string[] = [];
    if (amountReais === null) missingFields.push('valor');
    if (finalType === 'unknown') missingFields.push('tipo');
    // Don't mark description as missing if we have a valid category-based description
    if (!enhancedDesc || (enhancedDesc === 'Outros' && !ruleMatch)) missingFields.push('descrição');

    // Confidence: 0.9 if rule matched category, 0.8 if clear context (amount + type), 0.6 if inferred
    let confidence = 0.5;
    if (ruleMatch) confidence = 0.9;
    else if (amountReais !== null && finalType !== 'unknown') confidence = 0.8;
    else if (amountReais !== null || finalType !== 'unknown') confidence = 0.6;

    const result: ParsedTransaction = {
      type: finalType as TransactionType,
      amount: amountReais,
      description: enhancedDesc,
      category: finalCategory,
      confidence,
      missingFields,
      rawText,
      source: options.source === 'text' ? 'local' : options.source as any,
      date: formatBRT(new Date(), 'yyyy-MM-dd'),
      paymentMethod: 'unknown',
      installments,
    };

    this.logger.log(`[Parser] Local result: type=${result.type}, amount=R$${result.amount}, desc="${result.description}", cat="${result.category}", conf=${confidence}, missing=[${missingFields.join(',')}]`);

    // 2. AI ENHANCEMENT (Only if confidence < 0.9 or missing fields)
    if (confidence < 0.9 || missingFields.length > 0) {
      this.logger.log(`[Parser] Ativando AI Enhancement (Confiança: ${confidence}, Missing: [${missingFields.join(',')}])`);
      const aiDraft = await this.aiOrchestrator.parse(rawText, normalized, { 
        amount: amountCents || 0, 
        type: finalType, 
        category: finalCategory 
      });
      
      if (aiDraft) {
        this.logger.log(`[Parser] AI result: type=${aiDraft.type}, amount=${aiDraft.amount}, desc="${aiDraft.description}"`);

        // Use AI amount ONLY if local amount is null
        // AI returns amount in REAIS, local result.amount is also in REAIS
        const finalAmount = amountReais !== null ? amountReais : (aiDraft.amount ?? null);

        return {
          ...result,
          type: (result.type === 'unknown' ? (aiDraft.type as TransactionType) : result.type),
          amount: finalAmount,
          description: aiDraft.description || result.description,
          category: ruleMatch ? result.category : (aiDraft.category || result.category),
          confidence: Math.max(result.confidence, (aiDraft.confidence || 60) / 100),
          missingFields: aiDraft.missingFields || [],
          source: 'ai',
          date: aiDraft.date || result.date,
          paymentMethod: aiDraft.paymentMethod || result.paymentMethod,
          installments: aiDraft.installments || result.installments,
          paymentDetails: aiDraft.paymentDetails && aiDraft.paymentDetails.length > 0 ? aiDraft.paymentDetails : undefined,
        };
      }
    }

    return result;
  }
}
