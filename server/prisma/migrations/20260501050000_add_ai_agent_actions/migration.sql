-- CreateTable
CREATE TABLE "wf_ai_agent_actions" (
    "id" SERIAL NOT NULL,
    "assistant_run_id" INTEGER,
    "member_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "scope_type" TEXT NOT NULL DEFAULT 'GLOBAL',
    "scope_id" TEXT,
    "scope_label" TEXT,
    "preview" JSONB NOT NULL,
    "result" JSONB,
    "error_message" TEXT,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "executed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wf_ai_agent_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wf_ai_agent_actions_member_id_status_created_at_idx" ON "wf_ai_agent_actions"("member_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "wf_ai_agent_actions_assistant_run_id_idx" ON "wf_ai_agent_actions"("assistant_run_id");

-- AddForeignKey
ALTER TABLE "wf_ai_agent_actions" ADD CONSTRAINT "wf_ai_agent_actions_assistant_run_id_fkey" FOREIGN KEY ("assistant_run_id") REFERENCES "wf_ai_assistant_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wf_ai_agent_actions" ADD CONSTRAINT "wf_ai_agent_actions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wf_ai_agent_actions" ADD CONSTRAINT "wf_ai_agent_actions_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
