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
import { EmergencyService } from './emergency.service';
import { CreateEmergencyDto } from './dto/create-emergency.dto';
import { EmergencyQueryDto } from './dto/emergency-query.dto';
import { ResolveEmergencyDto } from './dto/resolve-emergency.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('emergency')
@UseGuards(JwtAuthGuard)
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  @Post('reports')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEmergencyDto,
  ) {
    return this.emergencyService.create(user.userId, dto);
  }

  @Get('reports')
  async findMyReports(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: EmergencyQueryDto,
    @Query('view') view?: string,
  ) {
    if (view === 'interventions') {
      return this.emergencyService.findMyInterventions(user.userId, query);
    }
    return this.emergencyService.findMyReports(user.userId, query);
  }

  @Get('reports/active')
  @UseGuards(RolesGuard)
  @Roles(UserRole.EMERGENCY, UserRole.ADMIN)
  async findActive(@Query() query: EmergencyQueryDto) {
    return this.emergencyService.findActive(query);
  }

  @Get('reports/:id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.emergencyService.findOne(id, user.userId, user.role);
  }

  @Patch('reports/:id/assign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.EMERGENCY, UserRole.ADMIN)
  async assign(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.emergencyService.assign(id, user.userId);
  }

  @Patch('reports/:id/start')
  @UseGuards(RolesGuard)
  @Roles(UserRole.EMERGENCY, UserRole.ADMIN)
  async startIntervention(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.emergencyService.startIntervention(id, user.userId);
  }

  @Patch('reports/:id/resolve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.EMERGENCY, UserRole.ADMIN)
  async resolve(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ResolveEmergencyDto,
  ) {
    return this.emergencyService.resolve(id, user.userId, dto);
  }

  @Patch('reports/:id/cancel')
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.emergencyService.cancel(id, user.userId);
  }
}
