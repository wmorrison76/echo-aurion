import express from "express";
import { z } from "zod";
import type { OnboardingProvisionPayload } from "../../shared/types/onboarding";
import { provisionOnboarding } from "../services/onboarding-provision-service";

const router = express.Router();

const onboardingSchema = z.object({
  org: z.object({
    orgId: z.string().optional(),
    name: z.string().min(1),
  }),
  outlets: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      location: z.string().nullable().optional(),
    }),
  ),
  departments: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      outletId: z.string().nullable().optional(),
    }),
  ),
  roles: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      permissions: z.array(z.string()).optional(),
    }),
  ),
  assignments: z.array(
    z.object({
      id: z.string().optional(),
      userId: z.string().min(1),
      roleId: z.string().min(1),
      outletId: z.string().nullable().optional(),
      departmentId: z.string().nullable().optional(),
    }),
  ),
  storageLocations: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      outletId: z.string().nullable().optional(),
      departmentId: z.string().nullable().optional(),
    }),
  ),
});

router.post("/onboarding/provision", async (req, res) => {
  try {
    const payload = onboardingSchema.parse(req.body) as OnboardingProvisionPayload;
    const result = await provisionOnboarding(payload);
    res.json({
      success: true,
      orgId: result.orgId,
      outlets: result.outlets.length,
      departments: result.departments.length,
      roles: result.roles.length,
      assignments: result.assignments.length,
      storageLocations: result.storageLocations.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provisioning failed";
    res.status(400).json({ success: false, error: message });
  }
});

export default router;
