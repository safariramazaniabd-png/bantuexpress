import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { QrCodesService } from '../qrcodes.service';
import { PrismaService } from '../../../database/prisma.service';

const mockPrisma = {
  qrCode: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  profile: {
    findUnique: jest.fn(),
  },
  address: {
    findUnique: jest.fn(),
  },
  landmark: {
    findUnique: jest.fn(),
  },
};

describe('QrCodesService', () => {
  let service: QrCodesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrCodesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<QrCodesService>(QrCodesService);
  });

  const mockQr = {
    id: 'qr-1',
    userId: 'user-1',
    entityType: 'address',
    entityId: 'addr-1',
    code: 'abc123def456',
    scans: 0,
    lastScannedAt: null,
    createdAt: new Date(),
  };

  describe('create', () => {
    it('should create a QR code for an address', async () => {
      mockPrisma.address.findUnique.mockResolvedValue({
        id: 'addr-1',
        userId: 'user-1',
        deletedAt: null,
      });
      mockPrisma.qrCode.findUnique.mockResolvedValue(null);
      mockPrisma.qrCode.create.mockResolvedValue(mockQr);

      const result = await service.create('user-1', {
        entityType: 'address',
        entityId: 'addr-1',
      });

      expect(result.code).toBeDefined();
      expect(result.code.length).toBe(12);
      expect(mockPrisma.qrCode.create).toHaveBeenCalled();
    });

    it('should create a QR code for a profile', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue({
        id: 'prof-1',
        userId: 'user-1',
      });
      mockPrisma.qrCode.findUnique.mockResolvedValue(null);
      mockPrisma.qrCode.create.mockResolvedValue({ ...mockQr, entityType: 'profile', entityId: 'prof-1' });

      const result = await service.create('user-1', {
        entityType: 'profile',
        entityId: 'prof-1',
      });

      expect(result.code).toBeDefined();
    });

    it('should throw ConflictException if QR already exists', async () => {
      mockPrisma.address.findUnique.mockResolvedValue({
        id: 'addr-1',
        userId: 'user-1',
        deletedAt: null,
      });
      mockPrisma.qrCode.findUnique.mockResolvedValue(mockQr);

      await expect(
        service.create('user-1', { entityType: 'address', entityId: 'addr-1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if entity does not exist', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-1', { entityType: 'profile', entityId: 'bad-id' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if entity belongs to another user', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue({
        id: 'prof-1',
        userId: 'user-2',
      });

      await expect(
        service.create('user-1', { entityType: 'profile', entityId: 'prof-1' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findMine', () => {
    it('should return user QR codes', async () => {
      mockPrisma.qrCode.findMany.mockResolvedValue([mockQr]);

      const result = await service.findMine('user-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.qrCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('resolve', () => {
    it('should resolve a QR code to an entity', async () => {
      mockPrisma.qrCode.findUnique.mockResolvedValue(mockQr);
      mockPrisma.address.findUnique.mockResolvedValue({
        label: 'Bureau',
        avenue: '10ème Rue',
        quartier: 'Limete',
        city: 'Kinshasa',
        province: 'Kinshasa',
        isPublic: true,
      });

      const result = await service.resolve('abc123def456');

      expect(result.type).toBe('address');
      expect(result.entity).toBeDefined();
      expect(result.qr).toBeDefined();
    });

    it('should throw if QR code not found', async () => {
      mockPrisma.qrCode.findUnique.mockResolvedValue(null);

      await expect(service.resolve('bad-code')).rejects.toThrow(NotFoundException);
    });

    it('should throw if linked entity is not public', async () => {
      mockPrisma.qrCode.findUnique.mockResolvedValue(mockQr);
      mockPrisma.address.findUnique.mockResolvedValue({
        isPublic: false,
      });

      await expect(service.resolve('abc123def456')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('should return scan stats', async () => {
      mockPrisma.qrCode.findUnique.mockResolvedValue(mockQr);

      const result = await service.getStats('abc123def456');

      expect(result.scans).toBe(0);
      expect(result.lastScannedAt).toBeNull();
    });

    it('should throw if QR not found', async () => {
      mockPrisma.qrCode.findUnique.mockResolvedValue(null);

      await expect(service.getStats('bad-code')).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordScan', () => {
    it('should increment scan counter', async () => {
      mockPrisma.qrCode.findUnique.mockResolvedValue(mockQr);
      mockPrisma.qrCode.update.mockResolvedValue({
        ...mockQr,
        scans: 1,
        lastScannedAt: new Date(),
      });

      const result = await service.recordScan('abc123def456');

      expect(result.scans).toBe(1);
      expect(mockPrisma.qrCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'qr-1' },
          data: expect.objectContaining({
            scans: { increment: 1 },
            lastScannedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw if QR not found', async () => {
      mockPrisma.qrCode.findUnique.mockResolvedValue(null);

      await expect(service.recordScan('bad-code')).rejects.toThrow(NotFoundException);
    });
  });
});
