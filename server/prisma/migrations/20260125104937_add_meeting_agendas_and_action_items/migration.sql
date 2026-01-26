-- CreateTable
CREATE TABLE "wf_meeting_agendas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "meeting_id" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER,
    "presenter" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wf_meeting_agendas_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "wf_meetings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "wf_meeting_action_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "meeting_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignee_id" INTEGER,
    "due_date" DATETIME,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "wf_meeting_action_items_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "wf_meetings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cells" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#00bcd4',
    "leader_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "cells_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "members" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cell_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cell_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joined_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "cell_members_cell_id_fkey" FOREIGN KEY ("cell_id") REFERENCES "cells" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "cell_members_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cell_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "attend_date" DATETIME NOT NULL,
    "meeting_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "note" TEXT,
    "checked_by_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "attendances_cell_id_fkey" FOREIGN KEY ("cell_id") REFERENCES "cells" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "attendances_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "attendances_checked_by_id_fkey" FOREIGN KEY ("checked_by_id") REFERENCES "members" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_wf_meetings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "meeting_date" DATETIME NOT NULL,
    "location" TEXT,
    "project_id" INTEGER,
    "content" TEXT NOT NULL,
    "content_type" TEXT NOT NULL DEFAULT 'text',
    "summary" TEXT,
    "author_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_wf_meetings" ("author_id", "content", "created_at", "id", "location", "meeting_date", "project_id", "status", "summary", "title", "updated_at") SELECT "author_id", "content", "created_at", "id", "location", "meeting_date", "project_id", "status", "summary", "title", "updated_at" FROM "wf_meetings";
DROP TABLE "wf_meetings";
ALTER TABLE "new_wf_meetings" RENAME TO "wf_meetings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "cell_members_cell_id_member_id_key" ON "cell_members"("cell_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_cell_id_member_id_attend_date_meeting_type_key" ON "attendances"("cell_id", "member_id", "attend_date", "meeting_type");
