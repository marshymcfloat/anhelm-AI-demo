import 'dotenv/config';
import Database from 'better-sqlite3';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationName = '20260716184000_init_conversations';
const migrationPath = resolve(
  'prisma',
  'migrations',
  migrationName,
  'migration.sql',
);
const migrationSql = readFileSync(migrationPath, 'utf8');
const configuredUrl = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';

if (!configuredUrl.startsWith('file:')) {
  throw new Error('DATABASE_URL must use the file: protocol for SQLite.');
}

const configuredPath = configuredUrl.slice('file:'.length);
const databasePath = resolve(configuredPath);
const database = new Database(databasePath);

try {
  database.pragma('foreign_keys = ON');
  database.exec(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    );
  `);

  const applied = database
    .prepare(
      'SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = ? LIMIT 1',
    )
    .get(migrationName);

  if (!applied) {
    const hasConversation = Boolean(
      database
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'Conversation'",
        )
        .get(),
    );
    const hasMessage = Boolean(
      database
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'Message'",
        )
        .get(),
    );

    if (hasConversation !== hasMessage) {
      throw new Error('The SQLite schema is partially initialized.');
    }

    const applyMigration = database.transaction(() => {
      if (!hasConversation) {
        database.exec(migrationSql);
      }

      database
        .prepare(
          `INSERT INTO "_prisma_migrations"
            ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
           VALUES (?, ?, CURRENT_TIMESTAMP, ?, 1)`,
        )
        .run(
          randomUUID(),
          createHash('sha256').update(migrationSql).digest('hex'),
          migrationName,
        );
    });

    applyMigration();
  }

  console.log(`SQLite database ready: ${databasePath}`);
} finally {
  database.close();
}
