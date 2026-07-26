import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AddressType } from '@prisma/client';
import { AddressesService } from '../addresses.service';
import { PrismaService } from '../../../database/prisma.service';

const mockPrisma = {
  address: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
};

describe('AddressesService', () => {
  let service: AddressesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AddressesService>(AddressesService);
  });

  const mockAddress = {
    id: 'addr-1',
    userId: 'user-1',
    label: 'Domicile',
    type: AddressType.PERSONAL,
    avenue: 'Avenue de la Libération',
    quartier: 'Gombe',
    city: 'Kinshasa',
    province: 'Kinshasa',
    country: 'CD',
    isPrimary: true,
    isPublic: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('create', () => {
    it('should create an address', async () => {
      mockPrisma.address.count.mockResolvedValue(0);
      mockPrisma.address.create.mockResolvedValue(mockAddress);

      const result = await service.create('user-1', {
        city: 'Kinshasa',
        label: 'Domicile',
      });

      expect(result.city).toBe('Kinshasa');
      expect(result.isPrimary).toBe(true);
      expect(mockPrisma.address.create).toHaveBeenCalledTimes(1);
    });

    it('should set isPrimary when no other addresses exist', async () => {
      mockPrisma.address.count.mockResolvedValue(0);
      mockPrisma.address.create.mockResolvedValue({ ...mockAddress, isPrimary: true });

      const result = await service.create('user-1', { city: 'Lubumbashi' });

      expect(result.isPrimary).toBe(true);
    });

    it('should unset other primary addresses when new one is primary', async () => {
      mockPrisma.address.count.mockResolvedValue(2);
      mockPrisma.address.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.address.create.mockResolvedValue({ ...mockAddress, isPrimary: true });

      await service.create('user-1', { city: 'Kinshasa', isPrimary: true });

      expect(mockPrisma.address.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isPrimary: true },
          data: { isPrimary: false },
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated addresses', async () => {
      mockPrisma.address.findMany.mockResolvedValue([mockAddress]);
      mockPrisma.address.count.mockResolvedValue(1);

      const result = await service.findAll('user-1', {});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by type', async () => {
      mockPrisma.address.findMany.mockResolvedValue([]);
      mockPrisma.address.count.mockResolvedValue(0);

      await service.findAll('user-1', { type: AddressType.PROFESSIONAL });

      expect(mockPrisma.address.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: AddressType.PROFESSIONAL }),
        }),
      );
    });

    it('should filter by isPublic', async () => {
      mockPrisma.address.findMany.mockResolvedValue([]);
      mockPrisma.address.count.mockResolvedValue(0);

      await service.findAll('user-1', { isPublic: true });

      expect(mockPrisma.address.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isPublic: true }),
        }),
      );
    });

    it('should paginate results', async () => {
      mockPrisma.address.findMany.mockResolvedValue([]);
      mockPrisma.address.count.mockResolvedValue(25);

      const result = await service.findAll('user-1', { page: 2, limit: 10 });

      expect(mockPrisma.address.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('findOne', () => {
    it('should return address if owner', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(mockAddress);

      const result = await service.findOne('addr-1', 'user-1');

      expect(result.id).toBe('addr-1');
    });

    it('should throw if deleted', async () => {
      mockPrisma.address.findUnique.mockResolvedValue({ ...mockAddress, deletedAt: new Date() });

      await expect(service.findOne('addr-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw if not found', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(null);

      await expect(service.findOne('addr-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw if not owner and not public', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(mockAddress);

      await expect(service.findOne('addr-1', 'user-2')).rejects.toThrow(NotFoundException);
    });

    it('should return if public and not owner', async () => {
      mockPrisma.address.findUnique.mockResolvedValue({ ...mockAddress, isPublic: true });

      const result = await service.findOne('addr-1', 'user-2');

      expect(result.id).toBe('addr-1');
    });

    it('should return public address without auth', async () => {
      mockPrisma.address.findUnique.mockResolvedValue({ ...mockAddress, isPublic: true });

      const result = await service.findOne('addr-1');

      expect(result.id).toBe('addr-1');
    });

    it('should throw without auth if not public', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(mockAddress);

      await expect(service.findOne('addr-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update fields', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(mockAddress);
      mockPrisma.address.update.mockResolvedValue({ ...mockAddress, label: 'Bureau' });

      const result = await service.update('addr-1', 'user-1', { label: 'Bureau' });

      expect(result.label).toBe('Bureau');
      expect(mockPrisma.address.update).toHaveBeenCalled();
    });

    it('should throw if not owner', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(mockAddress);

      await expect(
        service.update('addr-1', 'user-2', { label: 'Bureau' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if deleted', async () => {
      mockPrisma.address.findUnique.mockResolvedValue({ ...mockAddress, deletedAt: new Date() });

      await expect(
        service.update('addr-1', 'user-1', { label: 'Bureau' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should demote other primaries when setting isPrimary', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(mockAddress);
      mockPrisma.address.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.address.update.mockResolvedValue({ ...mockAddress, isPrimary: true });

      await service.update('addr-1', 'user-1', { isPrimary: true });

      expect(mockPrisma.address.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isPrimary: true, id: { not: 'addr-1' } },
          data: { isPrimary: false },
        }),
      );
    });
  });

  describe('remove', () => {
    it('should soft-delete', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(mockAddress);

      await service.remove('addr-1', 'user-1');

      expect(mockPrisma.address.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'addr-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    it('should throw if not owner', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(mockAddress);

      await expect(service.remove('addr-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });
  });
});
