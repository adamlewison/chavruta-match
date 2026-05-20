"use server";

import { db } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";

export type JoinWaitlistResult =
  | { success: true }
  | { success: false; error: string };

export async function joinWaitlist(
  formData: FormData,
): Promise<JoinWaitlistResult> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const location = (formData.get("location") as string | null)?.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  await db.insert(waitlist).values({
    email,
    requestedRegion: location || null,
  });

  return { success: true };
}
