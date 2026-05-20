"use client";

import { useActionState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { joinWaitlist } from "./actions";

const initialState = { success: false as boolean, error: undefined as string | undefined };

export default function WaitlistPage() {
  const [state, action, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await joinWaitlist(formData);
      if (result.success) return { success: true, error: undefined };
      return { success: false, error: result.error };
    },
    initialState,
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#0f172a]">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4">
          <Logo size={32} />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <p className="mb-3 text-sm uppercase tracking-[0.3em] text-cyan-700">
              Coming soon
            </p>
            <h1 className="text-3xl font-black leading-tight text-[#0b1736] sm:text-4xl">
              Find your{" "}
              <span className="bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text text-transparent">
                chavruta
              </span>
              .
            </h1>
            <p className="mt-3 text-slate-600">
              Be the first to know when we launch in your city.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white px-8 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            {state.success ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <CheckCircle2 className="h-12 w-12 text-cyan-500" />
                <h2 className="text-xl font-bold text-[#0b1736]">
                  You&apos;re on the list!
                </h2>
                <p className="text-sm text-slate-600">
                  We&apos;ll be in touch when Vruta launches near you.
                </p>
              </div>
            ) : (
              <form action={action} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="location">Your city or location</Label>
                  <Input
                    id="location"
                    name="location"
                    type="text"
                    placeholder="e.g. London, Manchester, New York…"
                    autoComplete="address-level2"
                  />
                </div>

                {state.error && (
                  <p className="text-sm text-red-500">{state.error}</p>
                )}

                <Button
                  type="submit"
                  className="mt-1 gap-2"
                  size="lg"
                  disabled={pending}
                >
                  {pending ? "Joining…" : "Join the waitlist"}
                  {!pending && <ArrowRight className="h-4 w-4" />}
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white/80 px-4 py-8 text-center text-sm text-slate-600">
        Vruta © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
