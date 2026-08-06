import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { regions, synagogues } from "@/lib/db/schema";
import shuls from "@/data/synagogues.json";

/**
 * Reference data: the rows the app needs to function at all, in any environment.
 * Contains no user data, so it is safe to run against production as well as previews.
 * Both seeders are idempotent — re-running them adds nothing and changes nothing.
 */

/** The regions the app currently serves, keyed by the slug the app looks them up by. */
const REGIONS = [
  {
    slug: "london",
    name: "London",
    timezone: "Europe/London",
    countryCode: "GB",
    active: true,
  },
] as const;

/**
 * Inserts the served regions, skipping any that already exist.
 *
 * @returns The `london` region's generated id, which every other seeder needs as a
 *   foreign key. Read back rather than assumed, because `regions.id` is a serial and
 *   a re-seeded database will not restart the sequence at 1.
 */
export async function seedRegions(): Promise<number> {
  await db
    .insert(regions)
    .values([...REGIONS])
    .onConflictDoNothing({ target: regions.slug });

  const [london] = await db
    .select({ id: regions.id })
    .from(regions)
    .where(eq(regions.slug, "london"));

  if (!london) {
    throw new Error("Seeded the london region but could not read it back");
  }
  return london.id;
}

/**
 * Inserts the synagogue reference list from `data/synagogues.json`.
 *
 * The JSON uses the database's snake_case column names, so each record is mapped onto
 * the camelCase Drizzle keys explicitly — passing the raw record through would let
 * Drizzle silently drop every multi-word column (`region_id`, `rabbi_name`, …) and
 * leave the rows unattached to their region.
 *
 * @param regionId - Region to attach every synagogue to, overriding the JSON's own
 *   `region_id`, whose serial values are not stable across a reseeded database.
 * @returns The number of synagogues in the reference list.
 */
export async function seedSynagogues(regionId: number): Promise<number> {
  const rows = shuls.map((shul) => ({
    name: shul.name,
    nickname: shul.nickname,
    description: shul.description,
    regionId,
    country: shul.country,
    address: shul.address,
    postcode: shul.postcode,
    email: shul.email,
    tel: shul.tel,
    rabbiName: shul.rabbi_name,
    rabbiNumber: shul.rabbi_number,
    rabbiEmail: shul.rabbi_email,
    nusach: shul.nusach,
    website: shul.website,
    addressLon: shul.address_lon,
    addressLat: shul.address_lat,
  }));

  // `synagogues.name` carries no unique constraint, so there is no conflict target to
  // key an upsert on. Skipping a populated table is what keeps a re-seed from
  // duplicating all 96 rows — clearing it instead would trip the foreign key that
  // seeded users hold on `synagogues.id`.
  const existing = await db.select({ id: synagogues.id }).from(synagogues).limit(1);
  if (existing.length > 0) {
    return 0;
  }

  await db.insert(synagogues).values(rows);
  return rows.length;
}
