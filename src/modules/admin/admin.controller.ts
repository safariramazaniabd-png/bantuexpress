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
import { AdminService } from './admin.service';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { ToggleUserStatusDto } from './dto/toggle-user-status.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReviewReportDto } from './dto/review-report.dto';
import { StatsDto } from './dto/stats.dto';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Administration')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({ summary: 'Liste des utilisateurs', description: 'Liste paginée de tous les utilisateurs avec filtres (rôle, statut, recherche par email/téléphone).' })
  @ApiOkResponse({ description: 'Liste paginée des utilisateurs' })
  @Get('users')
  async findAllUsers(@Query() query: AdminUserQueryDto) {
    return this.adminService.findAllUsers(query);
  }

  @ApiOperation({ summary: 'Détail utilisateur', description: 'Retourne les informations détaillées d\'un utilisateur (profil, nombre d\'adresses, points de repère).' })
  @ApiOkResponse({ description: 'Détail de l\'utilisateur' })
  @Get('users/:id')
  async findUser(@Param('id') id: string) {
    return this.adminService.findUser(id);
  }

  @ApiOperation({ summary: 'Changer le rôle', description: 'Modifie le rôle d\'un utilisateur. Empêche la rétrogradation du dernier ADMIN.' })
  @ApiOkResponse({ description: 'Rôle mis à jour' })
  @Patch('users/:id/role')
  async changeRole(
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.changeRole(id, dto, user.userId);
  }

  @ApiOperation({ summary: 'Activer/désactiver', description: 'Active ou désactive un compte utilisateur.' })
  @ApiOkResponse({ description: 'Statut mis à jour' })
  @Patch('users/:id/status')
  async toggleStatus(
    @Param('id') id: string,
    @Body() dto: ToggleUserStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.toggleStatus(id, dto, user.userId);
  }

  @ApiOperation({ summary: 'Signaler un contenu', description: 'Permet à tout utilisateur connecté de signaler un contenu inapproprié (spam, faux, etc.).' })
  @ApiCreatedResponse({ description: 'Signalement créé' })
  @Post('reports')
  @Roles()
  async createReport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReportDto,
  ) {
    return this.adminService.createReport(dto, user.userId);
  }

  @ApiOperation({ summary: 'Liste des signalements', description: 'Liste paginée des signalements avec filtres (statut, type d\'entité).' })
  @ApiOkResponse({ description: 'Liste des signalements' })
  @Get('reports')
  async findAllReports(@Query() query: ReportQueryDto) {
    return this.adminService.findAllReports(query);
  }

  @ApiOperation({ summary: 'Détail signalement', description: 'Retourne les détails d\'un signalement avec les informations du reporter et du reviewer.' })
  @ApiOkResponse({ description: 'Détail du signalement' })
  @Get('reports/:id')
  async findReport(@Param('id') id: string) {
    return this.adminService.findReport(id);
  }

  @ApiOperation({ summary: 'Traiter un signalement', description: 'Marque un signalement comme REVIEWED ou DISMISSED. Ne peut traiter qu\'un signalement PENDING.' })
  @ApiOkResponse({ description: 'Signalement traité' })
  @Patch('reports/:id/review')
  async reviewReport(
    @Param('id') id: string,
    @Body() dto: ReviewReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.reviewReport(id, dto, user.userId);
  }

  @ApiOperation({ summary: 'Statistiques dashboard', description: 'Retourne les métriques globales : utilisateurs par rôle, livraisons par statut, urgences, entreprises, points de repère, signalements.' })
  @ApiOkResponse({ description: 'Statistiques dashboard' })
  @Get('stats')
  async getStats(@Query() query: StatsDto) {
    return this.adminService.getStats(query);
  }

  @ApiOperation({ summary: 'Journal d\'audit', description: 'Liste paginée des actions administratives (changement de rôle, activation/désactivation, traitement de signalement).' })
  @ApiOkResponse({ description: 'Journal d\'audit' })
  @Get('audit-logs')
  async findAllAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.adminService.findAllAuditLogs(query);
  }

  @ApiOperation({ summary: 'Détail entrée d\'audit', description: 'Retourne les détails d\'une entrée du journal d\'audit.' })
  @ApiOkResponse({ description: 'Entrée d\'audit' })
  @Get('audit-logs/:id')
  async findAuditLog(@Param('id') id: string) {
    return this.adminService.findAuditLog(id);
  }
}
