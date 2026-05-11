import { redirect } from "next/navigation";
import { getCurrentUser, getRegionById } from "@/lib/queries";
import { LearningRequestForm } from "@/components/learning-request-form";

export default async function NewLearningRequestPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!user.regionId) redirect("/onboarding");

  const region = await getRegionById(user.regionId);
  const locationLabel = region?.name || "Unknown location";

  return (
    <div className="max-w-2xl mx-auto">
      <LearningRequestForm locationLabel={locationLabel} />
    </div>
  );
}
