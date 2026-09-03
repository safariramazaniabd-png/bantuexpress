import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { FavoriteQueryDto } from './dto/favorite-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Favoris')
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ajouter un favori', description: 'Ajoute une entité aux favoris de l\'utilisateur connecté.' })
  @ApiCreatedResponse({ description: 'Le favori a été créé avec succès.' })
  async add(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFavoriteDto,
  ) {
    return this.favoritesService.add(user.userId, dto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister les favoris', description: 'Récupère la liste des favoris de l\'utilisateur connecté.' })
  @ApiOkResponse({ description: 'La liste des favoris est retournée.' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FavoriteQueryDto,
  ) {
    return this.favoritesService.findAll(user.userId, query);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un favori', description: 'Supprime un favori par son identifiant.' })
  @ApiOkResponse({ description: 'Le favori a été supprimé.' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.favoritesService.remove(user.userId, id);
    return { message: 'Favorite removed' };
  }

  @Delete('entity/:entityType/:entityId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un favori par entité', description: 'Supprime un favori en fonction du type et de l\'identifiant de l\'entité.' })
  @ApiOkResponse({ description: 'Le favori a été supprimé.' })
  async removeByEntity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    await this.favoritesService.removeByEntity(user.userId, entityType, entityId);
    return { message: 'Favorite removed' };
  }

  @Get('count/:entityType/:entityId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Compter les favoris d\'une entité', description: 'Retourne le nombre de favoris pour une entité donnée.' })
  @ApiOkResponse({ description: 'Le nombre de favoris est retourné.' })
  async count(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    const count = await this.favoritesService.count(entityType, entityId);
    return { count };
  }
}
