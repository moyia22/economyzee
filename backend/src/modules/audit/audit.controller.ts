import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private svc: AuditService) {}

  @Get()
  findAll(@Request() req: any, @Query('page') page?: number) {
    return this.svc.findAll(req.user.orgId, page || 1);
  }
}
