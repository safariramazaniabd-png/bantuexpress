import { Injectable, BadRequestException, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma, AddressType, LandmarkCategory, BusinessType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SyncPushDto, SyncOperationDto } from './dto/sync-push.dto';
import { SyncPullQueryDto } from './dto/sync-pull-query.dto';
import { SYNC_ENTITY_TYPES, SYNC_QR_ENTITY_TYPES } from './dto/sync.constants';

export class SyncConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SyncConflictError';
  }
}

const ADDRESS_FIELDS = [
  'label',
  'type',
  'avenue',
  'quartier',
  'city',
  'province',
  'country',
  'latitude',
  'longitude',
  'isPrimary',
  'isPublic',
  'expiresAt',
] as const;

const LANDMARK_FIELDS = [
  'name',
  'category',
  'description',
  'address',
  'city',
  'province',
  'country',
  'latitude',
  'longitude',
  'isPublic',
] as const;

const BUSINESS_PROFILE_FIELDS = [
  'name',
  'type',
  'description',
  'sector',
  'logoUrl',
  'website',
  'email',
  'phone',
  'city',
  'province',
  'country',
  'isPublic',
] as const;

const QR_FIELDS = ['entityType', 'entityId'] as const;

export interface SyncResult {
  entityType: string;
  entityId: string;
  status: 'applied' | 'conflict' | 'rejected';
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger('SyncService');

  constructor(private readonly prisma: PrismaService) {}

  async push(userId: string, dto: SyncPushDto) {
    if (!dto.operations.length) {
      throw new BadRequestException('No operations provided');
    }

    if (dto.operations.length > 100) {
      throw new BadRequestException('Batch too large (max 100 operations)');
    }

    const results: SyncResult[] = [];

    for (const op of dto.operations) {
      try {
        await this.processOperation(userId, op);
        results.push({ entityType: op.entityType, entityId: op.entityId, status: 'applied' });
      } catch (error) {
        const status = error instanceof SyncConflictError ? 'conflict' : 'rejected';
        this.logger.warn(`Sync ${status}: ${op.entityType}/${op.entityId} — ${(error as Error).message}`);
        results.push({ entityType: op.entityType, entityId: op.entityId, status });
      }
    }

    return { applied: results.filter((r) => r.status === 'applied').length, results };
  }

  async pull(userId: string, query: SyncPullQueryDto) {
    const { since, entityType, page = 1, limit = 50 } = query;
    const sinceDate = since ? new Date(since) : undefined;

    const types = entityType ? [entityType] : [...SYNC_ENTITY_TYPES];

    const results: Array<{ entityType: string; entityId: string; action: string; updatedAt: string }> = [];

    for (const type of types) {
      try {
        const live = await this.fetchLive(userId, type, sinceDate, page, limit);
        for (const row of live) {
          results.push({
            entityType: type,
            entityId: row.id,
            action: 'updated',
            updatedAt: row.ts.toISOString(),
          });
        }

        if (type !== 'qrcodes') {
          const tombstones = await this.fetchTombstones(userId, type, sinceDate, page, limit);
          for (const row of tombstones) {
            results.push({
              entityType: type,
              entityId: row.id,
              action: 'deleted',
              updatedAt: row.ts.toISOString(),
            });
          }
        }
      } catch (error) {
        this.logger.warn(`Sync pull rejected for ${type}: ${(error as Error).message}`);
      }
    }

    return { data: results, meta: { page, limit, count: results.length } };
  }

