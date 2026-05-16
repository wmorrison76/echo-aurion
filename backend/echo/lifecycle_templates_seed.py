"""
Lifecycle Templates — Hospitality Default Seeds
================================================
Eight built-in lifecycle templates for the most common hospitality
project types. Each one is carefully sequenced with realistic
step-day offsets, named owner roles, and clear deliverables.

These are SEEDS — read-only after seeding. To customize for a
property, fork via POST /api/lifecycles/templates with a
property_id set. Edits to seeds are blocked at the engine level.

Anchor convention:
  · day_offset = days from the project's anchor_date
  · Negative = before anchor (T-90 = 90 days before)
  · Zero = on anchor
  · Positive = after anchor (T+30 = 30 days after)

Each project type's anchor:
  · Renovation                    : project start date
  · Property opening              : opening day (D-day)
  · F&B menu rollout              : menu launch date
  · Training cohort               : cohort start date
  · SOC 2 evidence                : audit start date
  · BEO production cycle          : event date
  · CapEx project                 : project approval date
  · Marketing campaign            : campaign launch date

The Monthly P&L close template is owned by `period_close.py` and
is not duplicated here.
"""

# ─────────────────────────────────────────────────────────────────
# 1) Renovation Project
# ─────────────────────────────────────────────────────────────────
RENOVATION = {
    "template_id": "seed_renovation",
    "project_type": "renovation",
    "property_id": None,
    "display_name": "Renovation Project (default)",
    "description": "Full life cycle for a property renovation: scope through soft re-open. Anchor = project start date.",
    "anchor_label": "project_start_date",
    "version": 1,
    "steps": [
        # Pre-construction
        {"step_id": "scope_definition", "title": "Scope of work defined and signed",
         "type": "Owner", "owner_role": "GM", "category": "Pre-construction", "day_offset": -45},
        {"step_id": "architectural_plans", "title": "Architectural plans complete",
         "type": "Owner", "owner_role": "Architect", "category": "Pre-construction", "day_offset": -30,
         "depends_on": ["scope_definition"]},
        {"step_id": "permits_filed", "title": "Building permits filed",
         "type": "Owner", "owner_role": "Project Manager", "category": "Pre-construction", "day_offset": -21,
         "depends_on": ["architectural_plans"]},
        {"step_id": "permits_approved", "title": "Building permits approved",
         "type": "Owner", "owner_role": "Project Manager", "category": "Pre-construction", "day_offset": -7,
         "depends_on": ["permits_filed"]},
        {"step_id": "vendor_selection", "title": "GC + sub-vendor selection complete",
         "type": "Owner", "owner_role": "Project Manager", "category": "Pre-construction", "day_offset": -14,
         "depends_on": ["scope_definition"]},
        {"step_id": "kickoff_meeting", "title": "Kickoff meeting with GC + GM + Owner",
         "type": "Mandatory", "owner_role": "Project Manager", "category": "Pre-construction", "day_offset": -3,
         "depends_on": ["permits_approved", "vendor_selection"]},
        # Construction
        {"step_id": "demo_phase", "title": "Demo phase",
         "type": "Owner", "owner_role": "GC", "category": "Construction", "day_offset": 0, "duration_days": 7},
        {"step_id": "rough_construction", "title": "Rough construction (framing / mechanical / electrical / plumbing)",
         "type": "Owner", "owner_role": "GC", "category": "Construction", "day_offset": 7, "duration_days": 21,
         "depends_on": ["demo_phase"]},
        {"step_id": "rough_inspection", "title": "Rough inspection passed",
         "type": "Owner", "owner_role": "Project Manager", "category": "Construction", "day_offset": 28,
         "depends_on": ["rough_construction"]},
        {"step_id": "finishes", "title": "Finishes phase (drywall, tile, flooring, fixtures)",
         "type": "Owner", "owner_role": "GC", "category": "Construction", "day_offset": 28, "duration_days": 21,
         "depends_on": ["rough_inspection"]},
        {"step_id": "ffe_install", "title": "FF&E delivered + installed",
         "type": "Owner", "owner_role": "Procurement", "category": "Construction", "day_offset": 49, "duration_days": 7,
         "depends_on": ["finishes"]},
        # Pre-open
        {"step_id": "punch_list_walk", "title": "Punch-list walk-through",
         "type": "Mandatory", "owner_role": "GM + GC + Project Manager", "category": "Pre-open", "day_offset": 56,
         "depends_on": ["ffe_install"]},
        {"step_id": "punch_list_resolved", "title": "Punch-list items resolved",
         "type": "Owner", "owner_role": "GC", "category": "Pre-open", "day_offset": 63,
         "depends_on": ["punch_list_walk"]},
        {"step_id": "deep_clean", "title": "Deep clean + finals",
         "type": "Owner", "owner_role": "Housekeeping", "category": "Pre-open", "day_offset": 64},
        {"step_id": "final_walkthrough", "title": "Final walkthrough + sign-off",
         "type": "Mandatory", "owner_role": "EC + Owner", "category": "Pre-open", "day_offset": 65,
         "depends_on": ["punch_list_resolved", "deep_clean"]},
        # Re-open
        {"step_id": "soft_reopen", "title": "Soft re-open (limited capacity)",
         "type": "Mandatory", "owner_role": "GM + Department heads", "category": "Re-open", "day_offset": 66,
         "depends_on": ["final_walkthrough"]},
        {"step_id": "full_reopen", "title": "Full re-open",
         "type": "Owner", "owner_role": "GM", "category": "Re-open", "day_offset": 70,
         "depends_on": ["soft_reopen"]},
        {"step_id": "thirty_day_review", "title": "30-day post-renovation review (capture ratio, guest feedback, cost reconciliation)",
         "type": "Mandatory", "owner_role": "EC", "category": "Post-open", "day_offset": 100,
         "depends_on": ["full_reopen"]},
    ],
}


