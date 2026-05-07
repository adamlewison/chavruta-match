"use server";

import { db } from "@/lib/db";
import { tentacles, users } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  localToUtc,
  getTimezoneOffsetHours,
  TOTAL_SLOTS,
} from "@/lib/availability";
import type { Subject, Medium } from "@/lib/db/schema";

export async function createTentacle(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user?.regionId) {
    return { error: "Please complete onboarding first" };
  }

  const subject = formData.get("subject") as Subject;
  const medium = (formData.get("medium") as Medium) || null;
  const notes = (formData.get("notes") as string) || null;
  const availabilityLocal = formData.get("availability") as string;

  if (!subject) return { error: "Please select a subject" };
  if (!availabilityLocal || availabilityLocal.length !== TOTAL_SLOTS) {
    return { error: "Please set your availability" };
  }

  // Get timezone offset for the user's region
  const region = await db.query.regions.findFirst({
    where: eq(
      (await import("@/lib/db/schema")).regions.id,
      user.regionId
    ),
  });

  const offset = region
    ? getTimezoneOffsetHours(region.timezone)
    : 0;
  const availabilityUtc = localToUtc(availabilityLocal, offset);

  const [tentacle] = await db
    .insert(tentacles)
    .values({
      userId: session.user.id,
      regionId: user.regionId,
      subject,
      availabilityLocal,
      availabilityUtc,
      medium,
      notes,
    })
    .returning();

  revalidatePath("/dashboard");
  redirect(`/tentacles/${tentacle.id}`);
}

export async function updateTentacle(tentacleId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const tentacle = await db.query.tentacles.findFirst({
    where: and(
      eq(tentacles.id, tentacleId),
      eq(tentacles.userId, session.user.id)
    ),
  });

  if (!tentacle) return { error: "Tentacle not found" };

  const subject = formData.get("subject") as Subject;
  const medium = (formData.get("medium") as Medium) || null;
  const notes = (formData.get("notes") as string) || null;
  const availabilityLocal = formData.get("availability") as string;
  const active = formData.get("active") !== "false";

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  const region = user?.regionId
    ? await db.query.regions.findFirst({
        where: eq(
          (await import("@/lib/db/schema")).regions.id,
          user.regionId
        ),
      })
    : null;

  const offset = region ? getTimezoneOffsetHours(region.timezone) : 0;
  const availabilityUtc = availabilityLocal
    ? localToUtc(availabilityLocal, offset)
    : tentacle.availabilityUtc;

  await db
    .update(tentacles)
    .set({
      subject,
      medium,
      notes,
      availabilityLocal: availabilityLocal || tentacle.availabilityLocal,
      availabilityUtc,
      active,
      updatedAt: new Date(),
    })
    .where(eq(tentacles.id, tentacleId));

  revalidatePath("/dashboard");
  revalidatePath(`/tentacles/${tentacleId}`);
  return { success: true };
}

export async function deleteTentacle(tentacleId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  await db
    .delete(tentacles)
    .where(
      and(eq(tentacles.id, tentacleId), eq(tentacles.userId, session.user.id))
    );

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
