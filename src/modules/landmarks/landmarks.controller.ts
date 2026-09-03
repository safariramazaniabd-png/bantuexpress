import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiUnauthorizedResponse, ApiQuery } from '@nestjs/swagger';
import { LandmarksService } from './landmarks.service';
import { CreateLandmarkDto } from './dto/create-landmark.dto';
import { UpdateLandmarkDto } from './dto/update-landmark.dto';
import { LandmarkQueryDto } from './dto/landmark-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Points de repère')
@Controller('landmarks')
export class LandmarksController {
  constructor(private readonly landmarksService: LandmarksService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un point de repère', description: 'Ajoute un nouveau point de repère' })
  @ApiCreatedResponse({ description: 'Point de repère créé avec succès' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLandmarkDto,
  ) {
    return this.landmarksService.create(user.userId, dto);
  }

  @ApiOperation({ summary: 'Rechercher des points de repère', description: 'Liste les points de repère avec filtres optionnels' })
  @ApiOkResponse({ description: 'Liste des points de repère retournée' })
  @ApiQuery({ name: 'category', required: false, description: 'Filtrer par catégorie' })
  @ApiQuery({ name: 'city', required: false, description: 'Filtrer par ville' })
  @ApiQuery({ name: 'lat', required: false, description: 'Latitude du centre de recherche' })
  @ApiQuery({ name: 'lng', required: false, description: 'Longitude du centre de recherche' })
  @ApiQuery({ name: 'radius', required: false, description: 'Rayon de recherche en mètres' })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre de résultats par page' })
  @UseGuards(OptionalAuthGuard)
  @Get()
  async findAll(@Query() query: LandmarkQueryDto) {
    return this.landmarksService.findAll(query);
  }

  @ApiOperation({ summary: 'Détails d\'un point de repère', description: 'Retourne les détails d\'un point de repère par son ID' })
  @ApiOkResponse({ description: 'Point de repère retourné' })
  @UseGuards(OptionalAuthGuard)
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.landmarksService.findOne(id, user?.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier un point de repère', description: 'Met à jour les informations d\'un point de repère' })
  @ApiOkResponse({ description: 'Point de repère mis à jour' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateLandmarkDto,
  ) {
    return this.landmarksService.update(id, user.userId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un point de repère', description: 'Supprime définitivement un point de repère' })
  @ApiOkResponse({ description: 'Point de repère supprimé' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.landmarksService.remove(id, user.userId);
    return { message: 'Landmark deleted' };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vérifier un point de repère', description: 'Marque un point de repère comme vérifié' })
  @ApiOkResponse({ description: 'Point de repère vérifié' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id/verify')
  async verify(@Param('id') id: string) {
    return this.landmarksService.verify(id);
  }
}
