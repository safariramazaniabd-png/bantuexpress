import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../app.module';

describe('Identities (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: string;

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

    const email = `e2e-identities-${Date.now()}@example.com`;
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
    userId = loginRes.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auto-created profile on registration', () => {
    it('should have an empty profile after registration', () => {
      return request(app.getHttpServer())
        .get('/api/v1/identities/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.firstName).toBe('');
          expect(res.body.lastName).toBe('');
        });
    });
  });

  describe('POST /api/v1/identities/profile', () => {
    it('should be idempotent and return the existing auto-created profile', () => {
      return request(app.getHttpServer())
        .post('/api/v1/identities/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Marie', lastName: 'Kabamba' })
        .expect(200)
        .expect((res) => {
          expect(res.body.userId).toBe(userId);
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/identities/profile')
        .send({ firstName: 'No', lastName: 'Auth' })
        .expect(401);
    });

    it('should reject unknown fields (forbidNonWhitelisted)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/identities/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Marie', lastName: 'Kabamba', bogus: true })
        .expect(400);
    });
  });

  describe('PATCH /api/v1/identities/profile', () => {
    it('should update profile fields', () => {
      return request(app.getHttpServer())
        .patch('/api/v1/identities/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'Marie',
          lastName: 'Kabamba',
          profession: 'Ingénieur',
          languages: ['fr', 'ln'],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.firstName).toBe('Marie');
          expect(res.body.lastName).toBe('Kabamba');
          expect(res.body.profession).toBe('Ingénieur');
        });
    });
  });

  describe('GET /api/v1/identities/profile', () => {
    it('should return the updated profile', () => {
      return request(app.getHttpServer())
        .get('/api/v1/identities/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.firstName).toBe('Marie');
          expect(res.body.lastName).toBe('Kabamba');
        });
    });
  });

  describe('POST /api/v1/identities/profile/qrcode', () => {
    it('should generate a QR code', () => {
      return request(app.getHttpServer())
        .post('/api/v1/identities/profile/qrcode')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body.personalQrCode).toMatch(/^bqe:profile:/);
        });
    });
  });

  describe('POST /api/v1/identities/profile/identity-document', () => {
    it('should upload an identity document (multipart file)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/identities/profile/identity-document')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', Buffer.from('fake jpeg bytes'), 'id-card.jpg')
        .expect(201)
        .expect((res) => {
          expect(res.body.identityDocumentPhoto).toMatch(/^\/uploads\/documents\//);
        });
    });
  });

  describe('POST /api/v1/identities/profile/verify', () => {
    it('should forbid verification for non-admins (403)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/identities/profile/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/identities/:userId (public profile)', () => {
    it('should return sanitized public fields before deletion', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/identities/${userId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.firstName).toBe('Marie');
          expect(res.body.userId).toBe(userId);
          expect(res.body.email).toBeUndefined();
          expect(res.body.secondaryPhones).toBeUndefined();
        });
    });
  });

  describe('DELETE /api/v1/identities/profile', () => {
    it('should delete the profile', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/identities/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Profile deleted');
        });
    });
  });

  describe('GET /api/v1/identities/:userId (public profile after delete)', () => {
    it('should return 404 for deleted profile', () => {
      return request(app.getHttpServer()).get(`/api/v1/identities/${userId}`).expect(404);
    });
  });
});
