import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LandmarkCategory } from '@prisma/client';
import { GeoService } from '../geo.service';
import { PrismaService } from '../../../database/prisma.service';

const mockPrisma = {
  userPosition: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  landmark: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  route: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

describe('GeoService', () => {
  let service: GeoService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeoService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<GeoService>(GeoService);
  });

  const mockPosition = {
    id: 'pos-1',
    userId: 'user-1',
    latitude: -4.3182,
    longitude: 15.3112,
    accuracy: 10,
    source: 'gps',
    recordedAt: new Date(),
    createdAt: new Date(),
  };

  const mockLandmark = {
    id: 'lm-1',
    name: 'Marché Central',
    category: LandmarkCategory.MARKET,
    latitude: -4.3182,
    longitude: 15.3112,
    isPublic: true,
    deletedAt: null,
  };

  describe('updatePosition', () => {
    it('should create a position record', async () => {
      mockPrisma.userPosition.create.mockResolvedValue(mockPosition);

      const result = await service.updatePosition('user-1', {
        latitude: -4.3182,
        longitude: 15.3112,
      });

      expect(result.latitude).toBe(-4.3182);
      expect(mockPrisma.userPosition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
    });

    it('should accept optional accuracy and source', async () => {
      mockPrisma.userPosition.create.mockResolvedValue({
        ...mockPosition,
        accuracy: 5,
        source: 'network',
      });

      const result = await service.updatePosition('user-1', {
        latitude: -4.3,
        longitude: 15.3,
        accuracy: 5,
        source: 'network',
      });

      expect(result.accuracy).toBe(5);
      expect(result.source).toBe('network');
    });
  });

  describe('getCurrentPosition', () => {
    it('should return latest position', async () => {
      mockPrisma.userPosition.findFirst.mockResolvedValue(mockPosition);

      const result = await service.getCurrentPosition('user-1');

      expect(result.latitude).toBe(-4.3182);
      expect(mockPrisma.userPosition.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          orderBy: { recordedAt: 'desc' },
        }),
      );
    });

    it('should throw if no position recorded', async () => {
      mockPrisma.userPosition.findFirst.mockResolvedValue(null);

      await expect(
        service.getCurrentPosition('user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPositionHistory', () => {
    it('should return paginated history', async () => {
      mockPrisma.userPosition.findMany.mockResolvedValue([mockPosition]);
      mockPrisma.userPosition.count.mockResolvedValue(1);

      const result = await service.getPositionHistory('user-1', {});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findNearby', () => {
    it('should use current position when coords not given', async () => {
      mockPrisma.userPosition.findFirst.mockResolvedValue(mockPosition);
      mockPrisma.userPosition.findMany.mockResolvedValue([]);
      mockPrisma.landmark.findMany.mockResolvedValue([]);

      const result = await service.findNearby('user-1', { type: 'all' });

      expect(mockPrisma.userPosition.findFirst).toHaveBeenCalled();
    });

    it('should find nearby users excluding self', async () => {
      mockPrisma.userPosition.findMany.mockResolvedValue([
        { userId: 'user-2', latitude: -4.31, longitude: 15.31 },
      ]);

      const result = await service.findNearby('user-1', {
        latitude: -4.3,
        longitude: 15.3,
        radius: 5000,
        type: 'users',
      });

      expect(result.users).toHaveLength(1);
      expect(result.users![0].userId).toBe('user-2');
      expect(result.users![0].distance).toBeDefined();
    });

    it('should find nearby landmarks', async () => {
      mockPrisma.userPosition.findMany.mockResolvedValue([]);
      mockPrisma.landmark.findMany.mockResolvedValue([mockLandmark]);

      const result = await service.findNearby('user-1', {
        latitude: -4.3,
        longitude: 15.3,
        radius: 5000,
        type: 'landmarks',
      });

      expect(result.landmarks).toHaveLength(1);
      expect(result.landmarks![0]).toHaveProperty('distance');
    });
  });

  describe('getMarkersInBounds', () => {
    it('should return markers within bounding box', async () => {
      mockPrisma.landmark.findMany.mockResolvedValue([mockLandmark]);

      const result = await service.getMarkersInBounds({
        swLat: -5,
        swLng: 14,
        neLat: -3,
        neLng: 16,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('latitude');
      expect(result[0]).toHaveProperty('longitude');
      expect(result[0]).not.toHaveProperty('description');
    });

    it('should filter by category', async () => {
      mockPrisma.landmark.findMany.mockResolvedValue([]);

      await service.getMarkersInBounds({
        swLat: -5,
        swLng: 14,
        neLat: -3,
        neLng: 16,
        category: LandmarkCategory.HOSPITAL,
      });

      expect(mockPrisma.landmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: LandmarkCategory.HOSPITAL,
          }),
        }),
      );
    });

    it('should limit results', async () => {
      mockPrisma.landmark.findMany.mockResolvedValue([]);

      await service.getMarkersInBounds({
        swLat: -5,
        swLng: 14,
        neLat: -3,
        neLng: 16,
        limit: 50,
      });

      expect(mockPrisma.landmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });
  });

  describe('calculateRoute', () => {
    it('should calculate distance and duration', async () => {
      mockPrisma.route.create.mockResolvedValue({
        id: 'route-1',
        name: 'Test route',
        originLat: -4.3,
        originLng: 15.3,
        destLat: -4.4,
        destLng: 15.4,
        distanceKm: 13.32,
        durationMin: 27,
        polyline: expect.any(String),
        createdAt: new Date(),
      });

      const result = await service.calculateRoute({
        originLat: -4.3,
        originLng: 15.3,
        destLat: -4.4,
        destLng: 15.4,
      });

      expect(result.distanceKm).toBeDefined();
      expect(result.durationMin).toBeDefined();
      expect(result.polyline).toBeDefined();
    });
  });

  describe('saveRoute', () => {
    it('should save a route for user', async () => {
      mockPrisma.route.create.mockResolvedValue({
        id: 'route-1',
        userId: 'user-1',
        name: 'Home to Office',
        originLat: -4.3,
        originLng: 15.3,
        destLat: -4.4,
        destLng: 15.4,
        distanceKm: 13.3,
        durationMin: 27,
        polyline: '...',
        createdAt: new Date(),
      });

      const result = await service.saveRoute('user-1', {
        name: 'Home to Office',
        originLat: -4.3,
        originLng: 15.3,
        destLat: -4.4,
        destLng: 15.4,
      });

      expect(result.name).toBe('Home to Office');
      expect(mockPrisma.route.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
    });
  });

  describe('getRoutes', () => {
    it('should return user routes', async () => {
      mockPrisma.route.findMany.mockResolvedValue([
        { id: 'route-1', name: 'Test' },
      ]);

      const result = await service.getRoutes('user-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.route.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });
  });

  describe('getRoute', () => {
    it('should return route if found and matches user', async () => {
      mockPrisma.route.findUnique.mockResolvedValue({
        id: 'route-1',
        userId: 'user-1',
        name: 'Test',
      });

      const result = await service.getRoute('route-1', 'user-1');

      expect(result.id).toBe('route-1');
    });

    it('should return anonymous route without userId', async () => {
      mockPrisma.route.findUnique.mockResolvedValue({
        id: 'route-1',
        userId: null,
        name: 'Test',
      });

      const result = await service.getRoute('route-1');

      expect(result.id).toBe('route-1');
    });

    it('should throw if not found', async () => {
      mockPrisma.route.findUnique.mockResolvedValue(null);

      await expect(service.getRoute('route-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if route belongs to another user', async () => {
      mockPrisma.route.findUnique.mockResolvedValue({
        id: 'route-1',
        userId: 'user-1',
        name: 'Test',
      });

      await expect(service.getRoute('route-1', 'user-2')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
