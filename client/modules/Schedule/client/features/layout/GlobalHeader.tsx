import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Brain,
  CalendarDays,
  Layers3,
  ChevronDown,
  BarChart2,
  DollarSign,
  Star,
  Users,
  ShieldCheck,
  Clock,
  BookOpen,
  Printer,
  Download,
  ClipboardList,
} from "lucide-react";
import { exportCSV, EmployeeRow } from "@/lib/schedule";
interface Props {
  onOpenSettings?: () => void;
  weekStartISO?: string;
  employees?: EmployeeRow[];
  onEmployeesChange?: (e: EmployeeRow[]) => void;
}
export default function GlobalHeader({
  onOpenSettings,
  weekStartISO = new Date().toISOString().slice(0, 10),
  employees = [],
  onEmployeesChange = () => {},
}: Props) {
  const [outletOpen, setOutletOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [managerLoginOpen, setManagerLoginOpen] = useState(false);
  const [managerPassword, setManagerPassword] = useState("");
  const [managerError, setManagerError] = useState("");
  const currentOutlet = localStorage.getItem("shiftflow:outlet") || "Main";
  const handleOutletChange = (outlet: string) => {
    localStorage.setItem("shiftflow:outlet", outlet);
    setOutletOpen(false);
    window.dispatchEvent(
      new CustomEvent("shiftflow:outlet-changed", { detail: { outlet } }),
    );
  };
  const handleSchedulerClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const isManagerLoggedIn = localStorage.getItem(
      "shiftflow:managerAuthenticated",
    );
    if (!isManagerLoggedIn) {
      e.preventDefault();
      setManagerLoginOpen(true);
    }
  };
  const handleManagerLogin = () => {
    const storedPassword =
      localStorage.getItem("shiftflow:managerPassword") || "manager";
    if (managerPassword === storedPassword) {
      localStorage.setItem("shiftflow:managerAuthenticated", "true");
      setManagerLoginOpen(false);
      setManagerPassword("");
      setManagerError("");
      window.location.href = "/";
    } else {
      setManagerError("Incorrect password");
    }
  };
  const download = () => {
    const csv = exportCSV({ weekStartISO, employees });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schedule_${weekStartISO}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const exportICS = (weekISO: string, employees: EmployeeRow[]) => {
    const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const start = new Date(weekISO);
    const dayDate = (i: number) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    };
    const pad = (n: number) => String(n).padStart(2, "0");
    const dt = (d: Date, t: string) => {
      const m = t ? t : "00:00";
      const [hh, mm] = (m.includes(":") ? m : `${m}:00`).split(":");
      const dc = new Date(d);
      dc.setHours(Number(hh), Number(mm), 0, 0);
      const y = dc.getFullYear();
      const mo = pad(dc.getMonth() + 1);
      const da = pad(dc.getDate());
      const H = pad(dc.getHours());
      const M = pad(dc.getMinutes());
      return `${y}${mo}${da}T${H}${M}00`;
    };
    let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ShiftFlow//EN\n";
    employees.forEach((e) => {
      for (let i = 0; i < 7; i++) {
        const key = DAYS[i];
        const c = e.shifts[key];
        if (!(c.in && c.out)) continue;
        const d = dayDate(i);
        const uid = `${e.id}-${weekISO}-${i}`;
        ics += `BEGIN:VEVENT\nUID:${uid}\nSUMMARY:${e.name} (${c.position || e.role || "Shift"})\nDTSTART:${dt(d, c.in)}\nDTEND:${dt(d, c.out)}\nEND:VEVENT\n`;
      }
    });
    ics += "END:VCALENDAR\n";
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schedule_${weekISO}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const autoSchedule = (
    _weekISO: string,
    employees: EmployeeRow[],
    onEmployeesChange: (e: EmployeeRow[]) => void,
  ) => {
    const fill = (e: EmployeeRow) => {
      const next = { ...e, shifts: { ...e.shifts } };
      const set = (k: string) => {
        next.shifts[k] = {
          ...(next.shifts[k] || ({} as any)),
          in: "09:00",
          out: "17:00",
          value: "09:00-17:00",
          range: null,
          breakMin: 30,
          position: next.shifts[k]?.position || e.role || "",
        } as any;
      };
      ["Mon", "Tue", "Wed", "Thu", "Fri"].forEach((k) => set(k));
      return next;
    };
    onEmployeesChange(employees.map(fill));
  };
  const handleNavClick = (href: string) => {
    setNavOpen(false);
    if (href.startsWith("#")) {
      const key = href.slice(1);
      window.dispatchEvent(new CustomEvent(`shiftflow:open-${key}` as any));
    } else {
      window.location.href = href;
    }
  };
  return (
    <header className="border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20">
      {" "}
      <div className="container px-2 h-11 flex items-center justify-between">
        {" "}
        <div className="flex items-center gap-3">
          {" "}
          <div className="h-8 w-8 rounded-md bg-primary/10 grid place-items-center text-primary font-bold">
            {" "}
            LU{" "}
          </div>{" "}
          <div className="text-sm font-semibold tracking-wide">LUCCCA</div>{" "}
          <nav className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
            {" "}
            <a
              className="hover:text-foreground flex items-center gap-1 px-2 py-1.5 rounded"
              href="/"
              onClick={handleSchedulerClick}
            >
              {" "}
              <Layers3 className="w-4 h-4" /> Scheduler{" "}
            </a>{" "}
            <DropdownMenu open={navOpen} onOpenChange={setNavOpen}>
              {" "}
              <DropdownMenuTrigger asChild>
                {" "}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-1.5 px-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  {" "}
                  <span className="flex items-center gap-1">
                    {" "}
                    Features <ChevronDown className="w-3 h-3" />{" "}
                  </span>{" "}
                </Button>{" "}
              </DropdownMenuTrigger>{" "}
              <DropdownMenuContent align="start" className="w-56">
                {" "}
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {" "}
                  Operations{" "}
                </DropdownMenuLabel>{" "}
                <DropdownMenuItem
                  onClick={() => handleNavClick("#lms")}
                  className="cursor-pointer"
                >
                  {" "}
                  <BookOpen className="w-4 h-4 mr-2" /> LMS Standards{" "}
                </DropdownMenuItem>{" "}
                <DropdownMenuItem
                  onClick={() => handleNavClick("#forecast")}
                  className="cursor-pointer"
                >
                  {" "}
                  <CalendarDays className="w-4 h-4 mr-2" /> Forecast{" "}
                </DropdownMenuItem>{" "}
                <DropdownMenuItem
                  onClick={() => handleNavClick("#reports")}
                  className="cursor-pointer"
                >
                  {" "}
                  <ClipboardList className="w-4 h-4 mr-2" /> Reports Hub{" "}
                </DropdownMenuItem>{" "}
                <DropdownMenuItem
                  onClick={() => handleNavClick("#analytics")}
                  className="cursor-pointer"
                >
                  {" "}
                  <BarChart2 className="w-4 h-4 mr-2" /> Analytics &
                  Reports{" "}
                </DropdownMenuItem>{" "}
                <DropdownMenuSeparator />{" "}
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {" "}
                  Human Resources{" "}
                </DropdownMenuLabel>{" "}
                <DropdownMenuItem
                  onClick={() => handleNavClick("#ratings")}
                  className="cursor-pointer"
                >
                  {" "}
                  <Star className="w-4 h-4 mr-2" /> Staff Ratings{" "}
                </DropdownMenuItem>{" "}
                <DropdownMenuItem
                  onClick={() => handleNavClick("#timeoff")}
                  className="cursor-pointer"
                >
                  {" "}
                  <Clock className="w-4 h-4 mr-2" /> Time Off{" "}
                </DropdownMenuItem>{" "}
                <DropdownMenuItem
                  onClick={() => handleNavClick("#attendance")}
                  className="cursor-pointer"
                >
                  {" "}
                  <Users className="w-4 h-4 mr-2" /> Attendance{" "}
                </DropdownMenuItem>{" "}
                <DropdownMenuSeparator />{" "}
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {" "}
                  Finance & Compliance{" "}
                </DropdownMenuLabel>{" "}
                <DropdownMenuItem
                  onClick={() => handleNavClick("#finance")}
                  className="cursor-pointer"
                >
                  {" "}
                  <DollarSign className="w-4 h-4 mr-2" /> Finance + GL
                  Costing{" "}
                </DropdownMenuItem>{" "}
                <DropdownMenuItem
                  onClick={() => handleNavClick("#legal")}
                  className="cursor-pointer"
                >
                  {" "}
                  <ShieldCheck className="w-4 h-4 mr-2" /> Legal &
                  Compliance{" "}
                </DropdownMenuItem>{" "}
              </DropdownMenuContent>{" "}
            </DropdownMenu>{" "}
          </nav>{" "}
        </div>{" "}
        <div className="flex items-center gap-2">
          {" "}
          <DropdownMenu open={outletOpen} onOpenChange={setOutletOpen}>
            {" "}
            <DropdownMenuTrigger asChild>
              {" "}
              <Button variant="outline" size="sm" className="h-8 text-xs">
                {" "}
                {currentOutlet} <ChevronDown className="w-3 h-3 ml-1" />{" "}
              </Button>{" "}
            </DropdownMenuTrigger>{" "}
            <DropdownMenuContent align="end">
              {" "}
              <DropdownMenuItem onClick={() => handleOutletChange("Main")}>
                {" "}
                Main{" "}
              </DropdownMenuItem>{" "}
              <DropdownMenuItem onClick={() => handleOutletChange("Outlet A")}>
                {" "}
                Outlet A{" "}
              </DropdownMenuItem>{" "}
              <DropdownMenuItem onClick={() => handleOutletChange("Outlet B")}>
                {" "}
                Outlet B{" "}
              </DropdownMenuItem>{" "}
            </DropdownMenuContent>{" "}
          </DropdownMenu>{" "}
          <DropdownMenu>
            {" "}
            <DropdownMenuTrigger asChild>
              {" "}
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                {" "}
                Apps <ChevronDown className="w-3 h-3 ml-1" />{" "}
              </Button>{" "}
            </DropdownMenuTrigger>{" "}
            <DropdownMenuContent align="end">
              {" "}
              <DropdownMenuItem asChild>
                {" "}
                <a href="/m/employee" className="cursor-pointer">
                  {" "}
                  Employee App{" "}
                </a>{" "}
              </DropdownMenuItem>{" "}
              <DropdownMenuItem asChild>
                {" "}
                <a href="/m/manager" className="cursor-pointer">
                  {" "}
                  Manager App{" "}
                </a>{" "}
              </DropdownMenuItem>{" "}
            </DropdownMenuContent>{" "}
          </DropdownMenu>{" "}
          <div className="flex items-center gap-1">
            {" "}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                autoSchedule(weekStartISO, employees, onEmployeesChange)
              }
              title="Auto-Build"
            >
              {" "}
              <ClipboardList className="h-4 w-4" />{" "}
            </Button>{" "}
          </div>{" "}
          <div className="flex items-center gap-1 border-l pl-2">
            {" "}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => window.print()}
              title="Print"
            >
              {" "}
              <Printer className="h-4 w-4" />{" "}
            </Button>{" "}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={download}
              title="Export CSV"
            >
              {" "}
              <Download className="h-4 w-4" />{" "}
            </Button>{" "}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => exportICS(weekStartISO, employees)}
              title="Export ICS"
            >
              {" "}
              <CalendarDays className="h-4 w-4" />{" "}
            </Button>{" "}
          </div>{" "}
          <Button
            size="sm"
            className="h-8"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("shiftflow:open-assistant"))
            }
          >
            {" "}
            <Brain className="mr-1 h-4 w-4" /> AI Optimize{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
      <Dialog open={managerLoginOpen} onOpenChange={setManagerLoginOpen}>
        {" "}
        <DialogContent>
          {" "}
          <DialogHeader>
            {" "}
            <DialogTitle>Manager Login Required</DialogTitle>{" "}
          </DialogHeader>{" "}
          <div className="space-y-4">
            {" "}
            <p className="text-sm text-muted-foreground">
              {" "}
              Please enter the manager password to access the schedule.{" "}
            </p>{" "}
            <div>
              {" "}
              <label className="text-sm mb-2 block">Password</label>{" "}
              <Input
                type="password"
                placeholder="Enter manager password"
                value={managerPassword}
                onChange={(e) => {
                  setManagerPassword(e.target.value);
                  setManagerError("");
                }}
                onKeyPress={(e) => e.key === "Enter" && handleManagerLogin()}
                autoFocus
              />{" "}
              {managerError && (
                <p className="text-xs text-red-500 mt-1">{managerError}</p>
              )}{" "}
            </div>{" "}
            <div className="flex gap-2 justify-end">
              {" "}
              <Button
                variant="outline"
                onClick={() => {
                  setManagerLoginOpen(false);
                  setManagerPassword("");
                  setManagerError("");
                }}
              >
                {" "}
                Cancel{" "}
              </Button>{" "}
              <Button onClick={handleManagerLogin}>Login</Button>{" "}
            </div>{" "}
          </div>{" "}
        </DialogContent>{" "}
      </Dialog>{" "}
    </header>
  );
}
