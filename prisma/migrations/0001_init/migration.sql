CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "VideoProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "originalFilePath" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "audioPath" TEXT,
    "exportPath" TEXT,
    "duration" REAL,
    "width" INTEGER,
    "height" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'Enviado',
    "contentType" TEXT NOT NULL DEFAULT 'Outro',
    "objective" TEXT NOT NULL DEFAULT 'Melhores momentos',
    "desiredDuration" TEXT NOT NULL DEFAULT '1 minuto',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VideoProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TranscriptSegment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "startTime" REAL NOT NULL,
    "endTime" REAL NOT NULL,
    "text" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 0.85,
    CONSTRAINT "TranscriptSegment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VideoProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SmartCut" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "startTime" REAL NOT NULL,
    "endTime" REAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "transcriptExcerpt" TEXT NOT NULL DEFAULT '',
    "isSelected" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL DEFAULT 'ai',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SmartCut_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VideoProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Caption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "cutId" TEXT,
    "startTime" REAL NOT NULL,
    "endTime" REAL NOT NULL,
    "text" TEXT NOT NULL,
    "style" TEXT NOT NULL DEFAULT 'Clean',
    "position" TEXT NOT NULL DEFAULT 'Inferior',
    CONSTRAINT "Caption_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VideoProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Caption_cutId_fkey" FOREIGN KEY ("cutId") REFERENCES "SmartCut" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ExportJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Criado',
    "format" TEXT NOT NULL DEFAULT 'Original',
    "aspectRatio" TEXT NOT NULL DEFAULT 'Original',
    "resolution" TEXT NOT NULL DEFAULT 'Original',
    "quality" TEXT NOT NULL DEFAULT 'Alta qualidade',
    "outputPath" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "ExportJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VideoProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "VideoProject_userId_idx" ON "VideoProject"("userId");
CREATE INDEX IF NOT EXISTS "VideoProject_status_idx" ON "VideoProject"("status");
CREATE INDEX IF NOT EXISTS "TranscriptSegment_projectId_idx" ON "TranscriptSegment"("projectId");
CREATE INDEX IF NOT EXISTS "SmartCut_projectId_idx" ON "SmartCut"("projectId");
CREATE INDEX IF NOT EXISTS "Caption_projectId_idx" ON "Caption"("projectId");
CREATE INDEX IF NOT EXISTS "Caption_cutId_idx" ON "Caption"("cutId");
CREATE INDEX IF NOT EXISTS "ExportJob_projectId_idx" ON "ExportJob"("projectId");
CREATE INDEX IF NOT EXISTS "ExportJob_status_idx" ON "ExportJob"("status");
