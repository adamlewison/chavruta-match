import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser, getAcceptedConnections } from "@/lib/queries";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight } from "lucide-react";

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const accepted = await getAcceptedConnections(user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Messages</h1>

      {accepted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              No conversations yet. Connect with a match to start chatting.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
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
                    <p className="text-xs text-muted-foreground">
                      Click to open chat
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
