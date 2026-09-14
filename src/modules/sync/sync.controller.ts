import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiUnauthorizedResponse, ApiQuery } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { SyncPushDto } from './dto/sync-push.dto';
import { SyncPullQueryDto } from './dto/sync-pull-query.dto';

@ApiTags('Synchronisation')
@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pousser les données', description: 'Envoie les opérations hors ligne au serveur pour synchronisation' })
  @ApiOkResponse({ description: 'Données synchronisées avec succès' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @Post('push')
  async push(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SyncPushDto,
  ) {
    return this.syncService.push(user.userId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les données', description: 'Récupère les modifications depuis la dernière synchronisation' })
  @ApiOkResponse({ description: 'Données récupérées avec succès' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @ApiQuery({ name: 'since', required: false, description: 'Horodatage de la dernière synchronisation (ISO 8601)' })
  @ApiQuery({ name: 'entityTypes', required: false, description: 'Types d\'entités à synchroniser' })
  @Get('pull')
  async pull(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SyncPullQueryDto,
  ) {
    return this.syncService.pull(user.userId, query);
  }
}
