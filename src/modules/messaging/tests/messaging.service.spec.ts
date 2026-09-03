import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { MessagingService } from '../messaging.service';
import { PrismaService } from '../../../database/prisma.service';

const mockPrisma = {
  user: {
    findMany: jest.fn(),
  },
  conversation: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  message: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

describe('MessagingService', () => {
  let service: MessagingService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<MessagingService>(MessagingService);
  });

  const mockConversation = {
    id: 'conv-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    participants: [{ userId: 'user-1' }, { userId: 'user-2' }],
    _count: { messages: 0 },
  };

  const mockMessage = {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'user-1',
    content: 'Hello',
    type: 'TEXT',
    createdAt: new Date(),
    sender: { id: 'user-1', email: 'a@b.com' },
  };

  describe('createConversation', () => {
    it('should create a conversation', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);
      mockPrisma.conversation.create.mockResolvedValue(mockConversation);

      const result = await service.createConversation('user-1', {
        participantIds: ['user-2'],
      });

      expect(mockPrisma.conversation.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);

      await expect(
        service.createConversation('user-1', { participantIds: ['missing'] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('sendMessage', () => {
    it('should send a message', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(mockConversation);
      mockPrisma.message.create.mockResolvedValue(mockMessage);

      const result = await service.sendMessage('conv-1', 'user-1', {
        content: 'Hello',
      });

      expect(result.content).toBe('Hello');
    });

    it('should throw if not participant', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(mockConversation);

      await expect(
        service.sendMessage('conv-1', 'user-3', { content: 'Hi' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getMessages', () => {
    it('should return paginated messages', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(mockConversation);
      mockPrisma.message.findMany.mockResolvedValue([mockMessage]);
      mockPrisma.message.count.mockResolvedValue(1);

      const result = await service.getMessages('conv-1', 'user-1');

      expect(result.data).toHaveLength(1);
    });
  });
});
