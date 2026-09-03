import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../app.module';

describe('BusinessProfiles (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let businessId: string;

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

    const email = `e2e-biz-${Date.now()}@example.com`;
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

  describe('POST /api/v1/business-profiles', () => {
    it('should create a business profile', () => {
      return request(app.getHttpServer())
        .post('/api/v1/business-profiles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Pharmacie Centrale',
          type: 'ENTERPRISE',
          sector: 'Santé',
          description: 'Pharmacie de référence à Kinshasa',
          city: 'Kinshasa',
          province: 'Kinshasa',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe('Pharmacie Centrale');
          expect(res.body.isVerified).toBe(false);
          businessId = res.body.id;
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/business-profiles')
        .send({ name: 'Test', city: 'Kinshasa' })
        .expect(401);
    });
  });

  describe('GET /api/v1/business-profiles', () => {
    it('should list public profiles', () => {
      return request(app.getHttpServer())
        .get('/api/v1/business-profiles')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        });
    });
  });

  describe('GET /api/v1/business-profiles/mine', () => {
    it('should return own profiles', () => {
      return request(app.getHttpServer())
        .get('/api/v1/business-profiles/mine')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(1);
        });
    });
  });

  describe('GET /api/v1/business-profiles/:id', () => {
    it('should return profile details', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/business-profiles/${businessId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Pharmacie Centrale');
        });
    });

    it('should return 404 for unknown id', () => {
      return request(app.getHttpServer())
        .get('/api/v1/business-profiles/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('PATCH /api/v1/business-profiles/:id', () => {
    it('should update the profile', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/business-profiles/${businessId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ description: 'Pharmacie mise à jour' })
        .expect(200)
        .expect((res) => {
          expect(res.body.description).toBe('Pharmacie mise à jour');
        });
    });
  });

  describe('Business members', () => {
    it('should list members (owner automatically added)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/business-profiles/${businessId}/members`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(1);
          expect(res.body[0].role).toBe('owner');
        });
    });
  });

  describe('Products', () => {
    let productId: string;

    it('should create a product', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/business-profiles/${businessId}/products`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Paracétamol 500mg', price: 2500 })
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe('Paracétamol 500mg');
          productId = res.body.id;
        });
    });

    it('should list products', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/business-profiles/${businessId}/products`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(1);
        });
    });
  });
});
