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
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { IdentitiesService } from './identities.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { avatarFilePipe, identityDocumentFilePipe, signatureFilePipe } from '../../common/pipes/file-validation.pipe';

@ApiTags('Identités')
@Controller('identities')
export class IdentitiesController {
  constructor(private readonly identitiesService: IdentitiesService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer mon profil', description: 'Crée le profil personnel de l\'utilisateur connecté' })
  @ApiCreatedResponse({ description: 'Profil créé' })
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('profile')
  async createProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProfileDto,
  ) {
    return this.identitiesService.createProfile(user.userId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mon profil', description: 'Retourne le profil complet de l\'utilisateur connecté' })
  @ApiOkResponse({ description: 'Profil retourné' })
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.identitiesService.getProfile(user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier mon profil', description: 'Met à jour les champs du profil' })
  @ApiOkResponse({ description: 'Profil mis à jour' })
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.identitiesService.updateProfile(user.userId, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer mon profil', description: 'Supprime le profil de l\'utilisateur connecté' })
  @ApiOkResponse({ description: 'Profil supprimé' })
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Delete('profile')
  @HttpCode(200)
  async deleteProfile(@CurrentUser() user: AuthenticatedUser) {
    await this.identitiesService.deleteProfile(user.userId);
    return { message: 'Profile deleted' };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload avatar', description: 'Télécharge une photo de profil (jpeg, png, webp, max 5 Mo)' })
  @ApiCreatedResponse({ description: 'Avatar uploadé' })
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('profile/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(avatarFilePipe) file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
  ) {
    return this.identitiesService.uploadAvatar(user.userId, file);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer avatar', description: 'Supprime la photo de profil' })
  @ApiOkResponse({ description: 'Avatar supprimé' })
  @UseGuards(JwtAuthGuard)
  @Delete('profile/avatar')
  async deleteAvatar(@CurrentUser() user: AuthenticatedUser) {
    await this.identitiesService.deleteAvatar(user.userId);
    return { message: 'Avatar deleted' };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Générer QR code', description: 'Génère ou retourne le QR code personnel. Ajouter ?force=true pour forcer la régénération' })
  @ApiCreatedResponse({ description: 'QR code généré' })
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('profile/qrcode')
  async generateQrCode(
    @CurrentUser() user: AuthenticatedUser,
    @Query('force') force?: string,
  ) {
    return this.identitiesService.generateQrCode(user.userId, force === 'true');
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vérifier profil', description: 'Marque le profil comme vérifié' })
  @ApiCreatedResponse({ description: 'Profil vérifié' })
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('profile/verify')
  async verifyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.identitiesService.verifyProfile(user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload pièce d\'identité', description: 'Télécharge une photo de la pièce d\'identité (jpeg, png, webp, pdf, max 10 Mo)' })
  @ApiCreatedResponse({ description: 'Document uploadé' })
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('profile/identity-document')
  @UseInterceptors(FileInterceptor('file'))
  async uploadIdentityDocument(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(identityDocumentFilePipe) file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
  ) {
    return this.identitiesService.uploadIdentityDocument(user.userId, file);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload signature', description: 'Télécharge une signature numérique (jpeg, png, webp, max 2 Mo)' })
  @ApiCreatedResponse({ description: 'Signature uploadée' })
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('profile/signature')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDigitalSignature(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(signatureFilePipe) file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
  ) {
    return this.identitiesService.uploadDigitalSignature(user.userId, file);
  }

  @ApiOperation({ summary: 'Profil public', description: 'Retourne les informations publiques d\'un profil par son ID utilisateur' })
  @ApiOkResponse({ description: 'Profil public retourné' })
  @Get(':userId')
  async getPublicProfile(@Param('userId') userId: string) {
    return this.identitiesService.getPublicProfile(userId);
  }
}
