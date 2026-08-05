"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { searchSynagogues } from "@/app/actions/onboarding";

interface Step5SynagogueProps {
  loading: boolean;
  regionId: number | null;
  onBack: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function Step5Synagogue({
  loading,
  regionId,
  onBack,
  onSubmit,
}: Step5SynagogueProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<
    { id: number; name: string }[]
  >([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [orthodoxAffiliationConfirmed, setOrthodoxAffiliationConfirmed] =
    useState(false);
  const [privacyConsentConfirmed, setPrivacyConsentConfirmed] = useState(false);
  const trimmedQuery = query.trim();
  const hasSynagogueSelection =
    Boolean(selectedName) || trimmedQuery.length > 0;

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (query.length < 2) {
        setShowSuggestions(false);
        setSuggestions([]);
        return;
      }
      const data = await searchSynagogues(query, regionId);
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, regionId]);

  function handleOrthodoxAffiliationChange(checked: boolean) {
    setOrthodoxAffiliationConfirmed(checked);
    if (!checked) {
      handleClear();
      setPrivacyConsentConfirmed(false);
    }
  }

  function handleSelect(s: { id: number; name: string }) {
    setSelectedId(s.id);
    setSelectedName(s.name);
    setQuery("");
    setShowSuggestions(false);
    setPrivacyConsentConfirmed(false);
  }

  function handleClear() {
    setSelectedId(null);
    setSelectedName(null);
    setQuery("");
    setPrivacyConsentConfirmed(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="orthodoxAffiliation"
            value="yes"
            checked={orthodoxAffiliationConfirmed}
            onChange={(event) =>
              handleOrthodoxAffiliationChange(event.target.checked)
            }
            required
            disabled={loading}
            className="mt-0.5 size-4 shrink-0 accent-primary cursor-pointer"
          />
          <span className="text-sm font-medium">
            I&apos;m affiliated with an Orthodox Jewish community
          </span>
        </label>
      </div>
      <div className="space-y-2">
        <Label htmlFor="synagogue" className="text-sm font-medium">
          Your shul or beis medrash
        </Label>
        {selectedName ? (
          <>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-lg border-2 border-primary bg-primary/5 px-4 py-3">
                <span className="text-sm font-medium text-foreground">
                  {selectedName}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Clear selection"
              >
                <X className="size-5" />
              </button>
            </div>
            <input type="hidden" name="synagogueName" value={selectedName} />
          </>
        ) : (
          <div className="relative">
            <Input
              id="synagogue"
              name="synagogueName"
              placeholder="e.g. Golders Green Synagogue"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
                setPrivacyConsentConfirmed(false);
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              autoComplete="off"
              disabled={!orthodoxAffiliationConfirmed || loading}
              required
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {suggestions.map((s) => (
                  <li
                    key={s.id}
                    onMouseDown={() => handleSelect(s)}
                    className="px-4 py-2.5 text-sm cursor-pointer hover:bg-primary/10 transition-colors first:rounded-t-lg last:rounded-b-lg"
                  >
                    {s.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <input type="hidden" name="synagogueId" value={selectedId ?? ""} />
        <p className="text-xs text-muted-foreground">
          Don&apos;t see yours? Just type it in and we&apos;ll add it.
        </p>
      </div>
      {hasSynagogueSelection && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="privacyConsent"
              value="yes"
              checked={privacyConsentConfirmed}
              onChange={(event) =>
                setPrivacyConsentConfirmed(event.target.checked)
              }
              required
              disabled={loading}
              className="mt-0.5 size-4 shrink-0 accent-primary cursor-pointer"
            />
            <span className="text-sm">
              I agree to the{" "}
              <Link
                href="/privacy-policy"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline hover:no-underline"
              >
                Privacy Policy
              </Link>{" "}
              and consent to identity verification with my synagogue if deemed
              necessary.
            </span>
          </label>
        </div>
      )}
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
        <Button
          type="submit"
          disabled={
            loading ||
            !orthodoxAffiliationConfirmed ||
            !hasSynagogueSelection ||
            !privacyConsentConfirmed
          }
          className="flex-1"
        >
          {loading ? "Finishing..." : "Finish"}
        </Button>
      </div>
    </form>
  );
}
