import React, { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { VoiceInventoryCapture } from "@/components/inventory/VoiceInventoryCapture";
import { Store } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
export default function InventoryVoiceCapture() {
  const { toast } = useToast();
  const [defaultOutlet] = useState(() => Store.listOutlets()[0]?.id ?? "");
  return (
    <AppLayout>
      {" "}
      <div className="space-y-6">
        {" "}
        <div>
          {" "}
          <h1 className="text-2xl font-semibold tracking-tight">
            {" "}
            Voice inventory capture{" "}
          </h1>{" "}
          <p className="text-sm text-muted-foreground">
            {" "}
            Hands-free counting: walk the outlet, speak items and quantities,
            and let Echo map everything back to storage.{" "}
          </p>{" "}
        </div>{" "}
        <VoiceInventoryCapture
          outletId={defaultOutlet}
          onSessionPosted={() =>
            toast({
              title: "Voice session posted",
              description:
                "Your spoken counts are ready for review in counts history.",
            })
          }
        />{" "}
      </div>{" "}
    </AppLayout>
  );
}
