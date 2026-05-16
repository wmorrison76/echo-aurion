import type { OrderGuidePlan } from "../../cognition/order-guides/generator";

export interface ApprovePOInput {
  plan: OrderGuidePlan;
  approver: string;
}

export interface ApprovePOResult {
  ok: boolean;
  message: string;
  purchaseOrder?: {
    vendorOrders: OrderGuidePlan["vendorOrders"];
    approvedBy: string;
    approvedAt: string;
  };
}

export async function approvePO(
  input: ApprovePOInput,
): Promise<ApprovePOResult> {
  if (!input.plan || input.plan.vendorOrders.length === 0) {
    return {
      ok: false,
      message: "No vendor orders were attached to this plan.",
    };
  }
  return {
    ok: true,
    message: `Purchase order prepared and awaiting manual send for ${input.plan.vendorOrders.length} line(s).`,
    purchaseOrder: {
      vendorOrders: input.plan.vendorOrders,
      approvedBy: input.approver,
      approvedAt: new Date().toISOString(),
    },
  };
}
