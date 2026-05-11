import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { synagogues } from "../lib/db/schema";
import shuls from "../data/synagogues (1).json";
import { exit } from "process";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function main() {
  await db.insert(synagogues).values(shuls);

  console.log("Seeded London region");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
