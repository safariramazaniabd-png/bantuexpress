import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagesQueryDto } from './dto/messages-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Messagerie')
@UseGuards(JwtAuthGuard)
@Controller('messaging')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post('conversations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une conversation', description: 'Crée une nouvelle conversation entre utilisateurs.' })
  @ApiCreatedResponse({ description: 'La conversation a été créée avec succès.' })
  async createConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
  ) {
    return this.messagingService.createConversation(user.userId, dto);
  }

  @Get('conversations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes conversations', description: 'Récupère la liste des conversations de l\'utilisateur connecté.' })
  @ApiOkResponse({ description: 'La liste de vos conversations est retournée.' })
  async findMyConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.findMyConversations(user.userId);
  }

  @Get('conversations/unread')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Nombre de messages non lus', description: 'Retourne le nombre total de messages non lus.' })
  @ApiOkResponse({ description: 'Le nombre de messages non lus est retourné.' })
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.messagingService.getUnreadCount(user.userId);
    return { unreadCount: count };
  }

  @Get('conversations/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détails d\'une conversation', description: 'Récupère les détails d\'une conversation par son identifiant.' })
  @ApiOkResponse({ description: 'Les détails de la conversation sont retournés.' })
  async findConversation(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messagingService.findConversation(id, user.userId);
  }

  @Post('conversations/:id/messages')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Envoyer un message', description: 'Envoie un message dans une conversation existante.' })
  @ApiCreatedResponse({ description: 'Le message a été envoyé avec succès.' })
  async sendMessage(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(id, user.userId, dto);
  }

  @Get('conversations/:id/messages')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister les messages', description: 'Récupère les messages d\'une conversation avec pagination.' })
  @ApiOkResponse({ description: 'La liste des messages est retournée.' })
  async getMessages(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MessagesQueryDto,
  ) {
    return this.messagingService.getMessages(
      id,
      user.userId,
      query.page,
      query.limit,
    );
  }
}
