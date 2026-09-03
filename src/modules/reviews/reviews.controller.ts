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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Avis')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un avis', description: 'Crée un avis sur une entité pour l\'utilisateur connecté.' })
  @ApiCreatedResponse({ description: 'L\'avis a été créé avec succès.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les avis', description: 'Récupère la liste des avis avec filtres optionnels.' })
  @ApiOkResponse({ description: 'La liste des avis est retournée.' })
  async findAll(@Query() query: ReviewQueryDto) {
    return this.reviewsService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier un avis', description: 'Modifie un avis existant appartenant à l\'utilisateur connecté.' })
  @ApiOkResponse({ description: 'L\'avis a été modifié avec succès.' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un avis', description: 'Supprime un avis existant appartenant à l\'utilisateur connecté.' })
  @ApiOkResponse({ description: 'L\'avis a été supprimé.' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.reviewsService.remove(id, user.userId);
    return { message: 'Review deleted' };
  }

  @Get('stats/:entityType/:entityId')
  @ApiOperation({ summary: 'Statistiques des avis', description: 'Retourne les statistiques d\'avis pour une entité donnée.' })
  @ApiOkResponse({ description: 'Les statistiques d\'avis sont retournées.' })
  async getStats(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.reviewsService.getStats(entityType, entityId);
  }
}