# ─────────────────────────────────────────────────────────────────
# 2) New Property Opening — 90-day Playbook
# Anchor = D-day (opening day)
# ─────────────────────────────────────────────────────────────────
PROPERTY_OPENING = {
    "template_id": "seed_property_opening",
    "project_type": "property_opening",
    "property_id": None,
    "display_name": "New Property Opening — 90-day Playbook",
    "description": "Pre-opening through 90-day stabilization. Anchor = opening day (D-day).",
    "anchor_label": "opening_day",
    "version": 1,
    "steps": [
        # T-90 to T-60 — Foundation
        {"step_id": "ec_team_signed", "title": "EC team hired and signed",
         "type": "Owner", "owner_role": "Owner", "category": "Foundation", "day_offset": -90},
        {"step_id": "department_head_offers", "title": "Department head offers extended",
         "type": "Owner", "owner_role": "GM", "category": "Foundation", "day_offset": -85,
         "depends_on": ["ec_team_signed"]},
        {"step_id": "vendor_setup_kickoff", "title": "Vendor setup kickoff (POS, PMS, payroll, channel manager)",
         "type": "Mandatory", "owner_role": "GM + IT", "category": "Foundation", "day_offset": -75},
        {"step_id": "brand_standards_review", "title": "Brand standards + SOPs reviewed",
         "type": "Owner", "owner_role": "GM", "category": "Foundation", "day_offset": -70},
        # T-60 to T-30 — Build
        {"step_id": "system_config", "title": "System configuration complete (POS, PMS, accounting)",
         "type": "Owner", "owner_role": "IT + Finance", "category": "Build", "day_offset": -55,
         "depends_on": ["vendor_setup_kickoff"]},
        {"step_id": "menu_finalized", "title": "Menus finalized + costed",
         "type": "Owner", "owner_role": "EC + F&B Director", "category": "Build", "day_offset": -50},
        {"step_id": "core_team_onboarded", "title": "Core team onboarded + handbook signed",
         "type": "Mandatory", "owner_role": "HR", "category": "Build", "day_offset": -45,
         "depends_on": ["department_head_offers"]},
        {"step_id": "training_curriculum", "title": "Training curriculum delivered",
         "type": "Owner", "owner_role": "Training Manager", "category": "Build", "day_offset": -40,
         "depends_on": ["core_team_onboarded"]},
        # T-30 to T-7 — Rehearse
        {"step_id": "soft_opening_dry_run", "title": "Friends + family soft opening dry-run",
         "type": "Mandatory", "owner_role": "GM + Department heads", "category": "Rehearse", "day_offset": -21},
        {"step_id": "first_real_reservations", "title": "First real reservations accepted",
         "type": "Owner", "owner_role": "Reservations", "category": "Rehearse", "day_offset": -14},
        {"step_id": "marketing_push_start", "title": "Marketing push begins",
         "type": "Owner", "owner_role": "Marketing Lead", "category": "Rehearse", "day_offset": -10},
        # T-7 to T-0 — Final
        {"step_id": "final_inspections", "title": "Final inspections (fire, health, occupancy)",
         "type": "Mandatory", "owner_role": "GM + Engineering", "category": "Final", "day_offset": -7},
        {"step_id": "stocking_complete", "title": "Final stocking + mise en place",
         "type": "Owner", "owner_role": "Procurement", "category": "Final", "day_offset": -3},
        {"step_id": "all_hands_eve", "title": "All-hands eve-of-opening rehearsal",
         "type": "Mandatory", "owner_role": "GM", "category": "Final", "day_offset": -1},
        # D-day
        {"step_id": "opening_day", "title": "OPENING DAY",
         "type": "Mandatory", "owner_role": "GM + Owner", "category": "D-day", "day_offset": 0},
        # T+1 to T+30 — Stabilize
        {"step_id": "first_week_retro", "title": "First-week retrospective",
         "type": "Mandatory", "owner_role": "GM + Department heads", "category": "Stabilize", "day_offset": 7},
        {"step_id": "first_p_and_l", "title": "First P&L close",
         "type": "Owner", "owner_role": "Finance", "category": "Stabilize", "day_offset": 30},
        # T+30 to T+90 — Settle
        {"step_id": "thirty_day_capture", "title": "30-day capture-ratio review (which outlets are landing)",
         "type": "Mandatory", "owner_role": "GM", "category": "Settle", "day_offset": 30},
        {"step_id": "sixty_day_pricing", "title": "60-day pricing + menu adjustments",
         "type": "Owner", "owner_role": "F&B Director + Revenue Team", "category": "Settle", "day_offset": 60},
        {"step_id": "ninety_day_owner_review", "title": "90-day Owner's review — full P&L + forecast + lessons learned",
         "type": "Mandatory", "owner_role": "EC + Owner", "category": "Settle", "day_offset": 90},
    ],
}


