import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { DeliveryController } from '../delivery.controller';
import { DeliveryService } from '../delivery.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

const mockDeliveryService = {
  create: jest.fn(),
  findMyDeliveries: jest.fn(),
  findAvailable: jest.fn(),
  findOne: jest.fn(),
  cancel: jest.fn(),
  accept: jest.fn(),
  markPickedUp: jest.fn(),
  markDelivered: jest.fn(),
  addTrackingPoint: jest.fn(),
  getTrackingHistory: jest.fn(),
};

describe('DeliveryController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryController],
      providers: [{ provide: DeliveryService, useValue: mockDeliveryService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn((context) => {
          const req = context.switchToHttp().getRequest();
          req.user = { userId: 'user-1', role: 'COURIER' };
          return true;
        }),
      })
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

  describe('POST /delivery/orders', () => {
    it('should return 201', () => {
      mockDeliveryService.create.mockResolvedValue({ id: 'del-1', status: 'PENDING' });

      return request(app.getHttpServer())
        .post('/delivery/orders')
        .send({ pickupAddress: '123 Rue A', pickupLat: -4.3, pickupLng: 15.3, dropoffAddress: '456 Rue B', dropoffLat: -4.4, dropoffLng: 15.4, description: 'Colis urgent' })
        .expect(201);
    });
  });

  describe('GET /delivery/orders', () => {
    it('should return 200', () => {
      mockDeliveryService.findMyDeliveries.mockResolvedValue({ data: [], meta: { total: 0 } });

      return request(app.getHttpServer())
        .get('/delivery/orders')
        .expect(200);
    });
  });

  describe('GET /delivery/orders/available', () => {
    it('should return 200', () => {
      mockDeliveryService.findAvailable.mockResolvedValue({ data: [], meta: { total: 0 } });

      return request(app.getHttpServer())
        .get('/delivery/orders/available')
        .expect(200);
    });
  });

  describe('GET /delivery/orders/:id', () => {
    it('should return 200', () => {
      mockDeliveryService.findOne.mockResolvedValue({ id: 'del-1' });

      return request(app.getHttpServer())
        .get('/delivery/orders/del-1')
        .expect(200);
    });
  });

  describe('PATCH /delivery/orders/:id/cancel', () => {
    it('should return 200', () => {
      mockDeliveryService.cancel.mockResolvedValue({ id: 'del-1', status: 'CANCELLED' });

      return request(app.getHttpServer())
        .patch('/delivery/orders/del-1/cancel')
        .expect(200);
    });
  });

  describe('PATCH /delivery/orders/:id/accept', () => {
    it('should return 200', () => {
      mockDeliveryService.accept.mockResolvedValue({ id: 'del-1', status: 'ASSIGNED' });

      return request(app.getHttpServer())
        .patch('/delivery/orders/del-1/accept')
        .expect(200);
    });
  });

  describe('PATCH /delivery/orders/:id/deliver', () => {
    it('should return 200', () => {
      mockDeliveryService.markDelivered.mockResolvedValue({ id: 'del-1', status: 'DELIVERED' });

      return request(app.getHttpServer())
        .patch('/delivery/orders/del-1/deliver')
        .expect(200);
    });
  });

  describe('POST /delivery/orders/:id/tracking', () => {
    it('should return 201', () => {
      mockDeliveryService.addTrackingPoint.mockResolvedValue({ id: 'track-1' });

      return request(app.getHttpServer())
        .post('/delivery/orders/del-1/tracking')
        .send({ latitude: -4.3, longitude: 15.3 })
        .expect(201);
    });
  });

  describe('GET /delivery/orders/:id/tracking', () => {
    it('should return 200', () => {
      mockDeliveryService.getTrackingHistory.mockResolvedValue([]);

      return request(app.getHttpServer())
        .get('/delivery/orders/del-1/tracking')
        .expect(200);
    });
  });
});
