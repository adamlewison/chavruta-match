import { notFound, redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser, getPublicUserProfile } from "@/lib/queries";
import { SUBJECT_LABELS, MEDIUM_LABELS } from "@/lib/db/schema";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/signin");

  const profile = await getPublicUserProfile(id);
  if (!profile) notFound();

  const { user, tentacles } = profile;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-sm">
          <AvatarImage src={user.imageUrl || user.image || undefined} />
          <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
            {user.name?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          {user.bio && (
            <p className="mt-1 text-muted-foreground">{user.bio}</p>
          )}
        </div>
      </div>

      {tentacles.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Learning
          </h2>
          <div className="flex flex-wrap gap-2">
            {tentacles.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm"
              >
                <span className="font-medium">
                  {SUBJECT_LABELS[t.subject as keyof typeof SUBJECT_LABELS]}
                </span>
                {t.medium && (
                  <Badge variant="outline" className="text-xs">
                    {MEDIUM_LABELS[t.medium as keyof typeof MEDIUM_LABELS]}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
