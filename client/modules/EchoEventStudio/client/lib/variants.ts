import type { Obj } from "@/store/sceneStore";
export type Variant = {
  id: string;
  name: string;
  objects: Obj[];
  meta?: Record<string, any>;
};
export type VariantDiff = {
  seatDelta: number;
  costDelta: number;
  countDelta: number;
};
export function generateVariant(
  base: Obj[],
  tweak: (objects: Obj[]) => Obj[],
): Variant {
  const id = `v-${Date.now()}`;
  const objects = tweak(base.map((obj) => ({ ...obj })));
  return { id, name: id, objects };
}
export function diffVariants(
  variantA: Variant,
  variantB: Variant,
): VariantDiff {
  const seatsA = variantA.objects.reduce(
    (sum, obj) => sum + (obj.seats || 0),
    0,
  );
  const seatsB = variantB.objects.reduce(
    (sum, obj) => sum + (obj.seats || 0),
    0,
  );
  const costA = variantA.objects.reduce(
    (sum, obj) => sum + (obj.meta?.cost || 0),
    0,
  );
  const costB = variantB.objects.reduce(
    (sum, obj) => sum + (obj.meta?.cost || 0),
    0,
  );
  const countA = variantA.objects.length;
  const countB = variantB.objects.length;
  return {
    seatDelta: seatsB - seatsA,
    costDelta: costB - costA,
    countDelta: countB - countA,
  };
}
