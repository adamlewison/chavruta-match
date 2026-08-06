import { db, client } from "@/lib/db";
import { connections, messages, synagogues, tentacles, users } from "@/lib/db/schema";
import { seedRegions, seedSynagogues } from "@/drizzle/seed-reference";
import {
  DEMO_CONNECTIONS,
  DEMO_EMAIL_DOMAIN,
  DEMO_MESSAGES,
  DEMO_USERS,
} from "@/drizzle/seed-preview-data";
import { getTimezoneOffsetHours, localToUtc } from "@/lib/availability";

/**
 * Seeds a browsable demo dataset for preview environments: reference data plus the fake
 * users, tentacles, connections and messages in `seed-preview-data.ts`, so a reviewer
 * opening a preview URL sees a populated app instead of empty states.
 *
 * Idempotent — every insert is keyed on a hard-coded id, so re-running changes nothing.
 * Never run this against production; `assertNotProduction` is the tripwire.
 */

const LONDON_TZ = "Europe/London";

/**
 * Aborts the seed if the target database holds accounts this seeder did not create,
 * which is the signature of a real environment rather than a preview branch.
 *
 * @throws If any user exists whose email is outside the demo domain. Set
 *   `FORCE_DEMO_SEED=1` to override — intended for reseeding a shared preview branch
 *   that has picked up manually created accounts, never for production.
 */
async function assertNotProduction(): Promise<void> {
  if (process.env.FORCE_DEMO_SEED === "1") return;

  const existing = await db.select({ email: users.email }).from(users);
  const real = existing.filter((u) => !u.email.endsWith(DEMO_EMAIL_DOMAIN));

  if (real.length > 0) {
    throw new Error(
      `Refusing to seed demo data: found ${real.length} non-demo user account(s). ` +
        `This does not look like a preview database. Set FORCE_DEMO_SEED=1 to override.`,
    );
  }
}

async function main() {
  await assertNotProduction();

  const regionId = await seedRegions();
  await seedSynagogues(regionId);

  // Read ids back rather than assuming 1..n — `synagogues.id` is a serial that does not
  // restart when the table is reseeded.
  const shulIds = (
    await db.select({ id: synagogues.id }).from(synagogues).orderBy(synagogues.id)
  ).map((s) => s.id);

  const offsetHours = getTimezoneOffsetHours(LONDON_TZ);

  await db
    .insert(users)
    .values(
      DEMO_USERS.map((u) => ({
        id: u.id,
        email: `${u.name.split(" ")[0].toLowerCase()}${DEMO_EMAIL_DOMAIN}`,
        name: u.name,
        bio: u.bio,
        gender: u.gender,
        regionId,
        synagogueId: shulIds[u.synagogueIndex % shulIds.length],
        postcode: u.postcode,
        postcodeLat: u.lat,
        postcodeLon: u.lon,
        emailVerified: new Date("2026-01-01T00:00:00Z"),
      })),
    )
    .onConflictDoNothing({ target: users.id });

  await db
    .insert(tentacles)
    .values(
      DEMO_USERS.flatMap((u) =>
        u.tentacles.map((t) => ({
          id: t.id,
          userId: u.id,
          regionId,
          subject: t.subject,
          availabilityLocal: t.availability,
          availabilityUtc: localToUtc(t.availability, offsetHours),
          medium: t.medium,
          notes: t.notes,
          active: true,
        })),
      ),
    )
    .onConflictDoNothing({ target: tentacles.id });

  await db
    .insert(connections)
    .values(DEMO_CONNECTIONS)
    .onConflictDoNothing({ target: connections.id });

  await db
    .insert(messages)
    .values(DEMO_MESSAGES)
    .onConflictDoNothing({ target: messages.id });

  const tentacleCount = DEMO_USERS.reduce((n, u) => n + u.tentacles.length, 0);
  console.log(
    `[seed:preview] ${DEMO_USERS.length} users, ${tentacleCount} tentacles, ` +
      `${DEMO_CONNECTIONS.length} connections, ${DEMO_MESSAGES.length} messages`,
  );

  await client.end();
}

main().catch(async (err) => {
  console.error("[seed:preview] failed:", err);
  await client.end();
  process.exit(1);
});
