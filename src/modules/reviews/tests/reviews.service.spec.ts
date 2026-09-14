import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReviewsService } from '../reviews.service';
import { PrismaService } from '../../../database/prisma.service';

const mockPrisma = {
  review: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
};

describe('ReviewsService', () => {
  let service: ReviewsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ReviewsService>(ReviewsService);
  });

  const mockReview = {
    id: 'rev-1',
    userId: 'user-1',
    entityType: 'business',
    entityId: 'biz-1',
    rating: 4,
    comment: 'Great service',
    createdAt: new Date(),
    user: { id: 'user-1', email: 'a@b.com', profile: null },
  };

  describe('create', () => {
    it('should create a review', async () => {
      mockPrisma.review.create.mockResolvedValue(mockReview);
      const result = await service.create('user-1', {
        entityType: 'business',
        entityId: 'biz-1',
        rating: 4,
        comment: 'Great service',
      });
      expect(result.id).toBe('rev-1');
    });

    it('should reject a duplicate review by the same user', async () => {
      mockPrisma.review.findFirst.mockResolvedValue(mockReview);

      await expect(
        service.create('user-1', {
          entityType: 'business',
          entityId: 'biz-1',
          rating: 4,
          comment: 'Again',
        }),
      ).rejects.toThrow(ConflictException);
      expect(mockPrisma.review.create).not.toHaveBeenCalled();
    });

    it('two concurrent identical reviews both pass the app-level pre-check (race demos: DB constraint is the real guard)', async () => {
      mockPrisma.review.findFirst.mockResolvedValue(null);
      mockPrisma.review.create.mockResolvedValue(mockReview);
      const dto = { entityType: 'business', entityId: 'biz-1', rating: 4 };

      const results = await Promise.allSettled([
        service.create('user-1', dto),
        service.create('user-1', dto),
      ]);

      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
      expect(mockPrisma.review.create).toHaveBeenCalledTimes(2);
    });

    it('unique constraint violation (P2002) on the losing request yields ConflictException — single creation', async () => {
      mockPrisma.review.findFirst.mockResolvedValue(null);
      mockPrisma.review.create
        .mockResolvedValueOnce(mockReview)
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
      const dto = { entityType: 'business', entityId: 'biz-1', rating: 4 };

      const results = await Promise.allSettled([
        service.create('user-1', dto),
        service.create('user-1', dto),
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      const reason = (results[1] as { status: 'rejected'; reason: unknown }).reason;
      expect(reason).toBeInstanceOf(ConflictException);
      expect((reason as Error).message).toBe('You have already reviewed this entity');
      expect(mockPrisma.review.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('findAll', () => {
    it('should return paginated reviews', async () => {
      mockPrisma.review.findMany.mockResolvedValue([mockReview]);
      mockPrisma.review.count.mockResolvedValue(1);
      const result = await service.findAll({});
      expect(result.data).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update own review', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(mockReview);
      mockPrisma.review.update.mockResolvedValue({ ...mockReview, rating: 5 });
      const result = await service.update('rev-1', 'user-1', { rating: 5 });
      expect(result.rating).toBe(5);
    });

    it('should throw if not owner', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(mockReview);
      await expect(service.update('rev-1', 'user-2', { rating: 5 })).rejects.toThrow(ForbiddenException);
    });

    it('should throw if not found', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(null);
      await expect(service.update('rev-1', 'user-1', { rating: 5 })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete own review', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(mockReview);
      await service.remove('rev-1', 'user-1');
      expect(mockPrisma.review.delete).toHaveBeenCalledWith({ where: { id: 'rev-1' } });
    });

    it('should throw if not owner', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(mockReview);
      await expect(service.remove('rev-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getStats', () => {
    it('should return aggregate stats', async () => {
      mockPrisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.2 },
        _count: { rating: 10 },
      });
      const result = await service.getStats('business', 'biz-1');
      expect(result.averageRating).toBe(4.2);
      expect(result.totalReviews).toBe(10);
    });
  });
});
