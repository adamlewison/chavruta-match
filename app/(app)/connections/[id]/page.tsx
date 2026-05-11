import { redirect, notFound } from "next/navigation";
import { MessageSquare, BookOpen, MessageCircle, Sparkles } from "lucide-react";
import { availabilityScore } from "@/lib/availability";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getCurrentUser, getConnectionDetail } from "@/lib/queries";
import { ChatPanel } from "@/components/chat-panel";
import { BlockButton } from "@/components/block-button";
import { ConnectionActions } from "@/components/connection-actions";
import { SUBJECT_LABELS, MEDIUM_LABELS } from "@/lib/db/schema";

export default async function ConnectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const detail = await getConnectionDetail(id, user.id);
  if (!detail) notFound();

  const {
    connection,
    otherUserName,
    otherUserImage,
    otherUserBio,
    myTentacle,
    theirTentacle,
  } = detail;

  const isPending = connection.status === "pending";
  const isRecipient = connection.recipientId === user.id;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Other user profile */}
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={otherUserImage || undefined} />
            <AvatarFallback className="text-xl">
              {otherUserName?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{otherUserName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {otherUserBio || "No bio added"}
            </p>
          </div>
          {!isPending && <BlockButton connectionId={connection.id} />}
        </CardContent>
      </Card>

      {isPending ? (
        <>
          {/* Message */}
          {connection.message && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  {isRecipient ? "Their message" : "Your message"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground italic">
                  &ldquo;{connection.message}&rdquo;
                </p>
              </CardContent>
            </Card>
          )}

          {/* Study slot details */}
          {(myTentacle || theirTentacle) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Study match details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {theirTentacle && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      They want to learn
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge>
                        {
                          SUBJECT_LABELS[
                            theirTentacle.subject as keyof typeof SUBJECT_LABELS
                          ]
                        }
                      </Badge>
                      {theirTentacle.medium && (
                        <Badge variant="outline">
                          {
                            MEDIUM_LABELS[
                              theirTentacle.medium as keyof typeof MEDIUM_LABELS
                            ]
                          }
                        </Badge>
                      )}
                    </div>
                    {theirTentacle.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {theirTentacle.notes}
                      </p>
                    )}
                  </div>
                )}

                {myTentacle && theirTentacle && (
                  <>
                    <Separator />
                    {(() => {
                      const score = availabilityScore(
                        myTentacle.availabilityUtc,
                        theirTentacle.availabilityUtc,
                      );
                      const label =
                        score >= 80
                          ? "Amazing fit"
                          : score >= 60
                            ? "Great fit"
                            : score >= 40
                              ? "Good fit"
                              : "Possible fit";
                      return (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5 text-sm font-semibold">
                              <Sparkles className="h-4 w-4 text-primary" />
                              {label}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Availability compatibility
                            </span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary via-primary/80 to-amber-400 transition-all"
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}

                {myTentacle && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Your study slot
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {
                          SUBJECT_LABELS[
                            myTentacle.subject as keyof typeof SUBJECT_LABELS
                          ]
                        }
                      </Badge>
                      {myTentacle.medium && (
                        <Badge variant="outline">
                          {
                            MEDIUM_LABELS[
                              myTentacle.medium as keyof typeof MEDIUM_LABELS
                            ]
                          }
                        </Badge>
                      )}
                    </div>
                    {myTentacle.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {myTentacle.notes}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Accept / decline (only for recipient) */}
          {isRecipient && (
            <div className="flex gap-3">
              <ConnectionActions connectionId={connection.id} type="incoming" />
            </div>
          )}

          {/* Cancel (only for initiator) */}
          {!isRecipient && (
            <div className="flex gap-3">
              <ConnectionActions connectionId={connection.id} type="outgoing" />
            </div>
          )}
        </>
      ) : connection.status === "accepted" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5" />
              Chat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChatPanel
              currentUserId={user.id}
              currentUserName={user.name}
              currentUserEmail={user.email}
              currentUserImage={user.imageUrl || user.image || undefined}
              connectionId={connection.id}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center py-10">
            <p className="text-muted-foreground capitalize">
              Connection {connection.status}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
