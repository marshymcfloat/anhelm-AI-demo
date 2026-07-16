import { Module } from '@nestjs/common';
import { BrandChatController } from './brand-chat.controller';
import { BrandChatService } from './brand-chat.service';
import { BrandKnowledgeService } from './brand-knowledge.service';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { GeminiService } from './gemini.service';

@Module({
  controllers: [BrandChatController, ConversationController],
  providers: [
    BrandChatService,
    BrandKnowledgeService,
    ConversationService,
    GeminiService,
  ],
})
export class BrandsModule {}
