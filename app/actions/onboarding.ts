"use server";

import { db } from "@/lib/db";
import { users, regions, synagogues } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, ilike, and, or, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

function normalizePostcode(postcode: string): string {
  const clean = postcode.replace(/\s+/g, "").toUpperCase();
  return clean.slice(0, -3) + " " + clean.slice(-3);
}

export async function saveOnboardingProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const name = formData.get("name") as string;
  const imageUrl = formData.get("imageUrl") as string | null;

  if (!name?.trim()) {
    return { error: "Name is required" };
  }

  const updateData: Record<string, unknown> = {
    name: name.trim(),
    updatedAt: new Date(),
  };

  if (imageUrl) {
    updateData.image = imageUrl;
  }

  await db.update(users).set(updateData).where(eq(users.id, session.user.id));

  return { success: true };
}

export async function saveOnboardingGender(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const gender = formData.get("gender") as string;

  if (gender !== "male" && gender !== "female") {
    return { error: "Please select your gender" };
  }

  await db
    .update(users)
    .set({ gender, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  return { success: true };
}

export async function saveOnboardingBio(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const bioRaw = formData.get("bio");
  const bio = typeof bioRaw === "string" ? bioRaw.trim() : "";

  if (bio.length > 300) {
    return { error: "Bio must be 300 characters or fewer" };
  }

  await db
    .update(users)
    .set({ bio: bio.length === 0 ? null : bio, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  return { success: true };
}

export async function saveOnboardingLocation(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) throw new Error("Not authenticated");
  const postcode = formData.get("postcode") as string;

  if (!postcode?.trim()) {
    return { error: "Postcode is required" };
  }

  if (!UK_POSTCODE_REGEX.test(postcode.trim())) {
    return { error: "Please enter a valid UK postcode" };
  }

  const normalized = normalizePostcode(postcode.trim());

  // Look up postcode coordinates
  let lat: number, lon: number, isLondon: boolean;
  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(normalized)}`,
    );
    if (!res.ok) {
      return { error: "Invalid postcode. Please check and try again." };
    }
    const data = await res.json();
    console.log("Postcode lookup result:", data);

    lat = data.result.latitude;
    lon = data.result.longitude;
    isLondon = data.result.region == "London";
  } catch {
    return { error: "Could not verify postcode. Please try again." };
  }

  // Check if the postcode falls within an active region

  /*

  const regionResult = await db
    .select({ id: regions.id })
    .from(regions)
    .where(
      sql`${regions.active} = true AND ST_Contains(boundary, ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326))`,
    )
    .limit(1);

  if (regionResult.length === 0) {
    return {
      error:
        "Your postcode is not within a supported region yet. You can join our waitlist to be notified when we expand.",
      showWaitlist: true,
    };
  }
    */

  // for now check if the postcode is in London (just as a placeholder until we have more regions)

  if (!isLondon) {
    return {
      error:
        "Your postcode is not within a supported region yet. You can join our waitlist to be notified when we expand.",
      showWaitlist: true,
    };
  }

  // For now, assign all London users to the same region until we have more defined regions
  const regionResult = await db
    .select({ id: regions.id })
    .from(regions)
    .where(eq(regions.slug, "london"))
    .limit(1);

  const regionId = regionResult[0].id;

  // Update user
  await db
    .update(users)
    .set({
      postcode: normalized,
      postcodeLat: lat.toString(),
      postcodeLon: lon.toString(),
      regionId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  return { success: true, regionId };
}

export async function searchSynagogues(
  query: string,
  regionId: number | null,
): Promise<{ id: number; name: string }[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  if (query.trim().length < 2) return [];

  return db
    .select({ id: synagogues.id, name: synagogues.name })
    .from(synagogues)
    .where(
      and(
        regionId ? eq(synagogues.regionId, regionId) : undefined,
        or(
          ilike(synagogues.name, `%${query.trim()}%`),
          ilike(synagogues.nickname, `%${query.trim()}%`),
          sql`regexp_replace(lower(${synagogues.nickname}), '[^a-z0-9]', '', 'g') like ${
            "%" +
            query
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]/gi, "") +
            "%"
          }`,
        ),
      ),
    )
    .limit(4);
}

export async function completeOnboarding(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const orthodoxAffiliation = formData.get("orthodoxAffiliation");
  if (orthodoxAffiliation !== "yes") {
    return {
      error: "Please confirm your orthodox community affiliation to continue.",
    };
  }

  const privacyConsent = formData.get("privacyConsent");
  if (privacyConsent !== "yes") {
    return {
      error:
        "Please agree to the Privacy Policy and consent to identity verification to continue.",
    };
  }

  const synagogueIdRaw = formData.get("synagogueId") as string | null;
  const synagogueName = (
    formData.get("synagogueName") as string | null
  )?.trim();

  if (synagogueName) {
    const synagogueId =
      synagogueIdRaw && synagogueIdRaw !== ""
        ? parseInt(synagogueIdRaw, 10)
        : null;

    let resolvedId: number;

    if (synagogueId !== null) {
      // User selected an existing synagogue
      resolvedId = synagogueId;
    } else {
      // User typed a name that doesn't match any suggestion — create it
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        columns: { regionId: true },
      });
      const inserted = await db
        .insert(synagogues)
        .values({
          name: synagogueName,
          regionId: currentUser?.regionId ?? null,
        })
        .returning({ id: synagogues.id });
      resolvedId = inserted[0].id;
    }

    await db
      .update(users)
      .set({ synagogueId: resolvedId, updatedAt: new Date() })
      .where(eq(users.id, session.user.id));
  }

  redirect("/dashboard");
}
