import "dotenv/config";
import { randomUUID } from "node:crypto";
import { pool } from "../lib/db";

type EnrollmentStatus = "enrolled" | "waitlist";

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

/** 用本地時間組出 YYYY-MM-DD，避免 toISOString() 轉 UTC 造成日期跑掉一天。 */
function toLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type SeedCourse = {
  title: string;
  teacher: string;
  category: string;
  day: number;
  periodIndex: number;
  location: string;
  description: string;
  syllabus: string[];
  capacity: number;
  /** 相對於執行時間的開放時間偏移（毫秒），負數代表已開放 */
  openAtOffset: number;
  hot: boolean;
  /** 預先填入的已選人數，用來模擬課程已經有人選 */
  prefilled: number;
  /** 預先填入的候補人數 */
  prefilledWaitlist: number;
};

const seedCourses: SeedCourse[] = [
  {
    title: "資料結構與演算法",
    teacher: "張明德",
    category: "資訊",
    day: 1,
    periodIndex: 0,
    location: "資訊館 201",
    description: "介紹陣列、鏈結串列、樹與圖等核心資料結構，並實作經典演算法。",
    syllabus: ["第1週：複雜度分析", "第2週：鏈結串列與堆疊", "第3週：樹狀結構", "第4週：圖論與最短路徑"],
    capacity: 30,
    openAtOffset: -DAY,
    hot: true,
    prefilled: 22,
    prefilledWaitlist: 0
  },
  {
    title: "西洋藝術史導論",
    teacher: "林淑芬",
    category: "人文藝術",
    day: 2,
    periodIndex: 1,
    location: "人文大樓 105",
    description: "從文藝復興到當代藝術，建立西方視覺藝術的觀看方式。",
    syllabus: ["第1週：文藝復興", "第2週：巴洛克與洛可可", "第3週：印象派", "第4週：現代藝術"],
    capacity: 40,
    openAtOffset: -DAY,
    hot: false,
    prefilled: 40,
    prefilledWaitlist: 3
  },
  {
    title: "創業與新事業開發",
    teacher: "王建宏",
    category: "商管",
    day: 3,
    periodIndex: 2,
    location: "管理學院 302",
    description: "從商業模式設計到募資簡報，帶你走過一次完整的創業歷程。",
    syllabus: ["第1週：商業模式圖", "第2週：市場驗證", "第3週：財務規劃", "第4週：募資簡報"],
    capacity: 25,
    openAtOffset: 25_000,
    hot: false,
    prefilled: 10,
    prefilledWaitlist: 0
  },
  {
    title: "普通物理學(一)",
    teacher: "陳雅婷",
    category: "自然科學",
    day: 1,
    periodIndex: 3,
    location: "理學院 B1",
    description: "力學與熱學基礎，含每週實驗課，建立扎實的物理直覺。",
    syllabus: ["第1週：運動學", "第2週：牛頓運動定律", "第3週：功與能量", "第4週：熱力學基礎"],
    capacity: 35,
    openAtOffset: 3 * DAY,
    hot: false,
    prefilled: 5,
    prefilledWaitlist: 0
  },
  {
    title: "英語簡報溝通技巧",
    teacher: "李佳恩",
    category: "語言",
    day: 4,
    periodIndex: 0,
    location: "語言中心 3F",
    description: "訓練英語口語架構與台風，適合準備國際發表的同學。",
    syllabus: ["第1週：架構與開場", "第2週：視覺輔助設計", "第3週：問答應對", "第4週：模擬發表"],
    capacity: 20,
    openAtOffset: -HOUR,
    hot: false,
    prefilled: 12,
    prefilledWaitlist: 0
  },
  {
    title: "行為經濟學",
    teacher: "吳承翰",
    category: "社會科學",
    day: 2,
    periodIndex: 3,
    location: "社科院 210",
    description: "探討人類決策中的非理性因素，結合實驗與案例討論。",
    syllabus: ["第1週：捷思與偏誤", "第2週：展望理論", "第3週：社會偏好", "第4週：推力與政策設計"],
    capacity: 28,
    openAtOffset: -HOUR,
    hot: false,
    prefilled: 28,
    prefilledWaitlist: 1
  },
  {
    title: "數位攝影入門",
    teacher: "周文彥",
    category: "人文藝術",
    day: 5,
    periodIndex: 1,
    location: "藝術中心 暗房",
    description: "從構圖、光線到後製，帶你掌握數位攝影的基本語言。",
    syllabus: ["第1週：曝光三要素", "第2週：構圖法則", "第3週：人像攝影", "第4週：後製工作流"],
    capacity: 18,
    openAtOffset: -HOUR,
    hot: false,
    prefilled: 3,
    prefilledWaitlist: 0
  }
];

