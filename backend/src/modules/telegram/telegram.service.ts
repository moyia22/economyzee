import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { FinancialParserService } from '../financial-parser/financial-parser.service';
import { TransactionsService } from '../transactions/transactions.service';
import { CategoriesService } from '../categories/categories.service';
import { RedisService, TransactionDraft, BotState } from '../redis/redis.service';
import { SpeechToTextService } from '../speech/speech-to-text.service';
import { ReceiptOcrService } from '../receipts/receipt-ocr.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Bot, Context, InlineKeyboard } from 'grammy';
import { FinancialSummaryService } from '../reports/financial-summary.service';
import { FinancialInsightsService } from '../analytics/financial-insights.service';
import { FinancialQueryParserService, Intent } from '../financial-parser/financial-query-parser.service';
import { extractMoneyAmount } from '../financial-parser/value-parser';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { SupabaseSafeService } from '../supabase/supabase-safe.service';
import { CategoryMemoryService } from '../category-memory/category-memory.service';
import { fromZonedTime, formatBRT } from '../../common/utils/date.utils';

type RequestedCardType = 'CREDIT' | 'DEBIT';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  public bot: Bot | null = null; // Changed to public to allow access from processor
  private botInfo: any = null;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private parser: FinancialParserService,
    private queryParser: FinancialQueryParserService,
    private transactions: TransactionsService,
    private categories: CategoriesService,
    private summary: FinancialSummaryService,
    private insights: FinancialInsightsService,
    private redis: RedisService,
    private categoryMemory: CategoryMemoryService,
    private speech: SpeechToTextService,
    private ocr: ReceiptOcrService,
    private eventEmitter: EventEmitter2,
    private supabaseSafe: SupabaseSafeService,
    @InjectQueue('telegram-message-processing') private telegramQueue: Queue,
  ) {}

  async onModuleInit() {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token || token === 'your-telegram-bot-token-from-botfather') {
      this.logger.warn('Telegram bot token not configured — bot disabled');
      return;
    }

    this.bot = new Bot(token);
    this.setupCommands();
    this.setupCallbackHandlers();
    this.setupMessageHandlers();

    // Global Error Handler
    this.bot.catch((err) => {
      this.logger.error(`[Telegram] Error in bot: ${err.message}`, err.stack);
      const ctx = err.ctx;
      ctx.reply('⚠️ Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.').catch(() => {});
    });

    try {
      // Retry getMe with increasing timeout (network can be slow on startup)
      let botInfo: any = null;
      const attempts = [5000, 10000, 15000];
      
      for (let i = 0; i < attempts.length; i++) {
        try {
          const getMePromise = this.bot.api.getMe();
          getMePromise.catch(() => {}); // prevent unhandled rejection
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('ConnectTimeoutError')), attempts[i])
          );
          botInfo = await Promise.race([getMePromise, timeoutPromise]);
          break; // success
        } catch (retryErr: any) {
          this.logger.warn(`[Telegram] getMe tentativa ${i + 1}/${attempts.length} falhou (timeout: ${attempts[i]}ms)`);
          if (i === attempts.length - 1) {
            this.logger.warn('[Telegram] Todas as tentativas de getMe falharam. Bot será iniciado sem info.');
          }
        }
      }

      if (botInfo) {
        this.botInfo = botInfo;
        this.logger.log(`🤖 Telegram bot @${this.botInfo.username} initialized`);
      }

      const nodeEnv = this.config.get('NODE_ENV');
      const webhookUrl = this.config.get('TELEGRAM_WEBHOOK_URL');
      const secretToken = this.config.get('WEBHOOK_SECRET');

      if (nodeEnv === 'production' && webhookUrl) {
        this.logger.log(`🌐 Setting Telegram webhook to: ${webhookUrl}`);
        await this.bot.api.setWebhook(webhookUrl, {
          secret_token: secretToken,
        });
      } else if (nodeEnv !== 'production') {
        this.bot.start({ onStart: () => this.logger.log('Bot polling started') });
      }
    } catch (err) {
      this.logger.error('Failed to initialize Telegram bot — starting polling anyway', err);
      // Still try to start polling even if init failed
      try {
        this.bot.start({ onStart: () => this.logger.log('Bot polling started (recovery mode)') });
      } catch {}
    }
  }

  private setupCommands() {
    if (!this.bot) return;

    this.bot.command('start', async (ctx) => {
      const payload = ctx.match;
      if (payload) {
        const code = this.extractLinkCode(payload);
        if (code) {
          await this.linkTelegramAccountByToken(code, ctx);
          return;
        }
      }
      await ctx.reply('💰 Bem-vindo ao EconomyZee! Envie seus gastos para começar.');
    });

    this.bot.command('resumo', async (ctx) => {
      const user = await this.getLinkedUser(ctx);
      if (!user) return;
      const member = await this.ensureUserEnvironment(user);
      if (member) await this.handleSummaryIntent('monthly', member, ctx);
    });

    this.bot.command('cancelar', async (ctx) => {
      const chatId = ctx.chat?.id.toString();
      if (chatId) {
        await this.redis.clearDraft(chatId);
        await ctx.reply('🚫 Operação cancelada.');
      }
    });
  }

  private setupMessageHandlers() {
    if (!this.bot) return;

    // Handle Text Messages
    this.bot.on('message:text', async (ctx) => {
      try {
        const text = ctx.message.text;
        const chatId = ctx.chat.id.toString();
        const telegramUserId = ctx.from.id.toString();
        this.logger.log(`[Telegram] Texto recebido de ${telegramUserId}`);

        // 1. Verificar se é um código de vinculação (mesmo se não estiver vinculado ainda)
        const possibleCode = this.extractLinkCode(text);
        if (possibleCode) {
          const processingMsg = await ctx.reply('🧠 Validando código...', { reply_to_message_id: ctx.message.message_id });
          await this.telegramQueue.add('process-message', {
            type: 'text',
            text,
            chatId,
            telegramUserId,
            username: ctx.from.username,
            firstName: ctx.from.first_name,
            messageId: processingMsg.message_id
          });
          return;
        }

        const user = await this.getUserByTelegramId(telegramUserId);
        if (!user) { await this.getLinkedUser(ctx); return; }

        const member = await this.ensureUserEnvironment(user);
        if (!member) return;

        const processingMsg = await ctx.reply('🧠 Entendendo...', { reply_to_message_id: ctx.message.message_id });

        await this.telegramQueue.add('process-message', {
          type: 'text',
          text,
          chatId,
          telegramUserId,
          userId: user.id,
          orgId: member.orgId,
          memberId: member.id,
          username: ctx.from.username,
          firstName: ctx.from.first_name,
          messageId: processingMsg.message_id
        });
      } catch (err) {
        this.logger.error('[Telegram] Erro no handler de texto', err);
      }
    });

    // Handle Voice Messages
    this.bot.on('message:voice', async (ctx) => {
      try {
        const chatId = ctx.chat.id.toString();
        const telegramUserId = ctx.from.id.toString();
        this.logger.log(`[Telegram] Áudio recebido de ${telegramUserId}`);

        const user = await this.getUserByTelegramId(telegramUserId);
        if (!user) { await this.getLinkedUser(ctx); return; }

        const member = await this.ensureUserEnvironment(user);
        if (!member) return;

        const processingMsg = await ctx.reply('🎙️ Recebi seu áudio! Estou processando...');

        await this.telegramQueue.add('process-message', {
          type: 'voice',
          fileId: ctx.message.voice.file_id,
          chatId,
          telegramUserId,
          userId: user.id,
          orgId: member.orgId,
          memberId: member.id,
          username: ctx.from.username,
          firstName: ctx.from.first_name,
          messageId: processingMsg.message_id
        });
      } catch (err) {
        this.logger.error('[Telegram] Erro no handler de voz', err);
      }
    });

    // Handle Photos (Receipts)
    this.bot.on('message:photo', async (ctx) => {
      try {
        const chatId = ctx.chat.id.toString();
        const telegramUserId = ctx.from.id.toString();
        this.logger.log(`[Telegram] Imagem recebida de ${telegramUserId}`);

        const user = await this.getUserByTelegramId(telegramUserId);
        if (!user) { await this.getLinkedUser(ctx); return; }

        const member = await this.ensureUserEnvironment(user);
        if (!member) return;

        const processingMsg = await ctx.reply('📸 Recebi o comprovante! Vou ler as informações...');

        // Get the highest resolution photo
        const photo = ctx.message.photo[ctx.message.photo.length - 1];

        await this.telegramQueue.add('process-message', {
          type: 'photo',
          fileId: photo.file_id,
          chatId,
          telegramUserId,
          userId: user.id,
          orgId: member.orgId,
          memberId: member.id,
          username: ctx.from.username,
          firstName: ctx.from.first_name,
          messageId: processingMsg.message_id
        });
      } catch (err) {
        this.logger.error('[Telegram] Erro no handler de foto', err);
      }
    });
  }

  private setupCallbackHandlers() {
    if (!this.bot) return;

    this.bot.on('callback_query:data', async (ctx) => {
      try {
        const data = ctx.callbackQuery.data;
        const chatId = ctx.chat?.id.toString();
        if (!chatId) return;

        const user = await this.getLinkedUser(ctx);
        if (!user) return;
        const member = await this.ensureUserEnvironment(user);
        if (!member) return;

        const draft = await this.redis.getDraft(chatId);

        if (data === 'tx_confirm') {
          if (!draft || draft.state !== 'AWAITING_CONFIRMATION') {
            await ctx.answerCallbackQuery('⚠️ Operação expirada.');
            return;
          }
          await ctx.answerCallbackQuery('💾 Salvando...');
          await this.saveTransaction(draft, member, ctx);
          await this.redis.clearDraft(chatId);
          await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
        } 
        else if (data === 'tx_cancel') {
          await this.redis.clearDraft(chatId);
          await ctx.answerCallbackQuery('🚫 Cancelado');
          await ctx.editMessageText('🚫 Lançamento descartado.');
        }
        else if (data === 'tx_edit') {
          if (!draft) {
            await ctx.answerCallbackQuery('Operacao expirada.');
            return;
          }
          draft.state = 'AWAITING_CORRECTION';
          await this.redis.saveDraft(chatId, draft);
          await ctx.answerCallbackQuery();
          await ctx.reply('✏️ O que deseja corrigir? Ex: "era 60 reais" ou "foi no mercado"');
        }
        else if (data === 'tx_cat') {
          if (!draft) {
            await ctx.answerCallbackQuery('Operacao expirada.');
            return;
          }
          draft.state = 'AWAITING_CATEGORY';
          await this.redis.saveDraft(chatId, draft);
          await ctx.answerCallbackQuery();
          await ctx.reply('📁 Digite o nome da categoria que deseja usar.');
        }
        else if (data === 'tx_pay_unknown') {
          if (!draft) return;
          draft.paymentMethod = 'unknown';
          draft.accountId = undefined;
          draft.cardId = undefined;
          await this.redis.saveDraft(chatId, draft);
          await ctx.answerCallbackQuery('Selecione o pagamento');
          await this.handleParseResult(draft, ctx, chatId, ctx.callbackQuery.message?.message_id);
        }
        else if (data === 'tx_switch_ws') {
          if (!draft) {
            await ctx.answerCallbackQuery('⚠️ Operação expirada.');
            return;
          }
          await ctx.answerCallbackQuery();
          const memberships = await this.prisma.organizationMember.findMany({
            where: { userId: draft.userId },
            include: { org: true },
            orderBy: [{ org: { type: 'asc' } }, { createdAt: 'asc' }],
          });
          const keyboard = new InlineKeyboard();
          const activeOrgId: string = draft.targetOrgId || draft.orgId;
          memberships.forEach(m => {
            const mark = m.orgId === activeOrgId ? '✅ ' : '';
            const typeLabel = m.org.type === 'PERSONAL' ? ' (Pessoal)' : '';
            keyboard.text(`${mark}${m.org.name}${typeLabel}`, `tx_pick_ws_${m.orgId}`).row();
          });
          keyboard.text('⬅️ Voltar', 'tx_pick_ws_back').row();
          const msg = '🏢 *Em qual workspace lançar esta transação?*';
          if (ctx.callbackQuery.message?.message_id) {
            await this.bot!.api.editMessageText(chatId, ctx.callbackQuery.message.message_id, msg, {
              parse_mode: 'Markdown',
              reply_markup: keyboard,
            });
          }
        }
        else if (data.startsWith('tx_pick_ws_')) {
          if (!draft) {
            await ctx.answerCallbackQuery('⚠️ Operação expirada.');
            return;
          }
          const pickedOrgId = data.replace('tx_pick_ws_', '');
          if (pickedOrgId === 'back') {
            await ctx.answerCallbackQuery();
            await this.showConfirmation(draft, ctx, chatId, ctx.callbackQuery.message?.message_id);
            return;
          }

          // Validar que o usuário é membro do workspace escolhido
          const targetMembership = await this.prisma.organizationMember.findUnique({
            where: { userId_orgId: { userId: draft.userId, orgId: pickedOrgId } },
            include: { org: true },
          });
          if (!targetMembership) {
            await ctx.answerCallbackQuery('⚠️ Você não é membro deste workspace.');
            return;
          }

          draft.targetOrgId = pickedOrgId;
          draft.targetMemberId = targetMembership.id;
          await this.redis.saveDraft(chatId, draft);
          await ctx.answerCallbackQuery(`Workspace: ${targetMembership.org.name}`);
          this.logger.log(`[Telegram] Workspace alvo trocado para ${targetMembership.org.name} (${pickedOrgId})`);
          await this.showConfirmation(draft, ctx, chatId, ctx.callbackQuery.message?.message_id);
        }
        else if (data.startsWith('tx_pay_')) {
          const payMethod = data.replace('tx_pay_', '');
          if (!draft) return;

          if (payMethod === 'pix' || payMethod === 'cash' || payMethod === 'wallet') {
            draft.paymentMethod = payMethod === 'pix' ? 'Pix' : payMethod === 'cash' ? 'Dinheiro' : 'Carteira';
            draft.accountId = undefined;
            draft.cardId = undefined;
          } else if (payMethod.startsWith('acc_')) {
            draft.accountId = payMethod.replace('acc_', '');
            draft.cardId = undefined;
            const acc = await this.prisma.account.findUnique({ where: { id: draft.accountId } });
            draft.paymentMethod = acc?.name || 'Conta';
          } else if (payMethod.startsWith('card_')) {
            const cardId = payMethod.replace('card_', '');
            const card = await this.prisma.card.findUnique({ where: { id: cardId } });
            const expectedCardType = (draft as any)._cardTypePrompt as RequestedCardType | undefined;
            if (!this.cardMatchesRequestedType(card, expectedCardType)) {
              const expectedLabel = this.getCardTypeLabel(expectedCardType!);
              await ctx.answerCallbackQuery(`Voce disse ${expectedLabel.toLowerCase()}; escolha um ${expectedLabel.toLowerCase()}.`);
              return;
            }
            
            if (draft.rawText?.toLowerCase().includes('parcelado') && card?.cardType === 'DEBIT') {
              await ctx.answerCallbackQuery('⚠️ Cartão de débito não permite parcelamento.');
              return;
            }

            draft.cardId = cardId;
            draft.accountId = undefined;
            draft.paymentMethod = card?.name || 'Cartão';
            delete (draft as any)._cardOnlyPrompt;
            delete (draft as any)._cardTypePrompt;
          }

          await this.redis.saveDraft(chatId, draft);
          await ctx.answerCallbackQuery(`Meio de pagamento: ${draft.paymentMethod}`);
          await this.handleParseResult(draft, ctx, chatId, ctx.callbackQuery.message?.message_id);
        }
        else if (data === 'tx_a_vista') {
          if (!draft) {
            await ctx.answerCallbackQuery('⚠️ Operação expirada.');
            return;
          }
          draft.installments = 1;
          await this.redis.saveDraft(chatId, draft);
          await ctx.answerCallbackQuery('À vista (1x)');
          this.logger.log(`[Telegram] Usuário escolheu À VISTA para transação de R$${draft.amount}`);
          await this.showConfirmation(draft, ctx, chatId, ctx.callbackQuery.message?.message_id);
        }
        else if (data === 'tx_parcelar') {
          if (!draft) {
            await ctx.answerCallbackQuery('⚠️ Operação expirada.');
            return;
          }
          await ctx.answerCallbackQuery('Escolha o número de parcelas');
          this.logger.log(`[Telegram] Usuário escolheu PARCELAR transação de R$${draft.amount}`);
          await this.askInstallments(draft, ctx, chatId, ctx.callbackQuery.message?.message_id);
        }
        else if (data.startsWith('tx_inst_')) {
          if (data === 'tx_inst_more') {
            if (!draft) return;
            const keyboard = new InlineKeyboard();
            keyboard.text('13x', 'tx_inst_13').text('14x', 'tx_inst_14').text('15x', 'tx_inst_15').row();
            keyboard.text('16x', 'tx_inst_16').text('18x', 'tx_inst_18').text('20x', 'tx_inst_20').row();
            keyboard.text('24x', 'tx_inst_24').text('36x', 'tx_inst_36').text('48x', 'tx_inst_48').row();
            keyboard.text('⬅️ Voltar', 'tx_inst_back').row();
            await ctx.answerCallbackQuery();
            await this.bot!.api.editMessageReplyMarkup(chatId, ctx.callbackQuery.message?.message_id!, { reply_markup: keyboard });
            return;
          }
          if (data === 'tx_inst_back') {
            if (!draft) return;
            const keyboard = new InlineKeyboard();
            keyboard.text('2x', 'tx_inst_2').text('3x', 'tx_inst_3').text('4x', 'tx_inst_4').row();
            keyboard.text('5x', 'tx_inst_5').text('6x', 'tx_inst_6').text('7x', 'tx_inst_7').row();
            keyboard.text('8x', 'tx_inst_8').text('9x', 'tx_inst_9').text('10x', 'tx_inst_10').row();
            keyboard.text('11x', 'tx_inst_11').text('12x', 'tx_inst_12').text('Mais...', 'tx_inst_more').row();
            await ctx.answerCallbackQuery();
            await this.bot!.api.editMessageReplyMarkup(chatId, ctx.callbackQuery.message?.message_id!, { reply_markup: keyboard });
            return;
          }

          const installments = parseInt(data.replace('tx_inst_', ''), 10);
          if (!draft) return;
          draft.installments = installments;
          draft.state = 'AWAITING_CONFIRMATION';
          await this.redis.saveDraft(chatId, draft);
          await ctx.answerCallbackQuery(`${installments}x selecionado`);
          await this.showConfirmation(draft, ctx, chatId, ctx.callbackQuery.message?.message_id);
        }
        // ==================== SPLIT PAYMENT CALLBACKS ====================
        else if (data === 'tx_split_single') {
          if (!draft || !draft.nfceResult) return;
          await ctx.answerCallbackQuery('💾 Preparando salvamento...');
          await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
          await this.resolveNextSplitCard(draft, member, ctx, chatId, 'single');
        }
        else if (data === 'tx_split_separate') {
          if (!draft || !draft.nfceResult) return;
          await ctx.answerCallbackQuery('📊 Preparando transações...');
          await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
          await this.resolveNextSplitCard(draft, member, ctx, chatId, 'separate');
        }
        else if (data.startsWith('tx_split_card_')) {
          if (!draft) return;
          const cardId = data.replace('tx_split_card_', '');
          const idx = draft.currentSplitPaymentIndex ?? 0;
          const splitPayment = draft.nfceResult?.paymentDetails?.[idx];
          if (splitPayment?.method === 'CREDIT_CARD' || splitPayment?.method === 'DEBIT_CARD') {
            const expectedType: RequestedCardType = splitPayment.method === 'CREDIT_CARD' ? 'CREDIT' : 'DEBIT';
            const card = await this.prisma.card.findUnique({ where: { id: cardId } });
            if (!this.cardMatchesRequestedType(card, expectedType)) {
              const expectedLabel = this.getCardTypeLabel(expectedType);
              await ctx.answerCallbackQuery(`Escolha um ${expectedLabel}.`);
              return;
            }
          }
          draft.splitCardSelections = draft.splitCardSelections || [];
          draft.splitCardSelections[idx] = cardId;
          await ctx.answerCallbackQuery('Cartão selecionado');
          await this.resolveNextSplitCard(draft, member, ctx, chatId);
        }
        else if (data === 'tx_split_correct') {
          if (!draft) return;
          await ctx.answerCallbackQuery();
          await ctx.reply(
            '✏️ *Corrigir pagamentos*\n\n' +
            'Envie os pagamentos no formato:\n' +
            '`crédito 90,00`\n' +
            '`débito 34,39`\n' +
            '`pix 50,00`\n\n' +
            'Um por linha. Quando terminar, envie `pronto`.',
            { parse_mode: 'Markdown' }
          );
          draft.state = 'AWAITING_PAYMENT_CORRECTION';
          await this.redis.saveDraft(chatId, draft);
        }
      } catch (err: any) {
        this.logger.error(`[Telegram] Callback error: ${err.message}`);
        try { await ctx.answerCallbackQuery('⚠️ Erro. Tente novamente.'); } catch {}
      }
    });
  }
  async processQueuedMessage(data: any) {
    const { type, chatId, userId, orgId, memberId, messageId, text, fileId, username, firstName } = data;
    const ctxStub = { 
      chat: { id: chatId }, 
      from: { 
        id: data.telegramUserId,
        username: username,
        first_name: firstName
      },
      reply: async (text: string, options?: any) => {
        return this.bot!.api.sendMessage(chatId, text, options);
      },
    } as any;

    this.logger.log(`[Parser] Início do processamento: ${type}`);

    try {
      let processingText = text || '';

      // 1. Media Pre-processing (STT / OCR)
      if (type === 'voice' && fileId) {
        const file = await this.bot!.api.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${this.config.get('TELEGRAM_BOT_TOKEN')}/${file.file_path}`;
        processingText = await this.speech.transcribe(fileUrl);
      } else if (type === 'photo' && fileId) {
        const file = await this.bot!.api.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${this.config.get('TELEGRAM_BOT_TOKEN')}/${file.file_path}`;
        const ocrData = await this.ocr.processReceiptFromUrl(fileUrl);
        if (ocrData) {
            const nfce = ocrData.nfceResult;
            const draft: any = {
                amount: ocrData.amount ? ocrData.amount / 100 : undefined,
                description: ocrData.merchantName ? this.buildReceiptDescription(ocrData.merchantName) : ocrData.description,
                category: ocrData.category,
                type: ocrData.type || 'expense',
                confidence: ocrData.confidence,
                state: 'AWAITING_CONFIRMATION',
                chatId, userId, orgId, memberId,
                rawText: nfce ? `[${nfce.source}] ${ocrData.merchantName || ''}` : 'OCR',
                date: ocrData.date || formatBRT(new Date(), 'yyyy-MM-dd'),
                missingFields: [],
                // NFC-e specific fields
                nfceResult: nfce || undefined,
                receiptSource: nfce?.source || 'OCR_FALLBACK',
            };

            // If split payment detected, show special UI
            if (nfce && nfce.hasSplitPayment && nfce.paymentDetails.length > 1) {
                await this.redis.saveDraft(chatId, draft);
                await this.showSplitPaymentConfirmation(draft, ctxStub, chatId, messageId);
                return;
            }

            // Single payment — if NFC-e has payment info, auto-set it
            if (nfce && nfce.paymentDetails.length === 1) {
                const pay = nfce.paymentDetails[0];
                draft.paymentMethod = pay.label;
                draft.installments = pay.installments;
            }

            await this.handleParseResult(draft, ctxStub, chatId, messageId);
            return;
        }
        processingText = 'Comprovante recebido';
      }

      if (!processingText && type !== 'text') {
        throw new Error('Não foi possível extrair texto da mídia');
      }

      // 2. Check for Account Linking Code
      const possibleCode = this.extractLinkCode(processingText);
      if (possibleCode) {
        await this.linkTelegramAccountByToken(possibleCode, ctxStub);
        await this.bot!.api.deleteMessage(chatId, messageId);
        return;
      }

      // 3. Conversational State Handling
      const existingDraft = await this.redis.getDraft(chatId);
      const textLower = processingText.toLowerCase();
      const cancelKeywords = ['cancelar', 'cancela', 'parar', 'sair', 'esquece', 'ignora', 'não', 'errado', 'descartar', 'recomeçar'];
      
      if (existingDraft && cancelKeywords.includes(textLower)) {
        await this.redis.clearDraft(chatId);
        await this.bot!.api.editMessageText(chatId, messageId, '🚫 Operação cancelada. Como posso ajudar agora?');
        return;
      }

      if (existingDraft && (existingDraft as any).state === 'AWAITING_CORRECTION') {
        await this.handleDraftCorrection(existingDraft, processingText, ctxStub, chatId, messageId);
        return;
      }

      if (existingDraft && (existingDraft as any).state === 'AWAITING_CATEGORY') {
        const draft = { ...(existingDraft as any) };
        draft.category = this.extractCategoryCorrection(processingText);
        draft.state = 'AWAITING_CONFIRMATION';
        draft.missingFields = [];
        draft.rawText = this.appendCorrectionToRawText(draft.rawText, processingText);
        await this.handleParseResult(draft, ctxStub, chatId, messageId);
        return;
      }

      // Handle payment correction mode
      if (existingDraft && (existingDraft as any).state === 'AWAITING_PAYMENT_CORRECTION') {
        if (textLower === 'pronto') {
          const draft = existingDraft as any;
          const nfce = draft.nfceResult;
          if (nfce && nfce.paymentDetails.length > 0) {
            const sum = Math.round(nfce.paymentDetails.reduce((s: number, p: any) => s + p.amount, 0) * 100) / 100;
            const diff = Math.abs(sum - draft.amount);
            if (diff > 0.02) {
              const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
              await this.bot!.api.sendMessage(chatId,
                `⚠️ A soma dos pagamentos (${fmt(sum)}) é diferente do total (${fmt(draft.amount)}).\n\n` +
                `Continue editando ou envie \`pronto\` para aceitar.`,
                { parse_mode: 'Markdown' }
              );
              return;
            }
          }
          draft.state = 'AWAITING_SPLIT_DECISION';
          await this.redis.saveDraft(chatId, draft);
          await this.showSplitPaymentConfirmation(draft, ctxStub, chatId);
          return;
        }

        // Parse payment correction lines
        const draft = existingDraft as any;
        const nfce = draft.nfceResult;
        if (!nfce) return;

        const lines = processingText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
        const newPayments: any[] = [];
        for (const line of lines) {
          // Flexible parsing: "crédito 90,00", "pix: 34,39", "débito R$ 50,00", "cartão crédito 90", "dinheiro R$20"
          const match = line.match(
            /^(cart[aã]o\s*(?:de\s*)?)?(?:cr[eé]dito|d[eé]bito|pix|dinheiro|vale)\s*:?\s*(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)$/i
          );
          if (match) {
            const fullLabel = line.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const amount = parseFloat(match[2].replace(',', '.'));
            let method = 'OTHER';
            let cleanLabel = 'Outro';
            if (/credito/.test(fullLabel)) { method = 'CREDIT_CARD'; cleanLabel = 'Cartão de crédito'; }
            else if (/debito/.test(fullLabel)) { method = 'DEBIT_CARD'; cleanLabel = 'Cartão de débito'; }
            else if (/pix/.test(fullLabel)) { method = 'PIX'; cleanLabel = 'Pix'; }
            else if (/dinheiro/.test(fullLabel)) { method = 'CASH'; cleanLabel = 'Dinheiro'; }
            else if (/vale/.test(fullLabel)) { method = 'OTHER'; cleanLabel = 'Vale'; }
            if (amount > 0) {
              newPayments.push({ method, label: cleanLabel, amount, installments: 1 });
            }
          }
        }

        if (newPayments.length > 0) {
          nfce.paymentDetails = newPayments;
          nfce.hasSplitPayment = newPayments.length > 1;
          await this.redis.saveDraft(chatId, draft);
          const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
          const list = newPayments.map((p: any) => `• ${p.label}: ${fmt(p.amount)}`).join('\n');
          await this.bot!.api.sendMessage(chatId,
            `✅ Pagamentos atualizados:\n${list}\n\nEnvie mais ou \`pronto\` para confirmar.`,
            { parse_mode: 'Markdown' }
          );
        } else {
          await this.bot!.api.sendMessage(chatId,
            '⚠️ Formato não reconhecido. Use:\n`crédito 90,00`\n`débito 34,39`',
            { parse_mode: 'Markdown' }
          );
        }
        return;
      }

      // If awaiting specific info, try to fill it
      if (existingDraft && (existingDraft.state === 'AWAITING_AMOUNT' || (existingDraft.state as string) === 'AWAITING_TYPE' || (existingDraft.state as string) === 'AWAITING_DESCRIPTION')) {
          const result = await this.parser.parse(processingText);
          const draft = { ...existingDraft };
          
          if (result.amount !== null) draft.amount = result.amount;
          if (result.type !== 'unknown') draft.type = result.type;
          if (result.description && result.description !== 'Outros') draft.description = result.description;
          
          // Re-validate
          const missing: string[] = [];
          if (!draft.amount) missing.push('valor');
          if (!draft.type || draft.type === 'unknown') missing.push('tipo');
          draft.missingFields = missing;
          
          await this.handleParseResult(draft, ctxStub, chatId, messageId);
          return;
      }

      // 4. Standard Intent Processing
      const queryResult = await this.queryParser.parseQuery(processingText, chatId, userId, orgId);
      this.logger.log(`[Parser] Intent detectado: ${queryResult.intent}`);

      switch (queryResult.intent) {
        case Intent.GET_SUMMARY:
          await this.handleSummaryIntent(queryResult.data.period, { orgId }, ctxStub, messageId);
          break;
        case Intent.GET_INSIGHTS:
          await this.handleInsightsIntent({ orgId }, ctxStub, messageId);
          break;
        case Intent.SEARCH_TRANSACTIONS:
          await this.handleSearchIntent(queryResult.data.query, { orgId }, ctxStub, messageId);
          break;
        case Intent.CREATE_TRANSACTION:
          // merge with existing context if any (even if not strictly awaiting)
          const transactionData: any = {
              ...queryResult.data,
              chatId, userId, orgId, memberId,
              rawText: processingText
          };
          
          // Check for split payment from AI or local regex
          let splitPayments = queryResult.data.paymentDetails && queryResult.data.paymentDetails.length > 1
            ? queryResult.data.paymentDetails
            : null;

          // Local regex fallback: detect multiple payment methods in text
          // Uses text-consumption: matched segments are removed to prevent duplicates
          if (!splitPayments) {
            let remaining = processingText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const matches: { label: string; amount: number; method: string }[] = [];
            
            // Step 1: Extract "cartao [de] debito [amount]"
            remaining = remaining.replace(/(?:pago?\s+(?:no|na|com)\s+)?cart(?:ao|ão)\s+(?:de\s+)?debito\s+(\d+(?:[.,]\d{1,2})?)/gi, (full, amt) => {
              const amount = parseFloat(amt.replace(',', '.'));
              if (amount > 0) matches.push({ label: 'Débito', amount, method: 'DEBIT_CARD' });
              return ''; // consume
            });
            
            // Step 2: Extract "cartao [de] credito [amount]"
            remaining = remaining.replace(/(?:pago?\s+(?:no|na|com)\s+)?cart(?:ao|ão)\s+(?:de\s+)?credito\s+(\d+(?:[.,]\d{1,2})?)/gi, (full, amt) => {
              const amount = parseFloat(amt.replace(',', '.'));
              if (amount > 0) matches.push({ label: 'Crédito', amount, method: 'CREDIT_CARD' });
              return '';
            });
            
            // Step 3: Extract "cartao [name] [amount]" (named cards like nubank, black, etc.)
            remaining = remaining.replace(/(?:pago?\s+(?:no|na|com)\s+)?cart(?:ao|ão)\s+([\w]+)\s+(\d+(?:[.,]\d{1,2})?)/gi, (full, name, amt) => {
              if (/^(de|debito|credito)$/i.test(name)) return full; // skip already handled
              const amount = parseFloat(amt.replace(',', '.'));
              if (amount > 0) matches.push({ label: name, amount, method: 'CREDIT_CARD' });
              return '';
            });
            
            // Step 4: Extract "pix [amount]" from remaining text
            remaining = remaining.replace(/(?:pago?\s+(?:no|na|com|via)\s+)?pix\s+(\d+(?:[.,]\d{1,2})?)/gi, (full, amt) => {
              const amount = parseFloat(amt.replace(',', '.'));
              if (amount > 0) matches.push({ label: 'Pix', amount, method: 'PIX' });
              return '';
            });
            
            // Step 5: Extract "dinheiro [amount]" from remaining text
            remaining = remaining.replace(/(?:pago?\s+(?:no|na|com|em)\s+)?(?:dinheiro|especie)\s+(\d+(?:[.,]\d{1,2})?)/gi, (full, amt) => {
              const amount = parseFloat(amt.replace(',', '.'));
              if (amount > 0) matches.push({ label: 'Dinheiro', amount, method: 'CASH' });
              return '';
            });
            
            // Step 6: Extract standalone "debito [amount]" from remaining text (not already consumed)
            remaining = remaining.replace(/(?:pago?\s+(?:no|na|com)\s+)?debito\s+(\d+(?:[.,]\d{1,2})?)/gi, (full, amt) => {
              const amount = parseFloat(amt.replace(',', '.'));
              if (amount > 0) matches.push({ label: 'Débito', amount, method: 'DEBIT_CARD' });
              return '';
            });
            
            // Step 7: Extract standalone "credito [amount]" from remaining text
            remaining.replace(/(?:pago?\s+(?:no|na|com)\s+)?credito\s+(\d+(?:[.,]\d{1,2})?)/gi, (full, amt) => {
              const amount = parseFloat(amt.replace(',', '.'));
              if (amount > 0) matches.push({ label: 'Crédito', amount, method: 'CREDIT_CARD' });
              return '';
            });
            
            if (matches.length > 1) {
              splitPayments = matches;
            }
          }

          if (splitPayments && splitPayments.length > 1) {
            const paymentDetails = splitPayments.map((p: any) => {
              const methodStr = (p.method || 'CREDIT_CARD').toUpperCase();
              return {
                method: ['CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'CASH'].includes(methodStr) ? methodStr : 'CREDIT_CARD',
                amount: p.amount,
                label: p.label || 'Pagamento',
                installments: p.installments || 1
              };
            });
            // Ensure the total amount matches the sum of split payments
            const splitSum = paymentDetails.reduce((s: number, p: any) => s + p.amount, 0);
            transactionData.amount = transactionData.amount || splitSum;
            transactionData.nfceResult = {
              hasSplitPayment: true,
              paymentDetails,
            };
            await this.redis.saveDraft(chatId, transactionData);
            await this.showSplitPaymentConfirmation(transactionData, ctxStub, chatId, messageId);
          } else {
            await this.handleParseResult(transactionData, ctxStub, chatId, messageId);
          }
          break;
        case Intent.HELP:
          await this.bot!.api.editMessageText(chatId, messageId, '💡 *EconomyZee: Seu Assistente Financeiro*\n\n' +
            '• "Gastei 50 no mercado"\n' +
            '• "Recebi 5000 de salário"\n' +
            '• "Resumo do mês"\n' +
            '• "Buscar gastos com uber"\n\n' +
            'Você também pode enviar *áudios* ou *fotos de comprovantes*!', { parse_mode: 'Markdown' });
          break;
        default:
          await this.bot!.api.editMessageText(chatId, messageId, '🤔 Não entendi muito bem. Tente algo como "Gastei 50 no mercado" ou peça um "/resumo".');
      }
      this.logger.log('[Telegram] Resposta final enviada');
    } catch (err: any) {
      this.logger.error(`[Telegram] Erro tratado: ${err.message}`);
      const friendlyMsg = err.message.includes('demorou') 
        ? '⚠️ O processamento demorou mais que o esperado. Se for um áudio longo ou imagem complexa, tente enviar o texto diretamente.'
        : '❌ Ops! Tive um problema técnico. Tente novamente em instantes.';
      await this.bot!.api.editMessageText(chatId, messageId, friendlyMsg);
    }
  }

  private async handleSummaryIntent(period: string, member: any, ctx: Context, messageId?: number) {
    if (period === 'daily') {
      const report = await this.summary.getDailySummary(member.orgId);
      let msg = `📅 *Resumo de Hoje (${report.date})*\n\n`;
      msg += `💸 *Gasto total:* R$ ${report.total.toFixed(2).replace('.', ',')}\n`;
      msg += `🧾 *Transações:* ${report.count}\n\n`;
      
      if (report.transactions.length > 0) {
        msg += report.transactions.map(t => `• R$ ${t.amount.toFixed(2).replace('.', ',')} - ${t.description}`).join('\n');
      } else {
        msg += 'Nenhum gasto hoje.';
      }

      if (messageId) await this.bot!.api.editMessageText(ctx.chat!.id, messageId, msg, { parse_mode: 'Markdown' });
      else await ctx.reply(msg, { parse_mode: 'Markdown' });
    } else {
      const report = await this.summary.getMonthlySummary(member.orgId);
      
      let msg = `📊 *Resumo de ${report.period}*\n\n`;
      msg += `💰 *Receitas:* R$ ${report.income.toFixed(2).replace('.', ',')}\n`;
      msg += `💸 *Despesas:* R$ ${report.expenses.toFixed(2).replace('.', ',')}\n`;
      msg += `📈 *Saldo:* R$ ${report.balance.toFixed(2).replace('.', ',')}\n\n`;

      if (report.previousMonthDiff !== 0) {
        const icon = report.previousMonthDiff > 0 ? '🔺' : '🔻';
        msg += `${icon} *${Math.abs(report.previousMonthDiff).toFixed(1)}%* vs mês anterior\n\n`;
      }

      msg += `📂 *Top Categorias:*\n`;
      msg += report.topCategories.map(c => `• ${c.name}: R$ ${c.amount.toFixed(2).replace('.', ',')}`).join('\n');

      const keyboard = new InlineKeyboard().url('📊 Abrir Dashboard', `${this.config.get('FRONTEND_URL')}/dashboard`);
      
      if (messageId) await this.bot!.api.editMessageText(ctx.chat!.id, messageId, msg, { parse_mode: 'Markdown', reply_markup: keyboard });
      else await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: keyboard });
    }
  }

  private async handleInsightsIntent(member: any, ctx: Context, messageId?: number) {
    const insights = await this.insights.getInsights(member.orgId);
    const msg = `🧠 *Insights Financeiros*\n\n` + insights.map(i => `✨ ${i}`).join('\n\n');
    if (messageId) await this.bot!.api.editMessageText(ctx.chat!.id, messageId, msg, { parse_mode: 'Markdown' });
    else await ctx.reply(msg, { parse_mode: 'Markdown' });
  }

  private async handleSearchIntent(query: string, member: any, ctx: Context, messageId?: number) {
    const results = await this.transactions.findAll(member.orgId, { search: query, limit: 5 });
    
    if (results.total === 0) {
      const msg = `❌ Não encontrei registros para "${query}".`;
      if (messageId) await this.bot!.api.editMessageText(ctx.chat!.id, messageId, msg);
      else await ctx.reply(msg);
      return;
    }

    let msg = `🔍 *Resultados para "${query}":*\n\n`;
    msg += results.data.map(t => `• ${new Date(t.date).toLocaleDateString('pt-BR')} - R$ ${(t.amountInCents/100).toFixed(2).replace('.', ',')} - ${t.description}`).join('\n');

    if (messageId) await this.bot!.api.editMessageText(ctx.chat!.id, messageId, msg, { parse_mode: 'Markdown' });
    else await ctx.reply(msg, { parse_mode: 'Markdown' });
  }

  private async handleDraftCorrection(
    existingDraft: TransactionDraft,
    correctionText: string,
    ctx: Context,
    chatId: string,
    messageId?: number,
  ) {
    const draft = { ...(existingDraft as any) };
    const text = correctionText.trim();
    const normalized = this.normalizeTelegramText(text);
    const amountCents = extractMoneyAmount(text);
    const typeCorrection = this.extractTypeCorrection(normalized);
    const categoryCorrection = this.tryExtractCategoryCorrection(text);

    if (categoryCorrection) {
      draft.category = categoryCorrection;
    } else if (this.isAmountCorrection(normalized, text, amountCents)) {
      draft.amount = amountCents! / 100;
    } else if (typeCorrection) {
      draft.type = typeCorrection;
    } else {
      draft.description = this.extractDescriptionCorrection(text);
    }

    draft.state = 'AWAITING_CONFIRMATION';
    draft.missingFields = [];
    draft.rawText = this.appendCorrectionToRawText(draft.rawText, text);

    await this.handleParseResult(draft, ctx, chatId, messageId);
  }

  private normalizeTelegramText(text: string) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isAmountCorrection(normalized: string, rawText: string, amountCents: number | null) {
    if (amountCents === null) return false;

    const numericOnly = /^\s*(?:r\$\s*)?\d+(?:[.,]\d{1,2})?\s*(?:reais?|rs)?\s*$/i.test(rawText);
    const explicitAmountWords = /\b(valor|preco|preço|custou|custa|era|foi|ficou|reais?|real|r\$)\b/i.test(rawText);
    const plainDescriptionWithNumber = /\b(loja|mercado|posto|24h|24 horas|numero|n[uú]mero)\b/i.test(normalized);

    return numericOnly || (explicitAmountWords && !plainDescriptionWithNumber);
  }

  private extractTypeCorrection(normalized: string): 'expense' | 'income' | null {
    if (/^(receita|entrada|ganho|renda)$/.test(normalized) || /\b(tipo|era|foi)\s+(receita|entrada)\b/.test(normalized)) {
      return 'income';
    }

    if (/^(despesa|gasto|saida|saída)$/.test(normalized) || /\b(tipo|era|foi)\s+(despesa|gasto|saida)\b/.test(normalized)) {
      return 'expense';
    }

    return null;
  }

  private tryExtractCategoryCorrection(text: string): string | null {
    const match = text.trim().match(/^(?:categoria|cat)\s*(?:nova|correta)?\s*[:=-]?\s*(.+)$/i);
    if (!match?.[1]) return null;
    return this.capitalizeCorrection(match[1]);
  }

  private extractCategoryCorrection(text: string): string {
    const category = this.tryExtractCategoryCorrection(text) || text.trim();
    return this.capitalizeCorrection(category);
  }

  private extractDescriptionCorrection(text: string): string {
    let description = text.trim();

    description = description
      .replace(/^(?:descri[cç][aã]o|descricao|desc)\s*(?:nova|correta)?\s*(?:e|é|era|para|:|=|-)?\s*/i, '')
      .replace(/^(?:foi|era|e|é)\s+(?:no|na|em|para|pro|pra|com)?\s*/i, '')
      .replace(/^(?:no|na|em|para|pro|pra)\s+/i, '')
      .trim();

    return this.capitalizeCorrection(description || text.trim());
  }

  private appendCorrectionToRawText(rawText: string | undefined, correction: string) {
    const base = rawText?.trim();
    return base ? `${base}\nCorrecao: ${correction}` : correction;
  }

  private capitalizeCorrection(value: string) {
    const cleaned = value.trim().replace(/\s+/g, ' ');
    if (!cleaned) return cleaned;
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  private async handleParseResult(draft: any, ctx: Context, chatId: string, messageId?: number) {
    // Memória de categorização: na primeira passagem por este draft, registra a
    // categoria sugerida pelo parser e aplica a memória do usuário (se houver).
    // Em re-renderizações (após correção) originalCategory já está setado -> não reaplica,
    // preservando a correção manual recém-feita.
    if (draft.originalCategory === undefined) {
      draft.originalCategory = draft.category || 'Outros';
      if (draft.userId) {
        await this.categoryMemory.applyTo(draft.userId, draft);
      }
    }

    // If missing fields, ask conversationally
    if (draft.missingFields && draft.missingFields.length > 0) {
      const missing = draft.missingFields[0];
      let question = '';
      
      if (missing === 'valor') {
        question = '💰 *Qual foi o valor?* (Ex: 12,50)';
        draft.state = 'AWAITING_AMOUNT';
      } else if (missing === 'tipo') {
        question = '🤔 *Isso foi um gasto ou uma entrada?*';
        draft.state = 'AWAITING_TYPE';
      } else if (missing === 'descrição') {
        question = '📝 *Esse valor foi referente a quê?* (Ex: Almoço)';
        draft.state = 'AWAITING_DESCRIPTION';
      } else {
        question = '🤔 Não entendi tudo. Pode explicar melhor?';
        draft.state = 'AWAITING_FIELD';
      }

      await this.redis.saveDraft(chatId, draft);
      if (messageId) await this.bot!.api.editMessageText(chatId, messageId, question, { parse_mode: 'Markdown' });
      else await ctx.reply(question, { parse_mode: 'Markdown' });
      return;
    }

    // STEP 1: Try to detect payment method from rawText before asking
    const rawLower = (draft.rawText || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Load user's cards and accounts ONCE
    const [allCards, allAccounts] = await Promise.all([
      this.prisma.card.findMany({ where: { orgId: draft.orgId } }),
      this.prisma.account.findMany({ where: { orgId: draft.orgId } }),
    ]);
    const requestedCardType = this.detectRequestedCardType(rawLower);
    const candidateCards = requestedCardType
      ? allCards.filter((card: any) => this.cardMatchesRequestedType(card, requestedCardType))
      : allCards;

    // Always try to auto-detect card from rawText (even if AI set a generic paymentMethod)
    if (!draft.cardId) {
      // Check pix / dinheiro first
      if (rawLower.includes('pix') && (!draft.paymentMethod || draft.paymentMethod === 'unknown')) {
        draft.paymentMethod = 'Pix';
      } else if ((rawLower.includes('dinheiro') || rawLower.includes('especie') || rawLower.includes('em maos')) && (!draft.paymentMethod || draft.paymentMethod === 'unknown')) {
        draft.paymentMethod = 'Dinheiro';
      } else {
        // Check cards by name (fuzzy: rawText contains card name)
        const matchedCard = candidateCards.find(c => {
          const cardNameLower = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return rawLower.includes(cardNameLower);
        });

        if (matchedCard) {
          draft.cardId = matchedCard.id;
          draft.paymentMethod = matchedCard.name;
        } else {
          // Also try matching by the AI-returned paymentMethod name against card names
          if (draft.paymentMethod && draft.paymentMethod !== 'unknown') {
            const pmLower = draft.paymentMethod.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const cardByPm = candidateCards.find(c => {
              const cn = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              return pmLower.includes(cn) || cn.includes(pmLower);
            });
            if (cardByPm) {
              draft.cardId = cardByPm.id;
              draft.paymentMethod = cardByPm.name;
            }
          }

          // Check common bank names
          if (!draft.cardId) {
            const bankKeywords: Record<string, string> = {
              nubank: 'Nubank', inter: 'Inter', itau: 'Itaú', bradesco: 'Bradesco',
              santander: 'Santander', caixa: 'Caixa', bb: 'Banco do Brasil',
              neon: 'Neon', c6: 'C6 Bank', picpay: 'PicPay', mercadopago: 'Mercado Pago',
            };
            const foundBank = Object.entries(bankKeywords).find(([kw]) => rawLower.includes(kw));
            if (foundBank) {
              const cardByBank = candidateCards.find(c =>
                c.name.toLowerCase().includes(foundBank[0]) || foundBank[0].includes(c.name.toLowerCase())
              );
              if (cardByBank) {
                draft.cardId = cardByBank.id;
                draft.paymentMethod = cardByBank.name;
              } else if (!draft.paymentMethod || draft.paymentMethod === 'unknown') {
                draft.paymentMethod = foundBank[1];
              }
            }
          }

          // Check accounts by name
          if (!requestedCardType && !draft.cardId && !draft.accountId) {
            const matchedAcc = allAccounts.find(a =>
              rawLower.includes(a.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
            );
            if (matchedAcc) {
              draft.accountId = matchedAcc.id;
              draft.paymentMethod = matchedAcc.name;
            }
          }
        }
      }

      // Detect if user mentioned generic "cartão/cartao" without specifying which one
      const mentionedGenericCard = /\b(cartao|cartão|credito|crédito|debito|débito)\b/i.test(rawLower)
        && !draft.cardId
        && !['Pix', 'Dinheiro'].includes(draft.paymentMethod || '');
      if (mentionedGenericCard) {
        (draft as any)._cardOnlyPrompt = true;
        if (requestedCardType) {
          (draft as any)._cardTypePrompt = requestedCardType;
        }
        draft.paymentMethod = 'unknown'; // Force into button flow
      }
    }

    // STEP 2: If still unknown after local detection → show buttons
    if (!draft.paymentMethod || draft.paymentMethod === 'unknown') {
      const isCardOnly = (draft as any)._cardOnlyPrompt === true;
      const promptCardType = ((draft as any)._cardTypePrompt || requestedCardType) as RequestedCardType | undefined;
      const isInstallmentContext = /\b(parcel|parcela|parcelad|parcelamento)/.test(rawLower);
      const cards = allCards.filter((card: any) => {
        if (!this.cardMatchesRequestedType(card, promptCardType)) return false;
        if (isInstallmentContext && this.cardMatchesRequestedType(card, 'DEBIT')) return false;
        return true;
      });

      if (isCardOnly && cards.length === 0) {
        const cardTypeLabel = promptCardType ? this.getCardTypeLabel(promptCardType).toLowerCase() : 'cartao';
        const question = `Nao encontrei nenhum ${cardTypeLabel} cadastrado. Cadastre um cartao em Contas & Cartoes e tente novamente.`;
        await this.redis.saveDraft(chatId, draft);
        if (messageId) await this.bot!.api.editMessageText(chatId, messageId, question);
        else await ctx.reply(question);
        return;
      }

      // If user said generic "cartao" and there's exactly 1 card → auto-select
      if (isCardOnly && cards.length === 1) {
        draft.cardId = cards[0].id;
        draft.paymentMethod = cards[0].name;
        delete (draft as any)._cardOnlyPrompt;
        delete (draft as any)._cardTypePrompt;
        await this.redis.saveDraft(chatId, draft);
        // Continue to installment check below
      } else {
        const keyboard = new InlineKeyboard();

        if (!isCardOnly) {
          // Show full payment options: Pix, Dinheiro, + user accounts
          keyboard.text('📱 Pix', 'tx_pay_pix').text('💵 Dinheiro', 'tx_pay_cash').row();

          // Show user's registered accounts (no generic "Carteira" — avoids duplicates)
          const accounts = allAccounts;
          if (accounts.length > 0) {
            accounts.forEach(acc => {
              keyboard.text(`🏦 ${acc.name}`, `tx_pay_acc_${acc.id}`).row();
            });
          } else {
            // Fallback: only show if user has no accounts registered
            keyboard.text('🏦 Carteira', 'tx_pay_wallet').row();
          }
        }

        // Always show only cards compatible with what the user said.
        cards.forEach(card => {
          const typeLabel = (card as any).cardType === 'DEBIT' ? '(Débito)' : '(Crédito)';
          keyboard.text(`💳 ${card.name} ${typeLabel}`, `tx_pay_card_${card.id}`).row();
        });

        draft.state = 'AWAITING_PAYMENT';
        delete (draft as any)._cardOnlyPrompt;
        await this.redis.saveDraft(chatId, draft);
        const cardQuestionLabel = promptCardType ? this.getCardTypeLabel(promptCardType) : 'cartao';
        const question = isCardOnly
          ? `💳 *Qual ${cardQuestionLabel} foi utilizado?*`
          : '💳 *Como você pagou isso?*';
        if (messageId) await this.bot!.api.editMessageText(chatId, messageId, question, { parse_mode: 'Markdown', reply_markup: keyboard });
        else await ctx.reply(question, { parse_mode: 'Markdown', reply_markup: keyboard });
        return;
      }
    }

    // STEP 3: Auto-link named payment method to DB entities (if AI returned a name like "Nubank" but no cardId yet)
    if (!draft.cardId && !draft.accountId && !['pix', 'dinheiro', 'carteira'].includes((draft.paymentMethod || '').toLowerCase())) {
        const pmLower = (draft.paymentMethod || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const matchedCard = candidateCards.find(c => {
          const cLower = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return pmLower.includes(cLower) || cLower.includes(pmLower);
        });
        
        if (matchedCard) {
            draft.cardId = matchedCard.id;
            draft.paymentMethod = matchedCard.name;
        } else {
            const matchedAcc = requestedCardType ? undefined : allAccounts.find(a => {
              const aLower = a.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              return pmLower.includes(aLower) || aLower.includes(pmLower);
            });
            if (matchedAcc) {
                draft.accountId = matchedAcc.id;
                draft.paymentMethod = matchedAcc.name;
            }
        }
    }

    // STEP 4: Installment handling
    // Regra: NUNCA pedir parcelas automaticamente. Só perguntar quando:
    //   (a) Cartão de CRÉDITO + sem intenção explícita → perguntar À VISTA ou PARCELADO
    //   (b) Intenção explícita ("parcelado", "dividido", "em X vezes/parcelas")
    //       sem número detectado → mostrar 2x..12x
    //   (c) Caso contrário, assume 1x (à vista) e segue para confirmação
    if (draft.cardId && draft.type === 'expense' && !draft.installments) {
      const linkedCard = allCards.find(c => c.id === draft.cardId);
      const isDebit = linkedCard && (linkedCard as any).cardType === 'DEBIT';

      if (isDebit) {
        // Cartão de débito sempre é à vista
        draft.installments = 1;
        this.logger.log(`[Telegram] Cartão DÉBITO "${linkedCard!.name}" → forçando 1x (à vista)`);
      } else {
        const rawLower = (draft.rawText || '').toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (this.hasExplicitInstallmentIntent(rawLower)) {
          // Usuário disse "parcelado"/"dividido" mas sem número
          // (se houvesse número, draft.installments já teria sido preenchido pelo parser)
          this.logger.log(`[Telegram] Intenção EXPLÍCITA de parcelamento (sem número) → mostrando 2x..12x`);
          return await this.askInstallments(draft, ctx, chatId, messageId);
        }

        // Sem intenção explícita → perguntar À vista / Parcelado
        this.logger.log(`[Telegram] Cartão de CRÉDITO sem intenção de parcelar → perguntando À vista/Parcelado`);
        return await this.askVistaOuParcelado(draft, ctx, chatId, messageId);
      }
    }

    // Sem cartão ou installments já definido — garantir installments=1 para a confirmação
    if (!draft.installments) {
      draft.installments = 1;
      this.logger.log(`[Telegram] Transação à vista (1x) — paymentMethod=${draft.paymentMethod}, type=${draft.type}, amount=R$${draft.amount}`);
    }

    await this.showConfirmation(draft, ctx, chatId, messageId);
  }

  /**
   * Detecta intenção EXPLÍCITA de parcelar no texto cru do usuário.
   * Cobre: parcelado, parcelei, parcelamento, parcelar, parcela, parcelas,
   *        dividido, dividir, "em X vezes/parcelas".
   * NÃO cobre apenas "cartão de crédito" — crédito sozinho não implica parcelar.
   * O parâmetro deve estar normalizado (lowercase + sem acentos).
   */
  private hasExplicitInstallmentIntent(textNorm: string): boolean {
    return /\bparcel(ado|ada|ei|amento|ar|a|as)\b/i.test(textNorm)
      || /\bdivid(ido|ida|ir|i)\b/i.test(textNorm)
      || /\bem\s+\d+\s*(x|vezes|parcelas?)\b/i.test(textNorm);
  }

  private detectRequestedCardType(textNorm: string): RequestedCardType | undefined {
    const mentionsCredit = /\bcredito\b/i.test(textNorm);
    const mentionsDebit = /\bdebito\b/i.test(textNorm);

    if (mentionsCredit && !mentionsDebit) return 'CREDIT';
    if (mentionsDebit && !mentionsCredit) return 'DEBIT';
    return undefined;
  }

  private cardMatchesRequestedType(card: any, requestedType?: RequestedCardType): boolean {
    if (!requestedType) return true;
    if (!card) return false;
    return ((card as any).cardType || 'CREDIT') === requestedType;
  }

  private getCardTypeLabel(cardType: RequestedCardType): string {
    return cardType === 'DEBIT' ? 'cartao de debito' : 'cartao de credito';
  }

  /**
   * Mostra os botões 2x..12x + Mais... para escolha do número de parcelas.
   */
  private async askInstallments(draft: any, ctx: Context, chatId: string, messageId?: number) {
    draft.state = 'AWAITING_INSTALLMENTS';
    await this.redis.saveDraft(chatId, draft);

    const keyboard = new InlineKeyboard();
    keyboard.text('2x', 'tx_inst_2').text('3x', 'tx_inst_3').text('4x', 'tx_inst_4').row();
    keyboard.text('5x', 'tx_inst_5').text('6x', 'tx_inst_6').text('7x', 'tx_inst_7').row();
    keyboard.text('8x', 'tx_inst_8').text('9x', 'tx_inst_9').text('10x', 'tx_inst_10').row();
    keyboard.text('11x', 'tx_inst_11').text('12x', 'tx_inst_12').text('Mais...', 'tx_inst_more').row();

    const valorFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(draft.amount || 0);
    const question = `🔢 *Em quantas parcelas?* (${valorFormatted})`;
    if (messageId) await this.bot!.api.editMessageText(chatId, messageId, question, { parse_mode: 'Markdown', reply_markup: keyboard });
    else await ctx.reply(question, { parse_mode: 'Markdown', reply_markup: keyboard });
  }

  /**
   * Mostra os botões "À vista" / "Parcelado" para cartão de crédito sem
   * intenção explícita de parcelar.
   */
  private async askVistaOuParcelado(draft: any, ctx: Context, chatId: string, messageId?: number) {
    draft.state = 'AWAITING_VISTA_PARCELADO';
    await this.redis.saveDraft(chatId, draft);

    const keyboard = new InlineKeyboard()
      .text('💵 À vista', 'tx_a_vista')
      .text('🔢 Parcelado', 'tx_parcelar');

    const valorFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(draft.amount || 0);
    const cardName = draft.paymentMethod || 'cartão de crédito';
    const question = `💳 *${valorFormatted} no ${cardName}*\nFoi à vista ou parcelado?`;
    if (messageId) await this.bot!.api.editMessageText(chatId, messageId, question, { parse_mode: 'Markdown', reply_markup: keyboard });
    else await ctx.reply(question, { parse_mode: 'Markdown', reply_markup: keyboard });
  }

  private async showConfirmation(draft: any, ctx: Context, chatId: string, messageId?: number) {
    draft.state = 'AWAITING_CONFIRMATION';

    // Detectar workspaces disponíveis (para mostrar/ocultar botão de trocar)
    const userMemberships = await this.prisma.organizationMember.findMany({
      where: { userId: draft.userId },
      include: { org: true },
      orderBy: { createdAt: 'asc' },
    });
    const hasMultipleWorkspaces = userMemberships.length > 1;

    // Workspace ativo do lançamento (default = workspace pessoal do orgId já setado)
    const activeOrgId: string = draft.targetOrgId || draft.orgId;
    const activeMember = userMemberships.find(m => m.orgId === activeOrgId) || userMemberships[0];
    const activeWorkspaceName = activeMember?.org?.name || 'Workspace';

    await this.redis.saveDraft(chatId, draft);

    const tipoIcon = draft.type === 'expense' ? '💸' : draft.type === 'income' ? '💰' : '🔄';
    const tipoText = draft.type === 'expense' ? 'Despesa' : draft.type === 'income' ? 'Receita' : 'Transferência';
    const valorFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(draft.amount || 0);
    const desc = (draft.description || 'Outros').charAt(0).toUpperCase() + (draft.description || '').slice(1);
    const cat = draft.category || 'Outros';
    const pay = draft.paymentMethod || 'Não informado';
    const inst = draft.installments && draft.installments > 1
      ? `${draft.installments}x de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((draft.amount || 0) / draft.installments)}`
      : 'À vista';

    // Source info from NFC-e
    let sourceLabel = '';
    let confidenceLabel = '';
    if (draft.receiptSource) {
      const sourceMap: Record<string, string> = {
        'NFCE_QRCODE': '📡 NFC-e via QR Code',
        'OCR_SMART': '📷 OCR Inteligente',
        'OCR_FALLBACK': '📷 OCR',
      };
      sourceLabel = sourceMap[draft.receiptSource] || '📷 OCR';
      const conf = draft.confidence || 0;
      confidenceLabel = conf >= 0.9 ? '🎯 Alta' : conf >= 0.6 ? '🎯 Média' : '⚠️ Baixa';
    }

    const keyboard = new InlineKeyboard()
      .text('✅ Confirmar', 'tx_confirm')
      .text('✏️ Corrigir', 'tx_edit').row()
      .text('📁 Mudar Categoria', 'tx_cat')
      .text('💳 Mudar Pagamento', 'tx_pay_unknown').row();

    // Botão de trocar workspace só aparece quando há >1 workspace
    if (hasMultipleWorkspaces) {
      keyboard.text('🔄 Trocar workspace', 'tx_switch_ws').row();
    }
    keyboard.text('🚫 Descartar', 'tx_cancel');

    let message =
      `📝 *Conferência de Lançamento*\n\n` +
      `📌 *Tipo:* ${tipoIcon} ${tipoText}\n` +
      `💵 *Valor:* ${valorFormatted}\n` +
      `📄 *Descrição:* ${desc}\n` +
      `📂 *Categoria:* ${cat}\n` +
      `💳 *Pagamento:* ${pay}\n` +
      (draft.cardId ? `🔢 *Parcelas:* ${inst}\n` : '');

    // Mostrar workspace de destino só quando o usuário tem mais de um
    if (hasMultipleWorkspaces) {
      message += `🏢 *Workspace:* ${activeWorkspaceName}\n`;
    }

    if (sourceLabel) {
      message += `📡 *Fonte:* ${sourceLabel}\n`;
      message += `🎯 *Confiança:* ${confidenceLabel}\n`;
    }

    message += `\n_Deseja salvar esta transação?_`;

    if (messageId) {
      await this.bot!.api.editMessageText(chatId, messageId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
    } else {
      await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
    }
  }

  // ==================== SPLIT PAYMENT CONFIRMATION ====================

  private async showSplitPaymentConfirmation(draft: any, ctx: Context, chatId: string, messageId?: number) {
    draft.state = 'AWAITING_SPLIT_DECISION';
    await this.redis.saveDraft(chatId, draft);

    const nfce = draft.nfceResult;
    if (!nfce) return;

    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    const tipoIcon = draft.type === 'expense' ? '💸' : '💰';
    const tipoText = draft.type === 'expense' ? 'Despesa' : 'Receita';
    const desc = (draft.description || 'Compra').charAt(0).toUpperCase() + (draft.description || '').slice(1);

    const sourceMap: Record<string, string> = {
      'NFCE_QRCODE': '🔗 NFC-e via QR Code',
      'OCR_SMART': '🤖 OCR Inteligente',
      'OCR_FALLBACK': '📷 OCR',
    };
    const sourceLabel = sourceMap[nfce.source] || '📷 OCR';
    const conf = draft.confidence || 0;
    const confidenceEmoji = conf >= 0.9 ? '🟢' : conf >= 0.6 ? '🟡' : '🔴';
    const confidenceLabel = conf >= 0.9 ? 'Alta' : conf >= 0.6 ? 'Média' : 'Baixa';

    // Payment emojis by method
    const paymentEmoji: Record<string, string> = {
      'CREDIT_CARD': '💳',
      'DEBIT_CARD': '🏧',
      'PIX': '📱',
      'CASH': '💵',
      'OTHER': '💰',
    };

    // Payment details with specific emojis
    let paymentList = '';
    let paymentSum = 0;
    nfce.paymentDetails.forEach((p: any) => {
      const emoji = paymentEmoji[p.method] || '💰';
      paymentList += `   ${emoji} ${p.label}: *${fmt(p.amount)}*\n`;
      paymentSum += p.amount;
    });
    paymentSum = Math.round(paymentSum * 100) / 100;

    // Total verification
    const totalMatch = Math.abs(paymentSum - draft.amount) < 0.02;
    const sumLine = totalMatch
      ? `   ✅ Total: *${fmt(paymentSum)}*`
      : `   ⚠️ Soma: *${fmt(paymentSum)}* (total nota: ${fmt(draft.amount)})`;

    // Validation warning
    let validationNote = '';
    if (nfce.splitPaymentStatus === 'NEEDS_CORRECTION' || !totalMatch) {
      validationNote = `\n⚠️ _Os valores podem precisar de correção. Use "Corrigir" para ajustar._\n`;
    }

    const keyboard = new InlineKeyboard()
      .text('💾 Salvar como única', 'tx_split_single').row()
      .text('📊 Separar por pagamento', 'tx_split_separate').row()
      .text('✏️ Corrigir pagamentos', 'tx_split_correct').row()
      .text('📁 Alterar categoria', 'tx_cat').row()
      .text('🚫 Descartar', 'tx_cancel');

    const message =
      `📝 *Conferência de Lançamento*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `${tipoIcon} *Tipo:* ${tipoText}\n` +
      `📄 *Descrição:* ${desc}\n` +
      `📂 *Categoria:* ${draft.category || 'Outros'}\n` +
      `${sourceLabel}\n` +
      `${confidenceEmoji} *Confiança:* ${confidenceLabel}\n\n` +
      `💳 *Pagamentos (${nfce.paymentDetails.length}):*\n` +
      paymentList +
      `   ─────────────\n` +
      sumLine + `\n` +
      validationNote +
      `\n_Como deseja salvar?_`;

    if (messageId) {
      await this.bot!.api.editMessageText(chatId, messageId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
    } else {
      await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
    }
  }

  private buildReceiptDescription(merchantName: string): string {
    let clean = merchantName
      .replace(/\s+(LTDA|ME|EIRELI|S\.?A\.?|EPP|CNPJ.*)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    clean = clean.split(' ')
      .map(w => w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())
      .join(' ');
    return clean || 'Cupom fiscal';
  }

  // ==================== SPLIT PAYMENT SAVE ====================

  private async resolveNextSplitCard(draft: any, member: any, ctx: Context, chatId: string, mode?: 'single' | 'separate') {
    if (mode) draft.splitMode = mode;
    draft.splitCardSelections = draft.splitCardSelections || [];
    const nfce = draft.nfceResult;
    if (!nfce) return;

    for (let i = draft.splitCardSelections.length; i < nfce.paymentDetails.length; i++) {
      const payment = nfce.paymentDetails[i];
      if (payment.method === 'CREDIT_CARD' || payment.method === 'DEBIT_CARD') {
        const allCards = await this.prisma.card.findMany({ where: { orgId: member.orgId } });
        const matchType = payment.method === 'CREDIT_CARD' ? 'CREDIT' : 'DEBIT';
        const matchedCards = allCards.filter((c: any) => c.cardType === matchType);

        if (matchedCards.length === 0) {
          draft.splitCardSelections.push(null);
        } else if (matchedCards.length === 1) {
          draft.splitCardSelections.push(matchedCards[0].id);
        } else {
          // Try to auto-match by payment label (card name mentioned in text)
          const labelLow = (payment.label || '').toLowerCase().trim();
          const nameMatch = labelLow.length > 1
            ? matchedCards.find((c: any) => c.name.toLowerCase().includes(labelLow) || labelLow.includes(c.name.toLowerCase()))
            : null;
          
          if (nameMatch) {
            this.logger.log(`[Split] Auto-matched card "${nameMatch.name}" for payment "${payment.label}"`);
            draft.splitCardSelections.push(nameMatch.id);
          } else {
            // NEED PROMPT — no name match found
            draft.currentSplitPaymentIndex = i;
            draft.state = 'AWAITING_SPLIT_CARD_SELECTION';
            await this.redis.saveDraft(chatId, draft);

            const keyboard = new InlineKeyboard();
            matchedCards.forEach((c: any) => {
              keyboard.text(`💳 ${c.name}`, `tx_split_card_${c.id}`).row();
            });
            const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount);
            const typeName = payment.method === 'CREDIT_CARD' ? 'Crédito' : 'Débito';
            const msg = `💳 *Qual cartão de ${typeName}* foi usado para a parcela de ${fmt}?`;

            if (ctx.callbackQuery?.message?.message_id) {
              await this.bot!.api.editMessageText(chatId, ctx.callbackQuery.message.message_id, msg, { parse_mode: 'Markdown', reply_markup: keyboard });
            } else {
              await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: keyboard });
            }
            return; // Wait for user to select
          }
        }
      } else {
        draft.splitCardSelections.push(null); // non-card payments (PIX, CASH)
      }
    }

    // All payments resolved, proceed to save
    await this.redis.saveDraft(chatId, draft); // Save the resolved cards
    await this.executeSplitPaymentSave(draft, member, ctx, chatId, draft.splitMode);
  }

  private async executeSplitPaymentSave(draft: any, member: any, ctx: Context, chatId: string, mode: 'single' | 'separate') {
    this.logger.log(`[Split] Salvando transação modo: ${mode}, orgId: ${member.orgId}, memberId: ${member.id}`);
    try {
      const cats = await this.categories.findAll(member.orgId);
      const categoryName = draft.category || 'Outros';
      let matchedCat = cats.find((c: any) => c.name.toLowerCase() === categoryName.toLowerCase());
      if (!matchedCat) {
        try {
          matchedCat = await this.prisma.category.create({
            data: { name: categoryName, orgId: member.orgId, icon: 'Sparkles', color: 'var(--chart-5)' }
          });
        } catch (catErr: any) {
          // Handle unique constraint race condition
          if (catErr.code === 'P2002') {
            const retried = await this.categories.findAll(member.orgId);
            matchedCat = retried.find((c: any) => c.name.toLowerCase() === categoryName.toLowerCase());
          }
          if (!matchedCat) throw catErr;
        }
      }

      let orgAccounts = await this.prisma.account.findMany({ where: { orgId: member.orgId } });
      if (orgAccounts.length === 0) {
        orgAccounts = [await this.prisma.account.create({
          data: { name: 'Conta Principal', bank: 'Carteira', type: 'CHECKING', balance: 0, orgId: member.orgId, color: '#3b82f6' }
        })];
      }
      const defaultAccountId = orgAccounts[0].id;
      const nfce = draft.nfceResult;
      const receiptGroupId = `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const saveMemberId = member.id;

      const allCards = await this.prisma.card.findMany({ where: { orgId: member.orgId } });
      
      // Pre-resolve cards for each payment detail
      const resolvedCards: (string | null)[] = [];
      for (let i = 0; i < nfce.paymentDetails.length; i++) {
        const payment = nfce.paymentDetails[i];
        // Use already-selected card from splitCardSelections if available
        if (draft.splitCardSelections?.[i]) {
          resolvedCards.push(draft.splitCardSelections[i]);
          continue;
        }
        
        if (payment.method === 'CREDIT_CARD' || payment.method === 'DEBIT_CARD') {
          const matchType = payment.method === 'CREDIT_CARD' ? 'CREDIT' : 'DEBIT';
          const cardsOfType = allCards.filter((c: any) => c.cardType === matchType);
          
          if (cardsOfType.length === 1) {
            // Only one card of this type — auto-select
            this.logger.log(`[Split] Auto-resolved "${cardsOfType[0].name}" for ${payment.method}`);
            resolvedCards.push(cardsOfType[0].id);
          } else if (cardsOfType.length > 1) {
            // Try name-based match
            const labelLow = (payment.label || '').toLowerCase().trim();
            const nameMatch = labelLow.length > 1
              ? cardsOfType.find((c: any) => c.name.toLowerCase().includes(labelLow) || labelLow.includes(c.name.toLowerCase()))
              : null;
            resolvedCards.push(nameMatch ? nameMatch.id : null);
          } else {
            resolvedCards.push(null);
          }
        } else {
          resolvedCards.push(null); // PIX, CASH — no card
        }
      }

      if (mode === 'single') {
        // Single transaction — use the first resolved card
        const cardId = resolvedCards.find(c => c !== null) || null;
        const noteDetails = nfce.paymentDetails
          .map((p: any) => `${p.label}: R$ ${p.amount.toFixed(2)}`)
          .join(' + ');

        await this.transactions.create(member.orgId, {
          description: draft.description,
          amountInCents: Math.round(draft.amount * 100),
          type: draft.type === 'expense' ? 'EXPENSE' : 'INCOME',
          categoryId: matchedCat!.id,
          accountId: cardId ? undefined : defaultAccountId,
          cardId: cardId || undefined,
          memberId: saveMemberId,
          origin: 'TELEGRAM',
          confidence: draft.confidence,
          date: draft.date ? new Date(draft.date) : new Date(),
          note: `Pagamento dividido: ${noteDetails}`,
          installments: 1,
        });

        const cardName = cardId ? allCards.find((c: any) => c.id === cardId)?.name : null;
        const successMsg = cardName
          ? `✅ Lançamento salvo (cartão: ${cardName})!`
          : '✅ Lançamento salvo como transação única!';
        if (ctx.callbackQuery?.message?.message_id) {
           await this.bot!.api.editMessageText(chatId, ctx.callbackQuery.message.message_id, successMsg);
        } else {
           await this.bot!.api.sendMessage(chatId, successMsg);
        }
      } else {
        // Separate transactions
        for (let i = 0; i < nfce.paymentDetails.length; i++) {
          const payment = nfce.paymentDetails[i];
          const cardId = resolvedCards[i] || null;

          this.logger.log(`[Split] Salvando pagamento ${i + 1}/${nfce.paymentDetails.length}: ${payment.label} R$${payment.amount} cardId=${cardId}`);

          await this.prisma.transaction.create({
            data: {
              description: `${draft.description} - ${payment.label}`,
              amountInCents: Math.round(payment.amount * 100),
              type: draft.type === 'expense' ? 'EXPENSE' : 'INCOME',
              categoryId: matchedCat!.id,
              accountId: cardId ? null : defaultAccountId,
              cardId: cardId || null,
              memberId: saveMemberId,
              orgId: member.orgId,
              origin: 'TELEGRAM',
              confidence: draft.confidence,
              date: draft.date ? new Date(draft.date) : new Date(),
              note: `Parte de compra dividida (${nfce.paymentDetails.length} pagamentos)`,
              installments: payment.installments || 1,
              receiptGroupId,
            },
          });
          
          // Sync card usage manually since we bypassed transactions.create
          if (cardId && draft.type === 'expense') {
              await this.transactions.updateCardUsage(cardId);
          }
        }

        const successMsg = `✅ ${nfce.paymentDetails.length} transações salvas, vinculadas à mesma compra!`;
        if (ctx.callbackQuery?.message?.message_id) {
           await this.bot!.api.editMessageText(chatId, ctx.callbackQuery.message.message_id, successMsg);
        } else {
           await this.bot!.api.sendMessage(chatId, successMsg);
        }
      }

      await this.redis.clearDraft(chatId);
      await this.redis.del(`summary:monthly:${member.orgId}`);
      this.eventEmitter.emit('sync.trigger', { type: 'transaction_created', orgId: member.orgId });
    } catch (e: any) {
      this.logger.error(`[Split] Erro ao salvar transações: ${e.message}`, e.stack);
      try {
        await this.bot!.api.sendMessage(chatId, '❌ Falha ao salvar. Tente novamente.');
      } catch { }
    }
  }

  private async saveTransaction(draft: TransactionDraft, member: any, ctx: Context) {
    this.logger.log('[Supabase] Início: Salvando transação');

    // Se o usuário trocou o workspace de destino no fluxo de confirmação,
    // usamos o targetOrgId/targetMemberId em vez do member padrão (pessoal).
    let targetMember = member;
    if ((draft as any).targetOrgId && (draft as any).targetOrgId !== member.orgId) {
      const switched = await this.prisma.organizationMember.findUnique({
        where: { userId_orgId: { userId: member.userId, orgId: (draft as any).targetOrgId } },
        include: { org: true },
      });
      if (switched) {
        targetMember = switched;
        this.logger.log(`[Telegram] Salvando no workspace alternativo: ${switched.org.name} (${switched.orgId})`);
      } else {
        this.logger.warn(`[Telegram] targetOrgId ${(draft as any).targetOrgId} não encontrado — caindo no pessoal`);
      }
    } else {
      this.logger.log(`[Telegram] Salvando no workspace padrão (pessoal): ${member.orgId}`);
    }

    try {
      await this.supabaseSafe.runQuery(async () => {
        // Ensure category (no workspace de destino)
        const cats = await this.categories.findAll(targetMember.orgId);
        const categoryName = draft.category || 'Outros';
        let matchedCat = cats.find(c => c.name.toLowerCase() === categoryName.toLowerCase());

        if (!matchedCat) {
            matchedCat = await this.prisma.category.create({
                data: {
                    name: categoryName,
                    orgId: targetMember.orgId,
                    icon: 'Sparkles',
                    color: 'var(--chart-5)'
                }
            });
        }

        // Ensure account (no workspace de destino)
        let orgAccounts = await this.prisma.account.findMany({ where: { orgId: targetMember.orgId } });
        if (orgAccounts.length === 0) {
            orgAccounts = [await this.prisma.account.create({
                data: {
                    name: 'Conta Principal', bank: 'Carteira', type: 'CHECKING', balance: 0, orgId: targetMember.orgId, color: '#3b82f6'
                }
            })];
        }
        const defaultAccountId = orgAccounts[0].id;

        // Card/account vinculados só podem ser usados se pertencerem ao workspace de destino
        // (evita salvar com cardId de outro workspace quando o usuário troca)
        let safeCardId = draft.cardId;
        if (safeCardId) {
          const card = await this.prisma.card.findUnique({ where: { id: safeCardId } });
          if (!card || card.orgId !== targetMember.orgId) safeCardId = undefined;
        }
        let safeAccountId = draft.accountId;
        if (safeAccountId) {
          const acc = await this.prisma.account.findUnique({ where: { id: safeAccountId } });
          if (!acc || acc.orgId !== targetMember.orgId) safeAccountId = undefined;
        }

        await this.transactions.create(targetMember.orgId, {
            description: draft.description,
            amountInCents: Math.round(draft.amount! * 100),
            type: draft.type === 'expense' ? 'EXPENSE' : 'INCOME',
            categoryId: matchedCat!.id,
            accountId: safeCardId ? undefined : (safeAccountId || defaultAccountId),
            cardId: safeCardId || undefined,
            memberId: targetMember.id,
            origin: 'TELEGRAM',
            confidence: draft.confidence,
            date: fromZonedTime(draft.date, 'America/Sao_Paulo'),
            note: draft.rawText,
            installments: draft.installments || 1,
        });

        // Invalidate cache
        await this.redis.del(`summary:monthly:${targetMember.orgId}`);
      });

      this.logger.log('[Supabase] Fim: Sucesso');
      const wsLabel = targetMember.orgId !== member.orgId ? ` no workspace *${(targetMember as any).org?.name || 'selecionado'}*` : '';
      await ctx.reply(`✅ Lançamento realizado com sucesso${wsLabel}!`, { parse_mode: 'Markdown' });
      this.eventEmitter.emit('sync.trigger', { type: 'transaction_created', orgId: targetMember.orgId });
    } catch (e: any) {
      this.logger.error('[Supabase] Erro ao salvar transação', e);
      const isTimeout = e.message?.includes('demorou') || e.code === 'ETIMEDOUT';

      const errorMsg = isTimeout
        ? '⚠️ Entendi o gasto, mas o banco demorou muito para responder. O lançamento pode ter sido processado, verifique no dashboard em instantes.'
        : '❌ Falha ao salvar transação. Tente novamente.';

      await ctx.reply(errorMsg);
    }
  }

  // ... Rest of the helper methods ...

  private extractLinkCode(text: string): string | null {
    const trimmed = text.trim();
    // Match only if the ENTIRE message is a 6-digit code (with optional EZ- prefix)
    // This prevents financial amounts like "100000" from being matched
    const exactMatch = trimmed.match(/^(?:EZ-)?(\d{6})$/i);
    if (exactMatch) return exactMatch[1];
    // Also match deep-link payload format (from /start command)
    const startMatch = trimmed.match(/^\/start\s+(\d{6})$/i);
    if (startMatch) return startMatch[1];
    return null;
  }

  private async getUserByTelegramId(id: string | undefined) {
    if (!id) return null;
    return this.prisma.user.findUnique({ where: { telegramUserId: id.toString() } });
  }

  private async getLinkedUser(ctx: Context) {
    if (!ctx.from) return null;
    const telegramUserId = ctx.from.id.toString();
    const user = await this.getUserByTelegramId(telegramUserId);
    if (!user) {
      await ctx.reply(
        '⚠️ Seu Telegram ainda não está vinculado.\n\n' +
        'Para conectar, abra o dashboard em Configurações > Telegram e envie o código exibido lá.'
      );
      return null;
    }
    return user;
  }

  private async ensureUserEnvironment(user: any) {
    if (!user || !user.id) return null;

    try {
        // Preferir o workspace PERSONAL do usuário (criado no signup).
        // Sem ordering, findFirst poderia retornar qualquer workspace (ex: um compartilhado),
        // o que faria os gastos do Telegram irem pro workspace errado.
        let member = await this.prisma.organizationMember.findFirst({
            where: { userId: user.id, org: { type: 'PERSONAL' } },
            include: { org: true },
            orderBy: { createdAt: 'asc' },
        });

        // Fallback: qualquer workspace (caso o usuário só tenha compartilhados — incomum)
        if (!member) {
            member = await this.prisma.organizationMember.findFirst({
                where: { userId: user.id },
                include: { org: true },
                orderBy: { createdAt: 'asc' },
            });
        }

        if (!member) {
            const org = await this.prisma.organization.create({
                data: { name: `${user.name} — Pessoal`, type: 'PERSONAL', initials: user.name.substring(0, 2).toUpperCase() }
            });

            member = await this.prisma.organizationMember.create({
                data: { userId: user.id, orgId: org.id, role: 'OWNER' },
                include: { org: true }
            });
        }

        return member;
    } catch (err) {
        this.logger.error(`[Telegram] Erro ao assegurar ambiente`, err);
        return null;
    }
  }

  async handleWebhook(update: any, secretToken?: string) {
    if (!this.bot) return;
    const expectedSecret = this.config.get('WEBHOOK_SECRET');
    if (expectedSecret && secretToken !== expectedSecret) return;
    await this.bot.handleUpdate(update);
  }

  getStatus() {
    return { active: !!this.bot, username: this.botInfo?.username || null, name: this.botInfo?.first_name || 'EconomyZee_Bot' };
  }

  async generateLinkToken(userId: string) {
    await this.prisma.telegramLinkToken.deleteMany({ where: { userId } });
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const linkToken = await this.prisma.telegramLinkToken.create({ data: { token, userId, expiresAt } });
    const botUsername = this.config.get('TELEGRAM_BOT_USERNAME') || this.botInfo?.username || 'EconomyZee_Bot';
    const deepLink = `https://t.me/${botUsername}?start=${token}`;
    return { ...linkToken, deepLink };
  }

  async getLinkStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const botUsername = this.config.get('TELEGRAM_BOT_USERNAME') || this.botInfo?.username || 'EconomyZee_Bot';
    return { linked: !!user?.telegramUserId, telegramUsername: user?.telegramUsername || null, telegramFirstName: user?.telegramFirstName || null, telegramLinkedAt: user?.telegramLinkedAt || null, telegramLastSeenAt: user?.telegramLastSeenAt || null, botUsername };
  }

  async linkTelegramAccountByToken(token: string, ctx: Context) {
    const linkToken = await this.prisma.telegramLinkToken.findUnique({ where: { token } });
    if (!linkToken || linkToken.usedAt || linkToken.expiresAt < new Date()) {
      await ctx.reply('⚠️ Código inválido ou expirado.');
      return;
    }
    if (!ctx.from || !ctx.chat) return;

    const telegramUserId = ctx.from.id.toString();
    const telegramChatId = ctx.chat.id.toString();
    try {
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: linkToken.userId },
          data: { telegramUserId, telegramChatId, telegramUsername: ctx.from.username || null, telegramFirstName: ctx.from.first_name || null, telegramLinkedAt: new Date(), telegramLastSeenAt: new Date() },
        }),
        this.prisma.telegramLinkToken.update({ where: { id: linkToken.id }, data: { usedAt: new Date() } }),
      ]);
      await ctx.reply('✅ Telegram vinculado com sucesso!');
    } catch (error: any) {
      if (error.code === 'P2002') {
        await ctx.reply('⚠️ Este Telegram já está vinculado a outra conta. Desvincule-a primeiro para continuar.');
      } else {
        throw error;
      }
    }
  }

  async unlinkAccount(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { telegramUserId: null, telegramChatId: null, telegramUsername: null, telegramFirstName: null, telegramLinkedAt: null, telegramLastSeenAt: null } });
    return { success: true };
  }
}
