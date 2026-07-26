import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Module transverse d'authentification. A ce stade, n'expose pas encore
 * de controller (login/register/refresh) - c'est le contenu du Module 1
 * cote authentification, a construire dans une prochaine etape. Ce
 * module se limite pour l'instant a enregistrer la strategie JWT dont
 * dependent tous les JwtAuthGuard deja utilises dans l'application :
 * sans lui, aucune route protegee ne peut fonctionner.
 */
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
  ],
  providers: [JwtStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
