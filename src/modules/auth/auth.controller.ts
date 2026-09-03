import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  Req,
  Param,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { ResendCodeDto } from './dto/resend-code.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AppleLoginDto } from './dto/apple-login.dto';
import { FacebookLoginDto } from './dto/facebook-login.dto';
import { WhatsappRequestDto } from './dto/whatsapp-request.dto';
import { WhatsappVerifyDto } from './dto/whatsapp-verify.dto';
import { Enable2faDto } from './dto/enable-2fa.dto';
import { Login2faDto } from './dto/login-2fa.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private extractDeviceInfo(req: Request) {
    return {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
  }

  @ApiOperation({ summary: 'Inscription', description: 'Crée un nouveau compte utilisateur' })
  @ApiCreatedResponse({ description: 'Compte créé, tokens retournés' })
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, this.extractDeviceInfo(req));
  }

  @ApiOperation({
    summary: 'Types de compte',
    description: 'Liste des types de compte publics disponibles (catalogue Role)',
  })
  @ApiOkResponse({ description: 'Liste des slugs/names des types de compte' })
  @Get('account-types')
  async accountTypes() {
    return this.authService.getAccountTypes();
  }

  @ApiOperation({ summary: 'Connexion', description: 'Authentification par email/phone + mot de passe' })
  @ApiOkResponse({ description: 'Connexion réussie, tokens retournés' })
  @ApiUnauthorizedResponse({ description: 'Identifiants invalides ou compte verrouillé' })
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, this.extractDeviceInfo(req));
  }

  @ApiOperation({
    summary: 'Rafraîchir tokens',
    description: 'Échange un refresh token valide contre une nouvelle paire de tokens',
  })
  @ApiOkResponse({ description: 'Nouveaux tokens générés' })
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto, this.extractDeviceInfo(req));
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Déconnexion', description: 'Révoque toutes les sessions actives' })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
  async logout(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.logout(user.userId);
    return { message: 'Logged out successfully' };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil', description: "Retourne les informations de l'utilisateur connecté" })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Sessions actives',
    description: "Liste des sessions de rafraîchissement actives de l'utilisateur",
  })
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async sessions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getSessions(user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Révoquer une session', description: 'Révoque une session précise' })
  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  async revokeSession(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.authService.revokeSession(user.userId, id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tout déconnecter', description: 'Révoque toutes les sessions actives' })
  @UseGuards(JwtAuthGuard)
  @Delete('sessions')
  async revokeAllSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.revokeAllSessions(user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Vérifier email',
    description: "Valide l'adresse email avec un code à 6 chiffres",
  })
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('verify-email')
  async verifyEmail(@CurrentUser() user: AuthenticatedUser, @Body() dto: VerifyCodeDto) {
    await this.authService.verifyEmail(user.userId, dto);
    return { message: 'Email verified successfully' };
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Vérifier téléphone',
    description: 'Valide le numéro de téléphone avec un code à 6 chiffres',
  })
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('verify-phone')
  async verifyPhone(@CurrentUser() user: AuthenticatedUser, @Body() dto: VerifyCodeDto) {
    await this.authService.verifyPhone(user.userId, dto);
    return { message: 'Phone verified successfully' };
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Renvoyer code',
    description: 'Renvoyer un nouveau code de vérification par email ou SMS',
  })
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('resend-code')
  async resendCode(@CurrentUser() user: AuthenticatedUser, @Body() dto: ResendCodeDto) {
    return this.authService.resendCode(user.userId, dto);
  }

  @ApiOperation({
    summary: 'Mot de passe oublié',
    description: 'Envoie un email avec un lien de réinitialisation',
  })
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @ApiOperation({
    summary: 'Réinitialiser mot de passe',
    description: 'Réinitialise le mot de passe avec un token valide',
  })
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { message: 'Password reset successfully' };
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Changer mot de passe',
    description: 'Change le mot de passe et révoque toutes les sessions',
  })
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('change-password')
  async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(user.userId, dto);
    return { message: 'Password changed successfully. All sessions have been revoked.' };
  }

  @ApiOperation({ summary: 'Google login', description: 'Authentification via Google OAuth 2.0' })
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('google')
  async googleLogin(@Body('idToken') idToken: string, @Req() req: Request) {
    return this.authService.googleLogin(idToken, this.extractDeviceInfo(req));
  }

  @ApiOperation({ summary: 'Apple login', description: 'Authentification via Sign in with Apple' })
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('apple')
  async appleLogin(@Body() dto: AppleLoginDto, @Req() req: Request) {
    return this.authService.appleLogin(dto.identityToken, this.extractDeviceInfo(req));
  }

  @ApiOperation({ summary: 'Facebook login', description: 'Authentification via Facebook Login' })
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('facebook')
  async facebookLogin(@Body() dto: FacebookLoginDto, @Req() req: Request) {
    return this.authService.facebookLogin(dto.accessToken, this.extractDeviceInfo(req));
  }

  @ApiOperation({ summary: 'WhatsApp request', description: 'Demande un code de connexion WhatsApp' })
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('whatsapp/request')
  async whatsappRequest(@Body() dto: WhatsappRequestDto) {
    return this.authService.whatsappRequest(dto.phone);
  }

  @ApiOperation({
    summary: 'WhatsApp verify',
    description: "Vérifie le code WhatsApp et connecte l'utilisateur",
  })
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('whatsapp/verify')
  async whatsappVerify(@Body() dto: WhatsappVerifyDto, @Req() req: Request) {
    return this.authService.whatsappVerify(dto.phone, dto.code, this.extractDeviceInfo(req));
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Activer 2FA',
    description: "Génère un secret TOTP pour l'authentification à deux facteurs",
  })
  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  async enable2fa(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.enable2fa(user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vérifier 2FA', description: 'Valide le code TOTP et active la 2FA' })
  @UseGuards(JwtAuthGuard)
  @Post('2fa/verify')
  async verify2fa(@CurrentUser() user: AuthenticatedUser, @Body() dto: Enable2faDto) {
    return this.authService.verify2fa(user.userId, dto.token);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Désactiver 2FA', description: "Désactive l'authentification à deux facteurs" })
  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  async disable2fa(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.disable2fa(user.userId);
  }

  @ApiOperation({
    summary: 'Connexion 2FA',
    description: 'Finalise la connexion avec un code TOTP après le login',
  })
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login/2fa')
  async loginWith2fa(@Body() dto: Login2faDto, @Req() req: Request) {
    return this.authService.loginWith2fa(dto.temporaryToken, dto.code, this.extractDeviceInfo(req));
  }
}
