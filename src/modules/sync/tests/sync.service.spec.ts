import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import {
  AddressType,
  LandmarkCategory,
  BusinessType,
} from '@prisma/client';
import { SyncService, SyncConflictError } from '../sync.service';
import { PrismaService } from '../../../database/prisma.service';

const mockPrisma = {
  address: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), create: jest.fn(), findMany: jest.fn() },
  landmark: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), create: jest.fn(), findMany: jest.fn() },
  businessProfile: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn(), findMany: jest.fn() },
  qrCode: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
  profile: { findUnique: jest.fn() },
};

const baseOp = {
  entityType: 'addresses',
  entityId: '11111111-1111-4111-8111-111111111111',
  action: 'create',
  data: {},
  clientTimestamp: '2026-09-12T10:00:00.000Z',
};

describe('SyncService', () => {
  let service: SyncService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [SyncService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<SyncService>(SyncService);
  });

  const now = new Date('2026-09-12T10:00:00.000Z');

  describe('push', () => {
    it('rejects a create address that includes a foreign userId', async () => {
      mockPrisma.address.findFirst.mockResolvedValue(null);

      const result = await service.push('user-1', {
        operations: [
          {
            ...baseOp,
            data: { city: 'Kinshasa', userId: 'attacker-id', isAdmin: true },
          },
        ],
      });

      expect(result.results[0].status).toBe('applied');
      const createCall = mockPrisma.address.create.mock.calls[0][0];
      expect(createCall.data.userId).toBe('user-1');
      expect(createCall.data).not.toHaveProperty('isAdmin');
    });

    it('does not overwrite ownership on an existing address', async () => {
      mockPrisma.address.findFirst.mockResolvedValue({
        id: baseOp.entityId,
        userId: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      const result = await service.push('user-1', {
        operations: [
          {
            ...baseOp,
            action: 'update',
            data: { city: 'Lubumbashi', userId: 'attacker-id' },
          },
        ],
      });

      expect(result.results[0].status).toBe('applied');
      const updateCall = mockPrisma.address.update.mock.calls[0][0];
      expect(updateCall.data.userId).toBeUndefined();
      expect(updateCall.data.city).toBe('Lubumbashi');
    });

    it('reports a conflict when the server copy is newer', async () => {
      mockPrisma.address.findFirst.mockResolvedValue({
        id: baseOp.entityId,
        userId: 'user-1',
        updatedAt: new Date('2026-09-12T11:00:00.000Z'),
      });

      const result = await service.push('user-1', {
        operations: [
          {
            ...baseOp,
            action: 'update',
            data: { city: 'Kisangani' },
          },
        ],
      });

      expect(result.results[0].status).toBe('conflict');
      expect(mockPrisma.address.update).not.toHaveBeenCalled();
    });

    it('rejects invalid enum values instead of applying them', async () => {
      mockPrisma.address.findFirst.mockResolvedValue(null);

      const result = await service.push('user-1', {
        operations: [
          {
            ...baseOp,
            data: { city: 'Kinshasa', type: 'NOT_A_TYPE' },
          },
        ],
      });

      expect(result.results[0].status).toBe('rejected');
      expect(mockPrisma.address.create).not.toHaveBeenCalled();
    });

    it('rejects an unsupported entity type', async () => {
      const result = await service.push('user-1', {
        operations: [{ ...baseOp, entityType: 'users' }],
      });

      expect(result.results[0].status).toBe('rejected');
    });

    it('rejects a QR code targeting an entity owned by someone else', async () => {
      mockPrisma.qrCode.findFirst.mockResolvedValue(null);
      mockPrisma.address.findUnique.mockResolvedValue({
        id: '33333333-3333-4333-8333-333333333333',
        userId: 'other-user',
        deletedAt: null,
      });

      const result = await service.push('user-1', {
        operations: [
          {
            ...baseOp,
            entityType: 'qrcodes',
            entityId: '22222222-2222-4222-8222-222222222222',
            data: {
              entityType: 'address',
              entityId: '33333333-3333-4333-8333-333333333333',
            },
          },
        ],
      });

      expect(result.results[0].status).toBe('rejected');
      expect(mockPrisma.qrCode.create).not.toHaveBeenCalled();
    });

    it('allows a QR code targeting an owned profile', async () => {
      mockPrisma.qrCode.findFirst.mockResolvedValue(null);
      mockPrisma.qrCode.findUnique.mockResolvedValue(null);
      mockPrisma.profile.findUnique.mockResolvedValue({
        id: '44444444-4444-4444-8444-444444444444',
        userId: 'user-1',
      });

      const result = await service.push('user-1', {
        operations: [
          {
            ...baseOp,
            entityType: 'qrcodes',
            entityId: '22222222-2222-4222-8222-222222222222',
            data: {
              entityType: 'profile',
              entityId: '44444444-4444-4444-8444-444444444444',
            },
          },
        ],
      });

      expect(result.results[0].status).toBe('applied');
      expect(mockPrisma.qrCode.create).toHaveBeenCalled();
      expect(mockPrisma.qrCode.create.mock.calls[0][0].data.userId).toBe('user-1');
    });

    it('soft-deletes addresses with delete action and a tombstone timestamp', async () => {
      mockPrisma.address.findFirst.mockResolvedValue({
        id: baseOp.entityId,
        userId: 'user-1',
        deletedAt: null,
        updatedAt: new Date('2026-09-12T09:00:00.000Z'),
      });

      const result = await service.push('user-1', {
        operations: [{ ...baseOp, action: 'delete' }],
      });

      expect(result.results[0].status).toBe('applied');
      expect(mockPrisma.address.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe('pull', () => {
    it('returns real timestamps and tombstones with deleted action', async () => {
      const liveAt = new Date('2026-09-12T08:00:00.000Z');
      const tombAt = new Date('2026-09-12T09:00:00.000Z');

      mockPrisma.address.findMany
        .mockResolvedValueOnce([{ id: 'a1', updatedAt: liveAt }])
        .mockResolvedValueOnce([{ id: 'a2', updatedAt: tombAt, deletedAt: tombAt }]);
      mockPrisma.landmark.findMany.mockResolvedValue([]);
      mockPrisma.businessProfile.findMany.mockResolvedValue([]);
      mockPrisma.qrCode.findMany.mockResolvedValue([]);

      const result = await service.pull('user-1', {});

      const liveEntry = result.data.find((r) => r.entityId === 'a1');
      const tombEntry = result.data.find((r) => r.entityId === 'a2');

      expect(liveEntry).toMatchObject({ action: 'updated' });
      expect(liveEntry!.updatedAt).toBe(liveAt.toISOString());
      expect(tombEntry).toMatchObject({ action: 'deleted' });
    });
  });
});