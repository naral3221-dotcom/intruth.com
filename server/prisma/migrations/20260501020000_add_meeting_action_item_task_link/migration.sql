-- Link meeting action items to generated workflow tasks.
ALTER TABLE "public"."wf_meeting_action_items"
ADD COLUMN "task_id" TEXT;

CREATE UNIQUE INDEX "wf_meeting_action_items_task_id_key"
ON "public"."wf_meeting_action_items"("task_id");

CREATE INDEX "wf_meeting_action_items_task_id_idx"
ON "public"."wf_meeting_action_items"("task_id");

ALTER TABLE "public"."wf_meeting_action_items"
ADD CONSTRAINT "wf_meeting_action_items_task_id_fkey"
FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
