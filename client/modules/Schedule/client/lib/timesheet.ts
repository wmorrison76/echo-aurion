const KEY = "shiftflow:timesheet:pool";
function load(): string[] {
  try {
    const s = localStorage.getItem(KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}
function save(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.from(new Set(ids))));
  } catch {}
}
export function addToTimesheet(empId: string) {
  const ids = load();
  ids.push(empId);
  save(ids);
}
export function getTimesheetPool(): string[] {
  return load();
}
export function clearTimesheetPool() {
  save([]);
}
