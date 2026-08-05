"use client";

import { useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { Loader2 } from "lucide-react";
import { LogoMark } from "@/components/logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUploadThing } from "@/lib/uploadthing-hooks";
import { resizeImage } from "@/lib/image-utils";
import {
  saveOnboardingProfile,
  saveOnboardingGender,
  saveOnboardingBio,
  saveOnboardingLocation,
  completeOnboarding,
} from "@/app/actions/onboarding";
import { Step1Profile } from "./_components/step-1-profile";
import { Step2Gender } from "./_components/step-2-gender";
import { Step3Bio } from "./_components/step-3-bio";
import { Step4Location } from "./_components/step-4-location";
import { Step5Synagogue } from "./_components/step-5-synagogue";

const STEPS = [
  {
    title: "Set up your profile",
    description:
      "Add your name and profile picture so study partners can recognise you.",
  },
  {
    title: "Confirm your gender",
    description: "This helps us tailor matching and recommendations.",
  },
  {
    title: "Introduce yourself",
    description: "Help potential study partners get to know you.",
  },
  {
    title: "Where are you based?",
    description:
      "We use your postcode to match you with nearby study partners.",
  },
  {
    title: "Your community",
    description:
      "We verify members through their shul to keep Vruta safe and trusted.",
  },
];

export default function OnboardingPage() {
  const { data: session, status } = useSession();

  // Wait for the session to resolve before mounting the wizard, so its form
  // state can be initialized from session data on first render instead of
  // backfilling it in an Effect once the session arrives.
  if (status === "loading") {
    return (
      <Card className="w-full overflow-visible">
        <CardContent className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return <OnboardingWizard session={session} />;
}

function OnboardingWizard({ session }: { session: Session | null }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [regionId, setRegionId] = useState<number | null>(null);
  const [name, setName] = useState(session?.user?.name ?? "");
  const [bio, setBio] = useState(session?.user?.bio ?? "");
  const [previewImage, setPreviewImage] = useState<string | null>(
    session?.user?.image ?? null,
  );
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const result = await saveOnboardingBio(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        const trimmedBio = (formData.get("bio") as string | null)?.trim() ?? "";
        setBio(trimmedBio);
        setStep(4);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const handleBioSkip = useCallback(() => {
    setStep(4);
  }, []);

  async function handleStep4(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      const result = await saveOnboardingLocation(formData);
      if (result?.error) {
        toast.error(result.error);
        if (result.showWaitlist) window.location.href = "/waitlist";
      } else {
        setRegionId(result.regionId ?? null);
        setStep(5);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleStep5(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      const result = await completeOnboarding(formData);
      if (result?.error) {
        toast.error(result.error);
      }
    } catch {
      // redirect throws, which is expected on success
    } finally {
      setLoading(false);
    }
  }

  const { title, description } = STEPS[step - 1];

  return (
    <Card className="w-full overflow-visible">
      <CardHeader className="text-center">
        <div className="mb-2 flex justify-center">
          <LogoMark size={48} />
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
          <Step3Bio
            bio={bio}
            loading={loading}
            onBack={() => setStep(2)}
            onSkip={handleBioSkip}
            onBioChange={setBio}
            onSubmit={handleStep3}
          />
        )}
        {step === 4 && (
          <Step4Location
            loading={loading}
            onBack={() => setStep(3)}
            onSubmit={handleStep4}
          />
        )}
        {step === 5 && (
          <Step5Synagogue
            loading={loading}
            regionId={regionId}
            onBack={() => setStep(4)}
            onSubmit={handleStep5}
          />
        )}
      </CardContent>
    </Card>
  );
}
