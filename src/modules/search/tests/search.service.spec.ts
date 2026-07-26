import { Test, TestingModule } from '@nestjs/testing';
import { LandmarkCategory } from '@prisma/client';
import { SearchService } from '../search.service';
import { PrismaService } from '../../../database/prisma.service';

const mockPrisma = {
  profile: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  landmark: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  address: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  describe('search', () => {
    it('should search people by name', async () => {
      mockPrisma.profile.findMany.mockResolvedValue([
        {
          id: 'prof-1',
          userId: 'user-1',
          firstName: 'Jean',
          lastName: 'Dupont',
          profession: 'Médecin',
          avatarUrl: null,
          languages: ['fr', 'ln'],
          isPublic: true,
          user: { addresses: [{ city: 'Kinshasa' }] },
        },
      ]);
      mockPrisma.profile.count.mockResolvedValue(1);
      mockPrisma.address.findMany.mockResolvedValue([]);
      mockPrisma.address.count.mockResolvedValue(0);
      mockPrisma.landmark.findMany.mockResolvedValue([]);
      mockPrisma.landmark.count.mockResolvedValue(0);

      const result = await service.search({ q: 'Jean', type: 'all' as any });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('people');
      expect(result.data[0].firstName).toBe('Jean');
    });

    it('should search landmarks by name', async () => {
      mockPrisma.profile.findMany.mockResolvedValue([]);
      mockPrisma.profile.count.mockResolvedValue(0);
      mockPrisma.landmark.findMany.mockResolvedValue([
        {
          id: 'lm-1',
          name: 'Marché Central',
          category: LandmarkCategory.MARKET,
          description: 'Grand marché',
          city: 'Kinshasa',
          province: 'Kinshasa',
          latitude: -4.3182,
          longitude: 15.3112,
        },
      ]);
      mockPrisma.landmark.count.mockResolvedValue(1);

      const result = await service.search({ q: 'Marché', type: 'landmarks' as any });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('landmark');
      expect(result.data[0].name).toBe('Marché Central');
    });

    it('should search addresses', async () => {
      mockPrisma.profile.findMany.mockResolvedValue([]);
      mockPrisma.profile.count.mockResolvedValue(0);
      mockPrisma.address.findMany.mockResolvedValue([
        {
          id: 'addr-1',
          label: 'Cabinet médical',
          avenue: 'Avenue de la Libération',
          quartier: 'Gombe',
          city: 'Kinshasa',
          province: 'Kinshasa',
          isPublic: true,
        },
      ]);
      mockPrisma.address.count.mockResolvedValue(1);
      mockPrisma.landmark.findMany.mockResolvedValue([]);
      mockPrisma.landmark.count.mockResolvedValue(0);

      const result = await service.search({ q: 'Cabinet', type: 'addresses' as any });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('address');
      expect(result.data[0].label).toBe('Cabinet médical');
    });

    it('should filter landmarks by category', async () => {
      mockPrisma.profile.findMany.mockResolvedValue([]);
      mockPrisma.profile.count.mockResolvedValue(0);
      mockPrisma.landmark.findMany.mockResolvedValue([]);
      mockPrisma.landmark.count.mockResolvedValue(0);

      await service.search({
        q: 'test',
        category: LandmarkCategory.HOSPITAL,
        type: 'landmarks' as any,
      });

      expect(mockPrisma.landmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: LandmarkCategory.HOSPITAL,
          }),
        }),
      );
    });

    it('should filter by city', async () => {
      mockPrisma.profile.findMany.mockResolvedValue([]);
      mockPrisma.profile.count.mockResolvedValue(0);
      mockPrisma.landmark.findMany.mockResolvedValue([]);
      mockPrisma.landmark.count.mockResolvedValue(0);

      await service.search({
        q: 'test',
        city: 'Lubumbashi',
        type: 'landmarks' as any,
      });

      expect(mockPrisma.landmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: expect.objectContaining({ contains: 'Lubumbashi' }),
          }),
        }),
      );
    });

    it('should return all entities for type=all', async () => {
      mockPrisma.profile.findMany.mockResolvedValue([
        {
          id: 'prof-1',
          userId: 'user-1',
          firstName: 'Marie',
          lastName: 'Kabila',
          profession: 'Avocat',
          avatarUrl: null,
          languages: ['fr'],
          isPublic: true,
          user: { addresses: [] },
        },
      ]);
      mockPrisma.profile.count.mockResolvedValue(1);
      mockPrisma.address.findMany.mockResolvedValue([
        {
          id: 'addr-1',
          label: 'Bureau',
          avenue: '10ème Rue',
          quartier: 'Limete',
          city: 'Kinshasa',
          province: 'Kinshasa',
          isPublic: true,
        },
      ]);
      mockPrisma.address.count.mockResolvedValue(1);
      mockPrisma.landmark.findMany.mockResolvedValue([
        {
          id: 'lm-1',
          name: 'Hôpital Général',
          category: LandmarkCategory.HOSPITAL,
          description: null,
          city: 'Kinshasa',
          province: 'Kinshasa',
          latitude: -4.3,
          longitude: 15.3,
        },
      ]);
      mockPrisma.landmark.count.mockResolvedValue(1);

      const result = await service.search({ q: 'Kinshasa', type: 'all' as any });

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      expect(result.meta.total).toBe(3);
    });

    it('should paginate results', async () => {
      mockPrisma.profile.findMany.mockResolvedValue([]);
      mockPrisma.profile.count.mockResolvedValue(0);
      mockPrisma.landmark.findMany.mockResolvedValue([]);
      mockPrisma.landmark.count.mockResolvedValue(0);

      const result = await service.search({ page: 2, limit: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
    });

    it('should browse all entities when no query', async () => {
      mockPrisma.landmark.findMany.mockResolvedValue([
        {
          id: 'lm-1',
          name: 'Parc de la Révolution',
          category: LandmarkCategory.PARK,
          description: null,
          city: 'Kinshasa',
          province: 'Kinshasa',
          latitude: -4.3,
          longitude: 15.3,
        },
      ]);
      mockPrisma.landmark.count.mockResolvedValue(1);

      const result = await service.search({ type: 'landmarks' as any });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('landmark');
    });

    it('should search people by profession', async () => {
      mockPrisma.profile.findMany.mockResolvedValue([
        {
          id: 'prof-2',
          userId: 'user-2',
          firstName: 'Paul',
          lastName: 'Mukendi',
          profession: 'Infirmier',
          avatarUrl: null,
          languages: ['fr'],
          isPublic: true,
          user: { addresses: [] },
        },
      ]);
      mockPrisma.profile.count.mockResolvedValue(1);
      mockPrisma.landmark.findMany.mockResolvedValue([]);
      mockPrisma.landmark.count.mockResolvedValue(0);

      const result = await service.search({
        q: 'Infirmier',
        type: 'people' as any,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('people');
      expect(result.data[0].profession).toBe('Infirmier');
    });
  });
});
