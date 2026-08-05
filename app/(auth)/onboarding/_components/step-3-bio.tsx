"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Step3BioProps {
  bio: string;
  loading: boolean;
  onBack: () => void;
  onSkip: () => void;
  onBioChange: (value: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function Step3Bio({
  bio,
  loading,
  onBack,
  onSkip,
  onBioChange,
  onSubmit,
}: Step3BioProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Textarea
          id="bio"
          name="bio"
          placeholder="e.g. I'm passionate about Gemara and love diving into complex sugyas..."
          value={bio}
          onChange={(event) => onBioChange(event.target.value)}
          maxLength={300}
          disabled={loading}
          className="min-h-24"
        />
        <p className="text-xs text-muted-foreground">
          Optional — helps others see if you&apos;re a good match
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
      <Button
        type="button"
        variant="ghost"
        onClick={onSkip}
        disabled={loading}
        className="w-full"
      >
        Skip for now
      </Button>
    </form>
  );
}
