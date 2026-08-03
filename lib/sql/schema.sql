-- 取代 prisma/schema.prisma 的 DDL。冪等（可重複執行），對應原本 `prisma db push`
-- 的工作流程：沒有 migration 歷史，直接用這份檔案同步 schema。

-- ---- enum ------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('student', 'teacher');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EnrollmentStatus" AS ENUM ('enrolled', 'waitlist');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---- better-auth 表 ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  image TEXT,
  role "Role",
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMPTZ,
  "refreshTokenExpiresAt" TIMESTAMPTZ,
  scope TEXT,
  password TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS account_userid_idx ON account ("userId");

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE INDEX IF NOT EXISTS session_userid_idx ON session ("userId");

CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification (identifier);

-- ---- App 網域表 --------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Course" (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  "teacherId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  day INTEGER NOT NULL,
  "periodIndex" INTEGER NOT NULL,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  syllabus TEXT[] NOT NULL,
  capacity INTEGER NOT NULL,
  "openAt" TIMESTAMPTZ NOT NULL,
  hot BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Course_teacherId_idx" ON "Course" ("teacherId");

CREATE TABLE IF NOT EXISTS "Enrollment" (
  id TEXT PRIMARY KEY,
  status "EnrollmentStatus" NOT NULL,
  -- 僅 waitlist 使用，enrolled 為 null
  position INTEGER,
  "courseId" TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 同一人同一課只能有一筆，併發時的最後防線
  UNIQUE ("courseId", "userId")
);
CREATE INDEX IF NOT EXISTS "Enrollment_courseId_status_idx" ON "Enrollment" ("courseId", status);
CREATE INDEX IF NOT EXISTS "Enrollment_userId_idx" ON "Enrollment" ("userId");
