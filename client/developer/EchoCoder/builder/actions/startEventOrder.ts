import type { OrderGuidePlan } from "../../cognition/order-guides/generator";
import { buildOrderGuidePlan, renderOrderGuide } from "../../cognition/order-guides/generator";

export interface StartEventOrderInput {
  eventName?: string;
  covers?: number;
  recipes?: string[];
  transcript?: string;
}

export interface StartEventOrderResult {
  ok: boolean;
  message: string;
  plan?: OrderGuidePlan;
}

export async function startEventOrder(input: StartEventOrderInput): Promise<StartEventOrderResult> {
  const transcript = input.transcript ?? buildTranscript(input);
  const plan = buildOrderGuidePlan(transcript, {
    eventName: input.eventName,
    covers: input.covers,
    requestedRecipes: input.recipes,
  });
  if (!plan) {
    return {
      ok: false,
      message:
        "No recognised recipes found. Provide recipe names such as 'crème brûlée' or 'Florentine torte'.",
    };
  }
  return {
    ok: true,
    message: renderOrderGuide(plan),
    plan,
  };
}

function buildTranscript(input: StartEventOrderInput): string {
  const recipes = (input.recipes ?? ["crème brûlée"]).join(", ");
  const covers = input.covers ?? 100;
  return `Create an order guide for ${recipes} for ${covers} covers.`;
}
