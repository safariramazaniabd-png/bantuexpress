import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CategoriesService } from '../categories.service';
import { PrismaService } from '../../../database/prisma.service';

const mockPrisma = {
  category: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<CategoriesService>(CategoriesService);
  });

  const mockCategory = {
    id: 'cat-1',
    name: 'Technology',
    slug: 'technology',
    description: 'Tech category',
    icon: null,
    parentId: null,
    createdAt: new Date(),
  };

  describe('create', () => {
    it('should create a category', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue(mockCategory);
      const result = await service.create({ name: 'Technology', slug: 'technology' });
      expect(result.id).toBe('cat-1');
    });

    it('should throw if slug exists', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      await expect(service.create({ name: 'Tech', slug: 'technology' })).rejects.toThrow(ConflictException);
    });

    it('should throw if parent not found', async () => {
      mockPrisma.category.findUnique.mockResolvedValueOnce(null);
      mockPrisma.category.findUnique.mockResolvedValueOnce(null);
      await expect(service.create({ name: 'Sub', slug: 'sub', parentId: 'missing' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all categories with children', async () => {
      mockPrisma.category.findMany.mockResolvedValue([mockCategory]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return category', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      const result = await service.findOne('cat-1');
      expect(result.id).toBe('cat-1');
    });
  });

  describe('update', () => {
    it('should update category', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.category.update.mockResolvedValue({ ...mockCategory, name: 'Updated' });
      const result = await service.update('cat-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should delete if no children', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        ...mockCategory,
        _count: { children: 0 },
      });
      await service.remove('cat-1');
      expect(mockPrisma.category.delete).toHaveBeenCalled();
    });

    it('should throw if has children', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        ...mockCategory,
        _count: { children: 2 },
      });
      await expect(service.remove('cat-1')).rejects.toThrow(ConflictException);
    });
  });
});
