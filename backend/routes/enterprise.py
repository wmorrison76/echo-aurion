"""Labor Cost, Payroll, Workflow, Notifications, Audit, Security routes."""
from typing import Optional
from fastapi import HTTPException, Query
from pydantic import BaseModel
import labor_cost
import payroll_engine
import workflow_engine
import notification_service
import tamper_audit
import security
import event_bus


# ─── Labor Models ──────────────────────────────────────────────────────────
class LaborPlanInput(BaseModel):
    event_id: str
    override_positions: Optional[list] = None

class ActualLaborInput(BaseModel):
    event_id: str
    staff_entries: list

class PositionInput(BaseModel):
    id: Optional[str] = None
    code: str
    name: str
    department: Optional[str] = "foh"
    guests_per_staff: Optional[int] = 20
    min_staff: Optional[int] = 1
    base_rate: Optional[float] = 15
    ot_mult: Optional[float] = 1.5
    dt_mult: Optional[float] = 2.0
    weekend_diff: Optional[float] = 0
    night_diff: Optional[float] = 0
    holiday_mult: Optional[float] = 1.5
    min_shift: Optional[int] = 4
    max_shift: Optional[int] = 10


# ─── Payroll Models ────────────────────────────────────────────────────────
class PayrollPeriodInput(BaseModel):
    start_date: str
    end_date: str
    period_type: Optional[str] = "biweekly"

class TimeEntryInput(BaseModel):
    employee_id: str
    employee_name: Optional[str] = ""
    position_code: Optional[str] = ""
    period_id: Optional[str] = ""
    date: str
    clock_in: Optional[str] = ""
    clock_out: Optional[str] = ""
    hours: float
    rate: float
    ot_multiplier: Optional[float] = 1.5
    event_id: Optional[str] = ""
    department: Optional[str] = ""
    tips: Optional[float] = 0


# ─── Workflow Models ───────────────────────────────────────────────────────
class WorkflowStartInput(BaseModel):
    workflow_type: str
    entity_type: str
    entity_id: str
    title: str
    data: Optional[dict] = {}
    started_by: Optional[str] = "system"

class WorkflowActionInput(BaseModel):
    action: str
    action_by: Optional[str] = "system"
    comments: Optional[str] = ""


# ─── Notification Models ──────────────────────────────────────────────────
class NotificationInput(BaseModel):
    recipient_id: str
    notification_type: str
    message: str
    entity_type: Optional[str] = ""
    entity_id: Optional[str] = ""
    data: Optional[dict] = {}


# ─── Security Models ──────────────────────────────────────────────────────
class ConsentInput(BaseModel):
    user_id: str
    consent_type: str
    granted: bool


