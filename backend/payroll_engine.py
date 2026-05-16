"""
LUCCCA Payroll Execution Engine
================================
Complete payroll processing pipeline:
  Time Entries -> Calculation -> Deductions -> Benefits ->
  GL Posting -> Pay Stub Generation -> Audit Trail

Integrates with:
- Schedule module (time entries)
- Labor Cost Engine (rates, overtime)
- Event Lifecycle (event-specific labor)
- EchoAurum (GL journal entries)
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
from database import db, audit_log_col

payroll_periods_col = db["payroll_periods"]
time_entries_col = db["time_entries"]
payroll_runs_col = db["payroll_runs"]
pay_stubs_col = db["pay_stubs"]
deductions_col = db["deduction_configs"]
gl_entries_col = db["gl_journal_entries"]

payroll_periods_col.create_index([("start_date", 1)])
time_entries_col.create_index([("employee_id", 1), ("date", 1)])
payroll_runs_col.create_index([("period_id", 1)])


def _uid():
    return str(uuid.uuid4())

def _now():
    return datetime.now(timezone.utc).isoformat()


# Federal tax brackets (simplified 2026)
FEDERAL_BRACKETS = [
    (11600, 0.10), (47150, 0.12), (100525, 0.22),
    (191950, 0.24), (243725, 0.32), (609350, 0.35), (float("inf"), 0.37),
]

DEFAULT_DEDUCTIONS = [
    {"code": "FED_TAX", "name": "Federal Income Tax", "type": "tax", "method": "bracket"},
    {"code": "FICA_SS", "name": "Social Security (FICA)", "type": "tax", "rate": 0.062, "cap": 168600},
    {"code": "FICA_MED", "name": "Medicare", "type": "tax", "rate": 0.0145},
    {"code": "STATE_TAX", "name": "State Income Tax", "type": "tax", "rate": 0.05},
    {"code": "HEALTH_INS", "name": "Health Insurance", "type": "benefit", "amount_per_period": 250},
    {"code": "DENTAL", "name": "Dental Insurance", "type": "benefit", "amount_per_period": 45},
    {"code": "401K", "name": "401(k) Contribution", "type": "retirement", "rate": 0.04},
]


def seed_deductions():
    if deductions_col.count_documents({}) > 0:
        return
    for d in DEFAULT_DEDUCTIONS:
        d["id"] = _uid()
        d["created_at"] = _now()
        deductions_col.insert_one(d)


# ---------------------------------------------------------------------------
# PAYROLL PERIODS
# ---------------------------------------------------------------------------
def create_period(start_date: str, end_date: str, period_type: str = "biweekly") -> dict:
    pid = _uid()
    doc = {
        "id": pid,
        "start_date": start_date,
        "end_date": end_date,
        "period_type": period_type,
        "status": "open",
        "created_at": _now(),
    }
    payroll_periods_col.insert_one(doc)
    del doc["_id"]
    return doc


def get_periods(status: str = None) -> list:
    q = {}
    if status:
        q["status"] = status
    return list(payroll_periods_col.find(q, {"_id": 0}).sort("start_date", -1).limit(20))


def get_period(period_id: str) -> Optional[dict]:
    return payroll_periods_col.find_one({"id": period_id}, {"_id": 0})


# ---------------------------------------------------------------------------
# TIME ENTRIES
# ---------------------------------------------------------------------------
def record_time_entry(data: dict) -> dict:
    tid = _uid()
    hours = data.get("hours", 0)
    rate = data.get("rate", 0)
    regular = min(hours, 8)
    overtime = max(0, hours - 8)
    ot_rate = rate * data.get("ot_multiplier", 1.5)

    doc = {
        "id": tid,
        "employee_id": data["employee_id"],
        "employee_name": data.get("employee_name", ""),
        "position_code": data.get("position_code", ""),
        "period_id": data.get("period_id", ""),
        "date": data["date"],
        "clock_in": data.get("clock_in", ""),
        "clock_out": data.get("clock_out", ""),
        "hours": hours,
        "regular_hours": regular,
        "overtime_hours": overtime,
        "rate": rate,
        "ot_rate": round(ot_rate, 2),
        "gross_pay": round(regular * rate + overtime * ot_rate, 2),
        "event_id": data.get("event_id", ""),
        "department": data.get("department", ""),
        "tips": data.get("tips", 0),
        "status": "approved",
        "created_at": _now(),
    }
    time_entries_col.insert_one(doc)
    del doc["_id"]
    return doc


def get_time_entries(period_id: str = None, employee_id: str = None) -> list:
    q = {}
    if period_id:
        q["period_id"] = period_id
    if employee_id:
        q["employee_id"] = employee_id
    return list(time_entries_col.find(q, {"_id": 0}).sort("date", -1))


# ---------------------------------------------------------------------------
# PAYROLL EXECUTION
# ---------------------------------------------------------------------------
def _calc_federal_tax(annual_gross: float) -> float:
    tax = 0
    prev_limit = 0
    for limit, rate in FEDERAL_BRACKETS:
        taxable = min(annual_gross, limit) - prev_limit
        if taxable <= 0:
            break
        tax += taxable * rate
        prev_limit = limit
    return tax


def process_payroll(period_id: str) -> dict:
    period = payroll_periods_col.find_one({"id": period_id})
    if not period:
        raise ValueError(f"Period {period_id} not found")

    entries = list(time_entries_col.find({"period_id": period_id, "status": "approved"}, {"_id": 0}))
    if not entries:
        raise ValueError("No approved time entries for this period")

    deduction_configs = list(deductions_col.find({}, {"_id": 0}))

    # Group by employee
    by_employee = {}
    for e in entries:
        eid = e["employee_id"]
        if eid not in by_employee:
            by_employee[eid] = {
                "employee_id": eid,
                "employee_name": e.get("employee_name", ""),
                "entries": [],
                "total_hours": 0,
                "regular_hours": 0,
                "overtime_hours": 0,
                "gross_pay": 0,
                "tips": 0,
            }
        by_employee[eid]["entries"].append(e)
        by_employee[eid]["total_hours"] += e.get("hours", 0)
        by_employee[eid]["regular_hours"] += e.get("regular_hours", 0)
        by_employee[eid]["overtime_hours"] += e.get("overtime_hours", 0)
        by_employee[eid]["gross_pay"] += e.get("gross_pay", 0)
        by_employee[eid]["tips"] += e.get("tips", 0)

    # Process each employee
    run_id = _uid()
    pay_stubs_list = []
    total_gross = 0
    total_net = 0
    total_deductions = 0

    for eid, emp in by_employee.items():
        gross = emp["gross_pay"] + emp["tips"]
        annual_est = gross * 26  # biweekly estimate

        # Calculate deductions
        deductions = []
        total_ded = 0
        for dc in deduction_configs:
            amount = 0
            if dc["code"] == "FED_TAX":
                annual_tax = _calc_federal_tax(annual_est)
                amount = round(annual_tax / 26, 2)
            elif dc.get("rate"):
                cap = dc.get("cap")
                taxable = min(gross, cap / 26) if cap else gross
                amount = round(taxable * dc["rate"], 2)
            elif dc.get("amount_per_period"):
                amount = dc["amount_per_period"]

            deductions.append({
                "code": dc["code"],
                "name": dc["name"],
                "type": dc["type"],
                "amount": amount,
            })
            total_ded += amount

        net_pay = round(gross - total_ded, 2)

        stub = {
            "id": _uid(),
            "run_id": run_id,
            "period_id": period_id,
            "employee_id": eid,
            "employee_name": emp["employee_name"],
            "period": {"start": period.get("start_date"), "end": period.get("end_date")},
            "earnings": {
                "regular_hours": round(emp["regular_hours"], 1),
                "overtime_hours": round(emp["overtime_hours"], 1),
                "regular_pay": round(emp["gross_pay"] - (emp["overtime_hours"] * emp["entries"][0].get("ot_rate", 0) if emp["entries"] else 0), 2),
                "overtime_pay": round(emp["gross_pay"] - (emp["regular_hours"] * emp["entries"][0].get("rate", 0) if emp["entries"] else 0), 2),
                "tips": emp["tips"],
                "gross_pay": round(gross, 2),
            },
            "deductions": deductions,
            "total_deductions": round(total_ded, 2),
            "net_pay": net_pay,
            "created_at": _now(),
        }
        pay_stubs_col.insert_one(stub)
        del stub["_id"]
        pay_stubs_list.append(stub)

        total_gross += gross
        total_net += net_pay
        total_deductions += total_ded

    # Save payroll run
    run = {
        "id": run_id,
        "period_id": period_id,
        "status": "calculated",
        "employee_count": len(by_employee),
        "total_gross": round(total_gross, 2),
        "total_deductions": round(total_deductions, 2),
        "total_net": round(total_net, 2),
        "total_hours": round(sum(e["total_hours"] for e in by_employee.values()), 1),
        "pay_stubs": [s["id"] for s in pay_stubs_list],
        "calculated_at": _now(),
    }
    payroll_runs_col.insert_one(run)
    del run["_id"]

    # Update period status
    payroll_periods_col.update_one({"id": period_id}, {"$set": {"status": "calculated"}})

    return run


def approve_payroll(run_id: str, approved_by: str = "admin") -> dict:
    run = payroll_runs_col.find_one({"id": run_id})
    if not run:
        raise ValueError("Payroll run not found")

    payroll_runs_col.update_one({"id": run_id}, {"$set": {
        "status": "approved", "approved_by": approved_by, "approved_at": _now(),
    }})

    return {"run_id": run_id, "status": "approved", "approved_by": approved_by}


def execute_payroll(run_id: str) -> dict:
    run = payroll_runs_col.find_one({"id": run_id}, {"_id": 0})
    if not run:
        raise ValueError("Payroll run not found")
    if run["status"] not in ("approved", "calculated"):
        raise ValueError(f"Cannot execute payroll in {run['status']} status")

    # Post GL entries for payroll
    gl_entries_col.insert_one({
        "id": _uid(), "event_id": "", "account_code": "5100",
        "account_name": "Payroll Expense",
        "debit": run["total_gross"], "credit": 0,
        "memo": f"Payroll run {run_id}", "posted_at": _now(),
    })
    gl_entries_col.insert_one({
        "id": _uid(), "event_id": "", "account_code": "2200",
        "account_name": "Payroll Tax Payable",
        "debit": 0, "credit": run["total_deductions"],
        "memo": f"Payroll deductions {run_id}", "posted_at": _now(),
    })
    gl_entries_col.insert_one({
        "id": _uid(), "event_id": "", "account_code": "1000",
        "account_name": "Cash",
        "debit": 0, "credit": run["total_net"],
        "memo": f"Payroll disbursement {run_id}", "posted_at": _now(),
    })

    payroll_runs_col.update_one({"id": run_id}, {"$set": {
        "status": "executed", "executed_at": _now(),
    }})

    period_id = run.get("period_id")
    if period_id:
        payroll_periods_col.update_one({"id": period_id}, {"$set": {"status": "closed"}})

    audit_log_col.insert_one({
        "id": _uid(), "engine": "payroll",
        "action": "payroll_executed",
        "data": {"run_id": run_id, "gross": run["total_gross"], "net": run["total_net"]},
        "timestamp": _now(),
    })

    return {"run_id": run_id, "status": "executed", "total_disbursed": run["total_net"]}


def get_pay_stubs(run_id: str = None, employee_id: str = None) -> list:
    q = {}
    if run_id:
        q["run_id"] = run_id
    if employee_id:
        q["employee_id"] = employee_id
    return list(pay_stubs_col.find(q, {"_id": 0}).sort("created_at", -1).limit(50))


def get_payroll_stats() -> dict:
    total_runs = payroll_runs_col.count_documents({})
    executed = payroll_runs_col.count_documents({"status": "executed"})
    pipeline = [{"$match": {"status": "executed"}}, {"$group": {"_id": None, "total": {"$sum": "$total_net"}}}]
    total_paid = list(payroll_runs_col.aggregate(pipeline))
    total_paid_val = total_paid[0]["total"] if total_paid else 0

    return {
        "total_runs": total_runs,
        "executed_runs": executed,
        "total_paid": round(total_paid_val, 2),
        "engine": "payroll",
        "status": "healthy",
        "timestamp": _now(),
    }
