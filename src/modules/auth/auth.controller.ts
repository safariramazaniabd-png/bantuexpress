import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { AppleLoginDto } from './dto/apple-login.dto';
import { FacebookLoginDto } from './dto/facebook-login.dto';
import { WhatsappRequestDto } from './dto/whatsapp-request.dto';
import { WhatsappVerifyDto } from './dto/whatsapp-verify.dto';
import { Enable2faDto } from './dto/enable-2fa.dto';
import { Login2faDto } from './dto/login-2fa.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.logout(user.userId);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-email')
  async verifyEmail(@CurrentUser() user: AuthenticatedUser, @Body() dto: VerifyCodeDto) {
    await this.authService.verifyEmail(user.userId, dto);
    return { message: 'Email verified successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-phone')
  async verifyPhone(@CurrentUser() user: AuthenticatedUser, @Body() dto: VerifyCodeDto) {
    await this.authService.verifyPhone(user.userId, dto);
    return { message: 'Phone verified successfully' };
  }

  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { message: 'Password reset successfully' };
  }

  @Post('google')
  async googleLogin(@Body('idToken') idToken: string) {
    return this.authService.googleLogin(idToken);
  }

  @Post('apple')
  async appleLogin(@Body() dto: AppleLoginDto) {
    return this.authService.appleLogin(dto.identityToken);
  }

  @Post('facebook')
  async facebookLogin(@Body() dto: FacebookLoginDto) {
    return this.authService.facebookLogin(dto.accessToken);
  }

  @Post('whatsapp/request')
  async whatsappRequest(@Body() dto: WhatsappRequestDto) {
    return this.authService.whatsappRequest(dto.phone);
  }

  @Post('whatsapp/verify')
  async whatsappVerify(@Body() dto: WhatsappVerifyDto) {
    return this.authService.whatsappVerify(dto.phone, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  async enable2fa(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.enable2fa(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/verify')
  async verify2fa(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: Enable2faDto,
  ) {
    return this.authService.verify2fa(user.userId, dto.token);
  }

  @Post('login/2fa')
  async loginWith2fa(@Body() dto: Login2faDto) {
    return this.authService.loginWith2fa(dto.temporaryToken, dto.code);
  }
}
