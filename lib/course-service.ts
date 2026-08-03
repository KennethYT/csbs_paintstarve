import { randomUUID } from "node:crypto";
import type { PoolClient } from "@neondatabase/serverless";
import { pool } from "@/lib/db";
import type {
  Course,
  CourseCategory,
  CourseRoster,
  CreateCoursePayload,
  EnrollmentState
} from "@/lib/types";

export type CoursesSnapshot = {
  courses: Course[];
  enrollments: Record<string, EnrollmentState>;
};

/** 領域錯誤，由 route handler 轉成對應的 HTTP 狀態碼。 */
export class CourseError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "CourseError";
  }
}

type CourseRow = {
  id: string;
  title: string;
  teacherId: string;
  category: string;
  day: number;
  periodIndex: number;
  location: string;
  description: string;
  syllabus: string[];
  capacity: number;
  openAt: Date;
  hot: boolean;
  courseDate: string;
  groupCount: number;
  teacherName: string;
};

const COURSE_COLUMNS = `
  c.id, c.title, c."teacherId", c.category, c.day, c."periodIndex", c.location,
  c.description, c.syllabus, c.capacity, c."openAt", c.hot,
  c."courseDate"::text AS "courseDate", c."groupCount", u.name AS "teacherName"
`;

const COURSE_JOIN_TEACHER = `FROM "Course" c JOIN "user" u ON u.id = c."teacherId"`;

function toCourse(row: CourseRow, enrolled: number, waitlistCount: number): Course {
  return {
    id: row.id,
    title: row.title,
    teacher: row.teacherName,
    teacherId: row.teacherId,
    category: row.category as CourseCategory,
    day: row.day,
    periodIndex: row.periodIndex,
    location: row.location,
    description: row.description,
    syllabus: row.syllabus,
    capacity: row.capacity,
    enrolled,
    waitlistCount,
    openAt: row.openAt.getTime(),
    hot: row.hot,
    courseDate: row.courseDate,
    groupCount: row.groupCount
  };
}

/** 讀取 Postgres 錯誤的 SQLSTATE（pg / Neon 的錯誤物件都帶這個欄位）。 */
function pgErrorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

/**
 * 取得所有課程 + 即時人數 + 這位使用者自己的選課狀態。
 * 人數用 GROUP BY 一次算完，不把全部選課紀錄拉回應用層。
 */
export async function getCoursesSnapshot(userId: string): Promise<CoursesSnapshot> {
  const [rows, counts, mine] = await Promise.all([
    pool.query<CourseRow>(
      `SELECT ${COURSE_COLUMNS} ${COURSE_JOIN_TEACHER} ORDER BY c.day ASC, c."periodIndex" ASC, c.title ASC`
    ),
    pool.query<{ courseId: string; status: "enrolled" | "waitlist"; count: number }>(
      `SELECT "courseId", status, COUNT(*)::int AS count FROM "Enrollment" GROUP BY "courseId", status`
    ),
    pool.query<{ courseId: string; status: "enrolled" | "waitlist"; position: number | null }>(
      `SELECT "courseId", status, position FROM "Enrollment" WHERE "userId" = $1`,
      [userId]
    )
  ]);

  const enrolledCounts = new Map<string, number>();
  const waitlistCounts = new Map<string, number>();

  for (const row of counts.rows) {
    const target = row.status === "enrolled" ? enrolledCounts : waitlistCounts;
    target.set(row.courseId, row.count);
  }

  const enrollments: Record<string, EnrollmentState> = {};

  for (const row of mine.rows) {
    enrollments[row.courseId] =
      row.status === "enrolled"
        ? { status: "enrolled" }
        : { status: "waitlist", position: row.position ?? 0 };
  }

  return {
    courses: rows.rows.map((row) =>
      toCourse(row, enrolledCounts.get(row.id) ?? 0, waitlistCounts.get(row.id) ?? 0)
    ),
    enrollments
  };
}

export async function getCourse(courseId: string, userId: string) {
  const { rows } = await pool.query<CourseRow>(
    `SELECT ${COURSE_COLUMNS} ${COURSE_JOIN_TEACHER} WHERE c.id = $1`,
    [courseId]
  );
  const row = rows[0];

  if (!row) {
    throw new CourseError("找不到這門課程。", 404);
  }

  const [enrolledResult, waitlistResult, mineResult] = await Promise.all([
    pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM "Enrollment" WHERE "courseId" = $1 AND status = 'enrolled'`,
      [courseId]
    ),
    pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM "Enrollment" WHERE "courseId" = $1 AND status = 'waitlist'`,
      [courseId]
    ),
    pool.query<{ status: "enrolled" | "waitlist"; position: number | null }>(
      `SELECT status, position FROM "Enrollment" WHERE "courseId" = $1 AND "userId" = $2`,
      [courseId, userId]
    )
  ]);

  const mine = mineResult.rows[0];
  const enrollment: EnrollmentState | null = mine
    ? mine.status === "enrolled"
      ? { status: "enrolled" }
      : { status: "waitlist", position: mine.position ?? 0 }
    : null;

  return {
    course: toCourse(row, enrolledResult.rows[0].count, waitlistResult.rows[0].count),
    enrollment
  };
}

