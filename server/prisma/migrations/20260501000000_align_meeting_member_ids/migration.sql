-- Align meeting module IDs with UUID-based Member and Project IDs.
ALTER TABLE "wf_meetings"
  ALTER COLUMN "project_id" TYPE TEXT USING "project_id"::TEXT,
  ALTER COLUMN "author_id" TYPE TEXT USING "author_id"::TEXT;

ALTER TABLE "wf_meeting_attendees"
  ALTER COLUMN "member_id" TYPE TEXT USING "member_id"::TEXT;

ALTER TABLE "wf_meeting_comments"
  ALTER COLUMN "author_id" TYPE TEXT USING "author_id"::TEXT;

ALTER TABLE "wf_meeting_action_items"
  ALTER COLUMN "assignee_id" TYPE TEXT USING "assignee_id"::TEXT;

ALTER TABLE "wf_meeting_recordings"
  ALTER COLUMN "created_by_id" TYPE TEXT USING "created_by_id"::TEXT;
