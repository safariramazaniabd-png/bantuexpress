import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiUnauthorizedResponse, ApiQuery } from '@nestjs/swagger';
import { GeoService } from './geo.service';
import { UpdatePositionDto } from './dto/update-position.dto';
import { PositionQueryDto } from './dto/position-query.dto';
import { CalculateRouteDto } from './dto/calculate-route.dto';
import { MarkerQueryDto } from './dto/marker-query.dto';
import { SaveRouteDto } from './dto/save-route.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Géolocalisation')
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour ma position', description: 'Enregistre la position GPS actuelle de l\'utilisateur' })
  @ApiCreatedResponse({ description: 'Position enregistrée avec succès' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @UseGuards(JwtAuthGuard)
  @Post('positions')
  async updatePosition(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePositionDto,
  ) {
    return this.geoService.updatePosition(user.userId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ma position actuelle', description: 'Retourne la dernière position enregistrée de l\'utilisateur' })
  @ApiOkResponse({ description: 'Position actuelle retournée' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @UseGuards(JwtAuthGuard)
  @Get('positions/me')
  async getCurrentPosition(@CurrentUser() user: AuthenticatedUser) {
    return this.geoService.getCurrentPosition(user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Historique de positions', description: 'Retourne l\'historique des positions de l\'utilisateur' })
  @ApiOkResponse({ description: 'Historique des positions retourné' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre de positions à retourner' })
  @UseGuards(JwtAuthGuard)
  @Get('positions/history')
  async getPositionHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PositionQueryDto,
  ) {
    return this.geoService.getPositionHistory(user.userId, query);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Utilisateurs à proximité', description: 'Trouve les utilisateurs et points de repère proches' })
  @ApiOkResponse({ description: 'Résultats de proximité retournés' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @ApiQuery({ name: 'type', required: false, description: 'Type de résultats : users, landmarks ou all' })
  @ApiQuery({ name: 'radius', required: false, description: 'Rayon de recherche en mètres' })
  @UseGuards(JwtAuthGuard)
  @Get('positions/nearby')
  async findNearby(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PositionQueryDto,
  ) {
    return this.geoService.findNearby(user.userId, query);
  }

  @ApiOperation({ summary: 'Marqueurs sur la carte', description: 'Retourne les marqueurs dans une zone géographique' })
  @ApiOkResponse({ description: 'Marqueurs retournés' })
  @ApiQuery({ name: 'swLat', required: false, description: 'Latitude sud-ouest de la bounding box' })
  @ApiQuery({ name: 'swLng', required: false, description: 'Longitude sud-ouest de la bounding box' })
  @ApiQuery({ name: 'neLat', required: false, description: 'Latitude nord-est de la bounding box' })
  @ApiQuery({ name: 'neLng', required: false, description: 'Longitude nord-est de la bounding box' })
  @UseGuards(OptionalAuthGuard)
  @Get('markers')
  async getMarkersInBounds(@Query() query: MarkerQueryDto) {
    return this.geoService.getMarkersInBounds(query);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calculer un itinéraire', description: 'Calcule un itinéraire entre deux points' })
  @ApiCreatedResponse({ description: 'Itinéraire calculé' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @UseGuards(JwtAuthGuard)
  @Post('routes/calculate')
  async calculateRoute(@Body() dto: CalculateRouteDto) {
    return this.geoService.calculateRoute(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sauvegarder un itinéraire', description: 'Enregistre un itinéraire pour réutilisation future' })
  @ApiCreatedResponse({ description: 'Itinéraire sauvegardé' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @UseGuards(JwtAuthGuard)
  @Post('routes')
  async saveRoute(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveRouteDto,
  ) {
    return this.geoService.saveRoute(user.userId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes itinéraires', description: 'Retourne les itinéraires sauvegardés de l\'utilisateur' })
  @ApiOkResponse({ description: 'Liste des itinéraires retournée' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @UseGuards(JwtAuthGuard)
  @Get('routes')
  async getRoutes(@CurrentUser() user: AuthenticatedUser) {
    return this.geoService.getRoutes(user.userId);
  }

  @ApiOperation({ summary: 'Détails d\'un itinéraire', description: 'Retourne les détails d\'un itinéraire par son ID' })
  @ApiOkResponse({ description: 'Itinéraire retourné' })
  @UseGuards(OptionalAuthGuard)
  @Get('routes/:id')
  async getRoute(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.geoService.getRoute(id, user?.userId);
  }
}
