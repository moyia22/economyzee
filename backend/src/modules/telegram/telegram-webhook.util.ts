/**
 * Política de segurança do webhook do Telegram.
 *
 * Produção opera em fail-closed: sem WEBHOOK_SECRET configurado o webhook NÃO é
 * registrado e nenhuma requisição é aceita. Desenvolvimento mantém o
 * comportamento atual (valida se houver secret; aceita se não houver) para não
 * quebrar o fluxo local de polling/testes.
 */

export function isWebhookSecretConfigured(secret?: string | null): boolean {
  return typeof secret === 'string' && secret.trim().length > 0;
}

/**
 * Decide se uma requisição de webhook recebida deve ser processada.
 * - Produção: exige secret configurado E igual ao recebido (fail-closed).
 * - Desenvolvimento: valida se houver secret; aceita se não houver.
 */
export function shouldAcceptWebhook(opts: {
  isProduction: boolean;
  expectedSecret?: string | null;
  providedSecret?: string | null;
}): boolean {
  const configured = isWebhookSecretConfigured(opts.expectedSecret);

  if (opts.isProduction) {
    if (!configured) return false;
    return opts.providedSecret === opts.expectedSecret;
  }

  if (configured) {
    return opts.providedSecret === opts.expectedSecret;
  }

  return true;
}

/**
 * Decide se o registro do webhook (setWebhook) pode ocorrer.
 * Em produção, só registra com secret configurado (fail-closed).
 */
export function canRegisterWebhook(opts: {
  isProduction: boolean;
  expectedSecret?: string | null;
}): boolean {
  if (!opts.isProduction) return true;
  return isWebhookSecretConfigured(opts.expectedSecret);
}
