import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Plus, ArrowRight, Users, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getCurrentUser,
  getUserTentacles,
  getIncomingConnections,
  getAcceptedConnections,
} from "@/lib/queries";
import { SUBJECT_LABELS, MEDIUM_LABELS } from "@/lib/db/schema";
import { AvailabilityMini } from "@/components/availability-picker";
import { ConnectionActions } from "@/components/connection-actions";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/signin");

  if (!user.regionId) {
    redirect("/onboarding");
  }

  const [tentaclesList, incoming, accepted] = await Promise.all([
    getUserTentacles(user.id),
    getIncomingConnections(user.id),
    getAcceptedConnections(user.id),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            Welcome back, {user.name}
          </p>
          <h1 className="text-2xl font-bold">My Learning</h1>
          <p className="text-muted-foreground">
            Keep your study slots, matches, and connections in one place.
          </p>
        </div>
        <Link href="/tentacles/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add a Learning Request
          </Button>
        </Link>
      </div>

      {/* Incoming connection requests */}
      {incoming.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Inbox className="h-5 w-5 text-primary" />
              Pending Requests ({incoming.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {incoming.map((row) => (
              <Link
                key={row.connection.id}
                href={`/connections/${row.connection.id}`}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={row.initiatorImage || undefined} />
                    <AvatarFallback>
                      {row.initiatorName?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{row.initiatorName}</p>
                    {row.connection.message && (
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        &quot;{row.connection.message}&quot;
                      </p>
                    )}
                  </div>
                </div>
                <ConnectionActions
                  connectionId={row.connection.id}
                  type="incoming"
                />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Your tentacles */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Your Study Slots</h2>
        {tentaclesList.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4 text-center max-w-sm">
                To find a chavruta, tell us what you’re interested in learning
                and when you’re free.
              </p>
              <Link href="/tentacles/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add a Learning Request
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {tentaclesList.map((t) => (
              <Card
                key={t.id}
                className="hover:border-primary/30 transition-colors h-full"
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant={t.active ? "default" : "secondary"}>
                      {SUBJECT_LABELS[t.subject as keyof typeof SUBJECT_LABELS]}
                    </Badge>
                    {!t.active && (
                      <Badge variant="outline" className="text-xs">
                        Paused
                      </Badge>
                    )}
                  </div>
                  {t.medium && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {MEDIUM_LABELS[t.medium as keyof typeof MEDIUM_LABELS]}
                    </p>
                  )}
                  <AvailabilityMini bitmap={t.availabilityLocal} />
                  {t.notes && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {t.notes}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/tentacles/${t.id}/matches`}
                      className="flex-1 min-w-[120px]"
                    >
                      <Button
                        variant="outline"
                        className="w-full justify-center gap-1"
                      >
                        Find matches
                      </Button>
                    </Link>
                    <Link
                      href={`/tentacles/${t.id}`}
                      className="flex-1 min-w-[120px]"
                    >
                      <Button
                        variant="ghost"
                        className="w-full justify-center gap-1"
                      >
                        Edit slot
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Accepted connections */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Your Chavrutas</h2>
          <Link href="/connections">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
        {accepted.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Users className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-center">
                No connections yet. Create a study slot and start matching!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {accepted.map((row) => (
              <Link
                key={row.connection.id}
                href={`/connections/${row.connection.id}`}
              >
                <Card className="hover:border-primary/30 transition-colors">
                  <CardContent className="flex items-center gap-3 py-3">
                    <Avatar>
                      <AvatarImage src={row.otherUserImage || undefined} />
                      <AvatarFallback>
                        {row.otherUserName?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{row.otherUserName}</p>
                      <p className="text-xs text-muted-foreground">Connected</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