/** 名單只有授課教師拿得到。 */
export async function getRoster(courseId: string, teacherId: string): Promise<CourseRoster> {
  const { rows: courseRows } = await pool.query<{ teacherId: string }>(
    `SELECT "teacherId" FROM "Course" WHERE id = $1`,
    [courseId]
  );
  const course = courseRows[0];

  if (!course) {
    throw new CourseError("找不到這門課程。", 404);
  }

  if (course.teacherId !== teacherId) {
    throw new CourseError("只有授課教師可以查看選課名單。", 403);
  }

  const { rows } = await pool.query<{
    status: "enrolled" | "waitlist";
    position: number | null;
    userId: string;
    userName: string;
  }>(
    `SELECT e.status, e.position, u.id AS "userId", u.name AS "userName"
     FROM "Enrollment" e JOIN "user" u ON u.id = e."userId"
     WHERE e."courseId" = $1
     ORDER BY e.position ASC NULLS LAST, e."createdAt" ASC`,
    [courseId]
  );

  return {
    courseId,
    enrolledStudents: rows
      .filter((row) => row.status === "enrolled")
      .map((row) => ({ id: row.userId, name: row.userName })),
    waitlist: rows
      .filter((row) => row.status === "waitlist")
      .map((row) => ({ id: row.userId, name: row.userName, position: row.position ?? 0 }))
  };
}

