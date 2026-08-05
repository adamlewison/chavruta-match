"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SimpleAvailabilityPicker } from "@/components/simple-availability-picker";
import { cn } from "@/lib/utils";
import { emptyBitmap } from "@/lib/availability";
import { createTentacle } from "@/app/actions/tentacles";
import {
  SUBJECTS,
  SUBJECT_LABELS,
  MEDIUMS,
  MEDIUM_LABELS,
} from "@/lib/db/schema";
import { toast } from "sonner";

interface LearningRequestFormProps {
  locationLabel: string;
}

export function LearningRequestForm({
  locationLabel,
}: LearningRequestFormProps) {
  const [availability, setAvailability] = useState(emptyBitmap());
  const [subject, setSubject] = useState("");
  const [medium, setMedium] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!subject) {
      toast.error("Select a subject before submitting");
      return;
    }
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("availability", availability);
    formData.set("subject", subject);
    if (medium) formData.set("medium", medium);
    if (notes) formData.set("notes", notes);

    try {
      const result = await createTentacle(formData);
      if (result?.error) {
        toast.error(result.error);
      }
    } catch {
      // redirect throws on success
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">New Learning Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Step 1 of 3
            </p>
            <div>
              <h2 className="text-lg font-semibold">
                What do you want to learn?
              </h2>
              <p className="text-sm text-muted-foreground">
                Choose the subject that best describes this study slot. You can
                create multiple requests if you study different topics.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {SUBJECTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSubject(value)}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left text-sm font-medium transition",
                    subject === value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-background hover:border-primary",
                  )}
                >
                  {SUBJECT_LABELS[value]}
                </button>
              ))}
            </div>
            {!subject && (
              <p className="text-xs text-destructive">
                Pick a subject to continue.
              </p>
            )}
          </section>

          <section className="space-y-3 border-t pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Step 2 of 3
            </p>
            <div>
              <h2 className="text-lg font-semibold">How and where?</h2>
              <p className="text-sm text-muted-foreground">
                Select your preferred medium and confirm the location we will
                use for matching.
              </p>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="medium">Preferred medium (optional)</Label>
                <Select
                  value={medium}
                  onValueChange={(value) => setMedium(value || "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any medium" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDIUMS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {MEDIUM_LABELS[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Location we&apos;ll use
                </p>
                <p className="text-sm font-medium">{locationLabel}</p>
                <p className="text-xs text-muted-foreground">
                  Contact support to update your location.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3 border-t pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Step 3 of 3
            </p>
            <div>
              <h2 className="text-lg font-semibold">When are you available?</h2>
              <p className="text-sm text-muted-foreground">
                Select the days and time slot when you&apos;re free to study.
              </p>
            </div>
            <SimpleAvailabilityPicker onChange={setAvailability} />
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tell your future chavruta anything helpful..."
                rows={3}
              />
            </div>
          </section>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Submit Learning Request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
