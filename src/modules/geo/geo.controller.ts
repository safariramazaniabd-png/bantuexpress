import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GeoService } from './geo.service';
import { UpdatePositionDto } from './dto/update-position.dto';
import { PositionQueryDto } from './dto/position-query.dto';
import { CalculateRouteDto } from './dto/calculate-route.dto';
import { MarkerQueryDto } from './dto/marker-query.dto';
import { SaveRouteDto } from './dto/save-route.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @UseGuards(JwtAuthGuard)
  @Post('positions')
  async updatePosition(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePositionDto,
  ) {
    return this.geoService.updatePosition(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('positions/me')
  async getCurrentPosition(@CurrentUser() user: AuthenticatedUser) {
    return this.geoService.getCurrentPosition(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('positions/history')
  async getPositionHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PositionQueryDto,
  ) {
    return this.geoService.getPositionHistory(user.userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('positions/nearby')
  async findNearby(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PositionQueryDto,
  ) {
    return this.geoService.findNearby(user.userId, query);
  }

  @UseGuards(OptionalAuthGuard)
  @Get('markers')
  async getMarkersInBounds(@Query() query: MarkerQueryDto) {
    return this.geoService.getMarkersInBounds(query);
  }

  @Post('routes/calculate')
  async calculateRoute(@Body() dto: CalculateRouteDto) {
    return this.geoService.calculateRoute(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('routes')
  async saveRoute(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveRouteDto,
  ) {
    return this.geoService.saveRoute(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('routes')
  async getRoutes(@CurrentUser() user: AuthenticatedUser) {
    return this.geoService.getRoutes(user.userId);
  }

  @UseGuards(OptionalAuthGuard)
  @Get('routes/:id')
  async getRoute(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.geoService.getRoute(id, user?.userId);
  }
}
