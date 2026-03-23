// Lightweight migration script using Prisma Client (no CLI needed)
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrate() {
  console.log('Running database migrations...')

  // Create tables if they don't exist
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "projects" (
      "id" TEXT NOT NULL,
      "title" TEXT NOT NULL DEFAULT 'Untitled Project',
      "description" TEXT NOT NULL DEFAULT '',
      "category" TEXT NOT NULL DEFAULT '',
      "status" TEXT NOT NULL DEFAULT 'active',
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "code_versions" (
      "id" TEXT NOT NULL,
      "project_id" TEXT NOT NULL,
      "version_number" INTEGER NOT NULL,
      "files" JSONB NOT NULL DEFAULT '{}',
      "prompt" TEXT NOT NULL DEFAULT '',
      "agent_name" TEXT NOT NULL DEFAULT '',
      "model_used" TEXT NOT NULL DEFAULT '',
      "tokens_used" INTEGER NOT NULL DEFAULT 0,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "code_versions_pkey" PRIMARY KEY ("id")
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "chat_messages" (
      "id" TEXT NOT NULL,
      "project_id" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "agent_name" TEXT,
      "content" TEXT NOT NULL DEFAULT '',
      "content_type" TEXT NOT NULL DEFAULT 'text',
      "metadata" JSONB NOT NULL DEFAULT '{}',
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
    )
  `)

  // Create unique constraint and foreign keys (idempotent)
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'code_versions_project_id_version_number_key') THEN
        ALTER TABLE "code_versions" ADD CONSTRAINT "code_versions_project_id_version_number_key" UNIQUE ("project_id", "version_number");
      END IF;
    END $$
  `)

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'code_versions_project_id_fkey') THEN
        ALTER TABLE "code_versions" ADD CONSTRAINT "code_versions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$
  `)

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_project_id_fkey') THEN
        ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$
  `)

  console.log('Migrations complete.')
  await prisma.$disconnect()
}

migrate().catch((e) => {
  console.error('Migration failed:', e)
  process.exit(1)
})
