import { Controller, Get, Post, Delete, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TelegramService } from './telegram.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@ApiTags('Integrations')
@Controller('integrations/telegram')
export class TelegramController {
  constructor(private svc: TelegramService) {}

  // Webhook endpoint — no auth guard (Telegram calls this)
  @Post('webhook')
  async webhook(@Body() body: any, @Request() req: any) {
    const secret = req.headers['x-telegram-bot-api-secret-token'];
    await this.svc.handleWebhook(body, secret);
    return { ok: true };
  }

  @Get('bot-status')
  botStatus() {
    return this.svc.getStatus();
  }

  @Get('status')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  status(@Request() req: any) {
    return this.svc.getLinkStatus(req.user.sub);
  }

  @Post('link-token')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  async generateLinkToken(@Request() req: any) {
    return this.svc.generateLinkToken(req.user.sub);
  }

  @Delete('unlink')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  async unlink(@Request() req: any) {
    return this.svc.unlinkAccount(req.user.sub);
  }
}


