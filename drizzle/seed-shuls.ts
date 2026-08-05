import { synagogues } from "@/lib/db/schema";
import shuls from "@/data/synagogues.json";
import { db, client } from "@/lib/db";

async function main() {
  await db.insert(synagogues).values(shuls);

  console.log("Seeded London region");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
