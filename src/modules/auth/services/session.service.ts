import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class SessionService {
  private readonly logger = new Logger('SessionService');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liste les sessions de rafraîchissement actives d'un utilisateur,
   * en exposant l'identifiant et les métadonnées (sans le jti brut).
   */
  async listSessions(userId: string) {
    const sessions = await this.prisma.refreshTokenSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return sessions;
  }

  /**
   * Révoque une session précise de l'utilisateur.
   */
  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.refreshTokenSession.findFirst({
      where: { id: sessionId, userId, revokedAt: null },
    });

    if (!session) {
      throw new BadRequestException('Session not found or already revoked');
    }

    await this.prisma.refreshTokenSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return { message: 'Session revoked' };
  }

  /**
   * Révoque toutes les sessions actives de l'utilisateur.
   */
  async revokeAll(userId: string) {
    await this.prisma.refreshTokenSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenJti: null },
    });

    return { message: 'All sessions revoked' };
  }
}
