import { redirect, notFound } from "next/navigation";
import { getCurrentUser, getTentacle, getMatches } from "@/lib/queries";
import { SUBJECT_LABELS } from "@/lib/db/schema";
import { MatchesResults } from "@/components/matches-results";

export default async function MatchesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  console.log("[MATCHES_PAGE] Loading matches page", { tentacleId: id });

  const user = await getCurrentUser();
  if (!user) {
    console.log("[MATCHES_PAGE] No user found, redirecting to signin");
    redirect("/signin");
  }

  const tentacle = await getTentacle(id, user.id);
  if (!tentacle) {
    console.log("[MATCHES_PAGE] Tentacle not found or unauthorized", {
      tentacleId: id,
      userId: user.id,
    });
    notFound();
  }

  console.log("[MATCHES_PAGE] Tentacle loaded", {
    tentacleId: tentacle.id,
    subject: tentacle.subject,
    regionId: tentacle.regionId,
    active: tentacle.active,
    availabilitySlots: tentacle.availabilityUtc
      .split("")
      .filter((c: string) => c === "1").length,
  });

  const lat = user.postcodeLat ? parseFloat(user.postcodeLat) : 0;
  const lon = user.postcodeLon ? parseFloat(user.postcodeLon) : 0;

  if (!user.postcodeLat || !user.postcodeLon) {
    console.log(
      "[MATCHES_PAGE] User has no location data - proximity scoring will be disabled",
    );
  }

  let matches: Awaited<ReturnType<typeof getMatches>> = [];
  let matchError: Error | null = null;

  try {
    matches = await getMatches(
      tentacle.id,
      user.id,
      tentacle.regionId,
      tentacle.subject,
      tentacle.availabilityUtc,
      lat,
      lon,
    );
  } catch (error) {
    matchError = error as Error;
    console.error("[MATCHES_PAGE] Error fetching matches", {
      error: matchError.message,
      stack: matchError.stack,
      hint: "Check if PostgreSQL extensions (cube, earthdistance, postgis) are installed",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Matches for{" "}
          {SUBJECT_LABELS[tentacle.subject as keyof typeof SUBJECT_LABELS]}
        </h1>
      </div>

      <MatchesResults
        matches={matches}
        currentUserId={user.id}
        myTentacleId={tentacle.id}
        myAvailability={tentacle.availabilityLocal}
        subjectLabel={
          SUBJECT_LABELS[tentacle.subject as keyof typeof SUBJECT_LABELS]
        }
        error={matchError}
      />
    </div>
  );
}
