import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { BusinessProfilesService } from './business-profiles.service';
import { CreateBusinessProfileDto } from './dto/create-business-profile.dto';
import { UpdateBusinessProfileDto } from './dto/update-business-profile.dto';
import { BusinessProfileQueryDto } from './dto/business-profile-query.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SetOpeningHoursDto } from './dto/set-opening-hours.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Profils professionnels')
@Controller('business-profiles')
export class BusinessProfilesController {
  constructor(
    private readonly businessProfilesService: BusinessProfilesService,
  ) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un profil pro', description: 'Crée un nouveau profil professionnel pour l\'utilisateur connecté. L\'utilisateur devient automatiquement le propriétaire (owner).' })
  @ApiCreatedResponse({ description: 'Profil professionnel créé' })
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBusinessProfileDto,
  ) {
    return this.businessProfilesService.create(user.userId, dto);
  }

  @ApiOperation({ summary: 'Lister les profils pros', description: 'Liste tous les profils professionnels publics avec filtres (type, secteur, ville, province) et pagination.' })
  @ApiOkResponse({ description: 'Liste paginée des profils' })
  @Get()
  async findAll(@Query() query: BusinessProfileQueryDto) {
    return this.businessProfilesService.findAll(query);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes profils pros', description: 'Liste les profils professionnels de l\'utilisateur connecté (propriétaire ou membre).' })
  @ApiOkResponse({ description: 'Liste des profils' })
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.businessProfilesService.findMine(user.userId);
  }

  @ApiOperation({ summary: 'Détail d\'un profil pro', description: 'Retourne les détails d\'un profil professionnel. Si l\'utilisateur est connecté et propriétaire, les champs privés sont inclus.' })
  @ApiOkResponse({ description: 'Détail du profil' })
  @UseGuards(OptionalAuthGuard)
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.businessProfilesService.findOne(id, user?.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier un profil pro', description: 'Modifie un profil professionnel. Seul le propriétaire ou un membre avec rôle admin peut modifier.' })
  @ApiOkResponse({ description: 'Profil mis à jour' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateBusinessProfileDto,
  ) {
    return this.businessProfilesService.update(id, user.userId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un profil pro', description: 'Supprime (soft-delete) un profil professionnel. Seul le propriétaire peut supprimer.' })
  @ApiOkResponse({ description: 'Profil supprimé' })
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.businessProfilesService.remove(id, user.userId);
    return { message: 'Business profile deleted' };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vérifier un profil pro', description: 'Marque un profil professionnel comme vérifié. Réservé aux administrateurs.' })
  @ApiOkResponse({ description: 'Profil vérifié' })
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/verify')
  async verify(@Param('id') id: string) {
    return this.businessProfilesService.verify(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ajouter un membre', description: 'Ajoute un membre à l\'équipe du profil professionnel. Seul le propriétaire peut ajouter des membres.' })
  @ApiCreatedResponse({ description: 'Membre ajouté' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddMemberDto,
  ) {
    return this.businessProfilesService.addMember(id, user.userId, dto);
  }

  @ApiOperation({ summary: 'Lister les membres', description: 'Liste les membres de l\'équipe d\'un profil professionnel.' })
  @ApiOkResponse({ description: 'Liste des membres' })
  @Get(':id/members')
  async getMembers(@Param('id') id: string) {
    return this.businessProfilesService.getMembers(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retirer un membre', description: 'Retire un membre de l\'équipe. Seul le propriétaire peut retirer des membres.' })
  @ApiOkResponse({ description: 'Membre retiré' })
  @UseGuards(JwtAuthGuard)
  @Delete(':id/members/:userId')
  async removeMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.businessProfilesService.removeMember(
      id,
      user.userId,
      targetUserId,
    );
    return { message: 'Member removed' };
  }

  // ---- Products ----

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ajouter un produit', description: 'Ajoute un produit/service au profil professionnel. Réservé au propriétaire ou admin.' })
  @ApiCreatedResponse({ description: 'Produit créé' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/products')
  async createProduct(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductDto,
  ) {
    return this.businessProfilesService.createProduct(id, user.userId, dto);
  }

  @ApiOperation({ summary: 'Lister les produits', description: 'Liste les produits/services d\'un profil professionnel.' })
  @ApiOkResponse({ description: 'Liste des produits' })
  @Get(':id/products')
  async findProducts(@Param('id') id: string) {
    return this.businessProfilesService.findProducts(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier un produit', description: 'Modifie un produit/service. Réservé au propriétaire ou admin.' })
  @ApiOkResponse({ description: 'Produit mis à jour' })
  @UseGuards(JwtAuthGuard)
  @Patch('products/:productId')
  async updateProduct(
    @Param('productId') productId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProductDto,
  ) {
    return this.businessProfilesService.updateProduct(productId, user.userId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un produit', description: 'Supprime un produit/service. Réservé au propriétaire ou admin.' })
  @ApiOkResponse({ description: 'Produit supprimé' })
  @UseGuards(JwtAuthGuard)
  @Delete('products/:productId')
  async removeProduct(
    @Param('productId') productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.businessProfilesService.removeProduct(productId, user.userId);
    return { message: 'Product deleted' };
  }

  // ---- Opening Hours ----

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Définir horaires', description: 'Définit les horaires d\'ouverture du profil professionnel. Remplace tous les horaires existants.' })
  @ApiCreatedResponse({ description: 'Horaires enregistrés' })
  @UseGuards(JwtAuthGuard)
  @Put(':id/opening-hours')
  async setOpeningHours(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetOpeningHoursDto,
  ) {
    return this.businessProfilesService.setOpeningHours(id, user.userId, dto);
  }

  @ApiOperation({ summary: 'Consulter horaires', description: 'Retourne les horaires d\'ouverture d\'un profil professionnel.' })
  @ApiOkResponse({ description: 'Horaires d\'ouverture' })
  @Get(':id/opening-hours')
  async getOpeningHours(@Param('id') id: string) {
    return this.businessProfilesService.getOpeningHours(id);
  }
}
