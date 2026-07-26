import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IdentitiesService } from './identities.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { BadRequestException } from '@nestjs/common';

@Controller('identities')
export class IdentitiesController {
  constructor(private readonly identitiesService: IdentitiesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  async createProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProfileDto,
  ) {
    return this.identitiesService.createProfile(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.identitiesService.getProfile(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.identitiesService.updateProfile(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.identitiesService.uploadAvatar(user.userId, file);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('profile/avatar')
  async deleteAvatar(@CurrentUser() user: AuthenticatedUser) {
    await this.identitiesService.deleteAvatar(user.userId);
    return { message: 'Avatar deleted' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile/qrcode')
  async generateQrCode(
    @CurrentUser() user: AuthenticatedUser,
    @Query('force') force?: string,
  ) {
    return this.identitiesService.generateQrCode(user.userId, force === 'true');
  }

  @Get(':userId')
  async getPublicProfile(@Param('userId') userId: string) {
    return this.identitiesService.getPublicProfile(userId);
  }
}
