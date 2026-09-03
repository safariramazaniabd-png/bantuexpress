import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../app.module';

describe('QrCodes (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let qrCode: string;

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

    const email = `e2e-qr-${Date.now()}@example.com`;
    const phone = `+24399${String(Date.now()).slice(-8)}`;

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, phone, password: 'Password1' })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ emailOrPhone: email, password: 'Password1' })
      .expect(200);

    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/qrcodes', () => {
    it('should create a QR code for the auto-created profile', async () => {
      const profileRes = await request(app.getHttpServer())
        .get('/api/v1/identities/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      return request(app.getHttpServer())
        .post('/api/v1/qrcodes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ entityType: 'profile', entityId: profileRes.body.id })
        .expect(201)
        .expect((res) => {
          expect(res.body.code).toBeDefined();
          expect(res.body.code.length).toBe(12);
          qrCode = res.body.code;
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/qrcodes')
        .send({ entityType: 'profile', entityId: 'test' })
        .expect(401);
    });
  });

  describe('GET /api/v1/qrcodes/mine', () => {
    it('should list user QR codes', () => {
      return request(app.getHttpServer())
        .get('/api/v1/qrcodes/mine')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(1);
        });
    });
  });

  describe('GET /api/v1/qrcodes/:code/resolve', () => {
    it('should resolve to the entity', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/qrcodes/${qrCode}`)
        .expect(200);

      expect(res.body.type).toBe('profile');
      expect(res.body.entity).toBeDefined();
    });

    it('should return 404 for unknown code', () => {
      return request(app.getHttpServer())
        .get('/api/v1/qrcodes/unknown12345')
        .expect(404);
    });
  });

  describe('GET /api/v1/qrcodes/:code/image', () => {
    it('should return a PNG image', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/qrcodes/${qrCode}/image`)
        .expect(200)
        .expect('Content-Type', /image\/png/);
    });

    it('should return 404 for unknown code', () => {
      return request(app.getHttpServer())
        .get('/api/v1/qrcodes/unknown12345/image')
        .expect(404);
    });
  });

  describe('PATCH /api/v1/qrcodes/:code/scan', () => {
    it('should increment scan counter', async () => {
      const before = await request(app.getHttpServer())
        .get(`/api/v1/qrcodes/${qrCode}/stats`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/qrcodes/${qrCode}/scan`)
        .expect(200);

      const after = await request(app.getHttpServer())
        .get(`/api/v1/qrcodes/${qrCode}/stats`)
        .expect(200);

      expect(after.body.scans).toBe(before.body.scans + 1);
    });
  });
});
