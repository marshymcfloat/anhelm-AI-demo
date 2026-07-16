import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';
import { resolve } from 'node:path';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const configuredUrl = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
    const url = configuredUrl.startsWith('file:./')
      ? `file:${resolve(configuredUrl.slice('file:'.length)).replaceAll('\\', '/')}`
      : configuredUrl;
    super({
      adapter: new PrismaBetterSqlite3({ url }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
