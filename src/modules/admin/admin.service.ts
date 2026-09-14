import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { ToggleUserStatusDto } from './dto/toggle-user-status.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReviewReportDto } from './dto/review-report.dto';
import { StatsDto } from './dto/stats.dto';
import { ReportStatus, UserRole } from '@prisma/client';

const SENSITIVE_USER_FIELDS = [
  'passwordHash',
  'refreshToken',
  'refreshTokenJti',
  'verificationCode',
  'resetPasswordToken',
  'twoFactorSecret',
];

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private sanitizeUser<T extends object>(user: T): T {
    const copy = { ...(user as Record<string, unknown>) };
    for (const field of SENSITIVE_USER_FIELDS) {
      delete copy[field];
    }
    return copy as T;
  }

  async findAllUsers(query: AdminUserQueryDto) {
    const { search, role, isActive, page = 1, limit = 20 } = query;
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { profile: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: data.map((user) => this.sanitizeUser(user)), meta: { total, page, limit } };
  }

  async findUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        _count: { select: { addresses: true, landmarks: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.sanitizeUser(user);
  }

  async changeRole(id: string, dto: ChangeRoleDto, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === UserRole.ADMIN && dto.role !== UserRole.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: { role: UserRole.ADMIN },
      });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot demote the last ADMIN user');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
    });

    await this.auditService.log(adminId, 'USER_ROLE_CHANGE', 'User', id, {
      from: user.role,
      to: dto.role,
    });

    return this.sanitizeUser(updated);
  }

  async toggleStatus(id: string, dto: ToggleUserStatusDto, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: dto.isActive },
    });

    await this.auditService.log(
      adminId,
      dto.isActive ? 'USER_ACTIVATE' : 'USER_DEACTIVATE',
      'User',
      id,
    );

    return this.sanitizeUser(updated);
  }

  async createReport(dto: CreateReportDto, reporterId: string) {
    return this.prisma.contentReport.create({
      data: {
        reporterId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        reason: dto.reason,
        description: dto.description,
      },
    });
  }

  async findAllReports(query: ReportQueryDto) {
    const { status, entityType, page = 1, limit = 20 } = query;
    const where: any = {};

    if (status) where.status = status;
    if (entityType) where.entityType = entityType;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.contentReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { reporter: true, reviewedBy: true },
      }),
      this.prisma.contentReport.count({ where }),
    ]);

    const sanitized = data.map((report) => ({
      ...report,
      reporter: this.sanitizeUser(report.reporter),
      reviewedBy: report.reviewedBy ? this.sanitizeUser(report.reviewedBy) : report.reviewedBy,
    }));

    return { data: sanitized, meta: { total, page, limit } };
  }

  async findReport(id: string) {
    const report = await this.prisma.contentReport.findUnique({
      where: { id },
      include: { reporter: true, reviewedBy: true },
    });
    if (!report) throw new NotFoundException('Report not found');
    return {
      ...report,
      reporter: this.sanitizeUser(report.reporter),
      reviewedBy: report.reviewedBy ? this.sanitizeUser(report.reviewedBy) : report.reviewedBy,
    };
  }

  async reviewReport(id: string, dto: ReviewReportDto, adminId: string) {
    const report = await this.prisma.contentReport.findUnique({
      where: { id },
    });
    if (!report) throw new NotFoundException('Report not found');
    if (report.status !== ReportStatus.PENDING) {
      throw new BadRequestException('Report already reviewed');
    }

    const updated = await this.prisma.contentReport.update({
      where: { id },
      data: {
        status: dto.status,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });

    await this.auditService.log(adminId, 'REPORT_REVIEW', 'ContentReport', id, {
      status: dto.status,
      notes: dto.notes,
    });

    return updated;
  }

  async getStats(_dto?: StatsDto) {
    const [
      totalUsers,
      usersByRole,
      totalDeliveries,
      deliveriesByStatus,
      totalEmergencies,
      emergenciesByStatus,
      totalBusinesses,
      verifiedBusinesses,
      totalLandmarks,
      verifiedLandmarks,
      reportsPending,
      reportsReviewed,
      reportsDismissed,
    ] = await Promise.all([
      this.prisma.user.count(),
      Promise.all(
        Object.values(UserRole).map((role) =>
          this.prisma.user.count({ where: { role } }).then((count) => ({ role, count })),
        ),
      ),
      this.prisma.delivery.count(),
      this.prisma.delivery
        .groupBy({ by: ['status'], _count: true })
        .then((rows) =>
          rows.reduce(
            (acc, r) => ({ ...acc, [r.status]: r._count }),
            {} as Record<string, number>,
          ),
        ),
      this.prisma.emergency.count(),
      this.prisma.emergency
        .groupBy({ by: ['status'], _count: true })
        .then((rows) =>
          rows.reduce(
            (acc, r) => ({ ...acc, [r.status]: r._count }),
            {} as Record<string, number>,
          ),
        ),
      this.prisma.businessProfile.count(),
      this.prisma.businessProfile.count({ where: { isVerified: true } }),
      this.prisma.landmark.count(),
      this.prisma.landmark.count({ where: { verifiedAt: { not: null } } }),
      this.prisma.contentReport.count({ where: { status: 'PENDING' } }),
      this.prisma.contentReport.count({ where: { status: 'REVIEWED' } }),
      this.prisma.contentReport.count({ where: { status: 'DISMISSED' } }),
    ]);

    return {
      users: {
        total: totalUsers,
        byRole: Object.fromEntries(usersByRole.map((r) => [r.role, r.count])),
      },
      deliveries: {
        total: totalDeliveries,
        byStatus: deliveriesByStatus,
      },
      emergencies: {
        total: totalEmergencies,
        byStatus: emergenciesByStatus,
      },
      businesses: {
        total: totalBusinesses,
        verified: verifiedBusinesses,
        unverified: totalBusinesses - verifiedBusinesses,
      },
      landmarks: {
        total: totalLandmarks,
        verified: verifiedLandmarks,
        unverified: totalLandmarks - verifiedLandmarks,
      },
      reports: {
        pending: reportsPending,
        reviewed: reportsReviewed,
        dismissed: reportsDismissed,
      },
    };
  }

  async findAllAuditLogs(query: { action?: string; page?: number; limit?: number }) {
    return this.auditService.findAll(query);
  }

  async findAuditLog(id: string) {
    const log = await this.auditService.findOne(id);
    if (!log) throw new NotFoundException('Audit log not found');
    return log;
  }
}
