"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { respondToConnection } from "@/app/actions/connections";

export function BlockButton({ connectionId }: { connectionId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleBlock() {
    if (!confirm("Are you sure you want to block this user? This is permanent."))
      return;

    setLoading(true);
    try {
      const result = await respondToConnection(connectionId, "block");
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("User blocked.");
      }
    } catch {
      toast.error("Failed to block user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={loading}
      onClick={handleBlock}
      className="text-destructive hover:text-destructive gap-1"
    >
      <Shield className="h-4 w-4" />
      Block
    </Button>
  );
}
