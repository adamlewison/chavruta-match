import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/queries";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <SettingsForm user={user} />
    </div>
  );
}
