import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const DB_TIMEOUT_MS = 2000;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * État général de l'API.
   *
   * Le endpoint /health est volontairement rapide et sert de sonde
   * (liveness + readiness Cloud Run / Docker HEALTHCHECK). On renvoie
   * toujours HTTP 200 tant que le serveur répond, afin de ne pas faire
   * redémarrer le conteneur par Cloud Run en cas de coupure réseau
   * transitoire vers la base. Le statut de la base est exposé dans le
   * corps de la réponse pour distinguer :
   *   - API opérationnelle + DB ok   → status 'ok'    , db 'up'
   *   - API opérationnelle + DB down → status 'degraded', db 'down'
   */
  async check(): Promise<{
    status: string;
    timestamp: string;
    db: string;
    dbLatencyMs: number | null;
    uptime: number;
  }> {
    const started = Date.now();
    let db: string;
    let dbLatencyMs: number | null = null;

    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('DB ping timeout')), DB_TIMEOUT_MS),
      );
      await Promise.race([this.prisma.$queryRaw`SELECT 1`, timeout]);
      db = 'up';
      dbLatencyMs = Date.now() - started;
    } catch (err) {
      db = 'down';
      this.logger.warn(`Database unreachable: ${(err as Error).message}`);
    }

    return {
      status: db === 'up' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      db,
      dbLatencyMs,
      uptime: Math.round(process.uptime()),
    };
  }
}
