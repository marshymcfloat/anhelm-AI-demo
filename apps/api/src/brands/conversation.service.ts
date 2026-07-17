import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { BrandKnowledgeService } from './brand-knowledge.service';
import { OpenAIService } from './openai.service';
import { BrandAnswer, ConversationTurn } from './brand.types';

const HISTORY_LIMIT = 12;

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brandKnowledgeService: BrandKnowledgeService,
    private readonly openAIService: OpenAIService,
  ) {}

  async create(brandId: string, visitorId?: string, title?: string) {
    await this.brandKnowledgeService.loadBrand(brandId);

    return this.prisma.conversation.create({
      data: {
        brandId,
        visitorId: visitorId ?? randomUUID(),
        title: title?.trim() || 'New conversation',
      },
      select: {
        id: true,
        brandId: true,
        visitorId: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async list(brandId: string, visitorId: string) {
    await this.brandKnowledgeService.loadBrand(brandId);

    const conversations = await this.prisma.conversation.findMany({
      where: { brandId, visitorId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            role: true,
            createdAt: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return conversations.map(({ messages, _count, ...conversation }) => ({
      ...conversation,
      messageCount: _count.messages,
      lastMessage: messages[0] ?? null,
    }));
  }

  async messages(conversationId: string, visitorId: string) {
    await this.getOwnedConversation(conversationId, visitorId);

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        status: true,
        model: true,
        createdAt: true,
      },
    });
  }

  async send(
    conversationId: string,
    visitorId: string,
    message: string,
  ): Promise<BrandAnswer & { conversationId: string; messageId: string }> {
    const conversation = await this.getOwnedConversation(
      conversationId,
      visitorId,
    );
    const brand = await this.brandKnowledgeService.loadBrand(
      conversation.brandId,
    );
    const history = this.toHistory(conversation.messages);

    const userMessage = await this.prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content: message,
        status: 'received',
      },
    });

    if (conversation.title === 'New conversation') {
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { title: this.createTitle(message) },
      });
    }

    const relevanceText = [
      ...history
        .filter((turn) => turn.role === 'user')
        .map((turn) => turn.content),
      message,
    ].join('\n');

    if (!this.brandKnowledgeService.isRelevant(relevanceText, brand.config)) {
      await this.saveAssistantMessage(
        conversationId,
        brand.config.refusalMessage,
        'refused',
      );

      return {
        conversationId,
        messageId: userMessage.id,
        brandId: conversation.brandId,
        status: 'refused',
        answer: brand.config.refusalMessage,
      };
    }

    const generated = await this.openAIService.answer(message, brand, history);
    const answer =
      generated.status === 'refused'
        ? brand.config.refusalMessage
        : generated.status === 'insufficient'
          ? brand.config.insufficientInformationMessage
          : generated.answer;

    await this.saveAssistantMessage(
      conversationId,
      answer,
      generated.status,
      this.openAIService.model,
    );

    return {
      conversationId,
      messageId: userMessage.id,
      brandId: conversation.brandId,
      status: generated.status,
      answer,
      model: this.openAIService.model,
    };
  }

  private async getOwnedConversation(
    conversationId: string,
    visitorId: string,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        visitorId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: HISTORY_LIMIT,
          select: {
            role: true,
            content: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation was not found.');
    }

    return conversation;
  }

  private toHistory(
    messages: { role: string; content: string }[],
  ): ConversationTurn[] {
    return messages
      .slice()
      .reverse()
      .filter(
        (message): message is ConversationTurn =>
          message.role === 'user' || message.role === 'assistant',
      );
  }

  private async saveAssistantMessage(
    conversationId: string,
    content: string,
    status: string,
    model?: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId,
          role: 'assistant',
          content,
          status,
          model,
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);
  }

  private createTitle(message: string): string {
    const normalized = message.replace(/\s+/g, ' ').trim();
    return normalized.length <= 60
      ? normalized
      : `${normalized.slice(0, 57)}...`;
  }
}
