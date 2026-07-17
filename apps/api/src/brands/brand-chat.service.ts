import { Injectable } from '@nestjs/common';
import { BrandKnowledgeService } from './brand-knowledge.service';
import { OpenAIService } from './openai.service';
import { BrandAnswer } from './brand.types';

@Injectable()
export class BrandChatService {
  constructor(
    private readonly brandKnowledgeService: BrandKnowledgeService,
    private readonly openAIService: OpenAIService,
  ) {}

  async answer(brandId: string, message: string): Promise<BrandAnswer> {
    const brand = await this.brandKnowledgeService.loadBrand(brandId);

    if (!this.brandKnowledgeService.isRelevant(message, brand.config)) {
      return {
        brandId,
        status: 'refused',
        answer: brand.config.refusalMessage,
      };
    }

    const generated = await this.openAIService.answer(message, brand);

    if (generated.status === 'refused') {
      return {
        brandId,
        status: 'refused',
        answer: brand.config.refusalMessage,
        model: this.openAIService.model,
      };
    }

    if (generated.status === 'insufficient') {
      return {
        brandId,
        status: 'insufficient',
        answer: brand.config.insufficientInformationMessage,
        model: this.openAIService.model,
      };
    }

    return {
      brandId,
      status: 'answered',
      answer: generated.answer,
      model: this.openAIService.model,
    };
  }
}
