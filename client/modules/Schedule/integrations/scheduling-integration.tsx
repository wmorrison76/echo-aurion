import { useCallback, useMemo } from "react";

import { useFinancialsStore } from "@/stores/shared/financialsStore";
import {
  type Schedule,
  type Shift,
  useSchedulingStore,
} from "@/stores/shared/schedulingStore";

type ScheduleStateInput = {
  weekStartISO: string;
  outletId: string;
  employees: Array<{
    id: string;
    name: string;
    role: string;
    shifts: Array<{
      day: string;
      start: string;
      end: string;
    }>;
  }>;
};

function buildWeekEndISO(weekStartISO: string) {
  const end = new Date(weekStartISO);
  end.setDate(end.getDate() + 6);
  return end.toISOString().slice(0, 10);
}

function calculateHours(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  return Number.isFinite(hours) && hours > 0 ? hours : 0;
}

export function useScheduleIntegration() {
  const createScheduleFromState = useCallback((state: ScheduleStateInput) => {
    const schedulingStore = useSchedulingStore.getState();
    const weekEndISO = buildWeekEndISO(state.weekStartISO);
    const scheduleId = `schedule-${state.weekStartISO}-${state.outletId || "main"}`;
    const createdAt = new Date().toISOString();

    const shifts: Shift[] = [];
    let totalHours = 0;
    let totalCost = 0;

    state.employees.forEach((employee) => {
      employee.shifts.forEach((shift) => {
        const startTime = `${shift.day}T${shift.start}`;
        const endTime = `${shift.day}T${shift.end}`;
        const hours = calculateHours(startTime, endTime);
        const cost = hours * 20;

        totalHours += hours;
        totalCost += cost;

        shifts.push({
          id: `${employee.id}-${shift.day}-${shift.start}`,
          employeeId: employee.id,
          employeeName: employee.name,
          role: employee.role,
          startTime,
          endTime,
          date: shift.day,
          outletId: state.outletId,
          status: "scheduled",
          cost,
        });
      });
    });

    const schedule: Schedule = {
      id: scheduleId,
      outletId: state.outletId,
      weekStart: state.weekStartISO,
      weekEnd: weekEndISO,
      shifts,
      totalHours,
      totalCost,
      status: "draft",
      createdBy: "system",
      createdAt,
      updatedAt: createdAt,
    };

    if (schedulingStore.getScheduleById(scheduleId)) {
      schedulingStore.updateSchedule(scheduleId, schedule);
    } else {
      schedulingStore.addSchedule(schedule);
    }

    schedulingStore.setShifts(shifts);

    return schedule;
  }, []);

  const syncScheduleToFinancials = useCallback(async (scheduleId: string) => {
    const schedulingStore = useSchedulingStore.getState();
    const financialsStore = useFinancialsStore.getState();
    const schedule = schedulingStore.getScheduleById(scheduleId);
    if (!schedule) return;

    const transaction = {
      id: `labor-${scheduleId}-${Date.now()}`,
      type: "expense" as const,
      category: "labor",
      amount: schedule.totalCost,
      currency: "USD",
      date: schedule.weekStart,
      outletId: schedule.outletId,
      description: `Labor costs for schedule ${schedule.weekStart} - ${schedule.weekEnd}`,
      reference: scheduleId,
      glAccount: "labor_cost",
      posted: false,
      createdAt: new Date().toISOString(),
    };

    await financialsStore.postTransaction(transaction.id);
    financialsStore.addTransaction(transaction);
  }, []);

  return useMemo(
    () => ({
      createScheduleFromState,
      syncScheduleToFinancials,
    }),
    [createScheduleFromState, syncScheduleToFinancials],
  );
}
