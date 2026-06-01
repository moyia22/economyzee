import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resendUrl = 'https://api.resend.com/emails';

  constructor(private config: ConfigService) {}

  /**
   * Envia email via Resend.
   * Requer RESEND_API_KEY e EMAIL_FROM no .env.
   * EMAIL_FROM precisa ser um remetente verificado no Resend (ex: "EconomyZee <no-reply@seu-dominio.com>").
   * Se RESEND_API_KEY não estiver configurado, apenas loga (modo silencioso) — não quebra o fluxo de invite.
   */
  async sendEmail(to: string, subject: string, html: string): Promise<{ sent: boolean; reason?: string }> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('EMAIL_FROM') || 'EconomyZee <onboarding@resend.dev>';

    if (!apiKey) {
      this.logger.warn(`[Email] RESEND_API_KEY não configurada — email para ${to} NÃO foi enviado (link manual).`);
      return { sent: false, reason: 'RESEND_API_KEY não configurada no servidor' };
    }

    try {
      const response = await axios.post(
        this.resendUrl,
        { from, to, subject, html },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );
      this.logger.log(`[Email] ✅ Enviado para ${to} (resend_id=${response.data?.id || 'unknown'})`);
      return { sent: true };
    } catch (err: any) {
      // Resend retorna estrutura: { name, message, statusCode } no body do 4xx/5xx
      const status = err.response?.status;
      const data = err.response?.data;
      const rawMsg = data?.message || data?.error || err.message;

      // Traduzir os erros mais comuns pra mensagem útil
      let friendlyMsg = rawMsg;
      if (typeof rawMsg === 'string') {
        if (/testing emails to your own/i.test(rawMsg) || /only send.*to your own/i.test(rawMsg)) {
          friendlyMsg = `Resend em modo teste: só envia para o email da sua conta Resend. Verifique um domínio em https://resend.com/domains para enviar a qualquer email.`;
        } else if (/api_key.*invalid/i.test(rawMsg) || status === 401) {
          friendlyMsg = `RESEND_API_KEY inválida. Gere uma nova em https://resend.com/api-keys`;
        } else if (/domain.*not verified/i.test(rawMsg) || /from.*not.*verified/i.test(rawMsg)) {
          friendlyMsg = `Domínio em EMAIL_FROM não verificado no Resend. Use "EconomyZee <onboarding@resend.dev>" ou verifique seu domínio.`;
        } else if (/invalid.*to.*email/i.test(rawMsg)) {
          friendlyMsg = `Email do destinatário inválido: ${to}`;
        }
      }

      this.logger.error(
        `[Email] ❌ FALHA ao enviar para ${to}\n` +
        `   status: ${status || 'n/a'}\n` +
        `   resend: ${JSON.stringify(data || err.message)}\n` +
        `   from:   ${from}`
      );

      return { sent: false, reason: friendlyMsg };
    }
  }

  /**
   * Template HTML do convite de workspace.
   */
  buildInviteEmail(params: {
    orgName: string;
    inviterName: string;
    inviteUrl: string;
    role: string;
  }): { subject: string; html: string } {
    const roleLabel =
      params.role === 'OWNER' ? 'Owner'
      : params.role === 'ADMIN' ? 'Administrador'
      : params.role === 'VIEWER' ? 'Visualizador'
      : 'Membro';

    const subject = `${params.inviterName} convidou você para o workspace "${params.orgName}" — EconomyZee`;

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0b0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e6e7eb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f1a;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#121826;border:1px solid #1f2937;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 28px 8px;">
          <div style="font-size:22px;font-weight:700;color:#22c55e;letter-spacing:-0.01em;">EconomyZee</div>
        </td></tr>
        <tr><td style="padding:8px 28px 0;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;line-height:1.3;color:#fff;">
            Você foi convidado para um workspace
          </h1>
          <p style="margin:0 0 8px;font-size:15px;line-height:1.55;color:#cbd5e1;">
            <strong style="color:#fff;">${escapeHtml(params.inviterName)}</strong> convidou você para entrar em
            <strong style="color:#fff;">${escapeHtml(params.orgName)}</strong> como <strong>${roleLabel}</strong> no EconomyZee.
          </p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.55;color:#94a3b8;">
            Aceite o convite para acompanhar finanças compartilhadas, registrar gastos e ver relatórios em tempo real.
          </p>
        </td></tr>
        <tr><td style="padding:0 28px 24px;" align="left">
          <a href="${params.inviteUrl}"
             style="display:inline-block;background:#22c55e;color:#0b0f1a;font-weight:700;text-decoration:none;padding:13px 22px;border-radius:10px;font-size:15px;">
            Aceitar convite
          </a>
        </td></tr>
        <tr><td style="padding:0 28px 28px;">
          <p style="margin:0;font-size:12px;line-height:1.55;color:#64748b;">
            Ou copie e cole este link no navegador:<br>
            <span style="color:#94a3b8;word-break:break-all;">${params.inviteUrl}</span>
          </p>
        </td></tr>
        <tr><td style="padding:18px 28px 24px;border-top:1px solid #1f2937;">
          <p style="margin:0;font-size:11px;color:#64748b;">
            Se você não esperava este convite, basta ignorar este e-mail — nada será criado na sua conta sem sua confirmação.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    return { subject, html };
  }

  /**
   * Template HTML do codigo de verificacao de email.
   */
  buildVerificationCodeEmail(params: {
    name?: string | null;
    code: string;
    expiresInMinutes: number;
  }): { subject: string; html: string } {
    const subject = 'Seu codigo de verificacao EconomyZee';
    const firstName = params.name?.trim()?.split(/\s+/)[0] || 'Tudo pronto';

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0b0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e6e7eb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f1a;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#121826;border:1px solid #1f2937;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 28px 8px;">
          <div style="font-size:22px;font-weight:800;color:#22c55e;letter-spacing:-0.01em;">EconomyZee</div>
        </td></tr>
        <tr><td style="padding:8px 28px 0;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;line-height:1.3;color:#fff;">
            Verifique seu email
          </h1>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#cbd5e1;">
            Ola, <strong style="color:#fff;">${escapeHtml(firstName)}</strong>. Seu codigo de verificacao e:
          </p>
        </td></tr>
        <tr><td style="padding:0 28px 20px;" align="center">
          <div style="display:inline-block;background:#0f172a;border:1px solid #263244;border-radius:14px;padding:18px 24px;letter-spacing:8px;font-size:34px;font-weight:800;color:#fff;">
            ${params.code}
          </div>
        </td></tr>
        <tr><td style="padding:0 28px 28px;">
          <p style="margin:0;font-size:14px;line-height:1.55;color:#94a3b8;">
            Ele expira em <strong style="color:#e6e7eb;">${params.expiresInMinutes} minutos</strong>.
            Se voce nao solicitou isso, ignore este email.
          </p>
        </td></tr>
        <tr><td style="padding:18px 28px 24px;border-top:1px solid #1f2937;">
          <p style="margin:0;font-size:11px;color:#64748b;">
            Por seguranca, nunca compartilhe este codigo. A equipe EconomyZee nunca pedira esse codigo por chat ou telefone.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    return { subject, html };
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
