import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { DeliveryQueryDto } from './dto/delivery-query.dto';
import { TrackingDto } from './dto/tracking.dto';
import { DeliveryStatus, PackageSize } from '@prisma/client';

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  private haversine(
    lat1: number, lng1: number,
    lat2: number, lng2: number,
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return Math.round((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) * 100) / 100;
  }

  private calculatePrice(distanceKm: number, packageSize: PackageSize): number {
    const baseFare = { SMALL: 3, MEDIUM: 5, LARGE: 8, EXTRA_LARGE: 12 };
    const perKm = { SMALL: 0.5, MEDIUM: 0.8, LARGE: 1.2, EXTRA_LARGE: 1.8 };
    return Math.round((baseFare[packageSize] + perKm[packageSize] * distanceKm) * 100) / 100;
  }

  async create(clientId: string, dto: CreateDeliveryDto) {
    const distanceKm = this.haversine(
      dto.pickupLat, dto.pickupLng,
      dto.dropoffLat, dto.dropoffLng,
    );
    const packageSize = dto.packageSize ?? PackageSize.MEDIUM;
    const price = this.calculatePrice(distanceKm, packageSize);

    return this.prisma.delivery.create({
      data: {
        clientId,
        packageSize,
        description: dto.description,
        pickupAddress: dto.pickupAddress,
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        dropoffAddress: dto.dropoffAddress,
        dropoffLat: dto.dropoffLat,
        dropoffLng: dto.dropoffLng,
        distanceKm,
        price,
        status: DeliveryStatus.PENDING,
      },
    });
  }

  async findMyDeliveries(userId: string, role: 'client' | 'courier', query: DeliveryQueryDto) {
    const { status, page = 1, limit = 20 } = query;

    const where: any =
      role === 'client' ? { clientId: userId } : { courierId: userId };

    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true } },
          courier: { select: { id: true } },
        },
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findAvailable(query: DeliveryQueryDto) {
    const { page = 1, limit = 20 } = query;

    const where = { status: DeliveryStatus.PENDING };

    const [data, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where,
        // Champs strictement nécessaires au boukage. clientId est exclu :
        // le livreur n'a pas besoin d'identifier le client via la liste publique.
        select: {
          id: true,
          status: true,
          packageSize: true,
          description: true,
          pickupAddress: true,
          pickupLat: true,
          pickupLng: true,
          dropoffAddress: true,
          dropoffLat: true,
          dropoffLng: true,
          distanceKm: true,
          price: true,
          createdAt: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findOne(id: string, userId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        client: { select: { id: true } },
        courier: { select: { id: true } },
      },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.clientId !== userId && delivery.courierId !== userId) {
      throw new NotFoundException('Delivery not found');
    }

    return delivery;
  }

  async cancel(id: string, userId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.clientId !== userId) {
      throw new ForbiddenException('Only the client can cancel');
    }

    // Transition PENDING -> CANCELLED atomique : la garde `status` est portée
    // dans le WHERE de l'UPDATE pour empêcher tout double-cancel / cancel-après-accept.
    const result = await this.prisma.delivery.updateMany({
      where: { id, status: DeliveryStatus.PENDING },
      data: {
        status: DeliveryStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledReason: 'Cancelled by client',
      },
    });

    if (result.count === 0) {
      throw new BadRequestException('Can only cancel pending deliveries');
    }

    return this.prisma.delivery.findUnique({ where: { id } });
  }

  async accept(id: string, courierId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.clientId === courierId) {
      throw new ForbiddenException('Cannot accept your own delivery');
    }

    if (delivery.status !== DeliveryStatus.PENDING) {
      throw new BadRequestException('Delivery is no longer available');
    }

    const activeDeliveries = await this.prisma.delivery.count({
      where: {
        courierId,
        status: {
          in: [DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT],
        },
      },
    });

    if (activeDeliveries > 0) {
      throw new BadRequestException('Complete your current delivery first');
    }

    // Transition PENDING -> ASSIGNED atomique : deux livreurs concurrents ne
    // peuvent pas accepter la même course — un seul updateMany aboutit.
    const result = await this.prisma.delivery.updateMany({
      where: { id, status: DeliveryStatus.PENDING },
      data: { courierId, status: DeliveryStatus.ASSIGNED },
    });

    if (result.count === 0) {
      throw new BadRequestException('Delivery is no longer available');
    }

    return this.prisma.delivery.findUnique({ where: { id } });
  }

  async markPickedUp(id: string, courierId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.courierId !== courierId) {
      throw new ForbiddenException('Not your delivery');
    }

    if (delivery.status !== DeliveryStatus.ASSIGNED) {
      throw new BadRequestException('Delivery must be assigned first');
    }

    // Transition ASSIGNED -> PICKED_UP atomique.
    const result = await this.prisma.delivery.updateMany({
      where: { id, courierId, status: DeliveryStatus.ASSIGNED },
      data: { status: DeliveryStatus.PICKED_UP, pickedUpAt: new Date() },
    });

    if (result.count === 0) {
      throw new BadRequestException('Delivery must be assigned first');
    }

    return this.prisma.delivery.findUnique({ where: { id } });
  }

  async markDelivered(id: string, courierId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.courierId !== courierId) {
      throw new ForbiddenException('Not your delivery');
    }

    if (delivery.status !== DeliveryStatus.PICKED_UP) {
      throw new BadRequestException('Delivery must be picked up first');
    }

    // Transition PICKED_UP -> DELIVERED atomique.
    const result = await this.prisma.delivery.updateMany({
      where: { id, courierId, status: DeliveryStatus.PICKED_UP },
      data: { status: DeliveryStatus.DELIVERED, deliveredAt: new Date() },
    });

    if (result.count === 0) {
      throw new BadRequestException('Delivery must be picked up first');
    }

    return this.prisma.delivery.findUnique({ where: { id } });
  }

  async addTrackingPoint(id: string, courierId: string, dto: TrackingDto) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.courierId !== courierId) {
      throw new ForbiddenException('Not your delivery');
    }

    if (delivery.status === DeliveryStatus.PENDING || delivery.status === DeliveryStatus.DELIVERED || delivery.status === DeliveryStatus.CANCELLED) {
      throw new BadRequestException('Delivery is not in transit');
    }

    return this.prisma.deliveryTracking.create({
      data: {
        deliveryId: id,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
  }

  async getTrackingHistory(id: string, userId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.clientId !== userId && delivery.courierId !== userId) {
      throw new NotFoundException('Delivery not found');
    }

    return this.prisma.deliveryTracking.findMany({
      where: { deliveryId: id },
      orderBy: { recordedAt: 'asc' },
    });
  }
}
