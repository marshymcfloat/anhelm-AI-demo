import { Module } from '@nestjs/common';
import { BrandChatController } from './brand-chat.controller';
import { BrandChatService } from './brand-chat.service';
import { BrandKnowledgeService } from './brand-knowledge.service';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { OpenAIService } from './openai.service';

@Module({
  controllers: [BrandChatController, ConversationController],
  providers: [
    BrandChatService,
    BrandKnowledgeService,
    ConversationService,
    OpenAIService,
  ],
})
export class BrandsModule {}
