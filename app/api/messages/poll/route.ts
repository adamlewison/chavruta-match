import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { messages, connections } from "@/lib/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { createHash } from "crypto";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Get the last update timestamp for all user's connections
    const userConnections = await db
      .select({
        connectionId: connections.id,
        lastMessageTime: messages.createdAt,
      })
      .from(connections)
      .leftJoin(messages, eq(messages.connectionId, connections.id))
      .where(
        and(
          or(
            eq(connections.initiatorId, userId),
            eq(connections.recipientId, userId)
          ),
          eq(connections.status, "accepted")
        )
      )
      .orderBy(desc(messages.createdAt));

    // Create a hash of the latest message timestamps to use as ETag
    const lastUpdateTimes = userConnections
      .map(conn => conn.lastMessageTime?.getTime() || 0)
      .sort((a, b) => b - a); // Sort descending to get latest first
    
    const etag = createHash('md5')
      .update(JSON.stringify({
        userId,
        timestamps: lastUpdateTimes.slice(0, 10) // Only consider top 10 most recent
      }))
      .digest('hex');

    // Check if client has the same ETag (no changes)
    const clientETag = request.headers.get('if-none-match');
    if (clientETag === `"${etag}"`) {
      return new NextResponse(null, { 
        status: 304,
        headers: {
          'ETag': `"${etag}"`,
          'Cache-Control': 'no-cache'
        }
      });
    }

    // Return minimal data indicating there are changes
    const hasNewMessages = lastUpdateTimes.length > 0 && lastUpdateTimes[0] > 0;
    
    return NextResponse.json(
      { 
        hasUpdates: hasNewMessages,
        lastUpdate: lastUpdateTimes[0] || null
      },
      {
        headers: {
          'ETag': `"${etag}"`,
          'Cache-Control': 'no-cache'
        }
      }
    );

  } catch (error) {
    console.error("[MESSAGES_POLL] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
