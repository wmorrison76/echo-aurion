import { Router, Request, Response } from "express";
import { realtimeManager } from "../lib/realtime";
import { supabase } from "../lib/db";

const router = Router();

interface Qualification {
  positionTitle: string;
  minTier?: number;
  requiredSkills: string[];
  requiredCertifications?: string[];
}

interface JobSharePost {
  id: string;
  org_id: string;
  outlet_id: string;
  outlet_name: string;
  position_title: string;
  department: string;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  reason: string;
  posted_by: string;
  posted_by_name: string;
  qualifications: Qualification;
  status: "open" | "filled" | "closed" | "cancelled";
  created_at: string;
  paf_id?: string;
}

interface JobShareApplicant {
  id: string;
  post_id: string;
  employee_id: string;
  employee_name: string;
  current_position: string;
  current_tier: number;
  qualified: boolean;
  qualification_reasons: string[];
  applied_at: string;
  status: "pending" | "accepted" | "rejected";
}

/**
 * POST /api/job-sharing/posts
 * Create a new job share post
 */
router.post("/posts", async (req: Request, res: Response) => {
  try {
    const {
      outletId,
      outletName,
      positionTitle,
      department,
      shiftDate,
      shiftStartTime,
      shiftEndTime,
      reason,
      qualifications,
      postedBy,
      postedByName,
    } = req.body;

    const orgId = req.headers["x-org-id"] as string;

    if (!orgId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    // Insert job share post
    const { data: post, error } = await supabase
      .from("job_share_posts")
      .insert({
        org_id: orgId,
        outlet_id: outletId,
        outlet_name: outletName,
        position_title: positionTitle,
        department,
        shift_date: shiftDate,
        shift_start_time: shiftStartTime,
        shift_end_time: shiftEndTime,
        reason,
        qualifications,
        posted_by: postedBy,
        posted_by_name: postedByName,
        status: "open",
      })
      .select()
      .single();

    if (error) throw error;

    // Broadcast to realtime subscribers
    realtimeManager.sendEvent("job-sharing", {
      type: "job-share-posted",
      data: post,
      timestamp: Date.now(),
    });

    res.json({ success: true, post });
  } catch (error: any) {
    console.error("[Job Share] Create post error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/job-sharing/posts
 * Get all job share posts
 */
router.get("/posts", async (req: Request, res: Response) => {
  try {
    const orgId = req.headers["x-org-id"] as string;
    const { outlet_id, status } = req.query;

    let query = supabase
      .from("job_share_posts")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (outlet_id && outlet_id !== "all") {
      query = query.eq("outlet_id", outlet_id);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data: posts, error } = await query;

    if (error) throw error;

    // Get applicants for each post
    const postsWithApplicants = await Promise.all(
      (posts || []).map(async (post) => {
        const { data: applicants } = await supabase
          .from("job_share_applicants")
          .select("*")
          .eq("post_id", post.id)
          .order("applied_at", { ascending: false });

        return {
          ...post,
          applicants: applicants || [],
        };
      })
    );

    res.json({ success: true, posts: postsWithApplicants });
  } catch (error: any) {
    console.error("[Job Share] Get posts error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/job-sharing/posts/:postId/apply
 * Employee applies to a job share post
 */
router.post("/posts/:postId/apply", async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { employeeId } = req.body;
    const orgId = req.headers["x-org-id"] as string;

    // Get the post
    const { data: post, error: postError } = await supabase
      .from("job_share_posts")
      .select("*")
      .eq("id", postId)
      .eq("org_id", orgId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: "Job share post not found" });
    }

    if (post.status !== "open") {
      return res.status(400).json({ error: "Post is no longer open" });
    }

    // Get employee profile
    const { data: employee, error: empError } = await supabase
      .from("employee_profiles")
      .select("*")
      .eq("id", employeeId)
      .eq("org_id", orgId)
      .single();

    if (empError || !employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Get employee skills
    const { data: employeeSkills } = await supabase
      .from("staff_skills")
      .select("skill_code, proficiency_level")
      .eq("employee_id", employeeId)
      .eq("org_id", orgId);

    const skillCodes = (employeeSkills || []).map((s) => s.skill_code);

    // Check qualifications
    const qualificationResult = checkQualifications(
      employee,
      skillCodes,
      post.qualifications
    );

    // Check if already applied
    const { data: existing } = await supabase
      .from("job_share_applicants")
      .select("*")
      .eq("post_id", postId)
      .eq("employee_id", employeeId)
      .single();

    if (existing) {
      return res.status(400).json({ error: "Already applied to this post" });
    }

    // Create application
    const { data: applicant, error: appError } = await supabase
      .from("job_share_applicants")
      .insert({
        post_id: postId,
        employee_id: employeeId,
        employee_name: `${employee.first_name} ${employee.last_name}`,
        current_position: employee.position_title || "",
        current_tier: (employee as any).position_tier || 1,
        qualified: qualificationResult.qualified,
        qualification_reasons: qualificationResult.reasons,
        status: "pending",
      })
      .select()
      .single();

    if (appError) throw appError;

    // Broadcast to realtime subscribers
    realtimeManager.sendEvent("job-sharing", {
      type: "job-share-application",
      data: { post, applicant },
      timestamp: Date.now(),
    });

    res.json({ success: true, applicant, qualificationResult });
  } catch (error: any) {
    console.error("[Job Share] Apply error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/job-sharing/posts/:postId/accept
 * Manager accepts an applicant (generates PAF, updates HR, schedule, time clock)
 */
router.post("/posts/:postId/accept", async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { applicantId } = req.body;
    const orgId = req.headers["x-org-id"] as string;

    // Get post and applicant
    const { data: post, error: postError } = await supabase
      .from("job_share_posts")
      .select("*")
      .eq("id", postId)
      .eq("org_id", orgId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: "Job share post not found" });
    }

    const { data: applicant, error: appError } = await supabase
      .from("job_share_applicants")
      .select("*")
      .eq("id", applicantId)
      .eq("post_id", postId)
      .single();

    if (appError || !applicant) {
      return res.status(404).json({ error: "Applicant not found" });
    }

    if (!applicant.qualified) {
      return res.status(400).json({
        error: "Cannot accept unqualified applicant",
      });
    }

    // 1. Generate PAF (Personnel Action Form)
    const pafId = await generatePAF({
      orgId,
      employeeId: applicant.employee_id,
      employeeName: applicant.employee_name,
      postId,
      post,
      applicant,
      actionType: "JOB_SHARE",
    });

    // 2. Update applicant status
    await supabase
      .from("job_share_applicants")
      .update({ status: "accepted" })
      .eq("id", applicantId);

    // 3. Update post status
    await supabase
      .from("job_share_posts")
      .update({
        status: "filled",
        paf_id: pafId,
      })
      .eq("id", postId);

    // 4. Reject other applicants
    await supabase
      .from("job_share_applicants")
      .update({ status: "rejected" })
      .eq("post_id", postId)
      .neq("id", applicantId);

    // 5. Add to schedule
    await addToSchedule({
      orgId,
      employeeId: applicant.employee_id,
      post,
      classification: "JOB_SHARE",
    });

    // 6. Update time clock access
    await updateTimeClockAccess({
      orgId,
      employeeId: applicant.employee_id,
      post,
      classification: "JOB_SHARE",
    });

    // 7. Update HR system
    await updateHRSystem({
      orgId,
      employeeId: applicant.employee_id,
      pafId,
      post,
      applicant,
    });

    // Broadcast success
    realtimeManager.sendEvent("job-sharing", {
      type: "job-share-accepted",
      data: { post, applicant, pafId },
      timestamp: Date.now(),
    });

    res.json({
      success: true,
      message: "Applicant accepted. PAF generated and systems updated.",
      pafId,
      applicant,
    });
  } catch (error: any) {
    console.error("[Job Share] Accept error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Check if employee qualifies for the job share position
 */
function checkQualifications(
  employee: any,
  employeeSkills: string[],
  qualifications: Qualification
): { qualified: boolean; reasons: string[] } {
  const reasons: string[] = [];
  let qualified = true;

  // Check position tier
  if (qualifications.minTier) {
    const employeeTier = employee.position_tier || 1;
    if (employeeTier < qualifications.minTier) {
      qualified = false;
      reasons.push(
        `Position tier ${employeeTier} below required tier ${qualifications.minTier}`
      );
    } else {
      reasons.push(`Meets tier requirement (${employeeTier} >= ${qualifications.minTier})`);
    }
  }

  // Check if current position disqualifies (e.g., Host can't be Cook 1)
  if (qualifications.positionTitle) {
    const currentPos = (employee.position_title || "").toLowerCase();
    const requiredPos = qualifications.positionTitle.toLowerCase();

    // Position incompatibility rules
    const incompatiblePositions: Record<string, string[]> = {
      cook: ["host", "server", "bartender"],
      chef: ["host", "server", "bartender"],
      "cook 1": ["host", "server", "bartender", "busser"],
      "cook 2": ["host", "server", "bartender", "busser"],
      server: ["cook", "chef", "dishwasher"],
      host: ["cook", "chef", "dishwasher"],
    };

    const incompatible = incompatiblePositions[requiredPos] || [];
    if (incompatible.some((pos) => currentPos.includes(pos))) {
      qualified = false;
      reasons.push(
        `Current position "${employee.position_title}" is incompatible with required position "${qualifications.positionTitle}"`
      );
    } else {
      reasons.push(`Position compatibility check passed`);
    }
  }

  // Check required skills
  if (qualifications.requiredSkills.length > 0) {
    const missingSkills = qualifications.requiredSkills.filter(
      (skill) => !employeeSkills.includes(skill)
    );

    if (missingSkills.length > 0) {
      qualified = false;
      reasons.push(`Missing required skills: ${missingSkills.join(", ")}`);
    } else {
      reasons.push(
        `Has all required skills: ${qualifications.requiredSkills.join(", ")}`
      );
    }
  }

  // Check certifications (if required)
  if (qualifications.requiredCertifications?.length) {
    const employeeCerts = employee.certifications || [];
    const missingCerts = qualifications.requiredCertifications.filter(
      (cert) => !employeeCerts.includes(cert)
    );

    if (missingCerts.length > 0) {
      qualified = false;
      reasons.push(`Missing certifications: ${missingCerts.join(", ")}`);
    } else {
      reasons.push(
        `Has all required certifications: ${qualifications.requiredCertifications.join(", ")}`
      );
    }
  }

  return { qualified, reasons };
}

/**
 * Generate Personnel Action Form (PAF)
 */
async function generatePAF(data: {
  orgId: string;
  employeeId: string;
  employeeName: string;
  postId: string;
  post: any;
  applicant: any;
  actionType: string;
}): Promise<string> {
  const pafId = `PAF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const pafData = {
    id: pafId,
    org_id: data.orgId,
    employee_id: data.employeeId,
    employee_name: data.employeeName,
    action_type: data.actionType,
    effective_date: data.post.shift_date,
    classification: "JOB_SHARE", // Not permanent
    job_share_post_id: data.postId,
    original_position: data.applicant.current_position,
    temporary_position: data.post.position_title,
    outlet_id: data.post.outlet_id,
    outlet_name: data.post.outlet_name,
    shift_date: data.post.shift_date,
    shift_start_time: data.post.shift_start_time,
    shift_end_time: data.post.shift_end_time,
    status: "APPROVED",
    auto_generated: true,
    generated_at: new Date().toISOString(),
  };

  // Insert PAF into database
  const { error } = await supabase.from("personnel_action_forms").insert(pafData);

  if (error) {
    console.error("[Job Share] PAF generation error:", error);
    throw new Error("Failed to generate PAF");
  }

  return pafId;
}

/**
 * Add employee to schedule for job share shift
 */
async function addToSchedule(data: {
  orgId: string;
  employeeId: string;
  post: any;
  classification: string;
}) {
  try {
    // Get or create schedule for the week
    const shiftDate = new Date(data.post.shift_date);
    const weekStart = getWeekStart(shiftDate);

    // Determine day key from date
    const dayKey = getDayKey(shiftDate);

    // Add shift to schedule via Schedule module API
    await fetch("/api/schedule/shifts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-org-id": data.orgId,
      },
      body: JSON.stringify({
        employee_id: data.employeeId,
        week_start_iso: weekStart,
        day_key: dayKey,
        in: data.post.shift_start_time,
        out: data.post.shift_end_time,
        position: data.post.position_title,
        classification: data.classification,
        job_share_post_id: data.post.id,
      }),
    });
  } catch (error) {
    console.error("[Job Share] Schedule update error:", error);
    // Don't throw - continue with other updates
  }
}

/**
 * Update time clock access for job share classification
 */
async function updateTimeClockAccess(data: {
  orgId: string;
  employeeId: string;
  post: any;
  classification: string;
}) {
  try {
    // Update employee's time clock permissions to include temporary position
    await supabase
      .from("time_clock_permissions")
      .upsert({
        org_id: data.orgId,
        employee_id: data.employeeId,
        position_title: data.post.position_title,
        outlet_id: data.post.outlet_id,
        valid_from: data.post.shift_date,
        valid_until: data.post.shift_date, // Single day job share
        classification: data.classification,
        active: true,
      });
  } catch (error) {
    console.error("[Job Share] Time clock update error:", error);
  }
}

/**
 * Update HR system with job share information
 */
async function updateHRSystem(data: {
  orgId: string;
  employeeId: string;
  pafId: string;
  post: any;
  applicant: any;
}) {
  try {
    // Update employee profile with temporary assignment
    await supabase
      .from("employee_profiles")
      .update({
        temporary_assignment: {
          position_title: data.post.position_title,
          outlet_id: data.post.outlet_id,
          outlet_name: data.post.outlet_name,
          start_date: data.post.shift_date,
          end_date: data.post.shift_date,
          classification: "JOB_SHARE",
          paf_id: data.pafId,
        },
      })
      .eq("id", data.employeeId)
      .eq("org_id", data.orgId);

    // Emit HR event
    realtimeManager.sendEvent("hr", {
      type: "job-share-assigned",
      data: {
        employeeId: data.employeeId,
        pafId: data.pafId,
        post: data.post,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[Job Share] HR update error:", error);
  }
}

/**
 * Helper: Get week start date (Monday) from any date
 */
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

/**
 * Helper: Get day key from date
 */
function getDayKey(date: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[date.getDay()];
}

export default router;
