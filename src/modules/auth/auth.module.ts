import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtTokenService } from './services/jwt-token.service';
import { RegistrationService } from './services/registration.service';
import { LoginService } from './services/login.service';
import { TwoFactorService } from './services/two-factor.service';
import { PasswordResetService } from './services/password-reset.service';
import { VerificationService } from './services/verification.service';
import { OAuthService } from './services/oauth.service';
import { OtpService } from './services/otp.service';
import { SessionService } from './services/session.service';
import { SecurityService } from './services/security.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwtSecret'),
        signOptions: { expiresIn: configService.get<string>('auth.jwtExpiration') },
      }),
    }),
    NotificationsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtTokenService,
    RegistrationService,
    LoginService,
    TwoFactorService,
    PasswordResetService,
    VerificationService,
    OAuthService,
    OtpService,
    SessionService,
    SecurityService,
    JwtStrategy,
  ],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
