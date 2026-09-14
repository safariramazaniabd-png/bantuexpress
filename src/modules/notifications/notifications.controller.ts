import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiUnauthorizedResponse, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationsQueryDto } from './dto/notifications-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister mes notifications', description: 'Retourne les notifications de l\'utilisateur avec filtres' })
  @ApiOkResponse({ description: 'Liste des notifications retournée' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @ApiQuery({ name: 'unreadOnly', required: false, description: 'Filtrer uniquement les non lues (true/false)' })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre de résultats par page' })
  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: NotificationsQueryDto,
  ) {
    return this.notificationsService.findAll(
      user.userId,
      query.page,
      query.limit,
      query.unreadOnly === 'true',
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marquer comme lue', description: 'Marque une notification spécifique comme lue' })
  @ApiOkResponse({ description: 'Notification marquée comme lue' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @Post(':id/read')
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(user.userId, id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tout marquer comme lu', description: 'Marque toutes les notifications comme lues' })
  @ApiOkResponse({ description: 'Toutes les notifications marquées comme lues' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @Post('read-all')
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une notification', description: 'Supprime définitivement une notification' })
  @ApiOkResponse({ description: 'Notification supprimée' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.notificationsService.remove(user.userId, id);
    return { message: 'Notification deleted' };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer toutes les notifications', description: 'Supprime toutes les notifications de l\'utilisateur' })
  @ApiOkResponse({ description: 'Toutes les notifications supprimées' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @Delete()
  async clearAll(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.clearAll(user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Nombre de non lues', description: 'Retourne le nombre de notifications non lues' })
  @ApiOkResponse({ description: 'Nombre de non lues retourné' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @Get('count')
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.notificationsService.findAll(user.userId, 1, 1, true);
    return { unreadCount: result.meta.unreadCount };
  }
}
