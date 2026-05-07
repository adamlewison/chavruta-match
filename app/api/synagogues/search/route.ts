import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, synagogues } from "@/lib/db/schema";
import { eq, ilike, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { regionId: true },
  });

  const results = await db
    .select({ id: synagogues.id, name: synagogues.name })
    .from(synagogues)
    .where(
      and(
        user?.regionId ? eq(synagogues.regionId, user.regionId) : undefined,
        ilike(synagogues.name, `%${q}%`),
      ),
    )
    .limit(4);

  return NextResponse.json(results);
}
