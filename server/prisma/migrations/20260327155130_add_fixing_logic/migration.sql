/*
  Warnings:

  - You are about to drop the column `defaultDescription` on the `Channel` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Channel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "titlePrefix" TEXT DEFAULT '🔥 ЭТО ВЗОРВАЛО СЕТЬ! | ',
    "descriptionFooter" TEXT DEFAULT '

Here is my contact email: pleasedontstrike@proton.me
If you have any concerns about the content, please reach out before taking any action. I’m sure we can work it out.',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Channel" ("createdAt", "id", "name", "titlePrefix") SELECT "createdAt", "id", "name", "titlePrefix" FROM "Channel";
DROP TABLE "Channel";
ALTER TABLE "new_Channel" RENAME TO "Channel";
CREATE UNIQUE INDEX "Channel_name_key" ON "Channel"("name");
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
    "needsFixing" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    CONSTRAINT "Task_originalVideoId_fkey" FOREIGN KEY ("originalVideoId") REFERENCES "OriginalVideo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("channelId", "createdAt", "creatorId", "id", "originalVideoId", "priority", "reactionFilePath", "status", "title", "updatedAt", "uploaderId", "youtubeUrl") SELECT "channelId", "createdAt", "creatorId", "id", "originalVideoId", "priority", "reactionFilePath", "status", "title", "updatedAt", "uploaderId", "youtubeUrl" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
