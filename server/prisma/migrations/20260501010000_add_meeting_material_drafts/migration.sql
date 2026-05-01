CREATE TABLE "wf_meeting_material_drafts" (
    "id" SERIAL NOT NULL,
    "meeting_id" INTEGER NOT NULL,
    "recording_id" INTEGER,
    "materials" JSONB NOT NULL,
    "transcript_snippet" TEXT,
    "source_recording_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_by_id" TEXT NOT NULL,
    "applied_by_id" TEXT,
    "applied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wf_meeting_material_drafts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "wf_meeting_material_drafts_meeting_id_status_idx"
    ON "wf_meeting_material_drafts"("meeting_id", "status");

CREATE INDEX "wf_meeting_material_drafts_created_by_id_idx"
    ON "wf_meeting_material_drafts"("created_by_id");

ALTER TABLE "wf_meeting_material_drafts"
    ADD CONSTRAINT "wf_meeting_material_drafts_meeting_id_fkey"
    FOREIGN KEY ("meeting_id") REFERENCES "wf_meetings"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
