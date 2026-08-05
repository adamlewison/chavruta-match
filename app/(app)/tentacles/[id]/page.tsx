import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser, getTentacle } from "@/lib/queries";
import { SUBJECT_LABELS, MEDIUM_LABELS } from "@/lib/db/schema";
import { totalHours } from "@/lib/availability";
import { TentacleEditForm } from "@/components/tentacle-edit-form";
import { DeleteTentacleButton } from "@/components/delete-tentacle-button";

export default async function TentaclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const tentacle = await getTentacle(id, user.id);
  if (!tentacle) notFound();

  const hours = totalHours(tentacle.availabilityLocal);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {SUBJECT_LABELS[tentacle.subject as keyof typeof SUBJECT_LABELS]}
          </h1>
          <p className="text-muted-foreground">
            {hours} hours/week &middot;{" "}
            {tentacle.medium
              ? MEDIUM_LABELS[tentacle.medium as keyof typeof MEDIUM_LABELS]
              : "Any medium"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/tentacles/${id}/matches`}>
            <Button className="gap-2">
              View Matches
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <TentacleEditForm tentacle={tentacle} />

      <Card className="border-destructive/30">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="font-medium text-sm">Delete this study slot</p>
            <p className="text-xs text-muted-foreground">
              This action cannot be undone.
            </p>
          </div>
          <DeleteTentacleButton tentacleId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
