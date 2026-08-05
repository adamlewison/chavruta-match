"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Step2GenderProps {
  loading: boolean;
  onBack: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function Step2Gender({ loading, onBack, onSubmit }: Step2GenderProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="space-y-3">
        <Label>Gender</Label>
        <div className="grid grid-cols-2 gap-3">
          {(["male", "female"] as const).map((value) => (
            <label
              key={value}
              className="flex cursor-pointer items-center justify-center rounded-lg border p-4 text-sm font-medium capitalize transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10"
            >
              <input
                type="radio"
                name="gender"
                value={value}
                required
                className="sr-only"
              />
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </label>
          ))}
        </div>
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
