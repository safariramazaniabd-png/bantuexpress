import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health', () => {
    it('GET /health should return 200', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
         .expect((res: any) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.timestamp).toBeDefined();
        });
    });
  });

  describe('Auth', () => {
    it('POST /api/v1/auth/login should return 401 for invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ emailOrPhone: 'nonexistent@test.com', password: 'Password1' })
        .expect(401);
    });

    it('POST /api/v1/auth/register should return 201 with tokens', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'e2e-test@example.com', phone: '+243990000001', password: 'Password1' })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
          expect(res.body.user.email).toBe('e2e-test@example.com');
        });
    });

    it('POST /api/v1/auth/register should return 409 for duplicate', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'e2e-test@example.com', phone: '+243990000001', password: 'Password1' })
        .expect(409);
    });

    it('POST /api/v1/auth/login should return 200 with tokens', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ emailOrPhone: 'e2e-test@example.com', password: 'Password1' })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.user.email).toBe('e2e-test@example.com');
        });
    });

    it('GET /api/v1/auth/me should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('GET /api/v1/auth/me should return 200 with valid token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ emailOrPhone: 'e2e-test@example.com', password: 'Password1' });

      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.email).toBe('e2e-test@example.com');
        });
    });

    it('POST /api/v1/auth/refresh should return 200 with valid refresh token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ emailOrPhone: 'e2e-test@example.com', password: 'Password1' });

      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: loginRes.body.refreshToken })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.accessToken).toBeDefined();
        });
    });
  });
});
