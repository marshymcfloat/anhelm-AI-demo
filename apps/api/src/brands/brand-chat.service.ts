import { Injectable } from '@nestjs/common';
import { BrandKnowledgeService } from './brand-knowledge.service';
import { GeminiService } from './gemini.service';
import { BrandAnswer } from './brand.types';

@Injectable()
export class BrandChatService {
  constructor(
    private readonly brandKnowledgeService: BrandKnowledgeService,
    private readonly geminiService: GeminiService,
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

    const generated = await this.geminiService.answer(message, brand);

    if (generated.status === 'refused') {
      return {
        brandId,
        status: 'refused',
        answer: brand.config.refusalMessage,
        model: this.geminiService.model,
      };
    }

    if (generated.status === 'insufficient') {
      return {
        brandId,
        status: 'insufficient',
        answer: brand.config.insufficientInformationMessage,
        model: this.geminiService.model,
      };
    }

    return {
      brandId,
      status: 'answered',
      answer: generated.answer,
      model: this.geminiService.model,
    };
  }
}
