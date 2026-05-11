import { cache } from "react";
import { db } from "@/lib/db";
import { users, tentacles, connections, regions } from "@/lib/db/schema";
import { eq, and, or, sql, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export const getCurrentUser = cache(async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  return user || null;
});

export async function getUserTentacles(userId: string) {
  return db.query.tentacles.findMany({
    where: eq(tentacles.userId, userId),
    orderBy: [desc(tentacles.createdAt)],
  });
}

export async function getTentacle(tentacleId: string, userId: string) {
  return db.query.tentacles.findFirst({
    where: and(eq(tentacles.id, tentacleId), eq(tentacles.userId, userId)),
  });
}

export async function getRegionById(regionId: number | null | undefined) {
  if (!regionId) return null;
  return db.query.regions.findFirst({
    where: eq(regions.id, regionId),
  });
}

export async function getIncomingConnections(userId: string) {
  const rows = await db
    .select({
      connection: connections,
      initiatorName: users.name,
      initiatorImage: sql<
        string | null
      >`COALESCE(${users.imageUrl}, ${users.image})`,
    })
    .from(connections)
    .innerJoin(users, eq(users.id, connections.initiatorId))
    .where(
      and(
        eq(connections.recipientId, userId),
        eq(connections.status, "pending"),
      ),
    )
    .orderBy(desc(connections.createdAt));

  return rows;
}

export async function getOutgoingConnections(userId: string) {
  const rows = await db
    .select({
      connection: connections,
      recipientName: users.name,
      recipientImage: sql<
        string | null
      >`COALESCE(${users.imageUrl}, ${users.image})`,
    })
    .from(connections)
    .innerJoin(users, eq(users.id, connections.recipientId))
    .where(
      and(
        eq(connections.initiatorId, userId),
        eq(connections.status, "pending"),
      ),
    )
    .orderBy(desc(connections.createdAt));

  return rows;
}

export async function getAcceptedConnections(userId: string) {
  const rows = await db
    .select({
      connection: connections,
      otherUserName: users.name,
      otherUserImage: sql<
        string | null
      >`COALESCE(${users.imageUrl}, ${users.image})`,
      otherUserId: users.id,
    })
    .from(connections)
    .innerJoin(
      users,
      sql`${users.id} = CASE
        WHEN ${connections.initiatorId} = ${userId} THEN ${connections.recipientId}
        ELSE ${connections.initiatorId}
      END`,
    )
    .where(
      and(
        or(
          eq(connections.initiatorId, userId),
          eq(connections.recipientId, userId),
        ),
        eq(connections.status, "accepted"),
      ),
    )
    .orderBy(desc(connections.respondedAt));

  return rows;
}

export async function getAllUserConnections(userId: string) {
  const rows = await db
    .select({
      connection: connections,
      otherUserName: users.name,
      otherUserImage: users.imageUrl,
      otherUserId: users.id,
    })
    .from(connections)
    .innerJoin(
      users,
      sql`${users.id} = CASE
        WHEN ${connections.initiatorId} = ${userId} THEN ${connections.recipientId}
        ELSE ${connections.initiatorId}
      END`,
    )
    .where(
      and(
        or(
          eq(connections.initiatorId, userId),
          eq(connections.recipientId, userId),
        ),
        sql`${connections.status} IN ('pending', 'accepted')`,
      ),
    )
    .orderBy(desc(connections.createdAt));

  return rows;
}

