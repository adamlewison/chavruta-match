import { regions } from "@/lib/db/schema";
import { db, client } from "@/lib/db";

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
