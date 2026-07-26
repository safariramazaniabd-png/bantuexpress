import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { LandmarkCategory } from '@prisma/client';
import { LandmarksService } from '../landmarks.service';
import { PrismaService } from '../../../database/prisma.service';

const mockPrisma = {
  landmark: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

describe('LandmarksService', () => {
  let service: LandmarksService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LandmarksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LandmarksService>(LandmarksService);
  });

  const mockLandmark = {
    id: 'lm-1',
    userId: 'user-1',
    name: 'Marché Central',
    category: LandmarkCategory.MARKET,
    description: 'Grand marché de Kinshasa',
    address: 'Avenue du Commerce',
    city: 'Kinshasa',
    province: 'Kinshasa',
    country: 'CD',
    latitude: -4.3182,
    longitude: 15.3112,
    isPublic: true,
    verifiedAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('create', () => {
    it('should create a landmark', async () => {
      mockPrisma.landmark.create.mockResolvedValue(mockLandmark);

      const result = await service.create('user-1', {
        name: 'Marché Central',
        city: 'Kinshasa',
        latitude: -4.3182,
        longitude: 15.3112,
      });

      expect(result.name).toBe('Marché Central');
      expect(mockPrisma.landmark.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated public landmarks', async () => {
      mockPrisma.landmark.findMany.mockResolvedValue([mockLandmark]);
      mockPrisma.landmark.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by category', async () => {
      mockPrisma.landmark.findMany.mockResolvedValue([]);
      mockPrisma.landmark.count.mockResolvedValue(0);

      await service.findAll({ category: LandmarkCategory.HOSPITAL });

      expect(mockPrisma.landmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: LandmarkCategory.HOSPITAL }),
        }),
      );
    });

    it('should paginate results', async () => {
      mockPrisma.landmark.findMany.mockResolvedValue([]);
      mockPrisma.landmark.count.mockResolvedValue(25);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(mockPrisma.landmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(result.meta.totalPages).toBe(3);
    });

    it('should use nearby search when coordinates are provided', async () => {
      mockPrisma.landmark.findMany.mockResolvedValue([mockLandmark]);

      const result = await service.findAll({
        latitude: -4.3,
        longitude: 15.3,
        radius: 5000,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('distance');
    });
  });

  describe('findOne', () => {
    it('should return landmark if public', async () => {
      mockPrisma.landmark.findUnique.mockResolvedValue(mockLandmark);

      const result = await service.findOne('lm-1');

      expect(result.id).toBe('lm-1');
    });

    it('should throw if deleted', async () => {
      mockPrisma.landmark.findUnique.mockResolvedValue({
        ...mockLandmark,
        deletedAt: new Date(),
      });

      await expect(service.findOne('lm-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw if not found', async () => {
      mockPrisma.landmark.findUnique.mockResolvedValue(null);

      await expect(service.findOne('lm-1')).rejects.toThrow(NotFoundException);
    });

    it('should return private landmark to owner', async () => {
      mockPrisma.landmark.findUnique.mockResolvedValue({
        ...mockLandmark,
        isPublic: false,
      });

      const result = await service.findOne('lm-1', 'user-1');

      expect(result.id).toBe('lm-1');
    });

    it('should hide private landmark from others', async () => {
      mockPrisma.landmark.findUnique.mockResolvedValue({
        ...mockLandmark,
        isPublic: false,
      });

      await expect(service.findOne('lm-1', 'user-2')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update fields', async () => {
      mockPrisma.landmark.findUnique.mockResolvedValue(mockLandmark);
      mockPrisma.landmark.update.mockResolvedValue({
        ...mockLandmark,
        name: 'Marché de la Liberté',
      });

      const result = await service.update('lm-1', 'user-1', {
        name: 'Marché de la Liberté',
      });

      expect(result.name).toBe('Marché de la Liberté');
    });

    it('should throw if not owner', async () => {
      mockPrisma.landmark.findUnique.mockResolvedValue(mockLandmark);

      await expect(
        service.update('lm-1', 'user-2', { name: 'Test' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if deleted', async () => {
      mockPrisma.landmark.findUnique.mockResolvedValue({
        ...mockLandmark,
        deletedAt: new Date(),
      });

      await expect(
        service.update('lm-1', 'user-1', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft-delete', async () => {
      mockPrisma.landmark.findUnique.mockResolvedValue(mockLandmark);

      await service.remove('lm-1', 'user-1');

      expect(mockPrisma.landmark.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lm-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    it('should throw if not owner', async () => {
      mockPrisma.landmark.findUnique.mockResolvedValue(mockLandmark);

      await expect(service.remove('lm-1', 'user-2')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('verify', () => {
    it('should set verifiedAt', async () => {
      mockPrisma.landmark.findUnique.mockResolvedValue(mockLandmark);
      mockPrisma.landmark.update.mockResolvedValue({
        ...mockLandmark,
        verifiedAt: new Date(),
      });

      const result = await service.verify('lm-1');

      expect(result.verifiedAt).toBeDefined();
      expect(mockPrisma.landmark.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lm-1' },
          data: { verifiedAt: expect.any(Date) },
        }),
      );
    });

    it('should throw if not found', async () => {
      mockPrisma.landmark.findUnique.mockResolvedValue(null);

      await expect(service.verify('lm-1')).rejects.toThrow(NotFoundException);
    });
  });
});