export async function getMatches(
  tentacleId: string,
  userId: string,
  regionId: number,
  subject: string,
  availabilityUtc: string,
  lat: number,
  lon: number,
) {
  const startTime = Date.now();
  console.log("[MATCHING] Starting match search", {
    tentacleId,
    userId,
    regionId,
    subject,
    availabilitySlots: availabilityUtc.split("").filter((c) => c === "1")
      .length,
    location: { lat, lon },
  });

  const result = await db.execute(sql`
    WITH candidates AS (
      SELECT
        t2.id,
        t2.user_id,
        t2.notes,
        t2.medium,
        t2.availability_local,
        pending_connection.id AS pending_connection_id,
        pending_connection.initiator_id AS pending_initiator_id,
        pending_connection.recipient_id AS pending_recipient_id,
        u.name,
        u.bio,
        COALESCE(u.image_url, u.image) as image_url,
        u.postcode_lat,
        u.postcode_lon,
        (
          SELECT COUNT(*)::int
          FROM generate_series(0, 335) AS i
          WHERE substring(t2.availability_utc FROM i+1 FOR 1) = '1'
            AND substring(${availabilityUtc}::text FROM i+1 FOR 1) = '1'
        ) AS exact_slots,
        (
          SELECT COUNT(*)::int
          FROM generate_series(0, 335) AS i
          WHERE (
            (i > 0 AND substring(t2.availability_utc FROM i FOR 1) = '1' 
              AND substring(${availabilityUtc}::text FROM i+1 FOR 1) = '1')
            OR
            (i < 335 AND substring(t2.availability_utc FROM i+2 FOR 1) = '1' 
              AND substring(${availabilityUtc}::text FROM i+1 FOR 1) = '1')
          )
        ) AS near_slots,
        CASE
          WHEN u.postcode_lat IS NOT NULL AND u.postcode_lon IS NOT NULL
          THEN earth_distance(
            ll_to_earth(u.postcode_lat::float, u.postcode_lon::float),
            ll_to_earth(${lat}::float, ${lon}::float)
          )
          ELSE NULL
        END AS distance_m
      FROM tentacles t2
      JOIN users u ON u.id = t2.user_id
      LEFT JOIN connections pending_connection
        ON pending_connection.status = 'pending'
        AND (
          (pending_connection.initiator_id = ${userId} AND pending_connection.recipient_id = t2.user_id) OR
          (pending_connection.recipient_id = ${userId} AND pending_connection.initiator_id = t2.user_id)
        )
      WHERE t2.region_id = ${regionId}
        AND t2.subject = ${subject}
        AND t2.active = true
        AND t2.user_id <> ${userId}
        AND t2.id <> ${tentacleId}
        AND NOT EXISTS (
          SELECT 1 FROM connections c
          WHERE c.status IN ('accepted', 'blocked')
            AND (
              (c.initiator_id = ${userId} AND c.recipient_id = t2.user_id) OR
              (c.recipient_id = ${userId} AND c.initiator_id = t2.user_id)
            )
        )
    )
    SELECT
      id,
      user_id,
      notes,
      medium,
      availability_local,
      pending_connection_id,
      pending_initiator_id,
      pending_recipient_id,
      name,
      bio,
      image_url,
      exact_slots,
      near_slots,
      COALESCE(distance_m / 1000.0, 0) AS distance_km,
      LEAST(
        100,
        ROUND(
          (
            ((2 * exact_slots + near_slots)::numeric /
            GREATEST(${availabilityUtc.split("").filter((c) => c === "1").length * 2}, 1))
            * 100
          )
        )::int
      ) AS availability_score,
      (2 * exact_slots + near_slots) + COALESCE(4 * exp(-distance_m / 10000.0), 0) AS score
    FROM candidates
    WHERE exact_slots > 0
    ORDER BY score DESC, exact_slots DESC, distance_m ASC NULLS LAST
    LIMIT 20
  `);

  const matches = [...result] as Array<{
    id: string;
    user_id: string;
    notes: string | null;
    medium: string | null;
    availability_local: string;
    pending_connection_id: string | null;
    pending_initiator_id: string | null;
    pending_recipient_id: string | null;
    name: string;
    bio: string | null;
    image_url: string | null;
    exact_slots: number;
    near_slots: number;
    distance_km: number;
    availability_score: number;
    score: number;
  }>;

  const duration = Date.now() - startTime;
  console.log("[MATCHING] Match search completed", {
    duration: `${duration}ms`,
    matchCount: matches.length,
    topMatches: matches.slice(0, 3).map((m) => ({
      name: m.name,
      exactSlots: m.exact_slots,
      nearSlots: m.near_slots,
      exactHours: (m.exact_slots * 0.5).toFixed(1),
      nearHours: (m.near_slots * 0.5).toFixed(1),
      distanceKm: m.distance_km.toFixed(1),
      availabilityScore: m.availability_score,
      score: m.score.toFixed(2),
    })),
  });

  if (matches.length === 0) {
    console.log(
      "[MATCHING] No matches found - check if there are active tentacles in region",
      {
        regionId,
        subject,
      },
    );
  }

  return matches;
}

export async function getPublicUserProfile(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) return null;

  const userTentacles = await db.query.tentacles.findMany({
    where: and(eq(tentacles.userId, userId), eq(tentacles.active, true)),
  });

  return { user, tentacles: userTentacles };
}

export async function getConnectionDetail(
  connectionId: string,
  userId: string,
) {
  const rows = await db
    .select({
      connection: connections,
      otherUserName: users.name,
      otherUserImage: sql<
        string | null
      >`COALESCE(${users.imageUrl}, ${users.image})`,
      otherUserId: users.id,
      otherUserBio: users.bio,
    })
    .from(connections)
    .innerJoin(
      users,
      sql`${users.id} = CASE
        WHEN ${connections.initiatorId} = ${userId} THEN ${connections.recipientId}
        ELSE ${connections.initiatorId}
      END`,
    )
    .where(
      and(
        eq(connections.id, connectionId),
        or(
          eq(connections.initiatorId, userId),
          eq(connections.recipientId, userId),
        ),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const { connection } = row;

  const [initiatorTentacle, recipientTentacle] = await Promise.all([
    connection.initiatorTentacleId
      ? db.query.tentacles.findFirst({
          where: eq(tentacles.id, connection.initiatorTentacleId),
        })
      : null,
    connection.recipientTentacleId
      ? db.query.tentacles.findFirst({
          where: eq(tentacles.id, connection.recipientTentacleId),
        })
      : null,
  ]);

  const myTentacle =
    connection.initiatorId === userId ? initiatorTentacle : recipientTentacle;
  const theirTentacle =
    connection.initiatorId === userId ? recipientTentacle : initiatorTentacle;

  return {
    ...row,
    myTentacle: myTentacle ?? null,
    theirTentacle: theirTentacle ?? null,
  };
}
