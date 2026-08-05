"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Step4LocationProps {
  loading: boolean;
  onBack: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function Step4Location({ loading, onBack, onSubmit }: Step4LocationProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="postcode">UK Postcode</Label>
        <Input
          id="postcode"
          name="postcode"
          placeholder="e.g. NW3 5QN"
          autoComplete="postal-code"
          required
        />
        <p className="text-xs text-muted-foreground">
          Your postcode is validated and won&apos;t be shared with other users.
        </p>
      </div>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={loading}
          className="flex-1"
        >
          Back
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Saving..." : "Continue"}
        </Button>
      </div>
    </form>
  );
}
