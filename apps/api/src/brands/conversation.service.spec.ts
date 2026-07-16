import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { BrandKnowledgeService } from './brand-knowledge.service';
import { ConversationService } from './conversation.service';
import { GeminiService } from './gemini.service';

describe('ConversationService', () => {
  const prisma = {
    conversation: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    message: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const brandKnowledgeService = {
    loadBrand: jest.fn(),
    isRelevant: jest.fn(),
  };

  const geminiService = {
    model: 'gemini-test',
    answer: jest.fn(),
  };

  let service: ConversationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: BrandKnowledgeService,
          useValue: brandKnowledgeService,
        },
        { provide: GeminiService, useValue: geminiService },
      ],
    }).compile();

    service = moduleRef.get(ConversationService);
  });

  it('passes stored messages to Gemini in chronological order', async () => {
    const brand = {
      config: {
        id: 'tri-consulting-services',
        displayName: 'TRI Consulting Services',
        aliases: ['TRI'],
        enabled: true,
        refusalMessage: 'Brand questions only.',
        insufficientInformationMessage: 'Not verified.',
        relevance: {
          keywords: ['coaching'],
          genericBrandQuestions: [],
        },
      },
      context: 'Approved context',
      sources: ['company-fact-sheet.md'],
    };

    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-id',
      brandId: 'tri-consulting-services',
      visitorId: 'visitor-1234',
      title: 'Coaching',
      messages: [
        { role: 'assistant', content: 'We offer coaching.' },
        { role: 'user', content: 'What do you offer?' },
      ],
    });
    prisma.message.create
      .mockResolvedValueOnce({ id: 'user-message-id' })
      .mockResolvedValueOnce({ id: 'assistant-message-id' });
    prisma.conversation.update.mockResolvedValue({});
    prisma.$transaction.mockResolvedValue([]);
    brandKnowledgeService.loadBrand.mockResolvedValue(brand);
    brandKnowledgeService.isRelevant.mockReturnValue(true);
    geminiService.answer.mockResolvedValue({
      status: 'answered',
      answer: 'Sessions start at $175.',
    });

    await service.send(
      'conversation-id',
      'visitor-1234',
      'How much does coaching cost?',
    );

    expect(geminiService.answer).toHaveBeenCalledWith(
      'How much does coaching cost?',
      brand,
      [
        { role: 'user', content: 'What do you offer?' },
        { role: 'assistant', content: 'We offer coaching.' },
      ],
    );
  });
});