# ─────────────────────────────────────────────────────────────────
# 3) F&B Menu Rollout
# Anchor = launch day
# ─────────────────────────────────────────────────────────────────
FB_MENU_ROLLOUT = {
    "template_id": "seed_fb_menu_rollout",
    "project_type": "fb_menu_rollout",
    "property_id": None,
    "display_name": "F&B Menu Rollout (default)",
    "description": "Concept through 30-day post-launch review. Anchor = menu launch date.",
    "anchor_label": "menu_launch_date",
    "version": 1,
    "steps": [
        {"step_id": "concept_brief", "title": "Concept brief + theme defined",
         "type": "Owner", "owner_role": "EC", "category": "Concept", "day_offset": -60},
        {"step_id": "recipe_dev", "title": "Recipe development + tasting",
         "type": "Owner", "owner_role": "Sous Chef", "category": "Concept", "day_offset": -45,
         "depends_on": ["concept_brief"]},
        {"step_id": "costing", "title": "Plated cost + margin analysis per dish",
         "type": "Owner", "owner_role": "Finance + EC", "category": "Costing", "day_offset": -35,
         "depends_on": ["recipe_dev"]},
        {"step_id": "tasting_panel", "title": "Internal tasting + EC sign-off",
         "type": "Mandatory", "owner_role": "EC + GM + F&B Director", "category": "Costing", "day_offset": -28,
         "depends_on": ["costing"]},
        {"step_id": "photography", "title": "Menu photography",
         "type": "Owner", "owner_role": "Marketing", "category": "Production", "day_offset": -21,
         "depends_on": ["tasting_panel"]},
        {"step_id": "menu_print", "title": "Print menu finalized",
         "type": "Owner", "owner_role": "Marketing", "category": "Production", "day_offset": -14,
         "depends_on": ["photography"]},
        {"step_id": "pos_loaded", "title": "POS items + prices loaded",
         "type": "Owner", "owner_role": "F&B Manager", "category": "Production", "day_offset": -7,
         "depends_on": ["costing"]},
        {"step_id": "server_training", "title": "Server training + flavor walkthrough",
         "type": "Mandatory", "owner_role": "F&B Director", "category": "Training", "day_offset": -5,
         "depends_on": ["tasting_panel"]},
        {"step_id": "soft_launch", "title": "Soft launch (selected covers)",
         "type": "Mandatory", "owner_role": "F&B Director + EC", "category": "Launch", "day_offset": -2,
         "depends_on": ["server_training", "menu_print", "pos_loaded"]},
        {"step_id": "full_launch", "title": "Full menu launch",
         "type": "Mandatory", "owner_role": "F&B Director", "category": "Launch", "day_offset": 0,
         "depends_on": ["soft_launch"]},
        {"step_id": "week1_review", "title": "First-week sales mix + margin review",
         "type": "Owner", "owner_role": "F&B Director + Finance", "category": "Review", "day_offset": 7},
        {"step_id": "thirty_day_review", "title": "30-day menu engineering review (Stars/Plowhorses/Puzzles/Dogs)",
         "type": "Mandatory", "owner_role": "EC + F&B Director", "category": "Review", "day_offset": 30},
    ],
}


