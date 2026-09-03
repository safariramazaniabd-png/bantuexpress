import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import { NotificationsGateway } from '../notifications.gateway';
import { PrismaService } from '../../../database/prisma.service';

const mockPrisma = {
  notification: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
};

const mockGateway = {
  sendToUser: jest.fn(),
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsGateway, useValue: mockGateway },
      ],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
  });

  const mockNotification = {
    id: 'notif-1',
    userId: 'user-1',
    type: 'info',
    title: 'Welcome',
    body: 'Hello!',
    data: null,
    readAt: null,
    createdAt: new Date(),
  };

  const mockReadNotification = { ...mockNotification, readAt: new Date() };

  describe('findAll', () => {
    it('should return paginated notifications with unread count', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([mockNotification]);
      mockPrisma.notification.count.mockResolvedValueOnce(1);
      mockPrisma.notification.count.mockResolvedValueOnce(1);

      const result = await service.findAll('user-1');
      expect(result.data).toHaveLength(1);
      expect(result.meta.unreadCount).toBe(1);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);
      mockPrisma.notification.update.mockResolvedValue(mockReadNotification);

      const result = await service.markAsRead('user-1', 'notif-1');
      expect(result.readAt).toBeTruthy();
    });

    it('should throw if not found', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);
      await expect(service.markAsRead('user-1', 'notif-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });
      const result = await service.markAllAsRead('user-1');
      expect(result.message).toBeDefined();
    });
  });

  describe('create', () => {
    it('should create a notification', async () => {
      mockPrisma.notification.create.mockResolvedValue(mockNotification);
      const result = await service.create({
        userId: 'user-1',
        type: 'info',
        title: 'Welcome',
        body: 'Hello!',
      });
      expect(result.id).toBe('notif-1');
    });
  });

  describe('remove', () => {
    it('should delete notification', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(mockNotification);
      await service.remove('user-1', 'notif-1');
      expect(mockPrisma.notification.delete).toHaveBeenCalled();
    });
  });

  describe('clearAll', () => {
    it('should delete all user notifications', async () => {
      mockPrisma.notification.deleteMany.mockResolvedValue({ count: 3 });
      const result = await service.clearAll('user-1');
      expect(result.message).toBeDefined();
    });
  });
});
