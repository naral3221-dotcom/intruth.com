CREATE TABLE "wf_teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#06b6d4',
    "leader_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wf_teams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wf_team_members" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wf_team_members_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "wf_meetings" ADD COLUMN "team_id" TEXT;

CREATE INDEX "wf_teams_leader_id_idx" ON "wf_teams"("leader_id");
CREATE UNIQUE INDEX "wf_team_members_team_id_member_id_key" ON "wf_team_members"("team_id", "member_id");
CREATE INDEX "wf_team_members_member_id_idx" ON "wf_team_members"("member_id");
CREATE INDEX "wf_meetings_team_id_idx" ON "wf_meetings"("team_id");

ALTER TABLE "wf_teams" ADD CONSTRAINT "wf_teams_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wf_team_members" ADD CONSTRAINT "wf_team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "wf_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wf_team_members" ADD CONSTRAINT "wf_team_members_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wf_meetings" ADD CONSTRAINT "wf_meetings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "wf_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
