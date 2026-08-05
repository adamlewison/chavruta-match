"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { joinWaitlist } from "@/app/actions/waitlist";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await joinWaitlist({ email, requestedRegion: region });
      toast.success(
        "You're on the list! We'll let you know when we launch in your area.",
      );
      setEmail("");
      setRegion("");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <MapPin className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">
          Not available in your area yet
        </CardTitle>
        <CardDescription>
          Vruta is currently available in London only. Join the waitlist and
          we&apos;ll notify you when we expand to your region.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="region">Where are you based?</Label>
            <Input
              id="region"
              placeholder="e.g. Manchester, New York"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Joining..." : "Join waitlist"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
