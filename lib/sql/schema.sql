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
  -- 同時持有教師與學生兩個 Discord 身份組的人（例如助教），可以自由切換身分
  "canSwitchRole" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL
);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "canSwitchRole" BOOLEAN NOT NULL DEFAULT false;

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
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  syllabus TEXT[] NOT NULL,
  capacity INTEGER NOT NULL,
  "openAt" TIMESTAMPTZ NOT NULL,
  hot BOOLEAN NOT NULL DEFAULT false,
  -- 上課日期：這門課實際上課的具體日曆日期，可以有好幾個、彼此不需要規律
  -- （跟「上課星期／節次」是分開的概念，見 CourseSchedule）
  "courseDates" DATE[] NOT NULL DEFAULT '{}',
  -- 組數：這門課分成幾組上課
  "groupCount" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Course_teacherId_idx" ON "Course" ("teacherId");

-- 一門課可以有好幾組「星期＋節次」（例如週一第1節 + 週三第5節）。
-- 舊版本 Course 表直接放 day / periodIndex 兩個純量欄位，只能存一組，
-- 下面的 DO 區塊會把舊資料搬過來後再把舊欄位砍掉，冪等可重跑。
-- periodIndex 對到 lib/course-constants.ts 的 24 個整點時段其中一個；
-- 選「自訂時段」的話 periodIndex 是 null，改用 startTime/endTime（"HH:MM" 文字）。
-- 兩者互斥，由 app/api/courses/route.ts 的 parseSchedule 把關，這裡不設 CHECK。
CREATE TABLE IF NOT EXISTS "CourseSchedule" (
  id TEXT PRIMARY KEY,
  "courseId" TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  "periodIndex" INTEGER,
  "startTime" TEXT,
  "endTime" TEXT
);
CREATE INDEX IF NOT EXISTS "CourseSchedule_courseId_idx" ON "CourseSchedule" ("courseId");
ALTER TABLE "CourseSchedule" ALTER COLUMN "periodIndex" DROP NOT NULL;
ALTER TABLE "CourseSchedule" ADD COLUMN IF NOT EXISTS "startTime" TEXT;
ALTER TABLE "CourseSchedule" ADD COLUMN IF NOT EXISTS "endTime" TEXT;

-- 補欄位要在下面的搬遷 DO 區塊「之前」跑，不然舊資料庫在還沒有 courseDates
-- 欄位時就會被 UPDATE "Course" SET "courseDates" = ... 那段打到不存在的欄位。
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "courseDates" DATE[] NOT NULL DEFAULT '{}';
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "groupCount" INTEGER NOT NULL DEFAULT 1;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Course' AND column_name = 'day'
  ) THEN
    INSERT INTO "CourseSchedule" (id, "courseId", day, "periodIndex")
    SELECT "Course".id || '-migrated', "Course".id, "Course".day, "Course"."periodIndex"
    FROM "Course"
    WHERE NOT EXISTS (
      SELECT 1 FROM "CourseSchedule" WHERE "CourseSchedule"."courseId" = "Course".id
    );

    ALTER TABLE "Course" DROP COLUMN day;
    ALTER TABLE "Course" DROP COLUMN "periodIndex";
  END IF;
END $$;

-- 舊版本是單一 courseDate（DATE），這裡搬成陣列 courseDates（DATE[]）。
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Course' AND column_name = 'courseDate'
  ) THEN
    UPDATE "Course" SET "courseDates" = ARRAY["courseDate"] WHERE "courseDate" IS NOT NULL;
    ALTER TABLE "Course" DROP COLUMN "courseDate";
  END IF;
END $$;

-- 全站課程只在同一個固定時間開放報名（見 lib/course-constants.ts 的 GLOBAL_OPEN_AT），
-- 不論新舊課程都一致，所以連既有課程的 openAt 也一併校正成這個時間。
UPDATE "Course" SET "openAt" = '2026-08-21 20:00:00+08';

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
