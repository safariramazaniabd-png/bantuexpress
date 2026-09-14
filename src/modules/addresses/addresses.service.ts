import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AddressQueryDto } from './dto/address-query.dto';
import { AddressType, Prisma } from '@prisma/client';

@Injectable()
export class AddressesService {
  private readonly logger = new Logger('AddressesService');

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateAddressDto) {
    if (dto.isPrimary) {
      await this.prisma.address.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const count = await this.prisma.address.count({
      where: { userId, deletedAt: null },
    });

    const address = await this.prisma.address.create({
      data: {
        userId,
        label: dto.label,
        type: dto.type ?? AddressType.HOME,
        avenue: dto.avenue,
        quartier: dto.quartier,
        city: dto.city,
        province: dto.province ?? '',
        country: dto.country ?? 'CD',
        isPrimary: dto.isPrimary ?? count === 0,
        isPublic: dto.isPublic ?? false,
      },
    });

    this.logger.log(`Address created: ${address.id} for user ${userId}`);
    return address;
  }

  async findAll(userId: string, query: AddressQueryDto) {
    const where: Prisma.AddressWhereInput = {
      userId,
      deletedAt: null,
    };

    if (query.type) where.type = query.type;
    if (query.isPublic !== undefined) where.isPublic = query.isPublic;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.address.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.address.count({ where }),
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

  async findOne(id: string, userId?: string) {
    const address = await this.prisma.address.findUnique({
      where: { id },
    });

    if (!address || address.deletedAt) {
      throw new NotFoundException('Address not found');
    }

    if (!userId && !address.isPublic) {
      throw new NotFoundException('Address not found');
    }

    if (userId && address.userId !== userId && !address.isPublic) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  async update(id: string, userId: string, dto: UpdateAddressDto) {
    const address = await this.prisma.address.findUnique({ where: { id } });

    if (!address || address.deletedAt) {
      throw new NotFoundException('Address not found');
    }

    if (address.userId !== userId) {
      throw new ForbiddenException('You can only update your own addresses');
    }

    if (dto.isPrimary) {
      await this.prisma.address.updateMany({
        where: { userId, isPrimary: true, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    const updated = await this.prisma.address.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.avenue !== undefined && { avenue: dto.avenue }),
        ...(dto.quartier !== undefined && { quartier: dto.quartier }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.province !== undefined && { province: dto.province }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.isPrimary !== undefined && { isPrimary: dto.isPrimary }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
      },
    });

    return updated;
  }

  async remove(id: string, userId: string) {
    const address = await this.prisma.address.findUnique({ where: { id } });

    if (!address || address.deletedAt) {
      throw new NotFoundException('Address not found');
    }

    if (address.userId !== userId) {
      throw new ForbiddenException('You can only delete your own addresses');
    }

    await this.prisma.address.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
