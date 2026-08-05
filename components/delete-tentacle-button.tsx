"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteTentacle } from "@/app/actions/tentacles";

export function DeleteTentacleButton({ tentacleId }: { tentacleId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this study slot?")) return;
    setLoading(true);
    try {
      await deleteTentacle(tentacleId);
    } catch {
      // redirect throws on success
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={loading}
      onClick={handleDelete}
      className="gap-1"
    >
      <Trash2 className="h-3 w-3" />
      Delete
    </Button>
  );
}
