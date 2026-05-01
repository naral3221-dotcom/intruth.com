-- CreateTable
CREATE TABLE "wf_ai_assistant_runs" (
    "id" SERIAL NOT NULL,
    "member_id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "highlights" JSONB NOT NULL,
    "suggested_questions" JSONB NOT NULL,
    "kakao_brief" TEXT NOT NULL,
    "source_counts" JSONB NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wf_ai_assistant_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wf_ai_assistant_runs_member_id_created_at_idx" ON "wf_ai_assistant_runs"("member_id", "created_at");

-- AddForeignKey
ALTER TABLE "wf_ai_assistant_runs" ADD CONSTRAINT "wf_ai_assistant_runs_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
