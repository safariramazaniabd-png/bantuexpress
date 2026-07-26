import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../database/prisma.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

const AVATAR_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'avatars');

@Injectable()
export class IdentitiesService {
  private readonly logger = new Logger('IdentitiesService');

  constructor(private readonly prisma: PrismaService) {}

  private sanitizeProfile(profile: {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    profession: string | null;
    languages: string[];
    secondaryPhones: string[];
    identityDocumentType: string | null;
    identityDocumentNumber: string | null;
    personalQrCode: string | null;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: profile.id,
      userId: profile.userId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatarUrl: profile.avatarUrl,
      profession: profile.profession,
      languages: profile.languages,
      secondaryPhones: profile.secondaryPhones,
      identityDocumentType: profile.identityDocumentType,
      identityDocumentNumber: profile.identityDocumentNumber,
      personalQrCode: profile.personalQrCode,
      isPublic: profile.isPublic,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  async createProfile(userId: string, dto: CreateProfileDto) {
    const existing = await this.prisma.profile.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException('Profile already exists');
    }

    const profile = await this.prisma.profile.create({
      data: {
        userId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        profession: dto.profession,
        languages: dto.languages ?? [],
        secondaryPhones: dto.secondaryPhones ?? [],
        identityDocumentType: dto.identityDocumentType,
        identityDocumentNumber: dto.identityDocumentNumber,
        isPublic: dto.isPublic ?? true,
      },
    });

    this.logger.log(`Profile created for user ${userId}`);
    return this.sanitizeProfile(profile);
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    return this.sanitizeProfile(profile);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.profile.findUnique({ where: { userId } });
    if (!existing) {
      throw new NotFoundException('Profile not found');
    }

    const profile = await this.prisma.profile.update({
      where: { userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.profession !== undefined && { profession: dto.profession }),
        ...(dto.languages !== undefined && { languages: dto.languages }),
        ...(dto.secondaryPhones !== undefined && { secondaryPhones: dto.secondaryPhones }),
        ...(dto.identityDocumentType !== undefined && { identityDocumentType: dto.identityDocumentType }),
        ...(dto.identityDocumentNumber !== undefined && { identityDocumentNumber: dto.identityDocumentNumber }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
      },
    });

    return this.sanitizeProfile(profile);
  }

  async getPublicProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    if (!profile.isPublic) {
      throw new NotFoundException('Profile not found');
    }

    return {
      id: profile.id,
      userId: profile.userId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatarUrl: profile.avatarUrl,
      profession: profile.profession,
      languages: profile.languages,
      personalQrCode: profile.personalQrCode,
    };
  }

  async uploadAvatar(userId: string, file: UploadedFile) {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Allowed: jpeg, png, webp');
    }

    const extension = file.originalname.split('.').pop() || 'jpg';
    const filename = `${userId}_${crypto.randomBytes(8).toString('hex')}.${extension}`;
    const filepath = path.join(AVATAR_UPLOAD_DIR, filename);

    if (!fs.existsSync(AVATAR_UPLOAD_DIR)) {
      fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });
    }

    fs.writeFileSync(filepath, file.buffer);

    const avatarUrl = `/uploads/avatars/${filename}`;

    const existing = await this.prisma.profile.findUnique({ where: { userId } });
    if (!existing) {
      fs.unlinkSync(filepath);
      throw new NotFoundException('Profile not found. Create a profile first.');
    }

    if (existing.avatarUrl) {
      const oldPath = path.join(process.cwd(), existing.avatarUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await this.prisma.profile.update({
      where: { userId },
      data: { avatarUrl },
    });

    return { avatarUrl };
  }

  async deleteAvatar(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    if (profile.avatarUrl) {
      const filepath = path.join(process.cwd(), profile.avatarUrl);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    }

    await this.prisma.profile.update({
      where: { userId },
      data: { avatarUrl: null },
    });
  }

  async generateQrCode(userId: string, forceRegenerate = false) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Profile not found. Create a profile first.');
    }

    if (profile.personalQrCode && !forceRegenerate) {
      return { personalQrCode: profile.personalQrCode };
    }

    const qrData = crypto.randomBytes(16).toString('hex');
    const personalQrCode = `bqe:profile:${qrData}`;

    await this.prisma.profile.update({
      where: { userId },
      data: { personalQrCode },
    });

    return { personalQrCode };
  }
}
