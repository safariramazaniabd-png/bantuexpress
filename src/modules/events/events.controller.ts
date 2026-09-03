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
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Événements')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un événement', description: 'Crée un nouvel événement pour l\'utilisateur connecté.' })
  @ApiCreatedResponse({ description: 'L\'événement a été créé avec succès.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les événements', description: 'Récupère la liste paginée des événements publics.' })
  @ApiOkResponse({ description: 'La liste des événements est retournée.' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.eventsService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes événements', description: 'Récupère les événements créés par l\'utilisateur connecté.' })
  @ApiOkResponse({ description: 'La liste de vos événements est retournée.' })
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.findMine(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un événement', description: 'Récupère les détails d\'un événement par son identifiant.' })
  @ApiOkResponse({ description: 'Les détails de l\'événement sont retournés.' })
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier un événement', description: 'Modifie un événement existant appartenant à l\'utilisateur connecté.' })
  @ApiOkResponse({ description: 'L\'événement a été modifié avec succès.' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un événement', description: 'Supprime un événement existant appartenant à l\'utilisateur connecté.' })
  @ApiOkResponse({ description: 'L\'événement a été supprimé.' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.eventsService.remove(id, user.userId);
    return { message: 'Event deleted' };
  }
}
