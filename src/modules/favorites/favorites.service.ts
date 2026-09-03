import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { FavoriteQueryDto } from './dto/favorite-query.dto';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, dto: CreateFavoriteDto) {
    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_entityType_entityId: {
          userId,
          entityType: dto.entityType,
          entityId: dto.entityId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Already favorited');
    }

    return this.prisma.favorite.create({
      data: {
        userId,
        entityType: dto.entityType,
        entityId: dto.entityId,
      },
    });
  }

  async findAll(userId: string, query: FavoriteQueryDto) {
    const where: any = { userId };
    if (query.entityType) where.entityType = query.entityType;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.favorite.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async remove(userId: string, id: string) {
    const fav = await this.prisma.favorite.findUnique({ where: { id } });
    if (!fav || fav.userId !== userId) {
      throw new NotFoundException('Favorite not found');
    }
    await this.prisma.favorite.delete({ where: { id } });
  }

  async removeByEntity(userId: string, entityType: string, entityId: string) {
    const fav = await this.prisma.favorite.findUnique({
      where: {
        userId_entityType_entityId: { userId, entityType, entityId },
      },
    });
    if (!fav) {
      throw new NotFoundException('Favorite not found');
    }
    await this.prisma.favorite.delete({ where: { id: fav.id } });
  }

  async count(entityType: string, entityId: string) {
    return this.prisma.favorite.count({
      where: { entityType, entityId },
    });
  }
}
