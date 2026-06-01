import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private svc: CategoriesService) {}

  @Get()
  findAll(@Request() req: any) { return this.svc.findAll(req.user.orgId); }

  @Post()
  create(@Request() req: any, @Body() body: { name: string; icon?: string; color?: string }) {
    return this.svc.create(req.user.orgId, body);
  }

  @Post('defaults')
  restoreDefaults(@Request() req: any) {
    return this.svc.restoreDefaults(req.user.orgId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Request() req: any, @Body() body: { name?: string; icon?: string; color?: string; active?: boolean }) {
    return this.svc.update(id, req.user.orgId, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.svc.delete(id); }
}
