import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../app.module';

describe('Emergency (e2e)', () => {
  let app: INestApplication;
  let userToken: string;
  let emergencyId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health', 'csrf-token', 'api/docs'] });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    const email = `e2e-emergency-${Date.now()}@example.com`;
    const phone = `+24399${String(Date.now()).slice(-8)}`;

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, phone, password: 'Password1' })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ emailOrPhone: email, password: 'Password1' })
      .expect(200);

    userToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/emergency/reports', () => {
    it('should create an emergency report', () => {
      return request(app.getHttpServer())
        .post('/api/v1/emergency/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'MEDICAL',
          description: 'Personne inconsciente au marché central',
          latitude: -4.325,
          longitude: 15.322,
          address: 'Marché Central, Kinshasa',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.type).toBe('MEDICAL');
          expect(res.body.severity).toBe('CRITICAL');
          expect(res.body.status).toBe('REPORTED');
          emergencyId = res.body.id;
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/emergency/reports')
        .send({ latitude: 0, longitude: 0 })
        .expect(401);
    });
  });

  describe('GET /api/v1/emergency/reports', () => {
    it('should list my reports', () => {
      return request(app.getHttpServer())
        .get('/api/v1/emergency/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
          expect(res.body.data[0].id).toBe(emergencyId);
        });
    });
  });

  describe('GET /api/v1/emergency/reports/:id', () => {
    it('should return report details', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/emergency/reports/${emergencyId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.description).toBe('Personne inconsciente au marché central');
        });
    });

    it('should return 404 for unknown id', () => {
      return request(app.getHttpServer())
        .get('/api/v1/emergency/reports/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/emergency/reports/:id/cancel', () => {
    it('should cancel the report', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/emergency/reports/${emergencyId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('CANCELLED');
          expect(res.body.cancelledAt).toBeDefined();
        });
    });

    it('should fail to cancel again', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/emergency/reports/${emergencyId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });
  });
});