# ─────────────────────────────────────────────────────────────────
# 4) Training Cohort Rollout
# Anchor = cohort start date
# ─────────────────────────────────────────────────────────────────
TRAINING_COHORT = {
    "template_id": "seed_training_cohort",
    "project_type": "training_cohort",
    "property_id": None,
    "display_name": "Training Cohort Rollout (default)",
    "description": "From curriculum design through certification + manager retro. Anchor = cohort start date.",
    "anchor_label": "cohort_start_date",
    "version": 1,
    "steps": [
        {"step_id": "curriculum_design", "title": "Curriculum design + learning objectives",
         "type": "Owner", "owner_role": "Training Manager", "category": "Design", "day_offset": -30},
        {"step_id": "instructor_prep", "title": "Instructor selection + prep materials",
         "type": "Owner", "owner_role": "Training Manager", "category": "Design", "day_offset": -21,
         "depends_on": ["curriculum_design"]},
        {"step_id": "cohort_selection", "title": "Cohort participants selected + announced",
         "type": "Owner", "owner_role": "HR + Department heads", "category": "Design", "day_offset": -14},
        {"step_id": "kickoff", "title": "Kickoff session",
         "type": "Mandatory", "owner_role": "Training Manager", "category": "Delivery", "day_offset": 0},
        {"step_id": "session_2", "title": "Session 2",
         "type": "Mandatory", "owner_role": "Instructor", "category": "Delivery", "day_offset": 7,
         "depends_on": ["kickoff"]},
        {"step_id": "session_3", "title": "Session 3",
         "type": "Mandatory", "owner_role": "Instructor", "category": "Delivery", "day_offset": 14,
         "depends_on": ["session_2"]},
        {"step_id": "session_4", "title": "Session 4",
         "type": "Mandatory", "owner_role": "Instructor", "category": "Delivery", "day_offset": 21,
         "depends_on": ["session_3"]},
        {"step_id": "practical_assessment", "title": "Practical assessment (on-floor evaluation)",
         "type": "Owner", "owner_role": "Department head + Instructor", "category": "Assessment", "day_offset": 28,
         "depends_on": ["session_4"]},
        {"step_id": "written_exam", "title": "Written exam",
         "type": "Owner", "owner_role": "Training Manager", "category": "Assessment", "day_offset": 30,
         "depends_on": ["practical_assessment"]},
        {"step_id": "certification_issued", "title": "Certification issued for passing participants",
         "type": "Owner", "owner_role": "HR", "category": "Wrap", "day_offset": 35,
         "depends_on": ["written_exam"]},
        {"step_id": "manager_retro", "title": "Manager retrospective — what worked, what to improve",
         "type": "Mandatory", "owner_role": "Department heads + Training Manager", "category": "Wrap", "day_offset": 45,
         "depends_on": ["certification_issued"]},
    ],
}


