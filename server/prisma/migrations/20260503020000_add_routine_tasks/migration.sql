-- CreateTable
CREATE TABLE "wf_routine_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "repeat_type" TEXT NOT NULL DEFAULT 'weekly',
    "repeat_days" INTEGER[] NOT NULL,
    "project_id" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "estimated_minutes" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wf_routine_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wf_routine_task_assignees" (
    "id" TEXT NOT NULL,
    "routine_task_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wf_routine_task_assignees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wf_routine_task_completions" (
    "id" TEXT NOT NULL,
    "routine_task_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "completed_by_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wf_routine_task_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wf_routine_tasks_project_id_idx" ON "wf_routine_tasks"("project_id");

-- CreateIndex
CREATE INDEX "wf_routine_tasks_created_by_id_idx" ON "wf_routine_tasks"("created_by_id");

-- CreateIndex
CREATE INDEX "wf_routine_tasks_is_active_idx" ON "wf_routine_tasks"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "wf_routine_task_assignees_routine_task_id_member_id_key" ON "wf_routine_task_assignees"("routine_task_id", "member_id");

-- CreateIndex
CREATE INDEX "wf_routine_task_assignees_member_id_idx" ON "wf_routine_task_assignees"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "wf_routine_task_completions_routine_task_id_date_key" ON "wf_routine_task_completions"("routine_task_id", "date");

-- CreateIndex
CREATE INDEX "wf_routine_task_completions_completed_by_id_idx" ON "wf_routine_task_completions"("completed_by_id");

-- AddForeignKey
ALTER TABLE "wf_routine_tasks" ADD CONSTRAINT "wf_routine_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wf_routine_tasks" ADD CONSTRAINT "wf_routine_tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wf_routine_task_assignees" ADD CONSTRAINT "wf_routine_task_assignees_routine_task_id_fkey" FOREIGN KEY ("routine_task_id") REFERENCES "wf_routine_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wf_routine_task_assignees" ADD CONSTRAINT "wf_routine_task_assignees_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wf_routine_task_completions" ADD CONSTRAINT "wf_routine_task_completions_routine_task_id_fkey" FOREIGN KEY ("routine_task_id") REFERENCES "wf_routine_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wf_routine_task_completions" ADD CONSTRAINT "wf_routine_task_completions_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
