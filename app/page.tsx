import Link from "next/link";
import { ArrowRight, BookOpen, MessageSquare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

const highlights = [
  {
    icon: BookOpen,
    title: "Create slots",
    detail: "Share what you study and when you are free.",
  },
  {
    icon: Users,
    title: "Match instantly",
    detail: "See curated chavruta matches nearby.",
  },
  {
    icon: MessageSquare,
    title: "Plan together",
    detail: "Send a quick invite and confirm your session.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fc] text-[#0f172a]">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Logo size={32} />
          <Link href="/signin">
            <Button size="sm" variant="outline">
              Sign in
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative isolate overflow-hidden rounded-b-[40px] bg-gradient-to-br from-[#eef2ff] via-white to-[#dff7ff] px-6 py-16 sm:px-10">
          <div className="relative mx-auto flex max-w-4xl flex-col gap-10 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-700">
              New look
            </p>
            <h1 className="text-4xl font-black leading-tight text-[#0b1736] sm:text-5xl lg:text-6xl">
              Find your{" "}
              <span className="bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text text-transparent">
                chavruta
              </span>
              .
              <span className="block text-4xl text-slate-600">
                Grow together.
              </span>
            </h1>
            <p className="text-lg text-slate-600">
              Match with someone who makes Torah come alive — in a few taps.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/signin">
                <Button className="gap-2" size="lg">
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link
                href="/waitlist"
                className="text-sm font-semibold text-cyan-700"
              >
                Not in your area yet?
              </Link>
            </div>
            <div className="flex justify-center gap-6 text-xs uppercase tracking-[0.3em] text-slate-500">
              <span>London</span>
              <span>Coming soon: NYC · TLV</span>
            </div>
          </div>
        </section>

        <section className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-14">
          <div className="grid gap-4 sm:grid-cols-3">
            {highlights.map((highlight) => (
              <div
                key={highlight.title}
                className="flex flex-col items-start gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-6 text-left shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 text-white">
                  <highlight.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-[#0f172a]">
                  {highlight.title}
                </h3>
                <p className="text-sm text-slate-600">{highlight.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/80 px-4 py-8 text-center text-sm text-slate-600">
        Vruta {new Date().getFullYear()}
      </footer>
    </div>
  );
}
