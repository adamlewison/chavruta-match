"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { BookOpen, Upload, Camera, Loader2 } from "lucide-react";
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUploadThing } from "@/lib/uploadthing-hooks";
import { resizeImage } from "@/lib/image-utils";
import {
  saveOnboardingProfile,
  saveOnboardingGender,
  saveOnboardingLocation,
  completeOnboarding,
} from "@/app/actions/onboarding";

const STEPS = [
  {
    title: "Set up your profile",
    description:
      "Add your name and profile picture so study partners can recognise you.",
  },
  {
    title: "Tell us about you",
    description: "This helps us tailor matching and recommendations.",
  },
  {
    title: "Where are you based?",
    description:
      "We use your postcode to match you with nearby study partners.",
  },
  {
    title: "Community affiliation",
    description:
      "Which shul or beis medrash are you most closely affiliated with?",
  },
];

// --- Step 1: Profile ---

interface Step1Props {
  name: string;
  setName: (name: string) => void;
  previewImage: string | null;
  isUploading: boolean;
  loading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (file: File | null) => void;
  hasProviderImage: boolean;
  uploadedUrl: string | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

function Step1Profile({
  name,
  setName,
  previewImage,
  isUploading,
  loading,
  fileInputRef,
  onFileChange,
  hasProviderImage,
  uploadedUrl,
  onSubmit,
}: Step1Props) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3">
        <Avatar className="size-24">
          <AvatarImage src={previewImage || undefined} alt="Profile picture" />
          <AvatarFallback className="text-2xl">
            {(name?.charAt(0) || "?").toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : previewImage ? (
            <Camera className="mr-2 size-4" />
          ) : (
            <Upload className="mr-2 size-4" />
          )}
          {isUploading
            ? "Uploading..."
            : previewImage
              ? "Change photo"
              : "Upload photo"}
        </Button>
        {hasProviderImage && !uploadedUrl && (
          <p className="text-center text-xs text-muted-foreground">
            We&apos;ve used your provider profile picture. You can change it if
            you like.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          name="name"
          placeholder="First name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={loading || isUploading} className="mt-2">
        {loading ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
}

// --- Step 2: Gender ---

interface Step2Props {
  loading: boolean;
  onBack: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

function Step2Gender({ loading, onBack, onSubmit }: Step2Props) {
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

// --- Step 3: Location ---

interface Step3Props {
  loading: boolean;
  onBack: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

function Step3Location({ loading, onBack, onSubmit }: Step3Props) {
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
          {loading ? "Verifying..." : "Continue"}
        </Button>
      </div>
    </form>
  );
}

// --- Step 4: Synagogue ---

interface Step4Props {
  loading: boolean;
  onBack: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

function Step4Synagogue({ loading, onBack, onSubmit }: Step4Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ id: number; name: string }[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/synagogues/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  function handleSelect(s: { id: number; name: string }) {
    setSelectedId(s.id);
    setQuery(s.name);
    setShowSuggestions(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="synagogue">Shul / Beis Medrash</Label>
        <div className="relative">
          <Input
            id="synagogue"
            name="synagogueName"
            placeholder="Start typing your shul name..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (selectedId) setSelectedId(null);
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            autoComplete="off"
          />
          {showSuggestions && (
            <ul className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-md overflow-hidden">
              {suggestions.map((s) => (
                <li
                  key={s.id}
                  onMouseDown={() => handleSelect(s)}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                >
                  {s.name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <input type="hidden" name="synagogueId" value={selectedId ?? ""} />
        <p className="text-xs text-muted-foreground">
          Optional. If your shul isn&apos;t listed, we&apos;ll add it.
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
          {loading ? "Finishing..." : "Finish"}
        </Button>
      </div>
    </form>
  );
}

// --- Main Page ---

export default function OnboardingPage() {
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
    if (session?.user?.image) setPreviewImage(session.user.image);
  }, [session?.user?.name, session?.user?.image]);

  const { startUpload, isUploading } = useUploadThing("profilePicture", {
    onClientUploadComplete: (res) => {
      if (res?.[0]?.ufsUrl) {
        setUploadedUrl(res[0].ufsUrl);
        setPreviewImage(res[0].ufsUrl);
      }
    },
    onUploadError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const handleFileChange = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      if (file.size > 4 * 1024 * 1024) {
        toast.error("Image must be less than 4MB");
        return;
      }
      let resized: File;
      try {
        resized = await resizeImage(file);
      } catch {
        toast.error("Failed to process image");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result as string);
      reader.readAsDataURL(resized);
      startUpload([resized]);
    },
    [startUpload],
  );

  async function handleStep1(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    if (uploadedUrl) formData.set("imageUrl", uploadedUrl);
    try {
      const result = await saveOnboardingProfile(formData);
      if (result?.error) toast.error(result.error);
      else setStep(2);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleStep2(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      const result = await saveOnboardingGender(formData);
      if (result?.error) toast.error(result.error);
      else setStep(3);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleStep3(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      const result = await saveOnboardingLocation(formData);
      if (result?.error) {
        toast.error(result.error);
        if (result.showWaitlist) window.location.href = "/waitlist";
      } else {
        setStep(4);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleStep4(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await completeOnboarding(formData);
    } catch {
      // redirect throws, which is expected on success
    } finally {
      setLoading(false);
    }
  }

  const { title, description } = STEPS[step - 1];

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="mb-2 flex justify-center">
          <BookOpen className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="flex justify-center gap-2 pt-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 w-8 rounded-full",
                step === i + 1 ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {step === 1 && (
          <Step1Profile
            name={name}
            setName={setName}
            previewImage={previewImage}
            isUploading={isUploading}
            loading={loading}
            fileInputRef={fileInputRef}
            onFileChange={handleFileChange}
            hasProviderImage={!!session?.user?.image}
            uploadedUrl={uploadedUrl}
            onSubmit={handleStep1}
          />
        )}
        {step === 2 && (
          <Step2Gender
            loading={loading}
            onBack={() => setStep(1)}
            onSubmit={handleStep2}
          />
        )}
        {step === 3 && (
          <Step3Location
            loading={loading}
            onBack={() => setStep(2)}
            onSubmit={handleStep3}
          />
        )}
        {step === 4 && (
          <Step4Synagogue
            loading={loading}
            onBack={() => setStep(3)}
            onSubmit={handleStep4}
          />
        )}
      </CardContent>
    </Card>
  );
}
