"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Link2, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  cancelConnection,
  sendConnectionRequest,
} from "@/app/actions/connections";
import { MEDIUM_LABELS } from "@/lib/db/schema";

interface MatchCardProps {
  match: {
    id: string;
    user_id: string;
    name: string;
    image_url: string | null;
    bio: string | null;
    notes: string | null;
    medium: string | null;
    exact_slots: number;
    near_slots: number;
    distance_km: number;
    availability_score: number;
    pending_connection_id: string | null;
    pending_initiator_id: string | null;
    pending_recipient_id: string | null;
    score: number;
  };
  currentUserId: string;
  myTentacleId: string;
  myAvailability: string;
  subjectLabel: string;
}

export type MatchCardMatch = MatchCardProps["match"];

export function MatchCard({
  match,
  currentUserId,
  myTentacleId,
  subjectLabel,
}: MatchCardProps) {
  const firstName = match.name?.trim().split(/\s+/)[0] || match.name;
  const defaultMessage = `Hi ${firstName},

I noticed that you would like to learn ${subjectLabel}.

I'd love to learn together!`;
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(defaultMessage);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const pendingConnectionId = cancelled ? null : match.pending_connection_id;
  const hasPendingRequest = sent || !!pendingConnectionId;
  const sentPendingRequest =
    !!pendingConnectionId && match.pending_initiator_id === currentUserId;
  const receivedPendingRequest =
    !!pendingConnectionId && match.pending_recipient_id === currentUserId;

  const availabilityScore = Math.max(
    0,
    Math.min(100, match.availability_score),
  );
  const compatibilityLabel =
    availabilityScore >= 80
      ? "Amazing fit"
      : availabilityScore >= 60
        ? "Great fit"
        : availabilityScore >= 40
          ? "Good fit"
          : "Possible fit";

  async function handleConnect() {
    setLoading(true);
    try {
      const result = await sendConnectionRequest({
        recipientId: match.user_id,
        initiatorTentacleId: myTentacleId,
        recipientTentacleId: match.id,
        message: message || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Connection request sent!");
        setSent(true);
        setOpen(false);
      }
    } catch {
      toast.error("Failed to send request");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelRequest() {
    if (!pendingConnectionId) return;

    setLoading(true);
    try {
      const result = await cancelConnection(pendingConnectionId);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Connection request cancelled");
        setCancelled(true);
      }
    } catch {
      toast.error("Failed to cancel request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-background via-background to-primary/5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-sm">
            <AvatarImage src={match.image_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
              {match.name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-bold">{match.name}</p>
                <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {match.distance_km > 0
                    ? `${match.distance_km.toFixed(1)}km away`
                    : "Distance unavailable"}
                </div>
              </div>
            </div>

            {match.bio && (
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                {match.bio}
              </p>
            )}

            {match.medium && (
              <Badge variant="outline" className="mt-3 text-xs">
                {MEDIUM_LABELS[match.medium as keyof typeof MEDIUM_LABELS]}
              </Badge>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-card/80 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              {compatibilityLabel}
            </div>
            <div className="text-xs text-muted-foreground">
              Availability compatibility
            </div>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-primary/80 to-amber-400 transition-all"
              style={{ width: `${availabilityScore}%` }}
            />
          </div>
        </div>

        {receivedPendingRequest && pendingConnectionId ? (
          <Button
            className="w-full gap-2 rounded-xl"
            render={<Link href={`/connections/${pendingConnectionId}`} />}
          >
            <Link2 className="h-4 w-4" />
            Respond to request
          </Button>
        ) : sentPendingRequest ? (
          <Button
            className="w-full gap-2 rounded-xl"
            disabled={loading}
            variant="secondary"
            onClick={handleCancelRequest}
          >
            <Link2 className="h-4 w-4" />
            {loading ? "Cancelling..." : "Cancel request"}
          </Button>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button
                  className="w-full gap-2 rounded-xl"
                  disabled={hasPendingRequest}
                  variant={hasPendingRequest ? "secondary" : "default"}
                />
              }
            >
              <Link2 className="h-4 w-4" />
              Connect
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect with {match.name}</DialogTitle>
                <DialogDescription>
                  Send a connection request with an optional intro message.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="message">Message (optional)</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Hi! I'd love to study together..."
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleConnect}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Sending..." : "Send connection request"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
