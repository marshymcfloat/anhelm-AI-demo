import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';

interface CreateConversationBody {
  visitorId?: unknown;
  title?: unknown;
}

interface SendMessageBody {
  visitorId?: unknown;
  message?: unknown;
}

@Controller()
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post('brands/:brandId/conversations')
  create(
    @Param('brandId') brandId: string,
    @Body() body: CreateConversationBody,
  ) {
    const visitorId =
      body.visitorId === undefined
        ? undefined
        : this.validateVisitorId(body.visitorId);
    const title =
      body.title === undefined ? undefined : this.validateTitle(body.title);

    return this.conversationService.create(brandId, visitorId, title);
  }

  @Get('brands/:brandId/conversations')
  list(
    @Param('brandId') brandId: string,
    @Query('visitorId') visitorId: unknown,
  ) {
    return this.conversationService.list(
      brandId,
      this.validateVisitorId(visitorId),
    );
  }

  @Get('conversations/:conversationId/messages')
  messages(
    @Param('conversationId') conversationId: string,
    @Query('visitorId') visitorId: unknown,
  ) {
    return this.conversationService.messages(
      conversationId,
      this.validateVisitorId(visitorId),
    );
  }

  @Post('conversations/:conversationId/messages')
  send(
    @Param('conversationId') conversationId: string,
    @Body() body: SendMessageBody,
  ) {
    return this.conversationService.send(
      conversationId,
      this.validateVisitorId(body.visitorId),
      this.validateMessage(body.message),
    );
  }

  private validateVisitorId(value: unknown): string {
    if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(value)) {
      throw new BadRequestException(
        'visitorId must be 8-128 letters, numbers, underscores, or hyphens.',
      );
    }

    return value;
  }

  private validateTitle(value: unknown): string {
    if (typeof value !== 'string' || !value.trim() || value.length > 100) {
      throw new BadRequestException(
        'title must be a non-empty string of 100 characters or fewer.',
      );
    }

    return value.trim();
  }

  private validateMessage(value: unknown): string {
    if (typeof value !== 'string' || !value.trim() || value.length > 2_000) {
      throw new BadRequestException(
        'message must be a non-empty string of 2,000 characters or fewer.',
      );
    }

    return value.trim();
  }
}
