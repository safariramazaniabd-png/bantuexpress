import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { DeliveryService } from './delivery.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { DeliveryQueryDto } from './dto/delivery-query.dto';
import { TrackingDto } from './dto/tracking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

const UUID_PIPE = new ParseUUIDPipe({ version: '4' });

@ApiTags('Livraison')
@Controller('delivery')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une commande', description: 'Crée une nouvelle commande de livraison' })
  @ApiCreatedResponse({ description: 'Commande créée avec succès' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @Post('orders')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDeliveryDto,
  ) {
    return this.deliveryService.create(user.userId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes livraisons', description: 'Retourne les livraisons de l\'utilisateur selon son rôle' })
  @ApiOkResponse({ description: 'Liste des livraisons retournée' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @Get('orders')
  async findMyDeliveries(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DeliveryQueryDto,
  ) {
    return this.deliveryService.findMyDeliveries(
      user.userId,
      query.role ?? 'client',
      query,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Livraisons disponibles', description: 'Retourne les livraisons disponibles pour les livreurs' })
  @ApiOkResponse({ description: 'Liste des livraisons disponibles retournée' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @Roles(UserRole.COURIER)
  @Get('orders/available')
  async findAvailable(@Query() query: DeliveryQueryDto) {
    return this.deliveryService.findAvailable(query);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détails d\'une livraison', description: 'Retourne les détails d\'une livraison par son ID' })
  @ApiOkResponse({ description: 'Livraison retournée' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @Get('orders/:id')
  async findOne(
    @Param('id', UUID_PIPE) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.findOne(id, user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Annuler une livraison', description: 'Annule une commande de livraison' })
  @ApiOkResponse({ description: 'Livraison annulée' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @Patch('orders/:id/cancel')
  async cancel(
    @Param('id', UUID_PIPE) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.cancel(id, user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accepter une livraison', description: 'Un livreur accepte une commande de livraison' })
  @ApiOkResponse({ description: 'Livraison acceptée' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @Roles(UserRole.COURIER)
  @Patch('orders/:id/accept')
  async accept(
    @Param('id', UUID_PIPE) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.accept(id, user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marquer enlevé', description: 'Marque la livraison comme enlevée par le livreur' })
  @ApiOkResponse({ description: 'Livraison marquée comme enlevée' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @Roles(UserRole.COURIER)
  @Patch('orders/:id/pickup')
  async markPickedUp(
    @Param('id', UUID_PIPE) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.markPickedUp(id, user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marquer livré', description: 'Marque la livraison comme livrée au destinataire' })
  @ApiOkResponse({ description: 'Livraison marquée comme livrée' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @Roles(UserRole.COURIER)
  @Patch('orders/:id/deliver')
  async markDelivered(
    @Param('id', UUID_PIPE) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.markDelivered(id, user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ajouter un point de suivi', description: 'Enregistre un point GPS pendant le transport' })
  @ApiCreatedResponse({ description: 'Point de suivi enregistré' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @Roles(UserRole.COURIER)
  @Post('orders/:id/tracking')
  async addTrackingPoint(
    @Param('id', UUID_PIPE) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TrackingDto,
  ) {
    return this.deliveryService.addTrackingPoint(id, user.userId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Historique de suivi', description: 'Retourne les points GPS enregistrés pour une livraison' })
  @ApiOkResponse({ description: 'Historique de suivi retourné' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @Get('orders/:id/tracking')
  async getTrackingHistory(
    @Param('id', UUID_PIPE) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryService.getTrackingHistory(id, user.userId);
  }
}
