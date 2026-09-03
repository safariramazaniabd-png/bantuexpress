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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AddressQueryDto } from './dto/address-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Adresses')
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une adresse', description: 'Ajoute une nouvelle adresse pour l\'utilisateur connecté' })
  @ApiCreatedResponse({ description: 'Adresse créée avec succès' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressesService.create(user.userId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister mes adresses', description: 'Retourne toutes les adresses de l\'utilisateur connecté' })
  @ApiOkResponse({ description: 'Liste des adresses retournée' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AddressQueryDto,
  ) {
    return this.addressesService.findAll(user.userId, query);
  }

  @ApiOperation({ summary: 'Détails d\'une adresse', description: 'Retourne les détails d\'une adresse par son ID' })
  @ApiOkResponse({ description: 'Adresse retournée' })
  @UseGuards(OptionalAuthGuard)
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.addressesService.findOne(id, user?.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier une adresse', description: 'Met à jour les informations d\'une adresse' })
  @ApiOkResponse({ description: 'Adresse mise à jour' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(id, user.userId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une adresse', description: 'Supprime définitivement une adresse' })
  @ApiOkResponse({ description: 'Adresse supprimée' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.addressesService.remove(id, user.userId);
    return { message: 'Address deleted' };
  }
}
