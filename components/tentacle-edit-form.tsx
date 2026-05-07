"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { AvailabilityPicker } from "@/components/availability-picker";
import { updateTentacle } from "@/app/actions/tentacles";
import { SUBJECT_LABELS, MEDIUM_LABELS, SUBJECTS, MEDIUMS } from "@/lib/db/schema";
import type { Tentacle } from "@/lib/db/schema";

export function TentacleEditForm({ tentacle }: { tentacle: Tentacle }) {
  const [availability, setAvailability] = useState(tentacle.availabilityLocal);
  const [subject, setSubject] = useState(tentacle.subject);
  const [medium, setMedium] = useState(tentacle.medium || "");
  const [notes, setNotes] = useState(tentacle.notes || "");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    const formData = new FormData();
    formData.set("subject", subject);
    formData.set("availability", availability);
    if (medium) formData.set("medium", medium);
    formData.set("notes", notes);

    try {
      const result = await updateTentacle(tentacle.id, formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Tentacle updated!");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Edit Tentacle</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Subject</Label>
          <Select value={subject} onValueChange={(v) => v && setSubject(v as typeof subject)}>
            <SelectTrigger>
              <SelectValue />
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
              <SelectValue placeholder="Any medium" />
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
          <AvailabilityPicker value={availability} onChange={setAvailability} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            rows={3}
          />
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
