import { NavBar } from "@/components/nav-bar";
import { getCurrentUser } from "@/lib/queries";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
      </main>
    </>
  );
}
