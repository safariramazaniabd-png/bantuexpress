import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { verifyPassword } from '../../../common/crypto/password.util';

const PASSWORD_HISTORY_CHECK = 5;

/**
 * Applique la politique de sécurité liée aux mots de passe : on n'autorise
 * pas la réutilisation d'un des N derniers mots de passe de l'utilisateur.
 */
@Injectable()
export class SecurityService {
  private readonly logger = new Logger('SecurityService');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vérifie qu'un nouveau mot de passe n'est pas identique à l'un des
   * PASSWORD_HISTORY_CHECK derniers mots de passe de l'utilisateur.
   * Lève BadRequestException en cas de réutilisation interdite.
   */
  async assertNotReused(userId: string, newPassword: string): Promise<void> {
    const history = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: PASSWORD_HISTORY_CHECK,
    });

    for (const entry of history) {
      if (verifyPassword(newPassword, entry.passwordHash)) {
        throw new BadRequestException(`Password was used recently. Choose a different one.`);
      }
    }
  }

  /**
   * Enregistre le hash du mot de passe courant dans l'historique, en ne
   * conservant que les N dernières entrées.
   */
  async recordPassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.passwordHistory.create({
      data: { userId, passwordHash },
    });

    const userHistory = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    const toDelete = userHistory.slice(PASSWORD_HISTORY_CHECK);
    if (toDelete.length > 0) {
      await this.prisma.passwordHistory.deleteMany({
        where: { id: { in: toDelete.map((e) => e.id) } },
      });
    }
  }
}