def register(app, ws_manager, _broadcast_sync):
    # ── Labor ──────────────────────────────────────────────────────────
    @app.post("/api/labor/plan")
    def plan_labor(data: LaborPlanInput):
        try:
            return labor_cost.auto_plan_labor(data.event_id, data.override_positions)
        except ValueError as e:
            raise HTTPException(400, str(e))

    @app.get("/api/labor/plan/{event_id}")
    def get_labor_plan(event_id: str):
        p = labor_cost.get_event_labor_plan(event_id)
        if not p:
            raise HTTPException(404, "No labor plan for this event")
        return p

    @app.post("/api/labor/actual")
    def record_actual(data: ActualLaborInput):
        return labor_cost.record_actual_labor(data.event_id, data.staff_entries)

    @app.get("/api/labor/variance/{event_id}")
    def labor_variance(event_id: str):
        return labor_cost.get_labor_variance(event_id)

    @app.get("/api/labor/positions")
    def get_positions():
        return labor_cost.get_positions()

    @app.post("/api/labor/position")
    def create_position(data: PositionInput):
        return labor_cost.upsert_position(data.model_dump())

    @app.get("/api/labor/analytics")
    def labor_analytics(days: int = Query(30, ge=1, le=365)):
        return labor_cost.get_labor_analytics(days)

    # ── Payroll ────────────────────────────────────────────────────────
    @app.post("/api/payroll/period")
    def create_payroll_period(data: PayrollPeriodInput):
        return payroll_engine.create_period(data.start_date, data.end_date, data.period_type)

    @app.get("/api/payroll/periods")
    def get_payroll_periods(status: Optional[str] = None):
        return payroll_engine.get_periods(status)

    @app.post("/api/payroll/time-entry")
    def create_time_entry(data: TimeEntryInput):
        return payroll_engine.record_time_entry(data.model_dump())

    @app.get("/api/payroll/time-entries")
    def get_time_entries(period_id: Optional[str] = None, employee_id: Optional[str] = None):
        return payroll_engine.get_time_entries(period_id, employee_id)

    @app.post("/api/payroll/process/{period_id}")
    def process_payroll(period_id: str):
        try:
            result = payroll_engine.process_payroll(period_id)
            event_bus.publish("payroll.calculated", {
                "run_id": result["id"], "total_gross": result["total_gross"],
                "employees": result["employee_count"]}, source="payroll")
            return result
        except ValueError as e:
            raise HTTPException(400, str(e))

    @app.post("/api/payroll/approve/{run_id}")
    def approve_payroll(run_id: str, approved_by: str = "admin"):
        try:
            result = payroll_engine.approve_payroll(run_id, approved_by)
            event_bus.publish("payroll.approved", {"run_id": run_id}, source="payroll")
            return result
        except ValueError as e:
            raise HTTPException(400, str(e))

    @app.post("/api/payroll/execute/{run_id}")
    def execute_payroll(run_id: str):
        try:
            result = payroll_engine.execute_payroll(run_id)
            event_bus.publish("payroll.executed", {
                "run_id": run_id, "total_net": result.get("total_disbursed", 0)}, source="payroll")
            return result
        except ValueError as e:
            raise HTTPException(400, str(e))

    @app.get("/api/payroll/stubs")
    def get_pay_stubs(run_id: Optional[str] = None, employee_id: Optional[str] = None):
        return payroll_engine.get_pay_stubs(run_id, employee_id)

    @app.get("/api/payroll/stats")
    def payroll_stats():
        return payroll_engine.get_payroll_stats()

    # ── Workflow ───────────────────────────────────────────────────────
    @app.post("/api/workflow/start")
    def start_workflow(data: WorkflowStartInput):
        try:
            result = workflow_engine.start_workflow(
                data.workflow_type, data.entity_type, data.entity_id,
                data.title, data.data, data.started_by)
            event_bus.publish("workflow.started", {
                "workflow_id": result["id"], "type": data.workflow_type,
                "title": data.title, "step": 1}, source="workflow")
            return result
        except ValueError as e:
            raise HTTPException(400, str(e))

    @app.post("/api/workflow/{workflow_id}/step/{step_num}")
    def action_workflow_step(workflow_id: str, step_num: int, data: WorkflowActionInput):
        try:
            result = workflow_engine.action_step(workflow_id, step_num, data.action,
                                                  data.action_by, data.comments)
            event_bus.publish(f"workflow.step.{data.action}", {
                "workflow_id": workflow_id, "step": step_num,
                "action": data.action, "by": data.action_by}, source="workflow")
            return result
        except ValueError as e:
            raise HTTPException(400, str(e))

    @app.get("/api/workflow/pending-actions")
    def pending_actions(role: Optional[str] = None):
        return workflow_engine.get_pending_actions(role)

    @app.get("/api/workflow/templates")
    def workflow_templates():
        return workflow_engine.TEMPLATES

    @app.get("/api/workflow/stats")
    def workflow_stats():
        return workflow_engine.get_workflow_stats()

    @app.get("/api/workflow/{workflow_id}")
    def get_workflow(workflow_id: str):
        wf = workflow_engine.get_workflow(workflow_id)
        if not wf:
            raise HTTPException(404, "Workflow not found")
        return wf

    @app.get("/api/workflows")
    def list_workflows(status: Optional[str] = None, workflow_type: Optional[str] = None):
        return workflow_engine.list_workflows(status, workflow_type)

    # ── Notifications ──────────────────────────────────────────────────
    @app.post("/api/notifications/send")
    def send_notification(data: NotificationInput):
        result = notification_service.send(
            data.recipient_id, data.notification_type, data.message,
            data.entity_type, data.entity_id, data.data)
        _broadcast_sync("notification", result)
        return result

    @app.get("/api/notifications/{recipient_id}")
    def get_notifications(recipient_id: str, unread_only: bool = False):
        return notification_service.get_notifications(recipient_id, unread_only)

    @app.get("/api/notifications/{recipient_id}/count")
    def notification_count(recipient_id: str):
        return {"unread": notification_service.get_unread_count(recipient_id)}

    @app.post("/api/notifications/{notification_id}/read")
    def mark_notification_read(notification_id: str):
        return notification_service.mark_read(notification_id)

    @app.post("/api/notifications/{recipient_id}/read-all")
    def mark_all_notifications_read(recipient_id: str):
        return notification_service.mark_all_read(recipient_id)

    @app.get("/api/notifications-stats")
    def notification_stats():
        return notification_service.get_notification_stats()

    @app.get("/api/notification-types")
    def notification_types():
        return notification_service.NOTIFICATION_TYPES

    # ── Audit ──────────────────────────────────────────────────────────
    @app.get("/api/audit/recent")
    def recent_audit(limit: int = 50, event_type: Optional[str] = None):
        return tamper_audit.get_recent(limit, event_type)

    @app.get("/api/audit/entity/{entity_type}/{entity_id}")
    def entity_timeline(entity_type: str, entity_id: str):
        return tamper_audit.get_entity_timeline(entity_type, entity_id)

    @app.get("/api/audit/actor/{actor_id}")
    def actor_history(actor_id: str):
        return tamper_audit.get_actor_history(actor_id)

    @app.get("/api/audit/verify-chain")
    def verify_chain():
        return tamper_audit.verify_chain()

    @app.get("/api/audit/compliance-report")
    def compliance_report(days: int = Query(30, ge=1, le=365)):
        return tamper_audit.compliance_report(days)

    @app.get("/api/audit/stats")
    def audit_stats():
        return tamper_audit.get_audit_stats()

    # ── Security / GDPR ───────────────────────────────────────────────
    @app.post("/api/gdpr/consent")
    def record_consent(data: ConsentInput):
        return security.record_consent(data.user_id, data.consent_type, data.granted)

    @app.get("/api/gdpr/consents/{user_id}")
    def get_consents(user_id: str):
        return security.get_consents(user_id)

    @app.get("/api/gdpr/export/{user_id}")
    def export_data(user_id: str):
        return security.export_user_data(user_id)

    @app.post("/api/gdpr/anonymize/{user_id}")
    def anonymize(user_id: str):
        return security.anonymize_user(user_id)

    @app.get("/api/gdpr/requests")
    def data_requests(user_id: Optional[str] = None):
        return security.get_data_requests(user_id)
