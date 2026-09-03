import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { HealthController } from '../health.controller';
import { HealthService } from '../health.service';

describe('HealthController', () => {
  let app: INestApplication;
  let healthService: { check: jest.Mock };

  beforeAll(async () => {
    jest.clearAllMocks();

    healthService = {
      check: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthService, useValue: healthService },
      ],
    })
      .overrideGuard(APP_GUARD)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return 200 with status ok and db up', () => {
      healthService.check.mockResolvedValue({
        status: 'ok',
        timestamp: new Date().toISOString(),
        db: 'up',
        dbLatencyMs: 5,
        uptime: 42,
      });

      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.db).toBe('up');
          expect(res.body.timestamp).toBeDefined();
        });
    });

    it('should return status degraded when db is down', () => {
      healthService.check.mockResolvedValue({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        db: 'down',
        dbLatencyMs: null,
        uptime: 42,
      });

      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('degraded');
          expect(res.body.db).toBe('down');
        });
    });
  });
});
