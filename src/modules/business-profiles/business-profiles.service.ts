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
        members: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
      },
    });

    if (!business || business.deletedAt) {
      throw new NotFoundException('Business profile not found');
    }

    if (!business.isPublic && business.userId !== userId) {
      throw new NotFoundException('Business profile not found');
    }

    return business;
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

  async getMembers(id: string) {
    const business = await this.prisma.businessProfile.findUnique({
      where: { id },
    });

    if (!business || business.deletedAt) {
      throw new NotFoundException('Business profile not found');
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
}
