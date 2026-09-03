import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SharingService } from '../sharing.service';
import { PrismaService } from '../../../database/prisma.service';

const mockPrisma = {
  shareLink: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
};

describe('SharingService', () => {
  let service: SharingService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<SharingService>(SharingService);
  });

  const mockLink = {
    id: 'link-1',
    userId: 'user-1',
    entityType: 'address',
    entityId: 'addr-1',
    token: 'abc123token',
    expiresAt: null,
    createdAt: new Date(),
  };

  describe('create', () => {
    it('should create a share link', async () => {
      mockPrisma.shareLink.create.mockResolvedValue(mockLink);
      const result = await service.create('user-1', {
        entityType: 'address',
        entityId: 'addr-1',
      });
      expect(result.token).toBeTruthy();
    });
  });

  describe('findByToken', () => {
    it('should return link by token', async () => {
      mockPrisma.shareLink.findUnique.mockResolvedValue(mockLink);
      const result = await service.findByToken('abc123token');
      expect(result.id).toBe('link-1');
    });

    it('should throw if expired', async () => {
      mockPrisma.shareLink.findUnique.mockResolvedValue({
        ...mockLink,
        expiresAt: new Date('2020-01-01'),
      });
      await expect(service.findByToken('abc')).rejects.toThrow(NotFoundException);
    });

    it('should throw if not found', async () => {
      mockPrisma.shareLink.findUnique.mockResolvedValue(null);
      await expect(service.findByToken('abc')).rejects.toThrow(NotFoundException);
    });
  });

  describe('resolve', () => {
    it('should return entity info', async () => {
      mockPrisma.shareLink.findUnique.mockResolvedValue(mockLink);
      const result = await service.resolve('abc123token');
      expect(result.entityType).toBe('address');
      expect(result.entityId).toBe('addr-1');
    });
  });

  describe('remove', () => {
    it('should delete if owner', async () => {
      mockPrisma.shareLink.findUnique.mockResolvedValue(mockLink);
      await service.remove('user-1', 'link-1');
      expect(mockPrisma.shareLink.delete).toHaveBeenCalled();
    });

    it('should throw if not owner', async () => {
      mockPrisma.shareLink.findUnique.mockResolvedValue(mockLink);
      await expect(service.remove('user-2', 'link-1')).rejects.toThrow(NotFoundException);
    });
  });
});
