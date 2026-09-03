import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

interface SyncOperation {
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  clientTimestamp: string;
}

interface PushDto {
  operations: SyncOperation[];
}

interface PullQuery {
  since?: string;
  entityType?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger('SyncService');

  constructor(private readonly prisma: PrismaService) {}

  async push(userId: string, dto: PushDto) {
    if (!dto.operations?.length) {
      throw new BadRequestException('No operations provided');
    }

    if (dto.operations.length > 100) {
      throw new BadRequestException('Batch too large (max 100 operations)');
    }

    const results: Array<{ entityType: string; entityId: string; status: string }> = [];

    for (const op of dto.operations) {
      try {
        await this.processOperation(userId, op);
        results.push({ entityType: op.entityType, entityId: op.entityId, status: 'applied' });
      } catch (error) {
        this.logger.warn(`Sync operation failed: ${op.entityType}/${op.entityId} — ${(error as Error).message}`);
        results.push({ entityType: op.entityType, entityId: op.entityId, status: 'conflict' });
      }
    }

    return { applied: results.filter((r) => r.status === 'applied').length, results };
  }

  async pull(userId: string, query: PullQuery) {
    const { since, entityType, page = 1, limit = 50 } = query;
    const sinceDate = since ? new Date(since) : undefined;

    const queries: Record<string, () => Promise<Array<{ id: string }>>> = {
      addresses: () =>
        this.prisma.address.findMany({
          where: { userId, ...(sinceDate ? { updatedAt: { gt: sinceDate } } : {}), deletedAt: null },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { updatedAt: 'desc' },
        }),
      landmarks: () =>
        this.prisma.landmark.findMany({
          where: { userId, ...(sinceDate ? { updatedAt: { gt: sinceDate } } : {}), deletedAt: null },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { updatedAt: 'desc' },
        }),
      'business-profiles': () =>
        this.prisma.businessProfile.findMany({
          where: { userId, ...(sinceDate ? { updatedAt: { gt: sinceDate } } : {}), deletedAt: null },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { updatedAt: 'desc' },
        }),
      qrcodes: () =>
        this.prisma.qrCode.findMany({
          where: { userId, ...(sinceDate ? { createdAt: { gt: sinceDate } } : {}) },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
    };

    const selected = entityType
      ? { [entityType]: queries[entityType] }
      : queries;

    const results: Array<{ entityType: string; entityId: string; action: string; updatedAt: string }> = [];

    for (const [type, queryFn] of Object.entries(selected)) {
      if (!queryFn) continue;
      try {
        const rows = await queryFn();
        for (const row of rows) {
          results.push({
            entityType: type,
            entityId: row.id,
            action: 'updated',
            updatedAt: new Date().toISOString(),
          });
        }
      } catch {
        this.logger.warn(`Sync pull failed for ${type}`);
      }
    }

    return { data: results, meta: { page, limit, count: results.length } };
  }

  private async processOperation(userId: string, op: SyncOperation) {
    switch (op.entityType) {
      case 'addresses':
        await this.syncAddress(userId, op);
        break;
      case 'landmarks':
        await this.syncLandmark(userId, op);
        break;
      case 'business-profiles':
        await this.syncBusinessProfile(userId, op);
        break;
      case 'qrcodes':
        await this.syncQrCode(userId, op);
        break;
      default:
        throw new BadRequestException(`Unsupported entity type: ${op.entityType}`);
    }
  }

  private async syncAddress(userId: string, op: SyncOperation) {
    const existing = await this.prisma.address.findFirst({
      where: { id: op.entityId, userId },
    });

    if (op.action === 'delete') {
      if (existing && !existing.deletedAt) {
        await this.prisma.address.update({ where: { id: op.entityId }, data: { deletedAt: new Date() } });
      }
      return;
    }

    const data: any = { userId, ...op.data };
    delete data.id;
    delete data.userId;

    if (existing) {
      await this.prisma.address.update({ where: { id: op.entityId }, data });
    } else {
      await this.prisma.address.create({ data: { id: op.entityId, ...data } });
    }
  }

  private async syncLandmark(userId: string, op: SyncOperation) {
    const existing = await this.prisma.landmark.findFirst({
      where: { id: op.entityId, userId },
    });

    if (op.action === 'delete') {
      if (existing && !existing.deletedAt) {
        await this.prisma.landmark.update({ where: { id: op.entityId }, data: { deletedAt: new Date() } });
      }
      return;
    }

    const data: any = { userId, ...op.data };
    delete data.id;
    delete data.userId;

    if (existing) {
      await this.prisma.landmark.update({ where: { id: op.entityId }, data });
    } else {
      await this.prisma.landmark.create({ data: { id: op.entityId, ...data } });
    }
  }

  private async syncQrCode(userId: string, op: SyncOperation) {
    const existing = await this.prisma.qrCode.findFirst({
      where: { id: op.entityId, userId },
    });

    if (op.action === 'delete') {
      if (existing) {
        await this.prisma.qrCode.delete({ where: { id: op.entityId } });
      }
      return;
    }

    if (existing) {
      await this.prisma.qrCode.update({ where: { id: op.entityId }, data: op.data as any });
    } else {
      await this.prisma.qrCode.create({ data: { id: op.entityId, userId, ...op.data } as any });
    }
  }

  private async syncBusinessProfile(userId: string, op: SyncOperation) {
    const existing = await this.prisma.businessProfile.findFirst({
      where: { id: op.entityId, userId },
    });

    if (op.action === 'delete') {
      if (existing && !existing.deletedAt) {
        await this.prisma.businessProfile.update({ where: { id: op.entityId }, data: { deletedAt: new Date() } });
      }
      return;
    }

    const data: any = { userId, ...op.data };
    delete data.id;
    delete data.userId;

    if (existing) {
      await this.prisma.businessProfile.update({ where: { id: op.entityId }, data });
    } else {
      await this.prisma.businessProfile.create({ data: { id: op.entityId, ...data } });
    }
  }
}
