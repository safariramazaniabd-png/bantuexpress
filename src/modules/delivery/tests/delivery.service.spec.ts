import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DeliveryStatus, PackageSize } from '@prisma/client';
import { DeliveryService } from '../delivery.service';
import { PrismaService } from '../../../database/prisma.service';

const mockPrisma = {
  delivery: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  deliveryTracking: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

describe('DeliveryService', () => {
  let service: DeliveryService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DeliveryService>(DeliveryService);
  });

  const mockDelivery = {
    id: 'del-1',
    clientId: 'client-1',
    courierId: null,
    status: DeliveryStatus.PENDING,
    packageSize: PackageSize.MEDIUM,
    description: 'Documents importants',
    pickupAddress: '123 Rue A, Gombe',
    pickupLat: -4.3182,
    pickupLng: 15.3112,
    dropoffAddress: '456 Rue B, Limete',
    dropoffLat: -4.35,
    dropoffLng: 15.34,
    distanceKm: 4.5,
    price: 8.6,
    pickedUpAt: null,
    deliveredAt: null,
    cancelledAt: null,
    cancelledReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('create', () => {
    it('should create a delivery with calculated price and distance', async () => {
      mockPrisma.delivery.create.mockResolvedValue(mockDelivery);

      const result = await service.create('client-1', {
        pickupAddress: '123 Rue A, Gombe',
        pickupLat: -4.3182,
        pickupLng: 15.3112,
        dropoffAddress: '456 Rue B, Limete',
        dropoffLat: -4.35,
        dropoffLng: 15.34,
      });

      expect(result.status).toBe(DeliveryStatus.PENDING);
      expect(result.distanceKm).toBeDefined();
      expect(result.price).toBeDefined();
      expect(mockPrisma.delivery.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clientId: 'client-1' }),
        }),
      );
    });

    it('should calculate correct price based on distance and package size', async () => {
      mockPrisma.delivery.create.mockResolvedValue(mockDelivery);

      const result = await service.create('client-1', {
        pickupAddress: 'A',
        pickupLat: 0,
        pickupLng: 0,
        dropoffAddress: 'B',
        dropoffLat: 0.01,
        dropoffLng: 0.01,
        packageSize: PackageSize.SMALL,
      });

      expect(result.distanceKm).toBeDefined();
      expect(result.price).toBeDefined();
    });
  });

  describe('findMyDeliveries', () => {
    it('should return client deliveries', async () => {
      mockPrisma.delivery.findMany.mockResolvedValue([mockDelivery]);
      mockPrisma.delivery.count.mockResolvedValue(1);

      const result = await service.findMyDeliveries('client-1', 'client', {});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should return courier deliveries', async () => {
      mockPrisma.delivery.findMany.mockResolvedValue([]);
      mockPrisma.delivery.count.mockResolvedValue(0);

      await service.findMyDeliveries('courier-1', 'courier', {});

      expect(mockPrisma.delivery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ courierId: 'courier-1' }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrisma.delivery.findMany.mockResolvedValue([]);
      mockPrisma.delivery.count.mockResolvedValue(0);

      await service.findMyDeliveries('client-1', 'client', {
        status: DeliveryStatus.DELIVERED,
      });

      expect(mockPrisma.delivery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: DeliveryStatus.DELIVERED }),
        }),
      );
    });
  });

  describe('findAvailable', () => {
    it('should return only PENDING deliveries', async () => {
      mockPrisma.delivery.findMany.mockResolvedValue([mockDelivery]);
      mockPrisma.delivery.count.mockResolvedValue(1);

      const result = await service.findAvailable({});

      expect(result.data).toHaveLength(1);
      expect(mockPrisma.delivery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: DeliveryStatus.PENDING },
        }),
      );
    });

    it('should not expose clientId to couriers', async () => {
      const publicDelivery = {
        id: 'del-1',
        status: 'PENDING',
        packageSize: 'MEDIUM',
        description: 'Documents',
        pickupAddress: 'A',
        dropoffLat: 1,
        createdAt: new Date(),
      };
      mockPrisma.delivery.findMany.mockResolvedValue([publicDelivery]);
      mockPrisma.delivery.count.mockResolvedValue(1);

      const result = await service.findAvailable({});

      expect(result.data[0]).not.toHaveProperty('clientId');
      expect(mockPrisma.delivery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.not.objectContaining({ clientId: expect.anything() }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return delivery for client', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        ...mockDelivery,
        client: { id: 'client-1' },
        courier: null,
      });

      const result = await service.findOne('del-1', 'client-1');

      expect(result.id).toBe('del-1');
    });

    it('should throw if not involved', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        ...mockDelivery,
        client: { id: 'client-1' },
        courier: null,
      });

      await expect(service.findOne('del-1', 'stranger')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if not found', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(null);

      await expect(service.findOne('del-1', 'client-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a pending delivery atomically', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValueOnce(mockDelivery);
      const cancelled = {
        ...mockDelivery,
        status: DeliveryStatus.CANCELLED,
        cancelledAt: new Date(),
      };
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.delivery.findUnique.mockResolvedValue(cancelled);

      const result = (await service.cancel('del-1', 'client-1'))!;

      expect(result.status).toBe(DeliveryStatus.CANCELLED);
      expect(mockPrisma.delivery.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'del-1', status: DeliveryStatus.PENDING },
          data: expect.objectContaining({ status: DeliveryStatus.CANCELLED }),
        }),
      );
    });

    it('should throw if not the client', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);

      await expect(service.cancel('del-1', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw if not PENDING', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        ...mockDelivery,
        status: DeliveryStatus.ASSIGNED,
      });
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.cancel('del-1', 'client-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequest when the atomic update matches no row (race)', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.cancel('del-1', 'client-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('accept', () => {
    it('should accept a pending delivery atomically', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValueOnce(mockDelivery);
      mockPrisma.delivery.count.mockResolvedValue(0);
      const assigned = {
        ...mockDelivery,
        courierId: 'courier-1',
        status: DeliveryStatus.ASSIGNED,
      };
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.delivery.findUnique.mockResolvedValue(assigned);

      const result = (await service.accept('del-1', 'courier-1'))!;

      expect(result.status).toBe(DeliveryStatus.ASSIGNED);
      expect(result.courierId).toBe('courier-1');
      expect(mockPrisma.delivery.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'del-1', status: DeliveryStatus.PENDING },
          data: expect.objectContaining({ courierId: 'courier-1' }),
        }),
      );
    });

    it('should throw if accepting own delivery', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);

      await expect(service.accept('del-1', 'client-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw if not PENDING', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        ...mockDelivery,
        status: DeliveryStatus.ASSIGNED,
      });

      await expect(service.accept('del-1', 'courier-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if courier has active deliveries', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      mockPrisma.delivery.count.mockResolvedValue(1);

      await expect(service.accept('del-1', 'courier-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequest when the atomic update matches no row (two couriers competing)', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue(mockDelivery);
      mockPrisma.delivery.count.mockResolvedValue(0);
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.accept('del-1', 'courier-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('markPickedUp', () => {
    it('should mark as picked up atomically', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValueOnce({
        ...mockDelivery,
        courierId: 'courier-1',
        status: DeliveryStatus.ASSIGNED,
      });
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.delivery.findUnique.mockResolvedValue({
        ...mockDelivery,
        status: DeliveryStatus.PICKED_UP,
        pickedUpAt: new Date(),
      });

      const result = (await service.markPickedUp('del-1', 'courier-1'))!;

      expect(result.status).toBe(DeliveryStatus.PICKED_UP);
      expect(mockPrisma.delivery.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'del-1', courierId: 'courier-1', status: DeliveryStatus.ASSIGNED },
        }),
      );
    });

    it('should throw if not assigned to courier', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        ...mockDelivery,
        courierId: 'courier-2',
        status: DeliveryStatus.ASSIGNED,
      });

      await expect(
        service.markPickedUp('del-1', 'courier-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if not ASSIGNED', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        ...mockDelivery,
        courierId: 'courier-1',
        status: DeliveryStatus.PENDING,
      });

      await expect(
        service.markPickedUp('del-1', 'courier-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markDelivered', () => {
    it('should mark as delivered atomically', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValueOnce({
        ...mockDelivery,
        courierId: 'courier-1',
        status: DeliveryStatus.PICKED_UP,
      });
      mockPrisma.delivery.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.delivery.findUnique.mockResolvedValue({
        ...mockDelivery,
        status: DeliveryStatus.DELIVERED,
        deliveredAt: new Date(),
      });

      const result = (await service.markDelivered('del-1', 'courier-1'))!;

      expect(result.status).toBe(DeliveryStatus.DELIVERED);
      expect(mockPrisma.delivery.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'del-1', courierId: 'courier-1', status: DeliveryStatus.PICKED_UP },
        }),
      );
    });

    it('should throw if not PICKED_UP', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        ...mockDelivery,
        courierId: 'courier-1',
        status: DeliveryStatus.ASSIGNED,
      });

      await expect(
        service.markDelivered('del-1', 'courier-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('addTrackingPoint', () => {
    it('should add tracking point', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        ...mockDelivery,
        courierId: 'courier-1',
        status: DeliveryStatus.IN_TRANSIT,
      });
      mockPrisma.deliveryTracking.create.mockResolvedValue({
        id: 'track-1',
        deliveryId: 'del-1',
        latitude: -4.33,
        longitude: 15.32,
        recordedAt: new Date(),
      });

      const result = await service.addTrackingPoint('del-1', 'courier-1', {
        latitude: -4.33,
        longitude: 15.32,
      });

      expect(result.latitude).toBe(-4.33);
    });

    it('should throw if delivery is PENDING', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        ...mockDelivery,
        courierId: 'courier-1',
        status: DeliveryStatus.PENDING,
      });

      await expect(
        service.addTrackingPoint('del-1', 'courier-1', {
          latitude: -4.33,
          longitude: 15.32,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTrackingHistory', () => {
    it('should return tracking history', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        ...mockDelivery,
        client: { id: 'client-1' },
        courier: null,
      });
      mockPrisma.deliveryTracking.findMany.mockResolvedValue([
        { id: 't-1', deliveryId: 'del-1', latitude: -4.33, longitude: 15.32, recordedAt: new Date() },
      ]);

      const result = await service.getTrackingHistory('del-1', 'client-1');

      expect(result).toHaveLength(1);
    });

    it('should throw if not involved', async () => {
      mockPrisma.delivery.findUnique.mockResolvedValue({
        ...mockDelivery,
        client: { id: 'client-1' },
        courier: null,
      });

      await expect(
        service.getTrackingHistory('del-1', 'stranger'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});