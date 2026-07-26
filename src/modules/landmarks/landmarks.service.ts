import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateLandmarkDto } from './dto/create-landmark.dto';
import { UpdateLandmarkDto } from './dto/update-landmark.dto';
import { LandmarkQueryDto } from './dto/landmark-query.dto';
import { Prisma, LandmarkCategory } from '@prisma/client';

@Injectable()
export class LandmarksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateLandmarkDto) {
    return this.prisma.landmark.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  async findAll(query: LandmarkQueryDto) {
    const {
      category,
      latitude,
      longitude,
      radius,
      page = 1,
      limit = 20,
    } = query;

    if (latitude !== undefined && longitude !== undefined && radius !== undefined) {
      return this.findNearby(latitude, longitude, radius, category, page, limit);
    }

    const where: Prisma.LandmarkWhereInput = {
      deletedAt: null,
      isPublic: true,
    };

    if (category) {
      where.category = category;
    }

    const [data, total] = await Promise.all([
      this.prisma.landmark.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.landmark.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async findNearby(
    latitude: number,
    longitude: number,
    radius: number,
    category?: LandmarkCategory,
    page = 1,
    limit = 20,
  ) {
    const earthRadius = 6371;
    const radians = radius / earthRadius;

    const latRad = (latitude * Math.PI) / 180;
    const lngRad = (longitude * Math.PI) / 180;

    const latMin = latitude - (radius / earthRadius) * (180 / Math.PI);
    const latMax = latitude + (radius / earthRadius) * (180 / Math.PI);
    const lngMin =
      longitude -
      (radius / earthRadius) * (180 / Math.PI) / Math.cos(latRad);
    const lngMax =
      longitude +
      (radius / earthRadius) * (180 / Math.PI) / Math.cos(latRad);

    const where: Prisma.LandmarkWhereInput = {
      deletedAt: null,
      isPublic: true,
      latitude: { gte: latMin, lte: latMax },
      longitude: { gte: lngMin, lte: lngMax },
    };

    if (category) {
      where.category = category;
    }

    const allNearby = await this.prisma.landmark.findMany({ where });

    const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const filtered = allNearby
      .map((l) => ({
        ...l,
        distance: haversine(latitude, longitude, l.latitude, l.longitude),
      }))
      .filter((l) => l.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    const total = filtered.length;
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId?: string) {
    const landmark = await this.prisma.landmark.findUnique({ where: { id } });

    if (!landmark || landmark.deletedAt) {
      throw new NotFoundException('Landmark not found');
    }

    if (!landmark.isPublic && landmark.userId !== userId) {
      throw new NotFoundException('Landmark not found');
    }

    return landmark;
  }

  async update(id: string, userId: string, dto: UpdateLandmarkDto) {
    const landmark = await this.prisma.landmark.findUnique({ where: { id } });

    if (!landmark || landmark.deletedAt) {
      throw new NotFoundException('Landmark not found');
    }

    if (landmark.userId !== userId) {
      throw new ForbiddenException('You can only update your own landmarks');
    }

    return this.prisma.landmark.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, userId: string) {
    const landmark = await this.prisma.landmark.findUnique({ where: { id } });

    if (!landmark || landmark.deletedAt) {
      throw new NotFoundException('Landmark not found');
    }

    if (landmark.userId !== userId) {
      throw new ForbiddenException('You can only delete your own landmarks');
    }

    await this.prisma.landmark.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async verify(id: string) {
    const landmark = await this.prisma.landmark.findUnique({ where: { id } });

    if (!landmark || landmark.deletedAt) {
      throw new NotFoundException('Landmark not found');
    }

    return this.prisma.landmark.update({
      where: { id },
      data: { verifiedAt: new Date() },
    });
  }
}
