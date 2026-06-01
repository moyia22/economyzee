import { Controller, Post, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';
import { SupabaseAuthGuard } from './supabase-auth.guard';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  name!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class VerifyEmailCodeDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

export class EmailOnlyDto {
  @IsEmail()
  email!: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) { }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.name, dto.password);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('verify-email-code')
  verifyEmailCode(@Body() dto: VerifyEmailCodeDto) {
    return this.auth.verifyEmailCode(dto.email, dto.code);
  }

  @Post('resend-email-code')
  resendEmailCode(@Body() dto: EmailOnlyDto) {
    return this.auth.resendEmailCode(dto.email);
  }

  @Post('email-verification-status')
  emailVerificationStatus(@Body() dto: EmailOnlyDto) {
    return this.auth.getEmailVerificationStatus(dto.email);
  }

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  me(@Request() req: any) {
    return this.auth.getProfile(req.user.sub);
  }

  @Patch('me')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  updateMe(@Request() req: any, @Body() body: any) {
    return this.auth.updateProfile(req.user.sub, {
      name: body.name,
      phone: body.phone,
    });
  }
}
