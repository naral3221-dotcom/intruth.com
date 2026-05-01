CREATE TABLE "wf_ai_command_messages" (
  "id" SERIAL NOT NULL,
  "member_id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "route" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "wf_ai_command_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "wf_ai_command_messages_member_id_created_at_idx" ON "wf_ai_command_messages"("member_id", "created_at");

ALTER TABLE "wf_ai_command_messages"
  ADD CONSTRAINT "wf_ai_command_messages_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
