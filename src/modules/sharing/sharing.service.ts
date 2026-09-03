import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import * as crypto from 'crypto';

@Injectable()
export class SharingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateShareLinkDto) {
    const token = crypto.randomBytes(24).toString('hex');

    return this.prisma.shareLink.create({
      data: {
        userId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        token,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  async findByToken(token: string) {
    const link = await this.prisma.shareLink.findUnique({ where: { token } });
    if (!link) throw new NotFoundException('Share link not found');
    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new NotFoundException('Share link has expired');
    }
    return link;
  }

  async resolve(token: string) {
    const link = await this.findByToken(token);
    return {
      entityType: link.entityType,
      entityId: link.entityId,
    };
  }

  async findMine(userId: string) {
    return this.prisma.shareLink.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(userId: string, id: string) {
    const link = await this.prisma.shareLink.findUnique({ where: { id } });
    if (!link || link.userId !== userId) {
      throw new NotFoundException('Share link not found');
    }
    await this.prisma.shareLink.delete({ where: { id } });
  }
}
