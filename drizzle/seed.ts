import { client } from "@/lib/db";
import { seedRegions, seedSynagogues } from "@/drizzle/seed-reference";

/**
 * Seeds reference data only — regions and the synagogue list. Contains no user data,
 * so this is the seeder that is safe to run against any environment, production
 * included. For a browsable preview environment use `db:seed:preview` instead.
 */
async function main() {
  const regionId = await seedRegions();
  const synagogueCount = await seedSynagogues(regionId);

  console.log(`[seed] region london (id ${regionId})`);
  console.log(
    synagogueCount > 0
      ? `[seed] ${synagogueCount} synagogues`
      : "[seed] synagogues already present, skipped",
  );

  await client.end();
}

main().catch(async (err) => {
  console.error("[seed] failed:", err);
  await client.end();
  process.exit(1);
});
