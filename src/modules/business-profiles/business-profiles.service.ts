import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateBusinessProfileDto } from './dto/create-business-profile.dto';
import { UpdateBusinessProfileDto } from './dto/update-business-profile.dto';
import { BusinessProfileQueryDto } from './dto/business-profile-query.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SetOpeningHoursDto } from './dto/set-opening-hours.dto';

@Injectable()
export class BusinessProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateBusinessProfileDto) {
    const business = await this.prisma.businessProfile.create({
      data: { ...dto, userId },
    });

    await this.prisma.businessMember.create({
      data: { businessId: business.id, userId, role: 'owner' },
    });

    return business;
  }

  async findAll(query: BusinessProfileQueryDto) {
    const { type, sector, city, province, page = 1, limit = 20 } = query;

    const where: any = { deletedAt: null, isPublic: true };

    if (type) where.type = type;
    if (sector) where.sector = { contains: sector, mode: 'insensitive' };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (province) where.province = { contains: province, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.businessProfile.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { members: true } },
        },
      }),
      this.prisma.businessProfile.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findMine(userId: string) {
    return this.prisma.businessProfile.findMany({
      where: { userId, deletedAt: null },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId?: string) {
    const business = await this.prisma.businessProfile.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true } },
      },
    });

    if (!business || business.deletedAt) {
      throw new NotFoundException('Business profile not found');
    }

    if (!business.isPublic && business.userId !== userId) {
      throw new NotFoundException('Business profile not found');
    }

    const isOwner = business.userId === userId;
    const member = userId
      ? await this.prisma.businessMember.findUnique({
          where: { businessId_userId: { businessId: id, userId } },
        })
      : null;
    const canSeeMemberDetails = isOwner || member?.role === 'admin';

    const members = await this.prisma.businessMember.findMany({
      where: { businessId: id },
      include: {
        user: canSeeMemberDetails
          ? { select: { id: true, email: true } }
          : { select: { id: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return { ...business, members };
  }

  async update(id: string, userId: string, dto: UpdateBusinessProfileDto) {
    const business = await this.prisma.businessProfile.findUnique({
      where: { id },
    });

    if (!business || business.deletedAt) {
      throw new NotFoundException('Business profile not found');
    }

    const member = await this.prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId: id, userId } },
    });

    const isOwner = business.userId === userId;
    const isAdmin = member?.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Only the owner or an admin can update');
    }

    return this.prisma.businessProfile.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, userId: string) {
    const business = await this.prisma.businessProfile.findUnique({
      where: { id },
    });

    if (!business || business.deletedAt) {
      throw new NotFoundException('Business profile not found');
    }

    if (business.userId !== userId) {
      throw new ForbiddenException('Only the owner can delete');
    }

    await this.prisma.businessProfile.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async verify(id: string) {
    const business = await this.prisma.businessProfile.findUnique({
      where: { id },
    });

    if (!business || business.deletedAt) {
      throw new NotFoundException('Business profile not found');
    }

    return this.prisma.businessProfile.update({
      where: { id },
      data: { isVerified: true },
    });
  }

  async addMember(id: string, userId: string, dto: AddMemberDto) {
    const business = await this.prisma.businessProfile.findUnique({
      where: { id },
    });

    if (!business || business.deletedAt) {
      throw new NotFoundException('Business profile not found');
    }

    const caller = await this.prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId: id, userId } },
    });

    const isOwner = business.userId === userId;
    const isAdmin = caller?.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Only the owner or an admin can add members');
    }

    const existing = await this.prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId: id, userId: dto.userId } },
    });

    if (existing) {
      throw new ConflictException('User is already a member');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.businessMember.create({
      data: { businessId: id, userId: dto.userId, role: dto.role ?? 'member' },
      include: {
        user: { select: { id: true, email: true } },
      },
    });
  }

  async getMembers(id: string, userId: string) {
    const business = await this.prisma.businessProfile.findUnique({
      where: { id },
    });

    if (!business || business.deletedAt) {
      throw new NotFoundException('Business profile not found');
    }

    const caller = await this.prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId: id, userId } },
    });

    const isOwner = business.userId === userId;
    const isAdmin = caller?.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Only the owner or an admin can list members');
    }

    return this.prisma.businessMember.findMany({
      where: { businessId: id },
      include: {
        user: { select: { id: true, email: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async removeMember(id: string, userId: string, targetUserId: string) {
    const business = await this.prisma.businessProfile.findUnique({
      where: { id },
    });

    if (!business || business.deletedAt) {
      throw new NotFoundException('Business profile not found');
    }

    const caller = await this.prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId: id, userId } },
    });

    const isOwner = business.userId === userId;
    const isAdmin = caller?.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Only the owner or an admin can remove members');
    }

    const member = await this.prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId: id, userId: targetUserId } },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === 'owner') {
      throw new ForbiddenException('Cannot remove the owner');
    }

    await this.prisma.businessMember.delete({
      where: { businessId_userId: { businessId: id, userId: targetUserId } },
    });
  }

  // ---- Products ----

  async createProduct(businessId: string, userId: string, dto: CreateProductDto) {
    const business = await this.prisma.businessProfile.findUnique({ where: { id: businessId } });
    if (!business || business.deletedAt) throw new NotFoundException('Business profile not found');

    const member = await this.prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId, userId } },
    });
    const isOwner = business.userId === userId;
    const isAdmin = member?.role === 'admin';
    if (!isOwner && !isAdmin) throw new ForbiddenException('Only the owner or admin can manage products');

    return this.prisma.product.create({
      data: {
        businessProfileId: businessId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        imageUrl: dto.imageUrl,
      },
    });
  }

  async findProducts(businessId: string) {
    const business = await this.prisma.businessProfile.findUnique({ where: { id: businessId } });
    if (!business || business.deletedAt || !business.isPublic) {
      throw new NotFoundException('Business profile not found');
    }

    return this.prisma.product.findMany({
      where: { businessProfileId: businessId },
      orderBy: { name: 'asc' },
    });
  }

  async updateProduct(productId: string, userId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { businessProfile: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const business = product.businessProfile;
    const member = await this.prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId: product.businessProfileId, userId } },
    });
    const isOwner = business.userId === userId;
    const isAdmin = member?.role === 'admin';
    if (!isOwner && !isAdmin) throw new ForbiddenException('Only the owner or admin can update products');

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      },
    });
  }

  async removeProduct(productId: string, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { businessProfile: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const business = product.businessProfile;
    const member = await this.prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId: product.businessProfileId, userId } },
    });
    const isOwner = business.userId === userId;
    const isAdmin = member?.role === 'admin';
    if (!isOwner && !isAdmin) throw new ForbiddenException('Only the owner or admin can delete products');

    await this.prisma.product.delete({ where: { id: productId } });
  }

  // ---- Opening Hours ----

  async setOpeningHours(businessId: string, userId: string, dto: SetOpeningHoursDto) {
    const business = await this.prisma.businessProfile.findUnique({ where: { id: businessId } });
    if (!business || business.deletedAt) throw new NotFoundException('Business profile not found');

    const member = await this.prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId, userId } },
    });
    const isOwner = business.userId === userId;
    const isAdmin = member?.role === 'admin';
    if (!isOwner && !isAdmin) throw new ForbiddenException('Only the owner or admin can set opening hours');

    await this.prisma.openingHour.deleteMany({ where: { businessProfileId: businessId } });

    const hours = await this.prisma.openingHour.createMany({
      data: dto.hours.map((h) => ({
        businessProfileId: businessId,
        dayOfWeek: h.dayOfWeek,
        open: h.open,
        close: h.close,
      })),
    });

    return this.prisma.openingHour.findMany({
      where: { businessProfileId: businessId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async getOpeningHours(businessId: string) {
    const business = await this.prisma.businessProfile.findUnique({ where: { id: businessId } });
    if (!business || business.deletedAt || !business.isPublic) {
      throw new NotFoundException('Business profile not found');
    }

    return this.prisma.openingHour.findMany({
      where: { businessProfileId: businessId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }
}
