import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import { OrderStatusBoard } from "./components/OrderStatusBoard";
export default function PurchRecPanel(props: any) {
  return (
    <PanelFrame title="Purchase & Receiving" icon="📦" {...props}>
      {" "}
      <div className="h-full overflow-auto">
        {" "}
        <OrderStatusBoard />{" "}
      </div>{" "}
    </PanelFrame>
  );
}
