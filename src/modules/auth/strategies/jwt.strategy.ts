import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../database/prisma.service';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

interface JwtPayload {
  sub: string; // userId
  role: string;
}

/**
 * Strategie JWT. Le payload valide devient `request.user`, consomme
 * ensuite par @CurrentUser() dans les controllers.
 *
 * Verifie explicitement que l'utilisateur existe toujours et est actif
 * a chaque requete (pas seulement a l'emission du token) - un compte
 * desactive entre-temps (Module 22, `is_active`) doit perdre l'acces
 * immediatement, meme avec un JWT non expire.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('auth.jwtSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Compte introuvable ou desactive');
    }

    return { userId: user.id, role: user.role };
  }
}
