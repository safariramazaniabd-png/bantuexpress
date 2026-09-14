import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FavoritesService } from '../favorites.service';
import { PrismaService } from '../../../database/prisma.service';

const mockPrisma = {
  favorite: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

describe('FavoritesService', () => {
  let service: FavoritesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<FavoritesService>(FavoritesService);
  });

  const mockFavorite = {
    id: 'fav-1',
    userId: 'user-1',
    entityType: 'business',
    entityId: 'biz-1',
    createdAt: new Date(),
  };

  describe('add', () => {
    it('should create a favorite', async () => {
      mockPrisma.favorite.findUnique.mockResolvedValue(null);
      mockPrisma.favorite.create.mockResolvedValue(mockFavorite);

      const result = await service.add('user-1', {
        entityType: 'business',
        entityId: 'biz-1',
      });

      expect(result.id).toBe('fav-1');
    });

    it('should throw Conflict if already favorited', async () => {
      mockPrisma.favorite.findUnique.mockResolvedValue(mockFavorite);

      await expect(
        service.add('user-1', { entityType: 'business', entityId: 'biz-1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('unique constraint violation (P2002) on concurrent duplicate yields ConflictException', async () => {
      mockPrisma.favorite.findUnique.mockResolvedValue(null);
      mockPrisma.favorite.create
        .mockResolvedValueOnce(mockFavorite)
        .mockRejectedValueOnce(
          new Prisma.PrismaClientKnownRequestError(
            'Unique constraint failed on the fields: (`userId`,`entityType`,`entityId`)',
            {
              code: 'P2002',
              clientVersion: '5.0.0',
              meta: { target: ['userId', 'entityType', 'entityId'] },
            },
          ),
        );

      const results = await Promise.allSettled([
        service.add('user-1', { entityType: 'business', entityId: 'biz-1' }),
        service.add('user-1', { entityType: 'business', entityId: 'biz-1' }),
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(
        (results[1] as { status: 'rejected'; reason: unknown }).reason,
      ).toBeInstanceOf(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated favorites', async () => {
      mockPrisma.favorite.findMany.mockResolvedValue([mockFavorite]);
      mockPrisma.favorite.count.mockResolvedValue(1);

      const result = await service.findAll('user-1', {});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by entityType', async () => {
      mockPrisma.favorite.findMany.mockResolvedValue([]);
      mockPrisma.favorite.count.mockResolvedValue(0);

      await service.findAll('user-1', { entityType: 'business' });

      expect(mockPrisma.favorite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entityType: 'business' }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('should delete a favorite by id', async () => {
      mockPrisma.favorite.findUnique.mockResolvedValue(mockFavorite);

      await service.remove('user-1', 'fav-1');

      expect(mockPrisma.favorite.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'fav-1' } }),
      );
    });

    it('should throw if not found', async () => {
      mockPrisma.favorite.findUnique.mockResolvedValue(null);

      await expect(service.remove('user-1', 'fav-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if not owner', async () => {
      mockPrisma.favorite.findUnique.mockResolvedValue({
        ...mockFavorite,
        userId: 'user-2',
      });

      await expect(service.remove('user-1', 'fav-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeByEntity', () => {
    it('should delete by entity composite key', async () => {
      mockPrisma.favorite.findUnique.mockResolvedValue(mockFavorite);

      await service.removeByEntity('user-1', 'business', 'biz-1');

      expect(mockPrisma.favorite.delete).toHaveBeenCalled();
    });

    it('should throw if not found', async () => {
      mockPrisma.favorite.findUnique.mockResolvedValue(null);

      await expect(
        service.removeByEntity('user-1', 'business', 'biz-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('count', () => {
    it('should return count', async () => {
      mockPrisma.favorite.count.mockResolvedValue(5);

      const result = await service.count('business', 'biz-1');

      expect(result).toBe(5);
    });
  });
});
