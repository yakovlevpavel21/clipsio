/*
  Warnings:

  - You are about to drop the column `duration` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `originalFilePath` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `originalVideoUrl` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailPath` on the `Task` table. All the data in the column will be lost.
  - Added the required column `originalVideoId` to the `Task` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "OriginalVideo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "duration" INTEGER,
    "filePath" TEXT,
    "thumbnailPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DOWNLOADING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
    "channelId" INTEGER NOT NULL,
    "reactionFilePath" TEXT,
    "youtubeUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "title" TEXT,
    CONSTRAINT "Task_originalVideoId_fkey" FOREIGN KEY ("originalVideoId") REFERENCES "OriginalVideo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("channelId", "createdAt", "creatorId", "id", "priority", "reactionFilePath", "status", "title", "updatedAt", "uploaderId", "youtubeUrl") SELECT "channelId", "createdAt", "creatorId", "id", "priority", "reactionFilePath", "status", "title", "updatedAt", "uploaderId", "youtubeUrl" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "OriginalVideo_url_key" ON "OriginalVideo"("url");
