import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "@neondatabase/serverless";

/** 取代 `prisma db push`：對 DATABASE_URL 執行一份冪等的 DDL 檔。 */
async function main() {
  const schemaPath = path.join(import.meta.dirname, "..", "lib", "sql", "schema.sql");
  const sql = readFileSync(schemaPath, "utf8");

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query(sql);
    console.log("Schema 已同步。");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
