import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { messages, connections } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { connectionId, content } = await request.json();

    if (!connectionId || !content?.trim()) {
      return NextResponse.json(
        { error: "Connection ID and message content are required" },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Verify the user is part of this connection and it's accepted
    const connection = await db.query.connections.findFirst({
      where: and(
        eq(connections.id, connectionId),
        or(
          eq(connections.initiatorId, userId),
          eq(connections.recipientId, userId)
        ),
        eq(connections.status, "accepted")
      ),
    });

    if (!connection) {
      return NextResponse.json(
        { error: "Connection not found or not authorized" },
        { status: 404 }
      );
    }

    // Create the message
    const [newMessage] = await db
      .insert(messages)
      .values({
        connectionId,
        senderId: userId,
        content: content.trim(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: newMessage,
    });

  } catch (error) {
    console.error("[MESSAGES_SEND] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
