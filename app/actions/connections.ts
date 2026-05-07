"use server";

import { db } from "@/lib/db";
import { connections, users } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function sendConnectionRequest({
  recipientId,
  initiatorTentacleId,
  recipientTentacleId,
  message,
}: {
  recipientId: string;
  initiatorTentacleId: string;
  recipientTentacleId: string;
  message?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  console.log("[CONNECTION_REQUEST] Initiating connection request", {
    initiatorId: session.user.id,
    recipientId,
    initiatorTentacleId,
    recipientTentacleId,
    hasMessage: !!message,
  });

  if (session.user.id === recipientId) {
    console.log("[CONNECTION_REQUEST] Rejected - self connection attempt");
    return { error: "You can't connect with yourself" };
  }

  // Check for existing active connection
  const existing = await db
    .select()
    .from(connections)
    .where(
      and(
        or(
          and(
            eq(connections.initiatorId, session.user.id),
            eq(connections.recipientId, recipientId),
          ),
          and(
            eq(connections.initiatorId, recipientId),
            eq(connections.recipientId, session.user.id),
          ),
        ),
        sql`${connections.status} IN ('pending', 'accepted')`,
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    console.log("[CONNECTION_REQUEST] Rejected - duplicate connection", {
      existingStatus: existing[0].status,
      existingConnectionId: existing[0].id,
    });
    return { error: "A connection already exists with this user" };
  }

  await db.insert(connections).values({
    initiatorId: session.user.id,
    recipientId,
    initiatorTentacleId,
    recipientTentacleId,
    message: message || null,
  });

  console.log("[CONNECTION_REQUEST] Connection request created successfully", {
    initiatorId: session.user.id,
    recipientId,
  });

  revalidatePath("/dashboard");
  revalidatePath("/connections");
  return { success: true };
}

export async function respondToConnection(
  connectionId: string,
  action: "accept" | "decline" | "block",
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  console.log("[CONNECTION_RESPONSE] Processing connection response", {
    connectionId,
    action,
    userId: session.user.id,
  });

  const conn = await db.query.connections.findFirst({
    where: eq(connections.id, connectionId),
  });

  if (!conn) {
    console.log("[CONNECTION_RESPONSE] Connection not found", { connectionId });
    return { error: "Connection not found" };
  }

  if (action === "block") {
    // Either side can block
    if (
      conn.initiatorId !== session.user.id &&
      conn.recipientId !== session.user.id
    ) {
      console.log("[CONNECTION_RESPONSE] Unauthorized block attempt", {
        connectionId,
        userId: session.user.id,
      });
      return { error: "Not authorized" };
    }
  } else {
    // Only recipient can accept/decline
    if (conn.recipientId !== session.user.id) {
      console.log("[CONNECTION_RESPONSE] Unauthorized accept/decline attempt", {
        connectionId,
        action,
        userId: session.user.id,
        recipientId: conn.recipientId,
      });
      return { error: "Not authorized" };
    }
  }

  const statusMap = {
    accept: "accepted" as const,
    decline: "declined" as const,
    block: "blocked" as const,
  };

  await db
    .update(connections)
    .set({
      status: statusMap[action],
      respondedAt: new Date(),
    })
    .where(eq(connections.id, connectionId));

  console.log("[CONNECTION_RESPONSE] Connection updated successfully", {
    connectionId,
    action,
    newStatus: statusMap[action],
  });

  revalidatePath("/dashboard");
  revalidatePath("/connections");
  revalidatePath(`/connections/${connectionId}`);
  return { success: true };
}

export async function cancelConnection(connectionId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  console.log("[CONNECTION_CANCEL] Attempting to cancel connection", {
    connectionId,
    userId: session.user.id,
  });

  const conn = await db.query.connections.findFirst({
    where: and(
      eq(connections.id, connectionId),
      eq(connections.initiatorId, session.user.id),
    ),
  });

  if (!conn) {
    console.log("[CONNECTION_CANCEL] Connection not found or not authorized", {
      connectionId,
      userId: session.user.id,
    });
    return { error: "Connection not found" };
  }

  if (conn.status !== "pending") {
    console.log("[CONNECTION_CANCEL] Cannot cancel non-pending connection", {
      connectionId,
      currentStatus: conn.status,
    });
    return { error: "Can only cancel pending requests" };
  }

  await db
    .update(connections)
    .set({ status: "cancelled" })
    .where(eq(connections.id, connectionId));

  console.log("[CONNECTION_CANCEL] Connection cancelled successfully", {
    connectionId,
  });

  revalidatePath("/dashboard");
  revalidatePath("/connections");
  return { success: true };
}
