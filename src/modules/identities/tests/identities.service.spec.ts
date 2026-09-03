import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { IdentitiesService } from '../identities.service';
import { PrismaService } from '../../../database/prisma.service';

jest.mock('fs', () => {
  const realFs = jest.requireActual('fs');
  return {
    ...realFs,
    existsSync: jest.fn().mockReturnValue(false),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    unlinkSync: jest.fn(),
  };
});

const mockPrisma = {
  profile: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('IdentitiesService', () => {
  let service: IdentitiesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [IdentitiesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<IdentitiesService>(IdentitiesService);
  });

  const mockProfile = {
    id: 'prof-1',
    userId: 'user-1',
    firstName: 'Jean',
    lastName: 'Mukendi',
    avatarUrl: null,
    gender: 'male',
    birthDate: new Date('1990-01-01'),
    profession: 'Développeur',
    languages: ['fr', 'ln'],
    secondaryPhones: ['+243990000002'],
    identityDocumentType: 'NATIONAL_ID',
    identityDocumentNumber: 'ID-123456',
    identityDocumentPhoto: '/uploads/documents/id_123.jpg',
    digitalSignature: null,
    verifiedAt: null,
    personalQrCode: null,
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('createProfile', () => {
    it('should create a profile', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);
      mockPrisma.profile.create.mockResolvedValue(mockProfile);

      const result = await service.createProfile('user-1', {
        firstName: 'Jean',
        lastName: 'Mukendi',
        profession: 'Développeur',
        languages: ['fr', 'ln'],
        secondaryPhones: ['+243990000002'],
        identityDocumentType: 'NATIONAL_ID',
        identityDocumentNumber: 'ID-123456',
      });

      expect(result.firstName).toBe('Jean');
      expect(result.lastName).toBe('Mukendi');
      expect(result.profession).toBe('Développeur');
      expect(mockPrisma.profile.create).toHaveBeenCalledTimes(1);
    });

    it('should return the existing profile if already exists (idempotent)', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.createProfile('user-1', {
        firstName: 'Jean',
        lastName: 'Mukendi',
      });

      expect(result.firstName).toBe('Jean');
      expect(mockPrisma.profile.create).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return the profile', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getProfile('user-1');

      expect(result.userId).toBe('user-1');
      expect(result.firstName).toBe('Jean');
    });

    it('should throw NotFoundException if no profile', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update fields', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.profile.update.mockResolvedValue({ ...mockProfile, firstName: 'Pierre' });

      const result = await service.updateProfile('user-1', { firstName: 'Pierre' });

      expect(result.firstName).toBe('Pierre');
      expect(mockPrisma.profile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          data: expect.objectContaining({ firstName: 'Pierre' }),
        }),
      );
    });

    it('should only change provided fields', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.profile.update.mockResolvedValue(mockProfile);

      await service.updateProfile('user-1', { profession: 'Designer' });

      expect(mockPrisma.profile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          data: { profession: 'Designer' },
        }),
      );
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);

      await expect(service.updateProfile('user-1', { firstName: 'Pierre' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPublicProfile', () => {
    it('should return public fields only', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getPublicProfile('user-1');

      expect(result.firstName).toBe('Jean');
      expect(result.lastName).toBe('Mukendi');
      expect(result.profession).toBe('Développeur');
      expect((result as any).secondaryPhones).toBeUndefined();
      expect((result as any).identityDocumentNumber).toBeUndefined();
    });

    it('should throw NotFoundException for private profile', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue({ ...mockProfile, isPublic: false });

      await expect(service.getPublicProfile('user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if no profile', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);

      await expect(service.getPublicProfile('user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadAvatar', () => {
    it('should reject invalid file types', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);

      await expect(
        service.uploadAvatar('user-1', {
          buffer: Buffer.from('test'),
          mimetype: 'text/plain',
          originalname: 'test.txt',
          size: 4,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if profile does not exist', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadAvatar('user-1', {
          buffer: Buffer.from('test'),
          mimetype: 'image/jpeg',
          originalname: 'test.jpg',
          size: 4,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should write the file and update the profile avatarUrl', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.profile.update.mockResolvedValue({
        ...mockProfile,
        avatarUrl: '/uploads/avatars/avatar.jpg',
      });

      const result = await service.uploadAvatar('user-1', {
        buffer: Buffer.from('img'),
        mimetype: 'image/png',
        originalname: 'avatar.png',
        size: 3,
      });

      expect(result.avatarUrl).toMatch(/^\/uploads\/avatars\//);
      expect(mockPrisma.profile.update).toHaveBeenCalled();
    });
  });

  describe('deleteAvatar', () => {
    it('should clear avatar URL', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue({
        ...mockProfile,
        avatarUrl: '/uploads/avatars/test.jpg',
      });
      mockPrisma.profile.update.mockResolvedValue({ ...mockProfile, avatarUrl: null });

      await service.deleteAvatar('user-1');

      expect(mockPrisma.profile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          data: { avatarUrl: null },
        }),
      );
    });

    it('should throw NotFoundException if no profile', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);

      await expect(service.deleteAvatar('user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteProfile', () => {
    it('should delete the profile', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.profile.delete.mockResolvedValue(mockProfile);

      await service.deleteProfile('user-1');

      expect(mockPrisma.profile.delete).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    });

    it('should throw NotFoundException if no profile', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);

      await expect(service.deleteProfile('user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateQrCode', () => {
    it('should generate a QR code string', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue({ ...mockProfile, personalQrCode: null });
      mockPrisma.profile.update.mockResolvedValue({ ...mockProfile, personalQrCode: 'bqe:profile:abc123' });

      const result = await service.generateQrCode('user-1');

      expect(result.personalQrCode).toMatch(/^bqe:profile:/);
    });

    it('should return existing QR code if not forced', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue({
        ...mockProfile,
        personalQrCode: 'bqe:profile:existing',
      });

      const result = await service.generateQrCode('user-1');

      expect(result.personalQrCode).toBe('bqe:profile:existing');
      expect(mockPrisma.profile.update).not.toHaveBeenCalled();
    });

    it('should regenerate if forced', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue({ ...mockProfile, personalQrCode: 'bqe:profile:old' });
      mockPrisma.profile.update.mockImplementation((_args: any) =>
        Promise.resolve({ ...mockProfile, personalQrCode: 'bqe:profile:new' }),
      );

      const result = await service.generateQrCode('user-1', true);

      expect(mockPrisma.profile.update).toHaveBeenCalled();
      expect(result.personalQrCode).toMatch(/^bqe:profile:/);
    });

    it('should throw if no profile', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);

      await expect(service.generateQrCode('user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyProfile', () => {
    it('should set verifiedAt', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);
      const updated = { ...mockProfile, verifiedAt: new Date() };
      mockPrisma.profile.update.mockResolvedValue(updated);

      const result = await service.verifyProfile('user-1');

      expect(result.verifiedAt).toBeDefined();
      expect(mockPrisma.profile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          data: expect.objectContaining({ verifiedAt: expect.any(Date) }),
        }),
      );
    });

    it('should throw NotFoundException if no profile', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);

      await expect(service.verifyProfile('user-1')).rejects.toThrow(NotFoundException);
    });

    it('should reject verification without an identity document', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue({
        ...mockProfile,
        identityDocumentPhoto: null,
      });

      await expect(service.verifyProfile('user-1')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.profile.update).not.toHaveBeenCalled();
    });
  });

  describe('uploadIdentityDocument', () => {
    it('should reject invalid file types', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);

      await expect(
        service.uploadIdentityDocument('user-1', {
          buffer: Buffer.from('test'),
          mimetype: 'text/plain',
          originalname: 'test.txt',
          size: 4,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if profile does not exist', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadIdentityDocument('user-1', {
          buffer: Buffer.from('test'),
          mimetype: 'image/jpeg',
          originalname: 'test.jpg',
          size: 4,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should write the document and update identityDocumentPhoto', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.profile.update.mockResolvedValue({
        ...mockProfile,
        identityDocumentPhoto: '/uploads/documents/id_doc.jpg',
      });

      const result = await service.uploadIdentityDocument('user-1', {
        buffer: Buffer.from('pdf'),
        mimetype: 'application/pdf',
        originalname: 'id.pdf',
        size: 3,
      });

      expect(result.identityDocumentPhoto).toMatch(/^\/uploads\/documents\//);
      expect(mockPrisma.profile.update).toHaveBeenCalled();
    });
  });

  describe('uploadDigitalSignature', () => {
    it('should reject invalid file types', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(mockProfile);

      await expect(
        service.uploadDigitalSignature('user-1', {
          buffer: Buffer.from('test'),
          mimetype: 'text/plain',
          originalname: 'test.txt',
          size: 4,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if profile does not exist', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadDigitalSignature('user-1', {
          buffer: Buffer.from('test'),
          mimetype: 'image/jpeg',
          originalname: 'test.jpg',
          size: 4,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
