import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { regions } from "../lib/db/schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function main() {
  await db.insert(regions).values({
    slug: "london",
    name: "London",
    timezone: "Europe/London",
    countryCode: "GB",
    active: true,
  }).onConflictDoNothing({ target: regions.slug });

  console.log("Seeded London region");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
