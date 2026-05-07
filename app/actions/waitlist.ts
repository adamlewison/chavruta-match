"use server";

import { db } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";

export async function joinWaitlist({
  email,
  requestedRegion,
  detectedCountry,
  detectedCity,
}: {
  email: string;
  requestedRegion?: string;
  detectedCountry?: string;
  detectedCity?: string;
}) {
  await db.insert(waitlist).values({
    email,
    requestedRegion: requestedRegion || null,
    detectedCountry: detectedCountry || null,
    detectedCity: detectedCity || null,
  });
}
