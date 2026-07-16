import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { BrandChatService } from './brand-chat.service';
import { BrandKnowledgeService } from './brand-knowledge.service';

interface ChatBody {
  message?: unknown;
}

@Controller('brands')
export class BrandChatController {
  constructor(
    private readonly brandChatService: BrandChatService,
    private readonly brandKnowledgeService: BrandKnowledgeService,
  ) {}

  @Get()
  listBrands() {
    return this.brandKnowledgeService.listBrands();
  }

  @Post(':brandId/chat')
  answer(@Param('brandId') brandId: string, @Body() body: ChatBody) {
    if (typeof body.message !== 'string' || !body.message.trim()) {
      throw new BadRequestException('message must be a non-empty string.');
    }

    if (body.message.length > 2_000) {
      throw new BadRequestException(
        'message must be 2,000 characters or fewer.',
      );
    }

    return this.brandChatService.answer(brandId, body.message.trim());
  }
}
