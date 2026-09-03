import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { QrCodesService } from './qrcodes.service';
import { CreateQrCodeDto } from './dto/create-qrcode.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('QR Codes')
@Controller('qrcodes')
export class QrCodesController {
  constructor(private readonly qrCodesService: QrCodesService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un QR code', description: 'Génère un nouveau QR code personnel ou d\'adresse' })
  @ApiCreatedResponse({ description: 'QR code créé avec succès' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateQrCodeDto,
  ) {
    return this.qrCodesService.create(user.userId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes QR codes', description: 'Retourne tous les QR codes de l\'utilisateur connecté' })
  @ApiOkResponse({ description: 'Liste des QR codes retournée' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalide ou manquant' })
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.qrCodesService.findMine(user.userId);
  }

  @ApiOperation({ summary: 'Résoudre un QR code', description: 'Retourne les données associées à un QR code' })
  @ApiOkResponse({ description: 'Données du QR code retournées' })
  @Get(':code')
  async resolve(@Param('code') code: string) {
    return this.qrCodesService.resolve(code);
  }

  @ApiOperation({ summary: 'Statistiques d\'un QR code', description: 'Retourne les statistiques de scan d\'un QR code' })
  @ApiOkResponse({ description: 'Statistiques retournées' })
  @UseGuards(OptionalAuthGuard)
  @Get(':code/stats')
  async getStats(@Param('code') code: string) {
    return this.qrCodesService.getStats(code);
  }

  @ApiOperation({ summary: 'Enregistrer un scan', description: 'Enregistre un scan du QR code' })
  @ApiOkResponse({ description: 'Scan enregistré' })
  @Patch(':code/scan')
  async recordScan(@Param('code') code: string) {
    return this.qrCodesService.recordScan(code);
  }

  @ApiOperation({ summary: 'Image du QR code', description: 'Retourne l\'image PNG du QR code' })
  @ApiOkResponse({ description: 'Image PNG du QR code' })
  @Get(':code/image')
  async generateImage(@Param('code') code: string, @Res() res: Response) {
    const png = await this.qrCodesService.generateImage(code);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(png);
  }
}
