/*
  Warnings:

  - You are about to drop the column `scheduledAt` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Task` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "originalVideoId" INTEGER NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'AWAITING_REACTION',
    "creatorId" INTEGER,
    "uploaderId" INTEGER,
    "managerId" INTEGER,
    "channelId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" DATETIME,
    "reactionUploadedAt" DATETIME,
    "publishedAt" DATETIME,
    "deadline" DATETIME,
    "reactionFilePath" TEXT,
    "youtubeUrl" TEXT,
    "title" TEXT,
    "needsFixing" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    CONSTRAINT "Task_originalVideoId_fkey" FOREIGN KEY ("originalVideoId") REFERENCES "OriginalVideo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("channelId", "createdAt", "creatorId", "id", "needsFixing", "originalVideoId", "priority", "reactionFilePath", "rejectionReason", "status", "title", "uploaderId", "youtubeUrl") SELECT "channelId", "createdAt", "creatorId", "id", "needsFixing", "originalVideoId", "priority", "reactionFilePath", "rejectionReason", "status", "title", "uploaderId", "youtubeUrl" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
