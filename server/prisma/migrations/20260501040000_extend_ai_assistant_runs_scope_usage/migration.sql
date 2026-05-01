-- AlterTable
ALTER TABLE "wf_ai_assistant_runs"
ADD COLUMN "scope_type" TEXT NOT NULL DEFAULT 'GLOBAL',
ADD COLUMN "scope_id" TEXT,
ADD COLUMN "scope_label" TEXT,
ADD COLUMN "model" TEXT,
ADD COLUMN "input_tokens" INTEGER,
ADD COLUMN "output_tokens" INTEGER,
ADD COLUMN "total_tokens" INTEGER,
ADD COLUMN "cached_tokens" INTEGER,
ADD COLUMN "reasoning_tokens" INTEGER,
ADD COLUMN "estimated_cost_usd" DOUBLE PRECISION;
