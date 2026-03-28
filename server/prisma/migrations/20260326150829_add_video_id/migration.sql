/*
  Warnings:

  - Added the required column `videoId` to the `OriginalVideo` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OriginalVideo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "videoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "duration" INTEGER,
    "filePath" TEXT,
    "thumbnailPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DOWNLOADING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_OriginalVideo" ("createdAt", "duration", "filePath", "id", "status", "thumbnailPath", "title", "url") SELECT "createdAt", "duration", "filePath", "id", "status", "thumbnailPath", "title", "url" FROM "OriginalVideo";
DROP TABLE "OriginalVideo";
ALTER TABLE "new_OriginalVideo" RENAME TO "OriginalVideo";
CREATE UNIQUE INDEX "OriginalVideo_videoId_key" ON "OriginalVideo"("videoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
