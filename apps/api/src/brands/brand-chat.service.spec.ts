import { Test } from '@nestjs/testing';
import { BrandChatService } from './brand-chat.service';
import { BrandKnowledgeService } from './brand-knowledge.service';
import { OpenAIService } from './openai.service';
import { BrandKnowledge } from './brand.types';

describe('BrandChatService', () => {
  const brand: BrandKnowledge = {
    config: {
      id: 'tri-consulting-services',
      displayName: 'TRI Consulting Services',
      aliases: ['TRI'],
      enabled: true,
      refusalMessage: 'Brand questions only.',
      insufficientInformationMessage: 'That information is not verified.',
      relevance: {
        keywords: ['coaching'],
        genericBrandQuestions: [],
      },
    },
    context: 'Approved context',
    sources: ['company-fact-sheet.md'],
  };

  const knowledgeService = {
    loadBrand: jest.fn().mockResolvedValue(brand),
    isRelevant: jest.fn(),
  };

  const openAIService = {
    model: 'openai-test',
    answer: jest.fn(),
  };

  let service: BrandChatService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        BrandChatService,
        {
          provide: BrandKnowledgeService,
          useValue: knowledgeService,
        },
        {
          provide: OpenAIService,
          useValue: openAIService,
        },
      ],
    }).compile();

    service = moduleRef.get(BrandChatService);
  });

  it('refuses unrelated messages without calling OpenAI', async () => {
    knowledgeService.isRelevant.mockReturnValue(false);

    await expect(
      service.answer('tri-consulting-services', 'Tell me the weather.'),
    ).resolves.toEqual({
      brandId: 'tri-consulting-services',
      status: 'refused',
      answer: 'Brand questions only.',
    });
    expect(openAIService.answer).not.toHaveBeenCalled();
  });

  it('returns a grounded answer for an approved brand question', async () => {
    knowledgeService.isRelevant.mockReturnValue(true);
    openAIService.answer.mockResolvedValue({
      status: 'answered',
      answer: 'TRI offers one-on-one coaching.',
    });

    await expect(
      service.answer('tri-consulting-services', 'What coaching do you offer?'),
    ).resolves.toEqual({
      brandId: 'tri-consulting-services',
      status: 'answered',
      answer: 'TRI offers one-on-one coaching.',
      model: 'openai-test',
    });
  });

  it('replaces model text with the configured insufficient-data message', async () => {
    knowledgeService.isRelevant.mockReturnValue(true);
    openAIService.answer.mockResolvedValue({
      status: 'insufficient',
      answer: 'Untrusted model text',
    });

    await expect(
      service.answer('tri-consulting-services', 'What is your phone number?'),
    ).resolves.toEqual({
      brandId: 'tri-consulting-services',
      status: 'insufficient',
      answer: 'That information is not verified.',
      model: 'openai-test',
    });
  });
});
