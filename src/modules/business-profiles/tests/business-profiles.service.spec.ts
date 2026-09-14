import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { BusinessType } from '@prisma/client';
import { BusinessProfilesService } from '../business-profiles.service';
import { PrismaService } from '../../../database/prisma.service';

const mockPrisma = {
  businessProfile: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  businessMember: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

describe('BusinessProfilesService', () => {
  let service: BusinessProfilesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessProfilesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BusinessProfilesService>(BusinessProfilesService);
  });

  const mockBusiness = {
    id: 'biz-1',
    userId: 'user-1',
    name: 'Tech SARL',
    type: BusinessType.ENTERPRISE,
    description: 'Solutions tech',
    sector: 'Technology',
    logoUrl: null,
    website: null,
    email: 'contact@techsarl.cd',
    phone: '+243123456789',
    city: 'Kinshasa',
    province: 'Kinshasa',
    country: 'CD',
    isVerified: false,
    isPublic: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('create', () => {
    it('should create a business profile and owner membership', async () => {
      mockPrisma.businessProfile.create.mockResolvedValue(mockBusiness);
      mockPrisma.businessMember.create.mockResolvedValue({
        id: 'member-1',
        businessId: 'biz-1',
        userId: 'user-1',
        role: 'owner',
        joinedAt: new Date(),
      });

      const result = await service.create('user-1', {
        name: 'Tech SARL',
        city: 'Kinshasa',
      });

      expect(result.name).toBe('Tech SARL');
      expect(mockPrisma.businessProfile.create).toHaveBeenCalled();
      expect(mockPrisma.businessMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { businessId: 'biz-1', userId: 'user-1', role: 'owner' },
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated public business profiles', async () => {
      mockPrisma.businessProfile.findMany.mockResolvedValue([
        { ...mockBusiness, _count: { members: 1 } },
      ]);
      mockPrisma.businessProfile.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by type', async () => {
      mockPrisma.businessProfile.findMany.mockResolvedValue([]);
      mockPrisma.businessProfile.count.mockResolvedValue(0);

      await service.findAll({ type: BusinessType.NGO });

      expect(mockPrisma.businessProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: BusinessType.NGO }),
        }),
      );
    });

    it('should filter by city', async () => {
      mockPrisma.businessProfile.findMany.mockResolvedValue([]);
      mockPrisma.businessProfile.count.mockResolvedValue(0);

      await service.findAll({ city: 'Lubumbashi' });

      expect(mockPrisma.businessProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: { contains: 'Lubumbashi', mode: 'insensitive' },
          }),
        }),
      );
    });
  });

  describe('findMine', () => {
    it('should return own business profiles', async () => {
      mockPrisma.businessProfile.findMany.mockResolvedValue([
        { ...mockBusiness, _count: { members: 1 } },
      ]);

      const result = await service.findMine('user-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.businessProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', deletedAt: null },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return public business profile', async () => {
      mockPrisma.businessProfile.findUnique.mockResolvedValue({
        ...mockBusiness,
        _count: { members: 1 },
        members: [],
      });

      const result = await service.findOne('biz-1');

      expect(result.id).toBe('biz-1');
    });

    it('should throw if deleted', async () => {
      mockPrisma.businessProfile.findUnique.mockResolvedValue({
        ...mockBusiness,
        deletedAt: new Date(),
      });

      await expect(service.findOne('biz-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw if not found', async () => {
      mockPrisma.businessProfile.findUnique.mockResolvedValue(null);

      await expect(service.findOne('biz-1')).rejects.toThrow(NotFoundException);
    });

    it('should return private profile to owner', async () => {
      mockPrisma.businessProfile.findUnique.mockResolvedValue({
        ...mockBusiness,
        isPublic: false,
        _count: { members: 1 },
        members: [],
      });

      const result = await service.findOne('biz-1', 'user-1');

      expect(result.id).toBe('biz-1');
    });

    it('should hide private profile from others', async () => {
      mockPrisma.businessProfile.findUnique.mockResolvedValue({
        ...mockBusiness,
        isPublic: false,
      });

      await expect(service.findOne('biz-1', 'user-2')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update fields as owner', async () => {
      mockPrisma.businessProfile.findUnique.mockResolvedValue(mockBusiness);
      mockPrisma.businessMember.findUnique.mockResolvedValue(null);
      mockPrisma.businessProfile.update.mockResolvedValue({
        ...mockBusiness,
        name: 'Tech SARL Updated',
      });

      const result = await service.update('biz-1', 'user-1', {
        name: 'Tech SARL Updated',
      });

      expect(result.name).toBe('Tech SARL Updated');
    });

    it('should update fields as admin member', async () => {
      mockPrisma.businessProfile.findUnique.mockResolvedValue({
        ...mockBusiness,
        userId: 'user-owner',
      });
      mockPrisma.businessMember.findUnique.mockResolvedValue({
        id: 'member-2',
        role: 'admin',
      });
      mockPrisma.businessProfile.update.mockResolvedValue({
        ...mockBusiness,
        name: 'Updated',
      });

      const result = await service.update('biz-1', 'admin-user', {
        name: 'Updated',
      });

      expect(result.name).toBe('Updated');
    });

    it('should throw if not owner or admin', async () => {
      mockPrisma.businessProfile.findUnique.mockResolvedValue({
        ...mockBusiness,
        userId: 'user-owner',
      });
      mockPrisma.businessMember.findUnique.mockResolvedValue(null);

      await expect(
        service.update('biz-1', 'other-user', { name: 'Test' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if deleted', async () => {
      mockPrisma.businessProfile.findUnique.mockResolvedValue({
        ...mockBusiness,
        deletedAt: new Date(),
      });

      await expect(
        service.update('biz-1', 'user-1', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete as owner', async () => {
      mockPrisma.businessProfile.findUnique.mockResolvedValue(mockBusiness);

      await service.remove('biz-1', 'user-1');

      expect(mockPrisma.businessProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'biz-1' },
          data: { deletedAt: expect.any(Date) },
        }),
      );
    });

    it('should throw if not owner', async () => {
      mockPrisma.businessProfile.findUnique.mockResolvedValue(mockBusiness);

      await expect(service.remove('biz-1', 'user-2')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('verify', () => {
    it('should set isVerified', async () => {
      mockPrisma.businessProfile.findUnique.mockResolvedValue(mockBusiness);
      mockPrisma.businessProfile.update.mockResolvedValue({
        ...mockBusiness,
        isVerified: true,
      });

      const result = await service.verify('biz-1');

      expect(result.isVerified).toBe(true);
    });
  });

  describe('addMember', () => {
    it('should add a member as owner', async () => {
      mockPrisma.businessProfile.findUnique.mockResolvedValue(mockBusiness);
      mockPrisma.businessMember.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-3', email: 'user3@test.cd' });
      mockPrisma.businessMember.create.mockResolvedValue({
        id: 'member-3',
        businessId: 'biz-1',
        userId: 'user-3',
        role: 'member',
        joinedAt: new Date(),
        user: { id: 'user-3', email: 'user3@test.cd' },
      });

      const result = await service.addMember('biz-1', 'user-1', {
        userId: 'user-3',
      });

      expect(result.userId).toBe('user-3');
    });

    it('should throw ConflictException if already a member', async () => {
      mockPrisma.businessProfile.findUnique.mockResolvedValue(mockBusiness);
      mockPrisma.businessMember.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing', userId: 'user-3' });

      await expect(
        service.addMember('biz-1', 'user-1', { userId: 'user-3' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw if target user not found', async () => {
      mockPrisma.businessProfile.findUnique.mockResolvedValue(mockBusiness);
      mockPrisma.businessMember.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember('biz-1', 'user-1', { userId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMembers', () => {
    it('should return members for an owner', async () => {
      mockPrisma.businessProfile.findUnique.mockResolvedValue(mockBusiness);
      mockPrisma.businessMember.findUnique.mockResolvedValue(null);
      mockPrisma.businessMember.findMany.mockResolvedValue([
        { id: 'm-1', userId: 'user-1', role: 'owner', user: { id: 'user-1', email: 'owner@test.cd' } },
      ]);

      const result = await service.getMembers('biz-1', 'user-1');

      expect(result).toHaveLength(1);
    });

    it('should throw ForbiddenException for a non-owner user', async () => {
      mockPrisma.businessProfile.findUnique.mockResolvedValue(mockBusiness);
      mockPrisma.businessMember.findUnique.mockResolvedValue(null);

      await expect(
        service.getMembers('biz-1', 'stranger'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeMember', () => {
    it('should remove a member', async () => {
      mockPrisma.businessProfile.findUnique.mockResolvedValue(mockBusiness);
      mockPrisma.businessMember.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'm-2',
          userId: 'user-2',
          role: 'member',
        });

      await service.removeMember('biz-1', 'user-1', 'user-2');

      expect(mockPrisma.businessMember.delete).toHaveBeenCalled();
    });

    it('should throw if removing owner', async () => {
      mockPrisma.businessProfile.findUnique.mockResolvedValue(mockBusiness);
      mockPrisma.businessMember.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'm-1',
          userId: 'user-1',
          role: 'owner',
        });

      await expect(
        service.removeMember('biz-1', 'user-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
