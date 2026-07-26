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
import { BusinessProfilesService } from './business-profiles.service';
import { CreateBusinessProfileDto } from './dto/create-business-profile.dto';
import { UpdateBusinessProfileDto } from './dto/update-business-profile.dto';
import { BusinessProfileQueryDto } from './dto/business-profile-query.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Controller('business-profiles')
export class BusinessProfilesController {
  constructor(
    private readonly businessProfilesService: BusinessProfilesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBusinessProfileDto,
  ) {
    return this.businessProfilesService.create(user.userId, dto);
  }

  @Get()
  async findAll(@Query() query: BusinessProfileQueryDto) {
    return this.businessProfilesService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.businessProfilesService.findMine(user.userId);
  }

  @UseGuards(OptionalAuthGuard)
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.businessProfilesService.findOne(id, user?.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateBusinessProfileDto,
  ) {
    return this.businessProfilesService.update(id, user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.businessProfilesService.remove(id, user.userId);
    return { message: 'Business profile deleted' };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/verify')
  async verify(@Param('id') id: string) {
    return this.businessProfilesService.verify(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddMemberDto,
  ) {
    return this.businessProfilesService.addMember(id, user.userId, dto);
  }

  @Get(':id/members')
  async getMembers(@Param('id') id: string) {
    return this.businessProfilesService.getMembers(id);
  }

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
}
