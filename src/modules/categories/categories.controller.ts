import {
  Controller,
  Get,
  Post,
  Patch,
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
import { UserRole } from '@prisma/client';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Catégories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une catégorie', description: 'Crée une nouvelle catégorie (admin uniquement).' })
  @ApiCreatedResponse({ description: 'La catégorie a été créée avec succès.' })
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les catégories', description: 'Récupère la liste de toutes les catégories.' })
  @ApiOkResponse({ description: 'La liste des catégories est retournée.' })
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Get('roots')
  @ApiOperation({ summary: 'Catégories racines', description: 'Récupère les catégories de premier niveau (racines).' })
  @ApiOkResponse({ description: 'La liste des catégories racines est retournée.' })
  async findRoots() {
    return this.categoriesService.findRoots();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'une catégorie', description: 'Récupère les détails d\'une catégorie par son identifiant.' })
  @ApiOkResponse({ description: 'Les détails de la catégorie sont retournés.' })
  async findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Catégorie par slug', description: 'Récupère une catégorie par son slug unique.' })
  @ApiOkResponse({ description: 'La catégorie correspondante est retournée.' })
  async findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier une catégorie', description: 'Modifie une catégorie existante (admin uniquement).' })
  @ApiOkResponse({ description: 'La catégorie a été modifiée avec succès.' })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une catégorie', description: 'Supprime une catégorie existante (admin uniquement).' })
  @ApiOkResponse({ description: 'La catégorie a été supprimée.' })
  async remove(@Param('id') id: string) {
    await this.categoriesService.remove(id);
    return { message: 'Category deleted' };
  }
}
