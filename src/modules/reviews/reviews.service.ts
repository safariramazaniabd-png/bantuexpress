import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto) {
    const existing = await this.prisma.review.findFirst({
      where: {
        userId,
        entityType: dto.entityType,
        entityId: dto.entityId,
      },
    });

    if (existing) {
      throw new ConflictException('You have already reviewed this entity');
    }

    try {
      const review = await this.prisma.review.create({
        data: {
          userId,
          entityType: dto.entityType,
          entityId: dto.entityId,
          rating: dto.rating,
          comment: dto.comment,
        },
        include: {
          user: { select: { id: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
        },
      });
      return review;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('You have already reviewed this entity');
      }
      throw error;
    }
  }

  async findAll(query: ReviewQueryDto) {
    const where: any = {};
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async update(id: string, userId: string, dto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException('You can only edit your own reviews');

    return this.prisma.review.update({
      where: { id },
      data: {
        ...(dto.rating !== undefined && { rating: dto.rating }),
        ...(dto.comment !== undefined && { comment: dto.comment }),
      },
      include: {
        user: { select: { id: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
      },
    });
  }

  async remove(id: string, userId: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException('You can only delete your own reviews');
    await this.prisma.review.delete({ where: { id } });
  }

  async getStats(entityType: string, entityId: string) {
    const stats = await this.prisma.review.aggregate({
      where: { entityType, entityId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    return {
      entityType,
      entityId,
      averageRating: stats._avg.rating ? Math.round(stats._avg.rating * 10) / 10 : 0,
      totalReviews: stats._count.rating,
    };
  }
}
