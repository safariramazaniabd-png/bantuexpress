import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { SharingService } from './sharing.service';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Partage')
@Controller('sharing')
export class SharingController {
  constructor(private readonly sharingService: SharingService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un lien de partage', description: 'Crée un lien de partage pour une entité donnée.' })
  @ApiCreatedResponse({ description: 'Le lien de partage a été créé avec succès.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateShareLinkDto,
  ) {
    return this.sharingService.create(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes liens de partage', description: 'Récupère les liens de partage créés par l\'utilisateur connecté.' })
  @ApiOkResponse({ description: 'La liste de vos liens de partage est retournée.' })
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.sharingService.findMine(user.userId);
  }

  @Get('resolve/:token')
  @ApiOperation({ summary: 'Résoudre un lien de partage', description: 'Résout un lien de partage à partir de son token.' })
  @ApiOkResponse({ description: 'Le contenu partagé est retourné.' })
  async resolve(@Param('token') token: string) {
    return this.sharingService.resolve(token);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un lien de partage', description: 'Supprime un lien de partage existant appartenant à l\'utilisateur connecté.' })
  @ApiOkResponse({ description: 'Le lien de partage a été supprimé.' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.sharingService.remove(user.userId, id);
    return { message: 'Share link deleted' };
  }
}
