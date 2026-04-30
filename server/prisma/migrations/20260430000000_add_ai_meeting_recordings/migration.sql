-- CreateTable
CREATE TABLE "wf_meeting_recordings" (
    "id" SERIAL NOT NULL,
    "meeting_id" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "duration_seconds" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "transcript_text" TEXT,
    "error_message" TEXT,
    "onedrive_id" TEXT,
    "storage_type" TEXT NOT NULL DEFAULT 'local',
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wf_meeting_recordings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wf_meeting_transcript_segments" (
    "id" SERIAL NOT NULL,
    "recording_id" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "speaker" TEXT,
    "start_seconds" DOUBLE PRECISION,
    "end_seconds" DOUBLE PRECISION,
    "text" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,

    CONSTRAINT "wf_meeting_transcript_segments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wf_meeting_recordings_meeting_id_idx" ON "wf_meeting_recordings"("meeting_id");

-- CreateIndex
CREATE INDEX "wf_meeting_recordings_created_by_id_idx" ON "wf_meeting_recordings"("created_by_id");

-- CreateIndex
CREATE INDEX "wf_meeting_transcript_segments_recording_id_idx" ON "wf_meeting_transcript_segments"("recording_id");

-- AddForeignKey
ALTER TABLE "wf_meeting_recordings" ADD CONSTRAINT "wf_meeting_recordings_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "wf_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wf_meeting_transcript_segments" ADD CONSTRAINT "wf_meeting_transcript_segments_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "wf_meeting_recordings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
