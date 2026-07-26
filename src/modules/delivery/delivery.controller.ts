import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { DeliveryQueryDto } from './dto/delivery-query.dto';
import { TrackingDto } from './dto/tracking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Controller('delivery')
@UseGuards(JwtAuthGuard)
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post('orders')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDeliveryDto,
  ) {
    return this.deliveryService.create(user.userId, dto);
  }

  @Get('orders')
  async findMyDeliveries(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DeliveryQueryDto,
    @Query('role') role?: string,
  ) {
    return this.deliveryService.findMyDeliveries(
      user.userId,
      (role as 'client' | 'courier') ?? 'client',
      query,
    );
  }

  @Get('orders/available')
  async findAvailable(@Query() query: DeliveryQueryDto) {
    return this.deliveryService.findAvailable(query);
  }

  @Get('orders/:id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.findOne(id, user.userId);
  }

  @Patch('orders/:id/cancel')
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.cancel(id, user.userId);
  }

  @Patch('orders/:id/accept')
  async accept(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.accept(id, user.userId);
  }

  @Patch('orders/:id/pickup')
  async markPickedUp(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.markPickedUp(id, user.userId);
  }

  @Patch('orders/:id/deliver')
  async markDelivered(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.markDelivered(id, user.userId);
  }

  @Post('orders/:id/tracking')
  async addTrackingPoint(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TrackingDto,
  ) {
    return this.deliveryService.addTrackingPoint(id, user.userId, dto);
  }

  @Get('orders/:id/tracking')
  async getTrackingHistory(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.getTrackingHistory(id, user.userId);
  }
}