# ─────────────────────────────────────────────────────────────────
# 5) SOC 2 Type I Evidence Collection
# Anchor = audit start date
# ─────────────────────────────────────────────────────────────────
SOC2_EVIDENCE = {
    "template_id": "seed_soc2_evidence",
    "project_type": "soc2_evidence",
    "property_id": None,
    "display_name": "SOC 2 Type I Evidence Collection (default)",
    "description": "Pre-engagement through Type I issuance + ongoing monitoring. Anchor = audit start date.",
    "anchor_label": "audit_start_date",
    "version": 1,
    "steps": [
        {"step_id": "auditor_engaged", "title": "SOC 2 auditor firm engaged + scope agreed",
         "type": "Owner", "owner_role": "CFO + Compliance Lead", "category": "Pre-engagement", "day_offset": -180},
        {"step_id": "framework_selection", "title": "Trust Services Criteria selected (CC, A, C, P, PI subset)",
         "type": "Owner", "owner_role": "Compliance Lead + Auditor", "category": "Pre-engagement", "day_offset": -150,
         "depends_on": ["auditor_engaged"]},
        {"step_id": "control_design", "title": "Control design documented + signed",
         "type": "Owner", "owner_role": "Compliance Lead", "category": "Design", "day_offset": -120,
         "depends_on": ["framework_selection"]},
        {"step_id": "policies_published", "title": "Policy library published + employees signed",
         "type": "Owner", "owner_role": "HR + Compliance Lead", "category": "Design", "day_offset": -90},
        {"step_id": "evidence_collection_kickoff", "title": "Evidence collection kickoff",
         "type": "Mandatory", "owner_role": "Compliance Lead", "category": "Evidence", "day_offset": -90},
        {"step_id": "access_controls_evidence", "title": "Access control evidence (CC6) — 6 weeks of logs",
         "type": "Owner", "owner_role": "IT + Compliance Lead", "category": "Evidence", "day_offset": -45},
        {"step_id": "change_management_evidence", "title": "Change management evidence (CC8) — every prod change documented",
         "type": "Owner", "owner_role": "Engineering Lead", "category": "Evidence", "day_offset": -45},
        {"step_id": "vendor_management_evidence", "title": "Vendor management evidence (CC9) — third-party diligence + monitoring",
         "type": "Owner", "owner_role": "Procurement + Compliance Lead", "category": "Evidence", "day_offset": -30},
        {"step_id": "incident_response_evidence", "title": "Incident response evidence (CC7) — drill + retros",
         "type": "Owner", "owner_role": "Engineering Lead", "category": "Evidence", "day_offset": -30},
        {"step_id": "audit_kickoff", "title": "Audit kickoff with auditor",
         "type": "Mandatory", "owner_role": "CFO + Compliance Lead + Auditor", "category": "Audit", "day_offset": 0},
        {"step_id": "evidence_handoff", "title": "Evidence handoff to auditor",
         "type": "Owner", "owner_role": "Compliance Lead", "category": "Audit", "day_offset": 7},
        {"step_id": "auditor_questions_round1", "title": "Auditor first-round questions answered",
         "type": "Owner", "owner_role": "Compliance Lead", "category": "Audit", "day_offset": 21},
        {"step_id": "draft_report", "title": "Draft Type I report received",
         "type": "Owner", "owner_role": "Auditor", "category": "Audit", "day_offset": 45},
        {"step_id": "findings_remediation", "title": "Findings remediated + documented",
         "type": "Owner", "owner_role": "Compliance Lead + Engineering", "category": "Audit", "day_offset": 60},
        {"step_id": "type1_issued", "title": "SOC 2 Type I report issued",
         "type": "Mandatory", "owner_role": "CFO + Auditor", "category": "Wrap", "day_offset": 75,
         "depends_on": ["findings_remediation"]},
        {"step_id": "continuous_monitoring", "title": "Continuous monitoring program kicked off (heading to Type II)",
         "type": "Mandatory", "owner_role": "Compliance Lead", "category": "Wrap", "day_offset": 90},
    ],
}


