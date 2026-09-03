import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { EventsService } from '../events.service';
import { PrismaService } from '../../../database/prisma.service';

const mockPrisma = {
  event: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

describe('EventsService', () => {
  let service: EventsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<EventsService>(EventsService);
  });

  const mockEvent = {
    id: 'evt-1',
    organizerId: 'user-1',
    name: 'Conference',
    description: 'Tech conference',
    address: 'Kin Plaza',
    latitude: null,
    longitude: null,
    qrCode: null,
    startDate: new Date('2026-08-01'),
    endDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('create', () => {
    it('should create an event', async () => {
      mockPrisma.event.create.mockResolvedValue(mockEvent);
      const result = await service.create('user-1', {
        name: 'Conference',
        startDate: '2026-08-01T00:00:00Z',
      });
      expect(result.id).toBe('evt-1');
    });
  });

  describe('findAll', () => {
    it('should return upcoming events', async () => {
      mockPrisma.event.findMany.mockResolvedValue([mockEvent]);
      mockPrisma.event.count.mockResolvedValue(1);
      const result = await service.findAll();
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findMine', () => {
    it('should return user events', async () => {
      mockPrisma.event.findMany.mockResolvedValue([mockEvent]);
      const result = await service.findMine('user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return event by id', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      const result = await service.findOne('evt-1');
      expect(result.id).toBe('evt-1');
    });

    it('should throw if not found', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);
      await expect(service.findOne('evt-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update own event', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.event.update.mockResolvedValue({ ...mockEvent, name: 'Updated' });
      const result = await service.update('evt-1', 'user-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should throw if not owner', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      await expect(service.update('evt-1', 'user-2', { name: 'x' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete own event', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      await service.remove('evt-1', 'user-1');
      expect(mockPrisma.event.delete).toHaveBeenCalledWith({ where: { id: 'evt-1' } });
    });

    it('should throw if not owner', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      await expect(service.remove('evt-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });
  });
});
