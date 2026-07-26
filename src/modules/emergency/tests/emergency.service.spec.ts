import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EmergencyType, EmergencySeverity, EmergencyStatus } from '@prisma/client';
import { EmergencyService } from '../emergency.service';
import { PrismaService } from '../../../database/prisma.service';

const mockPrisma = {
  emergency: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

describe('EmergencyService', () => {
  let service: EmergencyService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmergencyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EmergencyService>(EmergencyService);
  });

  const mockEmergency = {
    id: 'emerg-1',
    reporterId: 'user-1',
    responderId: null,
    type: EmergencyType.POLICE,
    severity: EmergencySeverity.HIGH,
    status: EmergencyStatus.REPORTED,
    description: 'Vol à main armée',
    latitude: -4.3182,
    longitude: 15.3112,
    address: 'Avenue du Commerce, Gombe',
    resolvedNotes: null,
    responseTimeMin: null,
    resolvedAt: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('create', () => {
    it('should create an emergency with auto severity', async () => {
      mockPrisma.emergency.create.mockResolvedValue(mockEmergency);

      const result = await service.create('user-1', {
        type: EmergencyType.POLICE,
        description: 'Vol à main armée',
        latitude: -4.3182,
        longitude: 15.3112,
      });

      expect(result.type).toBe(EmergencyType.POLICE);
      expect(result.severity).toBe(EmergencySeverity.HIGH);
      expect(mockPrisma.emergency.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reporterId: 'user-1',
            status: EmergencyStatus.REPORTED,
          }),
        }),
      );
    });

    it('should set CRITICAL severity for MEDICAL', async () => {
      mockPrisma.emergency.create.mockResolvedValue({
        ...mockEmergency,
        type: EmergencyType.MEDICAL,
        severity: EmergencySeverity.CRITICAL,
      });

      const result = await service.create('user-1', {
        type: EmergencyType.MEDICAL,
        latitude: -4.3,
        longitude: 15.3,
      });

      expect(result.severity).toBe(EmergencySeverity.CRITICAL);
    });
  });

  describe('findMyReports', () => {
    it('should return reporter emergencies', async () => {
      mockPrisma.emergency.findMany.mockResolvedValue([mockEmergency]);
      mockPrisma.emergency.count.mockResolvedValue(1);

      const result = await service.findMyReports('user-1', {});

      expect(result.data).toHaveLength(1);
      expect(mockPrisma.emergency.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ reporterId: 'user-1' }),
        }),
      );
    });

    it('should filter by type', async () => {
      mockPrisma.emergency.findMany.mockResolvedValue([]);
      mockPrisma.emergency.count.mockResolvedValue(0);

      await service.findMyReports('user-1', { type: EmergencyType.FIRE });

      expect(mockPrisma.emergency.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: EmergencyType.FIRE }),
        }),
      );
    });
  });

  describe('findMyInterventions', () => {
    it('should return responder emergencies', async () => {
      mockPrisma.emergency.findMany.mockResolvedValue([]);
      mockPrisma.emergency.count.mockResolvedValue(0);

      await service.findMyInterventions('responder-1', {});

      expect(mockPrisma.emergency.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ responderId: 'responder-1' }),
        }),
      );
    });
  });

  describe('findActive', () => {
    it('should return only REPORTED emergencies sorted by severity', async () => {
      mockPrisma.emergency.findMany.mockResolvedValue([mockEmergency]);
      mockPrisma.emergency.count.mockResolvedValue(1);

      const result = await service.findActive({});

      expect(result.data).toHaveLength(1);
      expect(mockPrisma.emergency.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: EmergencyStatus.REPORTED },
          orderBy: [{ severity: 'desc' }, { createdAt: 'asc' }],
        }),
      );
    });

    it('should filter by type', async () => {
      mockPrisma.emergency.findMany.mockResolvedValue([]);
      mockPrisma.emergency.count.mockResolvedValue(0);

      await service.findActive({ type: EmergencyType.FIRE });

      expect(mockPrisma.emergency.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: EmergencyStatus.REPORTED, type: EmergencyType.FIRE },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return emergency for reporter', async () => {
      mockPrisma.emergency.findUnique.mockResolvedValue({
        ...mockEmergency,
        reporter: { id: 'user-1' },
        responder: null,
      });

      const result = await service.findOne('emerg-1', 'user-1', 'INDIVIDUAL');

      expect(result.id).toBe('emerg-1');
    });

    it('should return emergency for admin', async () => {
      mockPrisma.emergency.findUnique.mockResolvedValue({
        ...mockEmergency,
        reporter: { id: 'user-1' },
        responder: null,
      });

      const result = await service.findOne('emerg-1', 'admin-1', 'ADMIN');

      expect(result.id).toBe('emerg-1');
    });

    it('should throw for unauthorized user', async () => {
      mockPrisma.emergency.findUnique.mockResolvedValue({
        ...mockEmergency,
        reporter: { id: 'user-1' },
        responder: null,
      });

      await expect(
        service.findOne('emerg-1', 'stranger', 'INDIVIDUAL'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if not found', async () => {
      mockPrisma.emergency.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('emerg-1', 'user-1', 'INDIVIDUAL'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assign', () => {
    it('should assign responder with response time', async () => {
      mockPrisma.emergency.findUnique.mockResolvedValue(mockEmergency);
      mockPrisma.emergency.update.mockResolvedValue({
        ...mockEmergency,
        responderId: 'responder-1',
        status: EmergencyStatus.ASSIGNED,
        responseTimeMin: 2,
      });

      const result = await service.assign('emerg-1', 'responder-1');

      expect(result.status).toBe(EmergencyStatus.ASSIGNED);
      expect(result.responderId).toBe('responder-1');
      expect(result.responseTimeMin).toBeDefined();
    });

    it('should throw if reporter is the responder', async () => {
      mockPrisma.emergency.findUnique.mockResolvedValue(mockEmergency);

      await expect(service.assign('emerg-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw if already assigned', async () => {
      mockPrisma.emergency.findUnique.mockResolvedValue({
        ...mockEmergency,
        status: EmergencyStatus.ASSIGNED,
      });

      await expect(service.assign('emerg-1', 'responder-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('startIntervention', () => {
    it('should start intervention', async () => {
      mockPrisma.emergency.findUnique.mockResolvedValue({
        ...mockEmergency,
        responderId: 'responder-1',
        status: EmergencyStatus.ASSIGNED,
      });
      mockPrisma.emergency.update.mockResolvedValue({
        ...mockEmergency,
        status: EmergencyStatus.IN_PROGRESS,
      });

      const result = await service.startIntervention('emerg-1', 'responder-1');

      expect(result.status).toBe(EmergencyStatus.IN_PROGRESS);
    });

    it('should throw if not assigned to this responder', async () => {
      mockPrisma.emergency.findUnique.mockResolvedValue({
        ...mockEmergency,
        responderId: 'other-responder',
        status: EmergencyStatus.ASSIGNED,
      });

      await expect(
        service.startIntervention('emerg-1', 'responder-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('resolve', () => {
    it('should resolve with notes', async () => {
      mockPrisma.emergency.findUnique.mockResolvedValue({
        ...mockEmergency,
        responderId: 'responder-1',
        status: EmergencyStatus.IN_PROGRESS,
      });
      mockPrisma.emergency.update.mockResolvedValue({
        ...mockEmergency,
        status: EmergencyStatus.RESOLVED,
        resolvedNotes: 'Intervention terminée',
        resolvedAt: new Date(),
      });

      const result = await service.resolve('emerg-1', 'responder-1', {
        resolvedNotes: 'Intervention terminée',
      });

      expect(result.status).toBe(EmergencyStatus.RESOLVED);
    });

    it('should throw if not IN_PROGRESS', async () => {
      mockPrisma.emergency.findUnique.mockResolvedValue({
        ...mockEmergency,
        responderId: 'responder-1',
        status: EmergencyStatus.ASSIGNED,
      });

      await expect(
        service.resolve('emerg-1', 'responder-1', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel a reported emergency', async () => {
      mockPrisma.emergency.findUnique.mockResolvedValue(mockEmergency);
      mockPrisma.emergency.update.mockResolvedValue({
        ...mockEmergency,
        status: EmergencyStatus.CANCELLED,
        cancelledAt: new Date(),
      });

      const result = await service.cancel('emerg-1', 'user-1');

      expect(result.status).toBe(EmergencyStatus.CANCELLED);
    });

    it('should throw if not the reporter', async () => {
      mockPrisma.emergency.findUnique.mockResolvedValue(mockEmergency);

      await expect(service.cancel('emerg-1', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw if not REPORTED', async () => {
      mockPrisma.emergency.findUnique.mockResolvedValue({
        ...mockEmergency,
        status: EmergencyStatus.ASSIGNED,
      });

      await expect(service.cancel('emerg-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