# ─────────────────────────────────────────────────────────────────
# 6) BEO Production Cycle
# Anchor = event date
# ─────────────────────────────────────────────────────────────────
BEO_PRODUCTION_CYCLE = {
    "template_id": "seed_beo_production_cycle",
    "project_type": "beo_production_cycle",
    "property_id": None,
    "display_name": "BEO Production Cycle (default)",
    "description": "From BEO finalization through post-event invoice reconciliation. Anchor = event date.",
    "anchor_label": "event_date",
    "version": 1,
    "steps": [
        {"step_id": "beo_finalized", "title": "BEO finalized + signed by client",
         "type": "Owner", "owner_role": "Catering Manager", "category": "Pre-event", "day_offset": -14},
        {"step_id": "equipment_list", "title": "Equipment + AV list confirmed",
         "type": "Owner", "owner_role": "Banquet Manager + AV", "category": "Pre-event", "day_offset": -14,
         "depends_on": ["beo_finalized"]},
        {"step_id": "staffing_plan", "title": "Staffing plan complete",
         "type": "Owner", "owner_role": "Banquet Manager", "category": "Pre-event", "day_offset": -7,
         "depends_on": ["beo_finalized"]},
        {"step_id": "menu_costed", "title": "Menu costed + plated cost finalized",
         "type": "Owner", "owner_role": "EC + Finance", "category": "Pre-event", "day_offset": -7,
         "depends_on": ["beo_finalized"]},
        {"step_id": "mise_en_place_orders", "title": "Mise en place orders placed",
         "type": "Owner", "owner_role": "Sous Chef + Procurement", "category": "Pre-event", "day_offset": -3,
         "depends_on": ["menu_costed"]},
        {"step_id": "rentals_arrived", "title": "Rentals delivered + verified",
         "type": "Owner", "owner_role": "Banquet Manager", "category": "Pre-event", "day_offset": -1,
         "depends_on": ["equipment_list"]},
        {"step_id": "pre_event_meeting", "title": "Pre-event meeting (BEO walk-through with team)",
         "type": "Mandatory", "owner_role": "Catering Manager + Banquet Manager + EC", "category": "Pre-event", "day_offset": -1,
         "depends_on": ["staffing_plan", "rentals_arrived"]},
        {"step_id": "production", "title": "Event production",
         "type": "Owner", "owner_role": "Banquet Manager", "category": "Event", "day_offset": 0,
         "depends_on": ["pre_event_meeting"]},
        {"step_id": "post_event_walk", "title": "Post-event venue walk + breakdown verification",
         "type": "Owner", "owner_role": "Banquet Manager", "category": "Post-event", "day_offset": 1,
         "depends_on": ["production"]},
        {"step_id": "actuals_recorded", "title": "Actuals recorded (covers, beverage, OT)",
         "type": "Owner", "owner_role": "Banquet Manager + Finance", "category": "Post-event", "day_offset": 1},
        {"step_id": "client_followup", "title": "Client follow-up + feedback",
         "type": "Owner", "owner_role": "Catering Manager", "category": "Post-event", "day_offset": 3},
        {"step_id": "final_invoice", "title": "Final invoice issued",
         "type": "Owner", "owner_role": "Catering Manager + Finance", "category": "Wrap", "day_offset": 7,
         "depends_on": ["actuals_recorded"]},
        {"step_id": "beo_retro", "title": "BEO retro — variance vs. estimate, lessons learned",
         "type": "Mandatory", "owner_role": "Catering Manager + EC", "category": "Wrap", "day_offset": 14},
    ],
}


