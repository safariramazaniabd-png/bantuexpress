import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { QrCodesService } from './qrcodes.service';
import { CreateQrCodeDto } from './dto/create-qrcode.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Controller('qrcodes')
export class QrCodesController {
  constructor(private readonly qrCodesService: QrCodesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateQrCodeDto,
  ) {
    return this.qrCodesService.create(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.qrCodesService.findMine(user.userId);
  }

  @Get(':code')
  async resolve(@Param('code') code: string) {
    return this.qrCodesService.resolve(code);
  }

  @UseGuards(OptionalAuthGuard)
  @Get(':code/stats')
  async getStats(@Param('code') code: string) {
    return this.qrCodesService.getStats(code);
  }

  @Patch(':code/scan')
  async recordScan(@Param('code') code: string) {
    return this.qrCodesService.recordScan(code);
  }
}
