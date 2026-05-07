import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { messages, connections, users } from "@/lib/db/schema";
import { eq, and, or, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { connectionId } = await params;
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

    // Get messages for this connection with sender info
    const connectionMessages = await db
      .select({
        id: messages.id,
        content: messages.content,
        createdAt: messages.createdAt,
        senderId: messages.senderId,
        senderName: users.name,
        senderImage: users.image,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.connectionId, connectionId))
      .orderBy(desc(messages.createdAt))
      .limit(100); // Limit to last 100 messages

    // Reverse to show oldest first
    const orderedMessages = connectionMessages.reverse();

    return NextResponse.json({
      messages: orderedMessages,
      connection: {
        id: connection.id,
        initiatorId: connection.initiatorId,
        recipientId: connection.recipientId,
      },
    });

  } catch (error) {
    console.error("[MESSAGES_FETCH] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
