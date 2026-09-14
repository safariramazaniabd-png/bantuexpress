import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEmergencyDto } from './dto/create-emergency.dto';
import { EmergencyQueryDto } from './dto/emergency-query.dto';
import { ResolveEmergencyDto } from './dto/resolve-emergency.dto';
import { EmergencyType, EmergencySeverity, EmergencyStatus } from '@prisma/client';

@Injectable()
export class EmergencyService {
  constructor(private readonly prisma: PrismaService) {}

  private determineSeverity(type: EmergencyType): EmergencySeverity {
    const map: Record<EmergencyType, EmergencySeverity> = {
      [EmergencyType.POLICE]: EmergencySeverity.HIGH,
      [EmergencyType.FIRE]: EmergencySeverity.CRITICAL,
      [EmergencyType.MEDICAL]: EmergencySeverity.CRITICAL,
      [EmergencyType.ACCIDENT]: EmergencySeverity.HIGH,
      [EmergencyType.NATURAL_DISASTER]: EmergencySeverity.CRITICAL,
      [EmergencyType.OTHER]: EmergencySeverity.LOW,
    };
    return map[type] ?? EmergencySeverity.MEDIUM;
  }

  async create(reporterId: string, dto: CreateEmergencyDto) {
    const type = dto.type ?? EmergencyType.OTHER;
    const severity = this.determineSeverity(type);

    return this.prisma.emergency.create({
      data: {
        reporterId,
        type,
        severity,
        description: dto.description,
        latitude: dto.latitude,
        longitude: dto.longitude,
        address: dto.address,
        status: EmergencyStatus.REPORTED,
      },
    });
  }

  async findMyReports(reporterId: string, query: EmergencyQueryDto) {
    const { type, status, page = 1, limit = 20 } = query;

    const where: any = { reporterId };
    if (type) where.type = type;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.emergency.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.emergency.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findMyInterventions(responderId: string, query: EmergencyQueryDto) {
    const { type, status, page = 1, limit = 20 } = query;

    const where: any = { responderId };
    if (type) where.type = type;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.emergency.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.emergency.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findActive(query: EmergencyQueryDto) {
    const { type, page = 1, limit = 20 } = query;

    const where: any = { status: EmergencyStatus.REPORTED };
    if (type) where.type = type;

    const [data, total] = await Promise.all([
      this.prisma.emergency.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'asc' },
        ],
      }),
      this.prisma.emergency.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findOne(id: string, userId: string, userRole: string) {
    const emergency = await this.prisma.emergency.findUnique({
      where: { id },
      include: {
        reporter: { select: { id: true } },
        responder: { select: { id: true } },
      },
    });

    if (!emergency) {
      throw new NotFoundException('Emergency not found');
    }

    const isReporter = emergency.reporterId === userId;
    const isResponder = emergency.responderId === userId;
    const isAdmin = userRole === 'ADMIN' || userRole === 'EMERGENCY';

    if (!isReporter && !isResponder && !isAdmin) {
      throw new NotFoundException('Emergency not found');
    }

    return emergency;
  }

  async assign(id: string, responderId: string) {
    const emergency = await this.prisma.emergency.findUnique({
      where: { id },
    });

    if (!emergency) {
      throw new NotFoundException('Emergency not found');
    }

    if (emergency.reporterId === responderId) {
      throw new ForbiddenException('Cannot respond to your own report');
    }

    const now = new Date();
    const responseTimeMin = Math.round(
      (now.getTime() - emergency.createdAt.getTime()) / 60_000,
    );

    const result = await this.prisma.emergency.updateMany({
      where: { id, status: EmergencyStatus.REPORTED },
      data: {
        responderId,
        status: EmergencyStatus.ASSIGNED,
        responseTimeMin,
      },
    });

    if (result.count !== 1) {
      throw new BadRequestException('Emergency is no longer available');
    }

    return this.prisma.emergency.findUnique({ where: { id } });
  }

  async startIntervention(id: string, responderId: string) {
    const emergency = await this.prisma.emergency.findUnique({
      where: { id },
    });

    if (!emergency) {
      throw new NotFoundException('Emergency not found');
    }

    if (emergency.responderId !== responderId) {
      throw new ForbiddenException('Not your assigned emergency');
    }

    if (emergency.status !== EmergencyStatus.ASSIGNED) {
      throw new BadRequestException('Emergency must be assigned first');
    }

    return this.prisma.emergency.update({
      where: { id },
      data: { status: EmergencyStatus.IN_PROGRESS },
    });
  }

  async resolve(id: string, responderId: string, dto: ResolveEmergencyDto) {
    const emergency = await this.prisma.emergency.findUnique({
      where: { id },
    });

    if (!emergency) {
      throw new NotFoundException('Emergency not found');
    }

    if (emergency.responderId !== responderId) {
      throw new ForbiddenException('Not your assigned emergency');
    }

    if (emergency.status !== EmergencyStatus.IN_PROGRESS) {
      throw new BadRequestException('Emergency must be in progress first');
    }

    return this.prisma.emergency.update({
      where: { id },
      data: {
        status: EmergencyStatus.RESOLVED,
        resolvedNotes: dto.resolvedNotes,
        resolvedAt: new Date(),
      },
    });
  }

  async cancel(id: string, reporterId: string) {
    const emergency = await this.prisma.emergency.findUnique({
      where: { id },
    });

    if (!emergency) {
      throw new NotFoundException('Emergency not found');
    }

    if (emergency.reporterId !== reporterId) {
      throw new ForbiddenException('Only the reporter can cancel');
    }

    if (emergency.status !== EmergencyStatus.REPORTED) {
      throw new BadRequestException('Can only cancel reported emergencies');
    }

    return this.prisma.emergency.update({
      where: { id },
      data: {
        status: EmergencyStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });
  }
}