const studentNames = [
  "陳品妤", "林彥廷", "張宜蓁", "黃冠傑", "吳佳穎",
  "蔡宗翰", "李欣妍", "許家瑋", "謝雨柔", "鄭博文",
  "洪韋辰", "邱思瑀", "周芷若", "王大衛", "林小美",
  "曾筱涵", "劉俊霖", "簡佩琪", "潘冠廷", "葉子瑄",
  "宋明翰", "廖婉婷", "范姜宇", "馮語彤", "杜宗霖",
  "崔于萱", "阮柏翰", "湯亦晴", "尤承勳", "毛映嘉",
  "岑柏辰", "夏語安", "翁鈺婷", "凌昱翔", "屈曉彤",
  "秦紹謙", "殷若璇", "邵宥廷", "巫沛慈", "戴子軒",
  "高詩涵", "莊皓宇", "石佳蓉", "溫柏睿", "紀妍希",
  "何昱辰", "康雅筑", "田孟叡", "傅心妍", "鍾岳霖",
  "余珮瑜", "顏世傑", "陸品安", "施惠雯", "武承祐"
];

async function upsertUser(name: string, email: string, role: "student" | "teacher") {
  const now = new Date();

  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
     VALUES ($1,$2,$3,true,$4,$5,$5)
     ON CONFLICT (email) DO UPDATE SET name = $2, role = $4, "updatedAt" = $5
     RETURNING id`,
    [randomUUID(), name, email, role, now]
  );

  return rows[0];
}

async function main() {
  console.log("清空既有課程與選課資料…");
  // Enrollment 對 Course 有 ON DELETE CASCADE，刪課程即連帶刪選課
  await pool.query(`DELETE FROM "Enrollment"`);
  await pool.query(`DELETE FROM "Course"`);

  console.log("建立教師帳號…");
  const teacherIds = new Map<string, string>();

  for (const [index, name] of [...new Set(seedCourses.map((course) => course.teacher))].entries()) {
    const user = await upsertUser(name, `teacher${index + 1}@example.edu`, "teacher");
    teacherIds.set(name, user.id);
  }

  console.log("建立示範學生帳號…");
  const studentIds: string[] = [];

  for (const [index, name] of studentNames.entries()) {
    const user = await upsertUser(name, `student${index + 1}@example.edu`, "student");
    studentIds.push(user.id);
  }

  console.log("建立課程與預填選課資料…");
  const now = Date.now();
  let cursor = 0;

  for (const seed of seedCourses) {
    const teacherId = teacherIds.get(seed.teacher);

    if (!teacherId) {
      throw new Error(`找不到教師 ${seed.teacher} 的帳號`);
    }

    const {
      rows: [course]
    } = await pool.query<{ id: string }>(
      `INSERT INTO "Course"
         (id, title, "teacherId", category, day, "periodIndex", location, description, syllabus, capacity, "openAt", hot, "courseDate", "groupCount")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        randomUUID(),
        seed.title,
        teacherId,
        seed.category,
        seed.day,
        seed.periodIndex,
        seed.location,
        seed.description,
        seed.syllabus,
        seed.capacity,
        new Date(now + seed.openAtOffset),
        seed.hot,
        toLocalDateString(new Date(now + seed.openAtOffset)),
        1
      ]
    );

    const rows: Array<{ userId: string; status: EnrollmentStatus; position: number | null }> = [];

    for (let i = 0; i < seed.prefilled; i += 1) {
      rows.push({
        userId: studentIds[(cursor + i) % studentIds.length],
        status: "enrolled",
        position: null
      });
    }

    for (let i = 0; i < seed.prefilledWaitlist; i += 1) {
      rows.push({
        userId: studentIds[(cursor + seed.prefilled + i) % studentIds.length],
        status: "waitlist",
        position: i + 1
      });
    }

    // 同一堂課不能有重複學生（UNIQUE ("courseId","userId")），去重後再寫入
    const seen = new Set<string>();
    const unique = rows.filter((row) => {
      if (seen.has(row.userId)) return false;
      seen.add(row.userId);
      return true;
    });

    for (const row of unique) {
      await pool.query(
        `INSERT INTO "Enrollment" (id, "courseId", "userId", status, position) VALUES ($1,$2,$3,$4,$5)`,
        [randomUUID(), course.id, row.userId, row.status, row.position]
      );
    }

    cursor = (cursor + seed.prefilled + seed.prefilledWaitlist) % studentIds.length;
    console.log(`  ✓ ${seed.title}（已選 ${unique.filter((row) => row.status === "enrolled").length}/${seed.capacity}）`);
  }

  const {
    rows: [{ count: courseCount }]
  } = await pool.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM "Course"`);
  const {
    rows: [{ count: enrollmentCount }]
  } = await pool.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM "Enrollment"`);

  console.log(`\n完成：${courseCount} 門課程、${enrollmentCount} 筆選課紀錄。`);
  console.log(
    `示範帳號：teacher1..teacher${teacherIds.size}@example.edu、student1..student${studentIds.length}@example.edu。` +
      "\n這些帳號沒有綁定 Discord，無法登入，只用來讓課程有真實的選課紀錄。" +
      "\n要實際操作請從 /login 用 Discord 登入。"
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
