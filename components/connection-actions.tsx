"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { respondToConnection, cancelConnection } from "@/app/actions/connections";

export function ConnectionActions({
  connectionId,
  type,
}: {
  connectionId: string;
  type: "incoming" | "outgoing";
}) {
  const [loading, setLoading] = useState(false);

  async function handleAction(action: "accept" | "decline" | "cancel") {
    setLoading(true);
    try {
      let result;
      if (action === "cancel") {
        result = await cancelConnection(connectionId);
      } else {
        result = await respondToConnection(connectionId, action);
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          action === "accept"
            ? "Connection accepted! You can now chat."
            : action === "decline"
            ? "Connection declined."
            : "Request cancelled."
        );
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (type === "incoming") {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={loading}
          onClick={() => handleAction("accept")}
          className="gap-1"
        >
          <Check className="h-3 w-3" />
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => handleAction("decline")}
          className="gap-1"
        >
          <X className="h-3 w-3" />
          Decline
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={loading}
      onClick={() => handleAction("cancel")}
    >
      Cancel
    </Button>
  );
}
