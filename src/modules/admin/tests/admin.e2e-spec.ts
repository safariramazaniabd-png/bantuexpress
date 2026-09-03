import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../database/prisma.service';
import { UserRole } from '@prisma/client';

describe('Admin (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let targetUserId: string;
  let adminUserId: string;

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

    prisma = app.get(PrismaService);

    // Create a target user
    const targetEmail = `e2e-admin-target-${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: targetEmail, phone: `+24399${Date.now()}00`, password: 'Password1' })
      .expect(201);

    const targetLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ emailOrPhone: targetEmail, password: 'Password1' })
      .expect(200);

    targetUserId = targetLogin.body.user.id;

    // Create and promote admin user
    const adminEmail = `e2e-admin-${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: adminEmail, phone: `+24399${Date.now()}01`, password: 'Password1' })
      .expect(201);

    const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    adminUserId = adminUser!.id;
    await prisma.user.update({ where: { id: adminUserId }, data: { role: UserRole.ADMIN } });

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ emailOrPhone: adminEmail, password: 'Password1' })
      .expect(200);

    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/admin/users', () => {
    it('should list users', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .expect(401);
    });
  });

  describe('GET /api/v1/admin/users/:id', () => {
    it('should return user details', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/admin/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(targetUserId);
          expect(res.body._count).toBeDefined();
        });
    });
  });

  describe('PATCH /api/v1/admin/users/:id/role', () => {
    it('should change user role', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${targetUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.PROFESSIONAL })
        .expect(200)
        .expect((res) => {
          expect(res.body.role).toBe('PROFESSIONAL');
        });
    });
  });

  describe('PATCH /api/v1/admin/users/:id/status', () => {
    it('should deactivate user', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200)
        .expect((res) => {
          expect(res.body.isActive).toBe(false);
        });
    });

    it('should reactivate user', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true })
        .expect(200)
        .expect((res) => {
          expect(res.body.isActive).toBe(true);
        });
    });
  });

  describe('POST /api/v1/admin/reports', () => {
    it('should create a content report', () => {
      return request(app.getHttpServer())
        .post('/api/v1/admin/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          entityType: 'profile',
          entityId: targetUserId,
          reason: 'SPAM',
          description: 'Profil suspect',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.reason).toBe('SPAM');
          expect(res.body.status).toBe('PENDING');
        });
    });
  });

  describe('GET /api/v1/admin/reports', () => {
    it('should list reports', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
        });
    });
  });

  describe('GET /api/v1/admin/stats', () => {
    it('should return dashboard stats', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.users).toBeDefined();
          expect(res.body.deliveries).toBeDefined();
          expect(res.body.emergencies).toBeDefined();
          expect(res.body.businesses).toBeDefined();
        });
    });
  });

  describe('GET /api/v1/admin/audit-logs', () => {
    it('should list audit logs', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });
});
