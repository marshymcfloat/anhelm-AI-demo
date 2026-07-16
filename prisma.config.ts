import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { resolve } from 'node:path';

const configuredUrl = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
const databaseUrl = configuredUrl.startsWith('file:./')
  ? `file:${resolve(configuredUrl.slice('file:'.length)).replaceAll('\\', '/')}`
  : configuredUrl;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});