# ─────────────────────────────────────────────────────────────────
# 7) Capital Expenditure Project
# Anchor = approval date
# ─────────────────────────────────────────────────────────────────
CAPEX_PROJECT = {
    "template_id": "seed_capex_project",
    "project_type": "capex_project",
    "property_id": None,
    "display_name": "Capital Expenditure Project (default)",
    "description": "From proposal through capitalization + depreciation start. Anchor = project approval date.",
    "anchor_label": "approval_date",
    "version": 1,
    "steps": [
        {"step_id": "proposal_drafted", "title": "Project proposal drafted (scope + budget + benefits)",
         "type": "Owner", "owner_role": "Department Head + Finance", "category": "Proposal", "day_offset": -45},
        {"step_id": "roi_analysis", "title": "ROI / payback / NPV analysis complete",
         "type": "Owner", "owner_role": "Finance", "category": "Proposal", "day_offset": -30,
         "depends_on": ["proposal_drafted"]},
        {"step_id": "approval_routing", "title": "Approval routed (department head → GM → Owner)",
         "type": "Mandatory", "owner_role": "GM + Owner", "category": "Proposal", "day_offset": -7,
         "depends_on": ["roi_analysis"]},
        {"step_id": "approval_granted", "title": "Project approved + budget locked",
         "type": "Mandatory", "owner_role": "Owner", "category": "Approval", "day_offset": 0},
        {"step_id": "vendor_rfp", "title": "Vendor RFP issued",
         "type": "Owner", "owner_role": "Procurement", "category": "Sourcing", "day_offset": 7,
         "depends_on": ["approval_granted"]},
        {"step_id": "vendor_selected", "title": "Vendor selected + contract signed",
         "type": "Owner", "owner_role": "Procurement + Legal", "category": "Sourcing", "day_offset": 30,
         "depends_on": ["vendor_rfp"]},
        {"step_id": "po_issued", "title": "PO issued + deposit paid",
         "type": "Owner", "owner_role": "Finance", "category": "Sourcing", "day_offset": 35,
         "depends_on": ["vendor_selected"]},
        {"step_id": "delivery", "title": "Asset delivered",
         "type": "Owner", "owner_role": "Procurement", "category": "Execution", "day_offset": 60},
        {"step_id": "install_acceptance", "title": "Installation + acceptance test passed",
         "type": "Owner", "owner_role": "Department Head + Engineering", "category": "Execution", "day_offset": 67,
         "depends_on": ["delivery"]},
        {"step_id": "capitalization_je", "title": "Capitalization JE posted (asset added to fixed asset register)",
         "type": "Owner", "owner_role": "Finance", "category": "Accounting", "day_offset": 70,
         "depends_on": ["install_acceptance"]},
        {"step_id": "depreciation_start", "title": "Depreciation schedule started",
         "type": "Owner", "owner_role": "Finance", "category": "Accounting", "day_offset": 75,
         "depends_on": ["capitalization_je"]},
        {"step_id": "post_implementation_review", "title": "Post-implementation review (actual vs. budget vs. ROI promised)",
         "type": "Mandatory", "owner_role": "GM + Finance + Department Head", "category": "Review", "day_offset": 180,
         "depends_on": ["depreciation_start"]},
    ],
}


