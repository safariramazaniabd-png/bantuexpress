import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, UnauthorizedException } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
  getProfile: jest.fn(),
  verifyEmail: jest.fn(),
  verifyPhone: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  googleLogin: jest.fn(),
  appleLogin: jest.fn(),
  facebookLogin: jest.fn(),
  whatsappRequest: jest.fn(),
  whatsappVerify: jest.fn(),
  enable2fa: jest.fn(),
  verify2fa: jest.fn(),
  disable2fa: jest.fn(),
  loginWith2fa: jest.fn(),
  resendCode: jest.fn(),
  changePassword: jest.fn(),
};

const mockJwtAuthGuard = {
  canActivate: jest.fn((context) => {
    const req = context.switchToHttp().getRequest();
    req.user = { userId: 'user-1', role: 'INDIVIDUAL' };
    return true;
  }),
};

describe('AuthController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(APP_GUARD)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    app = module.createNestApplication();
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should return 201 with tokens', () => {
      mockAuthService.register.mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
        user: { id: 'u1' },
      });

      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com', phone: '+243990000001', password: 'Password1' })
        .expect(201)
        .expect((res) => {
          expect(res.body.accessToken).toBe('at');
          expect(res.body.user.id).toBe('u1');
        });
    });

    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', phone: '+243990000001', password: 'Password1' })
        .expect(400);
    });

    it('should return 400 for weak password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com', phone: '+243990000001', password: 'weak' })
        .expect(400);
    });

    it('should return 400 for missing phone', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'Password1' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should return 200 with tokens', () => {
      mockAuthService.login.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt', user: { id: 'u1' } });

      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ emailOrPhone: 'test@example.com', password: 'Password1' })
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBe('at');
        });
    });

    it('should return 401 for invalid credentials', () => {
      mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ emailOrPhone: 'test@example.com', password: 'WrongPassword1' })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return 200 with new tokens', () => {
      mockAuthService.refresh.mockResolvedValue({ accessToken: 'new-at', refreshToken: 'new-rt' });

      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(200);
    });
  });

  describe('POST /auth/logout', () => {
    it('should return 200', () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      return request(app.getHttpServer())
        .post('/auth/logout')
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Logged out successfully');
        });
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user', () => {
      mockAuthService.getProfile.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });

      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe('test@example.com');
        });
    });
  });

  describe('POST /auth/verify-email', () => {
    it('should return 200 for valid code', () => {
      mockAuthService.verifyEmail.mockResolvedValue(undefined);

      return request(app.getHttpServer()).post('/auth/verify-email').send({ code: '123456' }).expect(201);
    });
  });

  describe('POST /auth/verify-phone', () => {
    it('should return 200 for valid code', () => {
      mockAuthService.verifyPhone.mockResolvedValue(undefined);

      return request(app.getHttpServer()).post('/auth/verify-phone').send({ code: '123456' }).expect(201);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should return 200', () => {
      mockAuthService.forgotPassword.mockResolvedValue({
        message: 'If that email exists, a reset link has been sent.',
      });

      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(201);
    });

    it('should return 400 for missing email', () => {
      return request(app.getHttpServer()).post('/auth/forgot-password').send({}).expect(400);
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should return 200 for valid token', () => {
      mockAuthService.resetPassword.mockResolvedValue(undefined);

      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'valid-token', newPassword: 'NewPassword1' })
        .expect(201);
    });

    it('should return 400 for weak password', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'valid-token', newPassword: 'weak' })
        .expect(400);
    });
  });

  describe('POST /auth/google', () => {
    it('should return 200 with tokens', () => {
      mockAuthService.googleLogin.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });

      return request(app.getHttpServer())
        .post('/auth/google')
        .send({ idToken: 'google-id-token' })
        .expect(201);
    });
  });

  describe('POST /auth/apple', () => {
    it('should return 200 with tokens', () => {
      mockAuthService.appleLogin.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });

      return request(app.getHttpServer())
        .post('/auth/apple')
        .send({ identityToken: 'apple-identity-token' })
        .expect(201);
    });
  });

  describe('POST /auth/facebook', () => {
    it('should return 200 with tokens', () => {
      mockAuthService.facebookLogin.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });

      return request(app.getHttpServer())
        .post('/auth/facebook')
        .send({ accessToken: 'fb-access-token' })
        .expect(201);
    });
  });

  describe('POST /auth/whatsapp/request', () => {
    it('should return 200', () => {
      mockAuthService.whatsappRequest.mockResolvedValue({ message: 'Code sent' });

      return request(app.getHttpServer())
        .post('/auth/whatsapp/request')
        .send({ phone: '+243990000001' })
        .expect(201);
    });
  });

  describe('POST /auth/whatsapp/verify', () => {
    it('should return 200 with tokens', () => {
      mockAuthService.whatsappVerify.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });

      return request(app.getHttpServer())
        .post('/auth/whatsapp/verify')
        .send({ phone: '+243990000001', code: '123456' })
        .expect(201);
    });
  });

  describe('POST /auth/2fa/enable', () => {
    it('should return 200 with secret', () => {
      mockAuthService.enable2fa.mockResolvedValue({ secret: 'secret', otpauth: 'otpauth://...' });

      return request(app.getHttpServer()).post('/auth/2fa/enable').expect(201);
    });
  });

  describe('POST /auth/2fa/verify', () => {
    it('should return 200 for valid token', () => {
      mockAuthService.verify2fa.mockResolvedValue({ message: '2FA enabled successfully' });

      return request(app.getHttpServer()).post('/auth/2fa/verify').send({ token: '123456' }).expect(201);
    });
  });

  describe('POST /auth/2fa/disable', () => {
    it('should return 200', () => {
      mockAuthService.disable2fa.mockResolvedValue({ message: '2FA disabled successfully' });

      return request(app.getHttpServer()).post('/auth/2fa/disable').expect(201);
    });
  });

  describe('POST /auth/login/2fa', () => {
    it('should return 200 with tokens', () => {
      mockAuthService.loginWith2fa.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });

      return request(app.getHttpServer())
        .post('/auth/login/2fa')
        .send({ temporaryToken: 'tmp-token', code: '123456' })
        .expect(201);
    });
  });
});
