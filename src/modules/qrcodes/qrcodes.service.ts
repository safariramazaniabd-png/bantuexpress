import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../database/prisma.service';
import { CreateQrCodeDto } from './dto/create-qrcode.dto';

@Injectable()
export class QrCodesService {
  constructor(private readonly prisma: PrismaService) {}

  private generateCode(): string {
    return randomBytes(8).toString('base64url').slice(0, 12);
  }

  async create(userId: string, dto: CreateQrCodeDto) {
    await this.ensureEntityAccess(userId, dto.entityType, dto.entityId);

    const existing = await this.prisma.qrCode.findUnique({
      where: { entityType_entityId: { entityType: dto.entityType, entityId: dto.entityId } },
    });

    if (existing) {
      throw new ConflictException('A QR code already exists for this entity');
    }

    return this.prisma.qrCode.create({
      data: {
        userId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        code: this.generateCode(),
      },
    });
  }

  async findMine(userId: string) {
    return this.prisma.qrCode.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolve(code: string) {
    const qr = await this.prisma.qrCode.findUnique({ where: { code } });

    if (!qr) {
      throw new NotFoundException('QR code not found');
    }

    const entity = await this.resolveEntity(qr.entityType, qr.entityId);

    if (!entity) {
      throw new NotFoundException('Linked entity not found');
    }

    return { type: qr.entityType, entity, qr: this.sanitizeQr(qr) };
  }

  async getStats(code: string) {
    const qr = await this.prisma.qrCode.findUnique({ where: { code } });

    if (!qr) {
      throw new NotFoundException('QR code not found');
    }

    return { scans: qr.scans, lastScannedAt: qr.lastScannedAt, createdAt: qr.createdAt };
  }

  async recordScan(code: string) {
    const qr = await this.prisma.qrCode.findUnique({ where: { code } });

    if (!qr) {
      throw new NotFoundException('QR code not found');
    }

    return this.prisma.qrCode.update({
      where: { id: qr.id },
      data: { scans: { increment: 1 }, lastScannedAt: new Date() },
    });
  }

  async generateImage(code: string): Promise<Buffer> {
    const qr = await this.prisma.qrCode.findUnique({ where: { code } });

    if (!qr) {
      throw new NotFoundException('QR code not found');
    }

    const resolveUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3001'}/scan/${code}`;

    return QRCode.toBuffer(resolveUrl, {
      type: 'png',
      width: 400,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    });
  }

  private async ensureEntityAccess(userId: string, entityType: string, entityId: string) {
    switch (entityType) {
      case 'profile': {
        const profile = await this.prisma.profile.findUnique({ where: { id: entityId } });
        if (!profile) throw new NotFoundException('Profile not found');
        if (profile.userId !== userId) throw new ForbiddenException('Access denied');
        return;
      }
      case 'address': {
        const address = await this.prisma.address.findUnique({ where: { id: entityId } });
        if (!address || address.deletedAt) throw new NotFoundException('Address not found');
        if (address.userId !== userId) throw new ForbiddenException('Access denied');
        return;
      }
      case 'landmark': {
        const landmark = await this.prisma.landmark.findUnique({ where: { id: entityId } });
        if (!landmark || landmark.deletedAt) throw new NotFoundException('Landmark not found');
        if (landmark.userId && landmark.userId !== userId) {
          throw new ForbiddenException('Access denied');
        }
        return;
      }
      default:
        throw new NotFoundException('Unknown entity type');
    }
  }

  private async resolveEntity(entityType: string, entityId: string) {
    switch (entityType) {
      case 'profile': {
        const profile = await this.prisma.profile.findUnique({
          where: { id: entityId },
          select: {
            firstName: true,
            lastName: true,
            avatarUrl: true,
            profession: true,
            languages: true,
            isPublic: true,
          },
        });
        if (!profile || !profile.isPublic) return null;
        return profile;
      }
      case 'address': {
        const address = await this.prisma.address.findUnique({
          where: { id: entityId },
          select: {
            label: true,
            avenue: true,
            quartier: true,
            city: true,
            province: true,
            isPublic: true,
          },
        });
        if (!address || !address.isPublic) return null;
        return address;
      }
      case 'landmark': {
        const landmark = await this.prisma.landmark.findUnique({
          where: { id: entityId },
          select: {
            name: true,
            category: true,
            description: true,
            latitude: true,
            longitude: true,
            city: true,
            isPublic: true,
          },
        });
        if (!landmark || !landmark.isPublic) return null;
        return landmark;
      }
      default:
        return null;
    }
  }

  private sanitizeQr(qr: any) {
    return { id: qr.id, code: qr.code, entityType: qr.entityType, entityId: qr.entityId };
  }
}
