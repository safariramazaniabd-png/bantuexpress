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
import { LandmarksService } from './landmarks.service';
import { CreateLandmarkDto } from './dto/create-landmark.dto';
import { UpdateLandmarkDto } from './dto/update-landmark.dto';
import { LandmarkQueryDto } from './dto/landmark-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Controller('landmarks')
export class LandmarksController {
  constructor(private readonly landmarksService: LandmarksService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLandmarkDto,
  ) {
    return this.landmarksService.create(user.userId, dto);
  }

  @UseGuards(OptionalAuthGuard)
  @Get()
  async findAll(@Query() query: LandmarkQueryDto) {
    return this.landmarksService.findAll(query);
  }

  @UseGuards(OptionalAuthGuard)
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.landmarksService.findOne(id, user?.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateLandmarkDto,
  ) {
    return this.landmarksService.update(id, user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.landmarksService.remove(id, user.userId);
    return { message: 'Landmark deleted' };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/verify')
  async verify(@Param('id') id: string) {
    return this.landmarksService.verify(id);
  }
}
