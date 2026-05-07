"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const name = formData.get("name") as string;
  const bio = formData.get("bio") as string;
  const avatarUrl = formData.get("avatarUrl") as string | null;
  const removeAvatar = formData.get("removeAvatar") === "true";

  if (!name?.trim()) {
    return { error: "Name is required" };
  }

  const updateData: {
    name: string;
    bio: string | null;
    image: string | null;
    updatedAt: Date;
  } = {
    name: name.trim(),
    bio: bio?.trim() || null,
    image: undefined as unknown as string | null,
    updatedAt: new Date(),
  };

  if (avatarUrl) {
    updateData.image = avatarUrl;
  } else if (removeAvatar) {
    updateData.image = null;
  } else {
    delete (updateData as { image?: string | null }).image;
  }

  await db.update(users).set(updateData).where(eq(users.id, session.user.id));

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateProfilePicture(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const avatarUrl = formData.get("avatarUrl") as string | null;
  const removeAvatar = formData.get("removeAvatar") === "true";

  if (!avatarUrl && !removeAvatar) {
    return { error: "No changes provided" };
  }

  const image = removeAvatar ? null : avatarUrl;

  await db
    .update(users)
    .set({ image, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true };
}