export async function createCourse(teacherId: string, payload: CreateCoursePayload) {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO "Course"
       (id, title, "teacherId", category, day, "periodIndex", location, description, syllabus, capacity, "openAt", "courseDate", "groupCount")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING id`,
    [
      randomUUID(),
      payload.title,
      teacherId,
      payload.category,
      payload.day,
      payload.periodIndex,
      payload.location,
      payload.description,
      payload.syllabus,
      payload.capacity,
      new Date(payload.openAt),
      payload.courseDate,
      payload.groupCount
    ]
  );

  return rows[0];
}

/**
 * 對同一堂課取得交易層級的 advisory lock，讓針對這門課的搶課／退選請求排隊處理。
 *
 * 為什麼不用 Serializable 隔離等級：那個做法下，N 個人同時搶同一堂課會讓 Postgres
 * 中止其中大部分交易（serialization_failure），必須靠重試補救；實測 20 人搶 5 個名額時，
 * 重試 5 次仍有請求失敗。advisory lock 是「排隊」而不是「互相中止」，
 * 在開搶瞬間的高競爭下行為穩定得多，也不需要靠重試次數硬撐。
 *
 * 鎖會隨交易結束自動釋放（xact 版本），不需要手動解鎖。
 * 不同課程雜湊碰撞時只是多排一次隊，不影響正確性。
 */
async function lockCourse(client: PoolClient, courseId: string) {
  await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [courseId]);
}

/**
 * 保險機制：即使有 advisory lock，仍可能因為其他原因出現可重試的交易錯誤
 * （40001 serialization_failure、40P01 deadlock_detected）。
 */
async function withRetry<T>(run: () => Promise<T>, attempts = 5): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      const code = pgErrorCode(error);
      const isRetryable = code === "40001" || code === "40P01";

      if (!isRetryable) {
        throw error;
      }

      lastError = error;
      // 指數退避加抖動，避免重試又同時撞在一起
      const backoff = 2 ** attempt * 25 + Math.random() * 50;
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  throw lastError;
}

/** 在一個交易內執行 fn，成功則 COMMIT，失敗則 ROLLBACK，並保證連線歸還。 */
async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export type GrabResult =
  | { status: "enrolled" }
  | { status: "waitlist"; position: number };

export async function grabCourse(courseId: string, userId: string): Promise<GrabResult> {
  return withRetry(() =>
    withTransaction(async (client) => {
      // 先排隊，之後的讀取與寫入就不會有其他人插進來
      await lockCourse(client, courseId);

      const { rows: courseRows } = await client.query<{ capacity: number; openAt: Date }>(
        `SELECT capacity, "openAt" FROM "Course" WHERE id = $1`,
        [courseId]
      );
      const course = courseRows[0];

      if (!course) {
        throw new CourseError("找不到這門課程。", 404);
      }

      if (Date.now() < course.openAt.getTime()) {
        throw new CourseError("這門課還沒開放搶課。", 409);
      }

      const { rows: existingRows } = await client.query<{ id: string }>(
        `SELECT id FROM "Enrollment" WHERE "courseId" = $1 AND "userId" = $2`,
        [courseId, userId]
      );

      if (existingRows[0]) {
        throw new CourseError("你已經選過或候補這門課了。", 409);
      }

      const {
        rows: [{ count: taken }]
      } = await client.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM "Enrollment" WHERE "courseId" = $1 AND status = 'enrolled'`,
        [courseId]
      );

      if (taken < course.capacity) {
        await client.query(
          `INSERT INTO "Enrollment" (id, "courseId", "userId", status) VALUES ($1,$2,$3,'enrolled')`,
          [randomUUID(), courseId, userId]
        );
        return { status: "enrolled" } as const;
      }

      const {
        rows: [{ count: waitlisted }]
      } = await client.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM "Enrollment" WHERE "courseId" = $1 AND status = 'waitlist'`,
        [courseId]
      );
      const position = waitlisted + 1;

      await client.query(
        `INSERT INTO "Enrollment" (id, "courseId", "userId", status, position) VALUES ($1,$2,$3,'waitlist',$4)`,
        [randomUUID(), courseId, userId, position]
      );

      return { status: "waitlist", position } as const;
    })
  ).catch((error) => {
    // @@unique([courseId, userId]) 擋下併發的重複搶課
    if (pgErrorCode(error) === "23505") {
      throw new CourseError("你已經選過或候補這門課了。", 409);
    }

    throw error;
  });
}

export type CancelResult = {
  /** 被取消的是正取還是候補 */
  cancelled: "enrolled" | "waitlist";
  /** 因為這次退選而遞補上來的使用者 id（沒有就是 null） */
  promotedUserId: string | null;
};

export async function cancelEnrollment(courseId: string, userId: string): Promise<CancelResult> {
  return withRetry(() =>
    withTransaction(async (client) => {
      // 與搶課共用同一把鎖，遞補期間不會有人搶走剛空出來的位子
      await lockCourse(client, courseId);

      const { rows: enrollmentRows } = await client.query<{
        id: string;
        status: "enrolled" | "waitlist";
      }>(`SELECT id, status FROM "Enrollment" WHERE "courseId" = $1 AND "userId" = $2`, [
        courseId,
        userId
      ]);
      const enrollment = enrollmentRows[0];

      if (!enrollment) {
        throw new CourseError("你沒有選這門課。", 404);
      }

      await client.query(`DELETE FROM "Enrollment" WHERE id = $1`, [enrollment.id]);

      if (enrollment.status === "waitlist") {
        // 取消候補後，把後面的人往前遞補號碼
        await resequenceWaitlist(client, courseId);
        return { cancelled: "waitlist" as const, promotedUserId: null };
      }

      // 退掉正取名額後，候補第一位自動遞補
      const { rows: nextRows } = await client.query<{ id: string; userId: string }>(
        `SELECT id, "userId" FROM "Enrollment"
         WHERE "courseId" = $1 AND status = 'waitlist'
         ORDER BY position ASC NULLS LAST, "createdAt" ASC
         LIMIT 1`,
        [courseId]
      );
      const next = nextRows[0];

      if (!next) {
        return { cancelled: "enrolled" as const, promotedUserId: null };
      }

      await client.query(
        `UPDATE "Enrollment" SET status = 'enrolled', position = NULL WHERE id = $1`,
        [next.id]
      );

      await resequenceWaitlist(client, courseId);

      return { cancelled: "enrolled" as const, promotedUserId: next.userId };
    })
  );
}

/** 把候補名單的 position 重新排成連續的 1、2、3…… */
async function resequenceWaitlist(client: PoolClient, courseId: string) {
  const { rows: remaining } = await client.query<{ id: string; position: number | null }>(
    `SELECT id, position FROM "Enrollment"
     WHERE "courseId" = $1 AND status = 'waitlist'
     ORDER BY position ASC NULLS LAST, "createdAt" ASC`,
    [courseId]
  );

  // 交易共用一條連線，逐筆更新而非平行送出
  for (const [index, row] of remaining.entries()) {
    if (row.position !== index + 1) {
      await client.query(`UPDATE "Enrollment" SET position = $1 WHERE id = $2`, [index + 1, row.id]);
    }
  }
}
