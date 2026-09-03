import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, NotFoundException } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { AddressesController } from '../addresses.controller';
import { AddressesService } from '../addresses.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../../auth/guards/optional-auth.guard';

const mockAddressesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockAuthGuard = {
  canActivate: jest.fn((context) => {
    const req = context.switchToHttp().getRequest();
    req.user = { userId: 'user-1', role: 'INDIVIDUAL' };
    return true;
  }),
};

describe('AddressesController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressesController],
      providers: [{ provide: AddressesService, useValue: mockAddressesService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(OptionalAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
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

  describe('POST /addresses', () => {
    it('should return 201', () => {
      mockAddressesService.create.mockResolvedValue({ id: 'addr-1', label: 'Domicile' });

      return request(app.getHttpServer())
        .post('/addresses')
        .send({ label: 'Domicile', type: 'HOME', city: 'Kinshasa', country: 'CD' })
        .expect(201);
    });

    it('should return 400 for missing required fields', () => {
      return request(app.getHttpServer())
        .post('/addresses')
        .send({ label: 'Domicile' })
        .expect(400);
    });
  });

  describe('GET /addresses', () => {
    it('should return 200', () => {
      mockAddressesService.findAll.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });

      return request(app.getHttpServer())
        .get('/addresses')
        .expect(200);
    });
  });

  describe('GET /addresses/:id', () => {
    it('should return 200', () => {
      mockAddressesService.findOne.mockResolvedValue({ id: 'addr-1', label: 'Domicile' });

      return request(app.getHttpServer())
        .get('/addresses/addr-1')
        .expect(200);
    });

    it('should return 404 for non-existent', () => {
      mockAddressesService.findOne.mockRejectedValue(new NotFoundException());

      return request(app.getHttpServer())
        .get('/addresses/nonexistent')
        .expect(404);
    });
  });

  describe('PATCH /addresses/:id', () => {
    it('should return 200', () => {
      mockAddressesService.update.mockResolvedValue({ id: 'addr-1', label: 'Updated' });

      return request(app.getHttpServer())
        .patch('/addresses/addr-1')
        .send({ label: 'Updated' })
        .expect(200);
    });
  });

  describe('DELETE /addresses/:id', () => {
    it('should return 201', () => {
      mockAddressesService.remove.mockResolvedValue(undefined);

      return request(app.getHttpServer())
        .delete('/addresses/addr-1')
        .expect(200);
    });
  });
});
