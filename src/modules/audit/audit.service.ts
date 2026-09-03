import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger('AuditService');

  constructor(private readonly prisma: PrismaService) {}

  async log(
    adminId: string,
    action: string,
    targetType?: string,
    targetId?: string,
    metadata?: Record<string, unknown>,
  ) {
    try {
      await this.prisma.adminAuditLog.create({
        data: {
          adminId,
          action,
          targetType,
          targetId,
          metadata: (metadata ?? undefined) as any,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to persist audit log: ${(error as Error).message}`);
    }
  }

  async findAll(query: { action?: string; page?: number; limit?: number }) {
    const { action, page = 1, limit = 20 } = query;
    const where: any = {};
    if (action) where.action = action;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { admin: { select: { id: true, email: true, role: true } } },
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } };
  }

  async findOne(id: string) {
    const log = await this.prisma.adminAuditLog.findUnique({
      where: { id },
      include: { admin: { select: { id: true, email: true, role: true } } },
    });

    if (!log) {
      return null;
    }

    return log;
  }
}
