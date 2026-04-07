-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Channel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "titlePrefix" TEXT DEFAULT '',
    "descriptionFooter" TEXT DEFAULT '',
    "showOriginalLink" BOOLEAN NOT NULL DEFAULT true,
    "originalLinkPrefix" TEXT DEFAULT 'CREDIT - ',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Channel" ("createdAt", "descriptionFooter", "id", "name", "titlePrefix") SELECT "createdAt", "descriptionFooter", "id", "name", "titlePrefix" FROM "Channel";
DROP TABLE "Channel";
ALTER TABLE "new_Channel" RENAME TO "Channel";
CREATE UNIQUE INDEX "Channel_name_key" ON "Channel"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
