import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminService } from '../admin.service';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../../database/prisma.service';
import { UserRole, ReportStatus, ReportReason } from '@prisma/client';

const mockAuditService = {
  log: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  contentReport: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  adminAuditLog: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  delivery: {
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  emergency: {
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  businessProfile: {
    count: jest.fn(),
  },
  landmark: {
    count: jest.fn(),
  },
};

const mockUser = {
  id: 'user-1',
  email: 'test@test.com',
  phone: '+243000000000',
  role: UserRole.INDIVIDUAL,
  isActive: true,
  passwordHash: 'hash',
  refreshToken: null,
  emailVerifiedAt: null,
  phoneVerifiedAt: null,
  verificationCode: null,
  verificationCodeExpiresAt: null,
  resetPasswordToken: null,
  resetPasswordExpiresAt: null,
  googleId: null,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockReport = {
  id: 'report-1',
  reporterId: 'user-1',
  entityType: 'landmark',
  entityId: 'landmark-1',
  reason: ReportReason.SPAM,
  description: 'Spam content',
  status: ReportStatus.PENDING,
  reviewedById: null,
  reviewedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();
    service = module.get<AdminService>(AdminService);
  });

  describe('findAllUsers', () => {
    it('should return paginated users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.findAllUsers({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('should filter by role', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.findAllUsers({ role: UserRole.ADMIN, page: 1, limit: 20 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: UserRole.ADMIN }),
        }),
      );
    });

    it('should search by email using contains insensitive', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.findAllUsers({ search: 'test@', page: 1, limit: 20 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                email: expect.objectContaining({ contains: 'test@', mode: 'insensitive' }),
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('findUser', () => {
    it('should return user with profile and counts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findUser('user-1');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          include: expect.objectContaining({
            profile: true,
            _count: expect.objectContaining({
              select: expect.objectContaining({ addresses: true, landmarks: true }),
            }),
          }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findUser('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('changeRole', () => {
    it('should change user role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, role: UserRole.ADMIN });
      mockPrisma.adminAuditLog.create.mockResolvedValue({});

      const result = await service.changeRole('user-1', { role: UserRole.ADMIN }, 'admin-1');

      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changeRole('nonexistent', { role: UserRole.ADMIN }, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if demoting the last ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, role: UserRole.ADMIN });
      mockPrisma.user.count.mockResolvedValue(1);

      await expect(
        service.changeRole('user-1', { role: UserRole.INDIVIDUAL }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('toggleStatus', () => {
    it('should activate user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, isActive: false });
      mockPrisma.adminAuditLog.create.mockResolvedValue({});

      await service.toggleStatus('user-1', { isActive: false }, 'admin-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.toggleStatus('nonexistent', { isActive: false }, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createReport', () => {
    it('should create a report', async () => {
      mockPrisma.contentReport.create.mockResolvedValue(mockReport);

      const result = await service.createReport(
        { entityType: 'landmark', entityId: 'landmark-1', reason: ReportReason.SPAM },
        'user-1',
      );

      expect(result).toEqual(mockReport);
      expect(mockPrisma.contentReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reporterId: 'user-1',
            entityType: 'landmark',
            entityId: 'landmark-1',
          }),
        }),
      );
    });
  });

  describe('findAllReports', () => {
    it('should return paginated reports', async () => {
      mockPrisma.contentReport.findMany.mockResolvedValue([mockReport]);
      mockPrisma.contentReport.count.mockResolvedValue(1);

      const result = await service.findAllReports({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrisma.contentReport.findMany.mockResolvedValue([]);
      mockPrisma.contentReport.count.mockResolvedValue(0);

      await service.findAllReports({ status: ReportStatus.PENDING, page: 1, limit: 20 });

      expect(mockPrisma.contentReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: ReportStatus.PENDING }),
        }),
      );
    });
  });

  describe('findReport', () => {
    it('should return report with includes', async () => {
      mockPrisma.contentReport.findUnique.mockResolvedValue(mockReport);

      const result = await service.findReport('report-1');

      expect(result).toEqual(mockReport);
      expect(mockPrisma.contentReport.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'report-1' },
          include: expect.objectContaining({ reporter: true, reviewedBy: true }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent report', async () => {
      mockPrisma.contentReport.findUnique.mockResolvedValue(null);

      await expect(service.findReport('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reviewReport', () => {
    it('should mark report as REVIEWED', async () => {
      mockPrisma.contentReport.findUnique.mockResolvedValue(mockReport);
      mockPrisma.contentReport.update.mockResolvedValue({
        ...mockReport,
        status: ReportStatus.REVIEWED,
        reviewedById: 'admin-1',
        reviewedAt: new Date(),
      });
      mockPrisma.adminAuditLog.create.mockResolvedValue({});

      const result = await service.reviewReport(
        'report-1',
        { status: ReportStatus.REVIEWED },
        'admin-1',
      );

      expect(result.status).toBe(ReportStatus.REVIEWED);
    });

    it('should throw BadRequestException if already reviewed', async () => {
      mockPrisma.contentReport.findUnique.mockResolvedValue({
        ...mockReport,
        status: ReportStatus.REVIEWED,
      });

      await expect(
        service.reviewReport('report-1', { status: ReportStatus.DISMISSED }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent report', async () => {
      mockPrisma.contentReport.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewReport('nonexistent', { status: ReportStatus.REVIEWED }, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('should return all dashboard metrics', async () => {
      mockPrisma.user.count.mockResolvedValueOnce(100);
      mockPrisma.user.count.mockResolvedValueOnce(50);
      mockPrisma.user.count.mockResolvedValueOnce(30);
      mockPrisma.user.count.mockResolvedValueOnce(15);
      mockPrisma.user.count.mockResolvedValueOnce(5);
      mockPrisma.delivery.count.mockResolvedValue(50);
      mockPrisma.delivery.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: 10 },
        { status: 'DELIVERED', _count: 40 },
      ]);
      mockPrisma.emergency.count.mockResolvedValue(20);
      mockPrisma.emergency.groupBy.mockResolvedValue([
        { status: 'REPORTED', _count: 5 },
        { status: 'RESOLVED', _count: 15 },
      ]);
      mockPrisma.businessProfile.count.mockResolvedValueOnce(30);
      mockPrisma.businessProfile.count.mockResolvedValueOnce(20);
      mockPrisma.landmark.count.mockResolvedValueOnce(120);
      mockPrisma.landmark.count.mockResolvedValueOnce(80);
      mockPrisma.contentReport.count.mockResolvedValueOnce(8);
      mockPrisma.contentReport.count.mockResolvedValueOnce(15);
      mockPrisma.contentReport.count.mockResolvedValueOnce(3);

      const stats = await service.getStats();

      expect(stats.users.total).toBe(100);
      expect(stats.deliveries.total).toBe(50);
      expect(stats.emergencies.total).toBe(20);
      expect(stats.businesses.total).toBe(30);
      expect(stats.businesses.verified).toBe(20);
      expect(stats.landmarks.total).toBe(120);
      expect(stats.landmarks.verified).toBe(80);
      expect(stats.reports.pending).toBe(8);
    });
  });

  describe('findAllAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      const mockLog = {
        id: 'log-1',
        adminId: 'admin-1',
        action: 'USER_ROLE_CHANGE',
        targetType: 'User',
        targetId: 'user-1',
        metadata: null,
        createdAt: new Date(),
        admin: { id: 'admin-1', email: 'admin@test.com' },
      };
      mockAuditService.findAll.mockResolvedValue({ data: [mockLog], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } });

      const result = await service.findAllAuditLogs({});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findAuditLog', () => {
    it('should return audit log detail', async () => {
      const mockLog = {
        id: 'log-1',
        adminId: 'admin-1',
        action: 'USER_ROLE_CHANGE',
        targetType: 'User',
        targetId: 'user-1',
        metadata: null,
        createdAt: new Date(),
        admin: { id: 'admin-1', email: 'admin@test.com' },
      };
      mockAuditService.findOne.mockResolvedValue(mockLog);

      const result = await service.findAuditLog('log-1');

      expect(result).toEqual(mockLog);
    });

    it('should throw NotFoundException for non-existent log', async () => {
      mockAuditService.findOne.mockResolvedValue(null);

      await expect(service.findAuditLog('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
