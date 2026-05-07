import Link from "next/link";
import { BookOpen, Users, MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: BookOpen,
    title: "Create Tentacles",
    description:
      "Each tentacle represents a subject you want to study — Gemora, Chumash, Daf Yomi, and more. Add your availability and find the right match.",
  },
  {
    icon: Users,
    title: "Get Matched",
    description:
      "Our matching algorithm finds partners with the same interests and overlapping availability in your area. Ranked by compatibility.",
  },
  {
    icon: MessageSquare,
    title: "Connect & Learn",
    description:
      "Send a connection request. Once accepted, a private chat opens between you. Arrange your first session and start learning together.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <BookOpen className="h-5 w-5 text-primary" />
            ChavrutaMatch
          </div>
          <Link href="/signin">
            <Button size="sm">Sign in</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Find your{" "}
            <span className="text-primary">chavruta</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto">
            A chavruta is a study partner — someone who challenges you, keeps you
            accountable, and helps Torah come alive. ChavrutaMatch pairs you with
            the right one based on what you want to learn, when you&apos;re free,
            and where you are.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signin">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Currently available in London. More cities coming soon.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-center mb-10">How it works</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col items-center text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-6">
        <div className="mx-auto max-w-5xl text-center text-sm text-muted-foreground">
          ChavrutaMatch &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