  private async processOperation(userId: string, op: SyncOperationDto) {
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

  private pick(data: Record<string, unknown>, allowed: readonly string[]): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const key of allowed) {
      const value = data[key];
      if (value !== undefined && value !== null) {
        out[key] = value;
      }
    }
    return out;
  }

  private rejectIfStale(clientTimestamp: string, serverUpdatedAt: Date) {
    const clientTime = new Date(clientTimestamp).getTime();
    if (Number.isNaN(clientTime)) {
      return;
    }
    if (clientTime < serverUpdatedAt.getTime()) {
      throw new SyncConflictError('Server version is newer — pull to resolve conflicts');
    }
  }

  private async syncAddress(userId: string, op: SyncOperationDto) {
    const existing = await this.prisma.address.findFirst({
      where: { id: op.entityId, userId },
    });

    if (op.action === 'delete') {
      if (existing && existing.deletedAt) {
        return;
      }
      if (existing) {
        this.rejectIfStale(op.clientTimestamp, existing.updatedAt);
        await this.prisma.address.update({ where: { id: op.entityId }, data: { deletedAt: new Date() } });
      }
      return;
    }

    const data = this.pick(op.data, ADDRESS_FIELDS);

    if (data.type !== undefined && !Object.values(AddressType).includes(data.type as AddressType)) {
      throw new BadRequestException('Invalid address type');
    }

    const writeData = data as unknown as Prisma.AddressUncheckedCreateInput;

    if (existing) {
      this.rejectIfStale(op.clientTimestamp, existing.updatedAt);
      await this.prisma.address.update({
        where: { id: op.entityId },
        data: writeData as Prisma.AddressUncheckedUpdateInput,
      });
    } else {
      const { id: _id, userId: _userId, ...createData } = writeData;
      void _id;
      void _userId;
      await this.prisma.address.create({
        data: { id: op.entityId, userId, ...createData },
      });
    }
  }

  private async syncLandmark(userId: string, op: SyncOperationDto) {
    const existing = await this.prisma.landmark.findFirst({
      where: { id: op.entityId, userId },
    });

    if (op.action === 'delete') {
      if (existing && existing.deletedAt) {
        return;
      }
      if (existing) {
        this.rejectIfStale(op.clientTimestamp, existing.updatedAt);
        await this.prisma.landmark.update({ where: { id: op.entityId }, data: { deletedAt: new Date() } });
      }
      return;
    }

    const data = this.pick(op.data, LANDMARK_FIELDS);

    if (data.category !== undefined && !Object.values(LandmarkCategory).includes(data.category as LandmarkCategory)) {
      throw new BadRequestException('Invalid landmark category');
    }

    const writeData = data as unknown as Prisma.LandmarkUncheckedCreateInput;

    if (existing) {
      this.rejectIfStale(op.clientTimestamp, existing.updatedAt);
      await this.prisma.landmark.update({
        where: { id: op.entityId },
        data: writeData as Prisma.LandmarkUncheckedUpdateInput,
      });
    } else {
      const { id: _id, userId: _userId, ...createData } = writeData;
      void _id;
      void _userId;
      await this.prisma.landmark.create({
        data: { id: op.entityId, userId, ...createData },
      });
    }
  }

  private async syncBusinessProfile(userId: string, op: SyncOperationDto) {
    const existing = await this.prisma.businessProfile.findFirst({
      where: { id: op.entityId, userId },
    });

    if (op.action === 'delete') {
      if (existing && existing.deletedAt) {
        return;
      }
      if (existing) {
        this.rejectIfStale(op.clientTimestamp, existing.updatedAt);
        await this.prisma.businessProfile.update({ where: { id: op.entityId }, data: { deletedAt: new Date() } });
      }
      return;
    }

    const data = this.pick(op.data, BUSINESS_PROFILE_FIELDS);

    if (data.type !== undefined && !Object.values(BusinessType).includes(data.type as BusinessType)) {
      throw new BadRequestException('Invalid business type');
    }

    const writeData = data as unknown as Prisma.BusinessProfileUncheckedCreateInput;

    if (existing) {
      this.rejectIfStale(op.clientTimestamp, existing.updatedAt);
      await this.prisma.businessProfile.update({
        where: { id: op.entityId },
        data: writeData as Prisma.BusinessProfileUncheckedUpdateInput,
      });
    } else {
      const { id: _id, userId: _userId, ...createData } = writeData;
      void _id;
      void _userId;
      await this.prisma.businessProfile.create({
        data: { id: op.entityId, userId, ...createData },
      });
    }
  }

  private async syncQrCode(userId: string, op: SyncOperationDto) {
    const existing = await this.prisma.qrCode.findFirst({
      where: { id: op.entityId, userId },
    });

    if (op.action === 'delete') {
      if (existing) {
        await this.prisma.qrCode.delete({ where: { id: op.entityId } });
      }
      return;
    }

    const target = this.pick(op.data, QR_FIELDS);
    const entityType = target.entityType as string | undefined;
    const entityId = target.entityId as string | undefined;

    if (!entityType || !SYNC_QR_ENTITY_TYPES.includes(entityType)) {
      throw new BadRequestException('Invalid QR entityType; must be profile, address or landmark');
    }

    if (!entityId || typeof entityId !== 'string') {
      throw new BadRequestException('Invalid QR entityId');
    }

    await this.ensureQrEntityAccess(userId, entityType, entityId);

    if (existing) {
      if (existing.entityType === entityType && existing.entityId === entityId) {
        return;
      }
      const duplicate = await this.prisma.qrCode.findUnique({
        where: { entityType_entityId: { entityType, entityId } },
      });
      if (duplicate && duplicate.id !== existing.id) {
        throw new BadRequestException('A QR code already exists for this entity');
      }
      await this.prisma.qrCode.update({
        where: { id: existing.id },
        data: { entityType, entityId },
      });
      return;
    }

    const duplicate = await this.prisma.qrCode.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    });
    if (duplicate) {
      throw new BadRequestException('A QR code already exists for this entity');
    }

    await this.prisma.qrCode.create({
      data: { id: op.entityId, userId, entityType, entityId, code: this.generateCode() },
    });
  }

  private generateCode(): string {
    return randomBytes(8).toString('base64url').slice(0, 12);
  }

  private async ensureQrEntityAccess(userId: string, entityType: string, entityId: string) {
    switch (entityType) {
      case 'profile': {
        const profile = await this.prisma.profile.findUnique({ where: { id: entityId } });
        if (!profile) throw new NotFoundException('Linked profile not found');
        if (profile.userId !== userId) throw new ForbiddenException('You do not own this profile');
        return;
      }
      case 'address': {
        const address = await this.prisma.address.findUnique({ where: { id: entityId } });
        if (!address || address.deletedAt) throw new NotFoundException('Linked address not found');
        if (address.userId !== userId) throw new ForbiddenException('You do not own this address');
        return;
      }
      case 'landmark': {
        const landmark = await this.prisma.landmark.findUnique({ where: { id: entityId } });
        if (!landmark || landmark.deletedAt) throw new NotFoundException('Linked landmark not found');
        if (landmark.userId && landmark.userId !== userId) {
          throw new ForbiddenException('You do not own this landmark');
        }
        return;
      }
      default:
        throw new BadRequestException('Unknown entity type');
    }
  }

  private async fetchLive(
    userId: string,
    type: string,
    since: Date | undefined,
    page: number,
    limit: number,
  ): Promise<Array<{ id: string; ts: Date }>> {
    const skip = (page - 1) * limit;
    const take = limit;

    switch (type) {
      case 'addresses': {
        const rows = await this.prisma.address.findMany({
          where: { userId, deletedAt: null, ...(since ? { updatedAt: { gt: since } } : {}) },
          select: { id: true, updatedAt: true },
          skip,
          take,
          orderBy: { updatedAt: 'desc' },
        });
        return rows.map((r) => ({ id: r.id, ts: r.updatedAt }));
      }
      case 'landmarks': {
        const rows = await this.prisma.landmark.findMany({
          where: { userId, deletedAt: null, ...(since ? { updatedAt: { gt: since } } : {}) },
          select: { id: true, updatedAt: true },
          skip,
          take,
          orderBy: { updatedAt: 'desc' },
        });
        return rows.map((r) => ({ id: r.id, ts: r.updatedAt }));
      }
      case 'business-profiles': {
        const rows = await this.prisma.businessProfile.findMany({
          where: { userId, deletedAt: null, ...(since ? { updatedAt: { gt: since } } : {}) },
          select: { id: true, updatedAt: true },
          skip,
          take,
          orderBy: { updatedAt: 'desc' },
        });
        return rows.map((r) => ({ id: r.id, ts: r.updatedAt }));
      }
      case 'qrcodes': {
        const rows = await this.prisma.qrCode.findMany({
          where: { userId, ...(since ? { createdAt: { gt: since } } : {}) },
          select: { id: true, createdAt: true },
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        });
        return rows.map((r) => ({ id: r.id, ts: r.createdAt }));
      }
      default:
        return [];
    }
  }

  private async fetchTombstones(
    userId: string,
    type: string,
    since: Date | undefined,
    page: number,
    limit: number,
  ): Promise<Array<{ id: string; ts: Date }>> {
    const skip = (page - 1) * limit;
    const take = limit;

    switch (type) {
      case 'addresses': {
        const rows = await this.prisma.address.findMany({
          where: { userId, deletedAt: { not: null }, ...(since ? { updatedAt: { gt: since } } : {}) },
          select: { id: true, updatedAt: true },
          skip,
          take,
          orderBy: { updatedAt: 'desc' },
        });
        return rows.map((r) => ({ id: r.id, ts: r.updatedAt }));
      }
      case 'landmarks': {
        const rows = await this.prisma.landmark.findMany({
          where: { userId, deletedAt: { not: null }, ...(since ? { updatedAt: { gt: since } } : {}) },
          select: { id: true, updatedAt: true },
          skip,
          take,
          orderBy: { updatedAt: 'desc' },
        });
        return rows.map((r) => ({ id: r.id, ts: r.updatedAt }));
      }
      case 'business-profiles': {
        const rows = await this.prisma.businessProfile.findMany({
          where: { userId, deletedAt: { not: null }, ...(since ? { updatedAt: { gt: since } } : {}) },
          select: { id: true, updatedAt: true },
          skip,
          take,
          orderBy: { updatedAt: 'desc' },
        });
        return rows.map((r) => ({ id: r.id, ts: r.updatedAt }));
      }
      default:
        return [];
    }
  }
}