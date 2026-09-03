import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from '../health.service';
import { PrismaService } from '../../../database/prisma.service';

describe('HealthService', () => {
  let service: HealthService;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma = {
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  describe('check()', () => {
    it('should return status ok and db up when the database responds', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await service.check();

      expect(result.status).toBe('ok');
      expect(result.db).toBe('up');
      expect(result.timestamp).toBeDefined();
      expect(result.dbLatencyMs).not.toBeNull();
      expect(typeof result.uptime).toBe('number');
    });

    it('should return status degraded and db down when the database is unreachable', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

      const result = await service.check();

      expect(result.status).toBe('degraded');
      expect(result.db).toBe('down');
      expect(result.dbLatencyMs).toBeNull();
    });
  });
});
