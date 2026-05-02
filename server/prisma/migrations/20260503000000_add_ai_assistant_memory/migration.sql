CREATE TABLE "wf_ai_assistant_memories" (
  "id" SERIAL NOT NULL,
  "member_id" TEXT NOT NULL,
  "scope_key" TEXT NOT NULL,
  "scope_type" TEXT NOT NULL DEFAULT 'GLOBAL',
  "scope_id" TEXT,
  "summary" TEXT NOT NULL DEFAULT '',
  "facts" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "wf_ai_assistant_memories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wf_ai_assistant_memories_member_id_scope_key_key"
  ON "wf_ai_assistant_memories"("member_id", "scope_key");

CREATE INDEX "wf_ai_assistant_memories_member_id_updated_at_idx"
  ON "wf_ai_assistant_memories"("member_id", "updated_at");

ALTER TABLE "wf_ai_assistant_memories"
  ADD CONSTRAINT "wf_ai_assistant_memories_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