# ─────────────────────────────────────────────────────────────────
# 8) Marketing Campaign
# Anchor = campaign launch date
# ─────────────────────────────────────────────────────────────────
MARKETING_CAMPAIGN = {
    "template_id": "seed_marketing_campaign",
    "project_type": "marketing_campaign",
    "property_id": None,
    "display_name": "Marketing Campaign (default)",
    "description": "From brief through end-of-campaign report. Anchor = campaign launch date.",
    "anchor_label": "campaign_launch_date",
    "version": 1,
    "steps": [
        {"step_id": "brief", "title": "Campaign brief signed (objectives, target, budget)",
         "type": "Owner", "owner_role": "Marketing Lead + GM", "category": "Brief", "day_offset": -45},
        {"step_id": "creative_dev", "title": "Creative development (copy, design, photo, video)",
         "type": "Owner", "owner_role": "Creative Director", "category": "Creative", "day_offset": -30,
         "depends_on": ["brief"]},
        {"step_id": "creative_approval", "title": "Creative approval",
         "type": "Mandatory", "owner_role": "GM + Marketing Lead", "category": "Creative", "day_offset": -21,
         "depends_on": ["creative_dev"]},
        {"step_id": "channel_plan", "title": "Channel plan finalized (paid, email, social, OTA, direct)",
         "type": "Owner", "owner_role": "Marketing Lead", "category": "Plan", "day_offset": -14,
         "depends_on": ["creative_approval"]},
        {"step_id": "tracking_setup", "title": "Tracking setup (UTMs, conversion pixels, channel codes)",
         "type": "Owner", "owner_role": "Marketing Analyst", "category": "Plan", "day_offset": -10},
        {"step_id": "ad_buys", "title": "Ad buys placed",
         "type": "Owner", "owner_role": "Media Buyer", "category": "Plan", "day_offset": -7,
         "depends_on": ["channel_plan"]},
        {"step_id": "launch", "title": "Campaign launch",
         "type": "Mandatory", "owner_role": "Marketing Lead", "category": "Launch", "day_offset": 0,
         "depends_on": ["tracking_setup", "ad_buys"]},
        {"step_id": "midflight_review", "title": "Mid-flight optimization review",
         "type": "Mandatory", "owner_role": "Marketing Lead + Media Buyer", "category": "Optimize", "day_offset": 14},
        {"step_id": "midflight_adjustments", "title": "Mid-flight creative or budget adjustments",
         "type": "Owner", "owner_role": "Marketing Lead", "category": "Optimize", "day_offset": 16,
         "depends_on": ["midflight_review"]},
        {"step_id": "campaign_end", "title": "Campaign ends + ad spend stopped",
         "type": "Owner", "owner_role": "Media Buyer", "category": "Wrap", "day_offset": 30},
        {"step_id": "results_pull", "title": "Results pulled (impressions, clicks, conversions, ROAS)",
         "type": "Owner", "owner_role": "Marketing Analyst", "category": "Wrap", "day_offset": 35},
        {"step_id": "end_of_campaign_report", "title": "End-of-campaign report + lessons learned",
         "type": "Mandatory", "owner_role": "Marketing Lead + GM", "category": "Wrap", "day_offset": 45,
         "depends_on": ["results_pull"]},
    ],
}


# All templates aggregated for the seeding endpoint
SEED_TEMPLATES = [
    RENOVATION,
    PROPERTY_OPENING,
    FB_MENU_ROLLOUT,
    TRAINING_COHORT,
    SOC2_EVIDENCE,
    BEO_PRODUCTION_CYCLE,
    CAPEX_PROJECT,
    MARKETING_CAMPAIGN,
]
