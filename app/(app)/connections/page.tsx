import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Inbox, Send, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getCurrentUser,
  getIncomingConnections,
  getOutgoingConnections,
  getAcceptedConnections,
} from "@/lib/queries";
import { ConnectionActions } from "@/components/connection-actions";
import { StopPropagation } from "@/components/stop-propagation";

export default async function ConnectionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const [incoming, outgoing, accepted] = await Promise.all([
    getIncomingConnections(user.id),
    getOutgoingConnections(user.id),
    getAcceptedConnections(user.id),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Connections</h1>

      <Tabs defaultValue="accepted">
        <TabsList>
          <TabsTrigger value="accepted" className="gap-1">
            <Users className="h-4 w-4" />
            Chavrutas ({accepted.length})
          </TabsTrigger>
          <TabsTrigger value="incoming" className="gap-1">
            <Inbox className="h-4 w-4" />
            Received ({incoming.length})
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="gap-1">
            <Send className="h-4 w-4" />
            Sent ({outgoing.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accepted" className="mt-4">
          {accepted.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-10">
                <Users className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No connections yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {accepted.map((row) => (
                <Link key={row.connection.id} href={`/connections/${row.connection.id}`}>
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
                          Connected
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="incoming" className="mt-4">
          {incoming.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-10">
                <Inbox className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No pending requests.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {incoming.map((row) => (
                <Link key={row.connection.id} href={`/connections/${row.connection.id}`}>
                  <Card className="hover:border-primary/30 transition-colors">
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={row.initiatorImage || undefined} />
                          <AvatarFallback>
                            {row.initiatorName?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{row.initiatorName}</p>
                          {row.connection.message && (
                            <p className="text-sm text-muted-foreground truncate max-w-[250px]">
                              &quot;{row.connection.message}&quot;
                            </p>
                          )}
                        </div>
                      </div>
                      <StopPropagation>
                        <ConnectionActions connectionId={row.connection.id} type="incoming" />
                      </StopPropagation>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="outgoing" className="mt-4">
          {outgoing.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-10">
                <Send className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No sent requests.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {outgoing.map((row) => (
                <Link key={row.connection.id} href={`/connections/${row.connection.id}`}>
                  <Card className="hover:border-primary/30 transition-colors">
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={row.recipientImage || undefined} />
                          <AvatarFallback>
                            {row.recipientName?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{row.recipientName}</p>
                          <Badge variant="outline" className="text-xs">
                            Pending
                          </Badge>
                        </div>
                      </div>
                      <StopPropagation>
                        <ConnectionActions connectionId={row.connection.id} type="outgoing" />
                      </StopPropagation>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
