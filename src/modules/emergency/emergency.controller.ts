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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { EmergencyService } from './emergency.service';
import { CreateEmergencyDto } from './dto/create-emergency.dto';
import { EmergencyQueryDto } from './dto/emergency-query.dto';
import { ResolveEmergencyDto } from './dto/resolve-emergency.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Urgences')
@ApiBearerAuth()
@Controller('emergency')
@UseGuards(JwtAuthGuard)
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  @ApiOperation({ summary: 'Signaler une urgence', description: 'Crée un signalement d\'urgence. La sévérité est automatiquement déterminée selon le type (POLICE=HIGH, FIRE=CRITICAL, MEDICAL=CRITICAL...).' })
  @ApiCreatedResponse({ description: 'Signalement créé' })
  @Post('reports')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEmergencyDto,
  ) {
    return this.emergencyService.create(user.userId, dto);
  }

  @ApiOperation({ summary: 'Mes signalements', description: 'Liste ses propres signalements d\'urgence. Utiliser ?view=interventions pour voir les interventions assignées.' })
  @ApiOkResponse({ description: 'Liste paginée des signalements' })
  @Get('reports')
  async findMyReports(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: EmergencyQueryDto,
    @Query('view') view?: string,
  ) {
    if (view === 'interventions') {
      return this.emergencyService.findMyInterventions(user.userId, query);
    }
    return this.emergencyService.findMyReports(user.userId, query);
  }

  @ApiOperation({ summary: 'Urgences actives', description: 'Liste les signalements en attente d\'assignation, triés par sévérité décroissante (CRITICAL d\'abord). Réservé aux intervenants EMERGENCY et ADMIN.' })
  @ApiOkResponse({ description: 'Liste des urgences actives' })
  @Get('reports/active')
  @UseGuards(RolesGuard)
  @Roles(UserRole.EMERGENCY, UserRole.ADMIN)
  async findActive(@Query() query: EmergencyQueryDto) {
    return this.emergencyService.findActive(query);
  }

  @ApiOperation({ summary: 'Détail d\'un signalement', description: 'Retourne les détails d\'un signalement. Accessible au reporter, au répondant assigné et aux administrateurs.' })
  @ApiOkResponse({ description: 'Détail du signalement' })
  @Get('reports/:id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.emergencyService.findOne(id, user.userId, user.role);
  }

  @ApiOperation({ summary: 'Assigner une urgence', description: 'Un intervenant se déclare disponible pour prendre en charge une urgence. Calcule le temps de réponse. Réservé aux rôles EMERGENCY et ADMIN.' })
  @ApiOkResponse({ description: 'Urgence assignée' })
  @Patch('reports/:id/assign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.EMERGENCY, UserRole.ADMIN)
  async assign(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.emergencyService.assign(id, user.userId);
  }

  @ApiOperation({ summary: 'Démarrer l\'intervention', description: 'Marque l\'intervention comme en cours. L\'intervenant doit être celui assigné. L\'urgence doit être au statut ASSIGNED.' })
  @ApiOkResponse({ description: 'Intervention démarrée' })
  @Patch('reports/:id/start')
  @UseGuards(RolesGuard)
  @Roles(UserRole.EMERGENCY, UserRole.ADMIN)
  async startIntervention(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.emergencyService.startIntervention(id, user.userId);
  }

  @ApiOperation({ summary: 'Résoudre une urgence', description: 'Marque l\'intervention comme résolue avec des notes. Réservé à l\'intervenant assigné.' })
  @ApiOkResponse({ description: 'Urgence résolue' })
  @Patch('reports/:id/resolve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.EMERGENCY, UserRole.ADMIN)
  async resolve(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ResolveEmergencyDto,
  ) {
    return this.emergencyService.resolve(id, user.userId, dto);
  }

  @ApiOperation({ summary: 'Annuler un signalement', description: 'Annule un signalement d\'urgence. Seul l\'auteur du signalement peut annuler, et uniquement si le statut est REPORTED.' })
  @ApiOkResponse({ description: 'Signalement annulé' })
  @Patch('reports/:id/cancel')
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.emergencyService.cancel(id, user.userId);
  }
}
