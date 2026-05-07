"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { AvailabilityPicker } from "@/components/availability-picker";
import { emptyBitmap } from "@/lib/availability";
import { createTentacle } from "@/app/actions/tentacles";
import { SUBJECT_LABELS, MEDIUM_LABELS, SUBJECTS, MEDIUMS } from "@/lib/db/schema";

export default function NewTentaclePage() {
  const router = useRouter();
  const [availability, setAvailability] = useState(emptyBitmap());
  const [subject, setSubject] = useState("");
  const [medium, setMedium] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("availability", availability);
    formData.set("subject", subject);
    if (medium) formData.set("medium", medium);

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
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create a Tentacle</CardTitle>
          <CardDescription>
            A tentacle represents a specific learning interest. Choose a subject,
            set your availability, and we&apos;ll find matching study partners.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={(v) => v && setSubject(v)} required>
                <SelectTrigger>
                  <SelectValue placeholder="What do you want to study?" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SUBJECT_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Preferred Medium</Label>
              <Select value={medium} onValueChange={(v) => setMedium(v || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="How would you like to learn?" />
                </SelectTrigger>
                <SelectContent>
                  {MEDIUMS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {MEDIUM_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Availability</Label>
              <p className="text-sm text-muted-foreground">
                Click or drag to paint your available times. All times in your
                local timezone.
              </p>
              <AvailabilityPicker
                value={availability}
                onChange={setAvailability}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="e.g. I'm a beginner, looking for someone patient..."
                rows={3}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create Tentacle"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
