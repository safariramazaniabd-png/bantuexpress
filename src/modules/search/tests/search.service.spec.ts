import { Test, TestingModule } from '@nestjs/testing';
import { LandmarkCategory, BusinessType } from '@prisma/client';
import { SearchService } from '../search.service';
import { PrismaService } from '../../../database/prisma.service';

const mockPrisma = {
  profile: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  },
  landmark: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  },
  address: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  },
  businessProfile: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  },
  $queryRawUnsafe: jest.fn(() => { throw new Error('FTS unavailable'); }),
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
    it('should search people by name (LIKE fallback)', async () => {
      mockPrisma.profile.findMany.mockResolvedValue([
        {
          id: 'prof-1', userId: 'user-1', firstName: 'Jean', lastName: 'Dupont',
          profession: 'Médecin', avatarUrl: null, languages: ['fr', 'ln'], isPublic: true,
          user: { addresses: [{ city: 'Kinshasa' }] },
        },
      ]);
      mockPrisma.profile.count.mockResolvedValue(1);
      mockPrisma.landmark.findMany.mockResolvedValue([]);
      mockPrisma.landmark.count.mockResolvedValue(0);
      mockPrisma.address.findMany.mockResolvedValue([]);
      mockPrisma.address.count.mockResolvedValue(0);

      const result = await service.search({ q: 'Jean', type: 'all' as any });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('people');
      expect(result.data[0].firstName).toBe('Jean');
    });

    it('should search landmarks by name (LIKE fallback)', async () => {
      mockPrisma.profile.findMany.mockResolvedValue([]);
      mockPrisma.profile.count.mockResolvedValue(0);
      mockPrisma.landmark.findMany.mockResolvedValue([
        {
          id: 'lm-1', name: 'Marché Central', category: LandmarkCategory.MARKET,
          description: 'Grand marché', city: 'Kinshasa', province: 'Kinshasa',
          latitude: -4.3182, longitude: 15.3112,
        },
      ]);
      mockPrisma.landmark.count.mockResolvedValue(1);
      mockPrisma.address.findMany.mockResolvedValue([]);
      mockPrisma.address.count.mockResolvedValue(0);
      mockPrisma.businessProfile.findMany.mockResolvedValue([]);
      mockPrisma.businessProfile.count.mockResolvedValue(0);

      const result = await service.search({ q: 'Marché', type: 'all' as any });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('landmark');
      expect(result.data[0].name).toBe('Marché Central');
    });

    it('should search addresses', async () => {
      mockPrisma.profile.findMany.mockResolvedValue([]);
      mockPrisma.profile.count.mockResolvedValue(0);
      mockPrisma.address.findMany.mockResolvedValue([
        {
          id: 'addr-1', label: 'Cabinet médical', avenue: 'Avenue de la Libération',
          quartier: 'Gombe', city: 'Kinshasa', province: 'Kinshasa',
          latitude: null, longitude: null, isPublic: true,
        },
      ]);
      mockPrisma.address.count.mockResolvedValue(1);
      mockPrisma.landmark.findMany.mockResolvedValue([]);
      mockPrisma.landmark.count.mockResolvedValue(0);
      mockPrisma.businessProfile.findMany.mockResolvedValue([]);
      mockPrisma.businessProfile.count.mockResolvedValue(0);

      const result = await service.search({ q: 'Cabinet', type: 'addresses' as any });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('address');
      expect(result.data[0].label).toBe('Cabinet médical');
    });

    it('should search businesses (LIKE fallback)', async () => {
      mockPrisma.profile.findMany.mockResolvedValue([]);
      mockPrisma.profile.count.mockResolvedValue(0);
      mockPrisma.landmark.findMany.mockResolvedValue([]);
      mockPrisma.landmark.count.mockResolvedValue(0);
      mockPrisma.address.findMany.mockResolvedValue([]);
      mockPrisma.address.count.mockResolvedValue(0);
      mockPrisma.businessProfile.findMany.mockResolvedValue([
        {
          id: 'biz-1', name: 'Pharmacie Centrale', type: BusinessType.ENTERPRISE,
          sector: 'Santé', description: 'Pharmacie de référence', city: 'Kinshasa',
          province: 'Kinshasa', logoUrl: null, isVerified: true, isPublic: true,
          deletedAt: null,
        },
      ]);
      mockPrisma.businessProfile.count.mockResolvedValue(1);

      const result = await service.search({ q: 'Pharmacie', type: 'businesses' as any });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('business');
      expect(result.data[0].name).toBe('Pharmacie Centrale');
    });

    it('should filter landmarks by category', async () => {
      mockPrisma.profile.findMany.mockResolvedValue([]);
      mockPrisma.profile.count.mockResolvedValue(0);
      mockPrisma.businessProfile.findMany.mockResolvedValue([]);
      mockPrisma.businessProfile.count.mockResolvedValue(0);
      mockPrisma.landmark.findMany.mockResolvedValue([]);
      mockPrisma.landmark.count.mockResolvedValue(0);

      await service.search({ q: 'test', category: LandmarkCategory.HOSPITAL, type: 'landmarks' as any });

      expect(mockPrisma.landmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: LandmarkCategory.HOSPITAL }),
        }),
      );
    });

    it('should filter by city', async () => {
      await service.search({ q: 'test', city: 'Lubumbashi', type: 'landmarks' as any });

      expect(mockPrisma.landmark.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: 'Lubumbashi',
          }),
        }),
      );
    });

    it('should return all entities for type=all', async () => {
      mockPrisma.profile.findMany.mockResolvedValue([
        {
          id: 'prof-1', userId: 'user-1', firstName: 'Marie', lastName: 'Kabila',
          profession: 'Avocat', avatarUrl: null, languages: ['fr'], isPublic: true,
          user: { addresses: [] },
        },
      ]);
      mockPrisma.profile.count.mockResolvedValue(1);
      mockPrisma.address.findMany.mockResolvedValue([
        {
          id: 'addr-1', label: 'Bureau', avenue: '10ème Rue', quartier: 'Limete',
          city: 'Kinshasa', province: 'Kinshasa', latitude: null, longitude: null, isPublic: true,
        },
      ]);
      mockPrisma.address.count.mockResolvedValue(1);
      mockPrisma.landmark.findMany.mockResolvedValue([
        {
          id: 'lm-1', name: 'Hôpital Général', category: LandmarkCategory.HOSPITAL,
          description: null, city: 'Kinshasa', province: 'Kinshasa',
          latitude: -4.3, longitude: 15.3,
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

    it('should browse landmarks when no query', async () => {
      mockPrisma.landmark.findMany.mockResolvedValue([
        {
          id: 'lm-1', name: 'Parc de la Révolution', category: LandmarkCategory.PARK,
          description: null, city: 'Kinshasa', province: 'Kinshasa',
          latitude: -4.3, longitude: 15.3,
        },
      ]);
      mockPrisma.landmark.count.mockResolvedValue(1);

      const result = await service.search({ type: 'landmarks' as any });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('landmark');
    });

    it('should search people by profession (LIKE fallback)', async () => {
      mockPrisma.profile.findMany.mockResolvedValue([
        {
          id: 'prof-2', userId: 'user-2', firstName: 'Paul', lastName: 'Mukendi',
          profession: 'Infirmier', avatarUrl: null, languages: ['fr'], isPublic: true,
          user: { addresses: [] },
        },
      ]);
      mockPrisma.profile.count.mockResolvedValue(1);
      mockPrisma.landmark.findMany.mockResolvedValue([]);
      mockPrisma.landmark.count.mockResolvedValue(0);

      const result = await service.search({ q: 'Infirmier', type: 'people' as any });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('people');
      expect(result.data[0].profession).toBe('Infirmier');
    });
  });

  describe('suggest', () => {
    it('should return suggestions from people, landmarks, and businesses', async () => {
      mockPrisma.profile.findMany.mockResolvedValue([
        { firstName: 'Jean', lastName: 'Dupont' },
      ]);
      mockPrisma.landmark.findMany.mockResolvedValue([
        { id: 'lm-1', name: 'Marché Central' },
      ]);
      mockPrisma.businessProfile.findMany.mockResolvedValue([
        { id: 'biz-1', name: 'Pharmacie Centrale' },
      ]);

      const result = await service.suggest({ q: 'Jean' });

      expect(result).toHaveLength(3);
      expect(result[0].text).toBe('Jean Dupont');
      expect(result[0].type).toBe('people');
      expect(result[1].type).toBe('landmark');
      expect(result[2].type).toBe('business');
    });

    it('should return empty for short query', async () => {
      const result = await service.suggest({ q: 'J' });
      expect(result).toEqual([]);
    });

    it('should limit results', async () => {
      mockPrisma.profile.findMany.mockResolvedValue([
        { firstName: 'A', lastName: 'B' }, { firstName: 'C', lastName: 'D' },
      ]);
      mockPrisma.landmark.findMany.mockResolvedValue([]);
      mockPrisma.businessProfile.findMany.mockResolvedValue([]);

      const result = await service.suggest({ q: 'test', limit: 1 });

      expect(result).toHaveLength(1);
    });
  });
});
