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
import { AdminService } from './admin.service';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { ToggleUserStatusDto } from './dto/toggle-user-status.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReviewReportDto } from './dto/review-report.dto';
import { StatsDto } from './dto/stats.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async findAllUsers(@Query() query: AdminUserQueryDto) {
    return this.adminService.findAllUsers(query);
  }

  @Get('users/:id')
  async findUser(@Param('id') id: string) {
    return this.adminService.findUser(id);
  }

  @Patch('users/:id/role')
  async changeRole(
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.changeRole(id, dto, user.userId);
  }

  @Patch('users/:id/status')
  async toggleStatus(
    @Param('id') id: string,
    @Body() dto: ToggleUserStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.toggleStatus(id, dto, user.userId);
  }

  @Post('reports')
  @Roles()
  async createReport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReportDto,
  ) {
    return this.adminService.createReport(dto, user.userId);
  }

  @Get('reports')
  async findAllReports(@Query() query: ReportQueryDto) {
    return this.adminService.findAllReports(query);
  }

  @Get('reports/:id')
  async findReport(@Param('id') id: string) {
    return this.adminService.findReport(id);
  }

  @Patch('reports/:id/review')
  async reviewReport(
    @Param('id') id: string,
    @Body() dto: ReviewReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.reviewReport(id, dto, user.userId);
  }

  @Get('stats')
  async getStats(@Query() query: StatsDto) {
    return this.adminService.getStats(query);
  }

  @Get('audit-logs')
  async findAllAuditLogs(
    @Query('action') action?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.findAllAuditLogs({ action, page, limit });
  }

  @Get('audit-logs/:id')
  async findAuditLog(@Param('id') id: string) {
    return this.adminService.findAuditLog(id);
  }
}
