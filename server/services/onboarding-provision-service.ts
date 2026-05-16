import type { TraceLedgerAppendInput } from "../../shared/types/trace-ledger";
import type { OnboardingProvisionPayload } from "../../shared/types/onboarding";
import { provisionOnboardingStore } from "./onboarding-provision-store";
import { appendTraceEvent } from "./trace-ledger-fallback";

export const provisionOnboarding = async (payload: OnboardingProvisionPayload) => {
  const result = await provisionOnboardingStore(payload);
  const orgId = result.orgId;

  const append = async (entry: Omit<TraceLedgerAppendInput, "orgId">) =>
    appendTraceEvent({ orgId, ...entry });

  await append({
    entityType: "org",
    entityId: orgId,
    sourceRef: "onboarding",
    payload: { action: "ORG_PROVISIONED", name: result.org.name },
  });

  for (const outlet of result.outlets) {
    await append({
      entityType: "outlet",
      entityId: outlet.id,
      sourceRef: orgId,
      payload: { action: "OUTLET_CREATED", name: outlet.name },
    });
  }

  for (const assignment of result.assignments) {
    await append({
      entityType: "role-assignment",
      entityId: assignment.id,
      sourceRef: orgId,
      payload: {
        action: "ROLE_ASSIGNED",
        userId: assignment.userId,
        roleId: assignment.roleId,
        outletId: assignment.outletId,
        departmentId: assignment.departmentId,
      },
    });
  }

  for (const location of result.storageLocations) {
    await append({
      entityType: "storage-location",
      entityId: location.id,
      sourceRef: orgId,
      payload: {
        action: "STORAGE_LOCATION_CREATED",
        name: location.name,
        outletId: location.outletId,
        departmentId: location.departmentId,
      },
    });
  }

  return result;
};
