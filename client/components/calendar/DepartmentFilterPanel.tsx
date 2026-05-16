import React, { useEffect } from "react";
import { cn } from "@/lib/glass";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Department {
  id: string;
  name: string;
  color?: string;
}

interface DepartmentFilterPanelProps {
  departments: Department[];
  selectedDepartments: string[];
  onDepartmentsChange: (deptIds: string[]) => void;
  isExecutiveChef?: boolean;
  className?: string;
}

export function DepartmentFilterPanel({
  departments,
  selectedDepartments,
  onDepartmentsChange,
  isExecutiveChef = true,
  className,
}: DepartmentFilterPanelProps) {
  // Persist filter preference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        "calendar_dept_filter",
        JSON.stringify(selectedDepartments),
      );
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [selectedDepartments]);

  const handleToggleDepartment = (deptId: string) => {
    const newSelected = selectedDepartments.includes(deptId)
      ? selectedDepartments.filter((id) => id !== deptId)
      : [...selectedDepartments, deptId];

    onDepartmentsChange(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedDepartments.length === departments.length) {
      onDepartmentsChange([]);
    } else {
      onDepartmentsChange(departments.map((d) => d.id));
    }
  };

  const allSelected = selectedDepartments.length === departments.length;
  const someSelected =
    selectedDepartments.length > 0 &&
    selectedDepartments.length < departments.length;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-glass-muted">
          Filter by Department
        </label>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSelectAll}
          className="text-xs h-7"
        >
          {allSelected ? "Clear all" : "Select all"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {departments.map((dept) => (
          <div key={dept.id} className="flex items-center gap-2">
            <Checkbox
              id={`dept-${dept.id}`}
              checked={selectedDepartments.includes(dept.id)}
              onCheckedChange={() => handleToggleDepartment(dept.id)}
              disabled={!isExecutiveChef && departments.length === 1}
              className="h-4 w-4"
            />
            <Label
              htmlFor={`dept-${dept.id}`}
              className="text-sm font-medium cursor-pointer flex items-center gap-2"
            >
              {dept.color && (
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: dept.color }}
                />
              )}
              <span className="text-glass-foreground">{dept.name}</span>
            </Label>
          </div>
        ))}
      </div>

      {!isExecutiveChef && departments.length > 1 && (
        <p className="text-xs text-glass-muted/60 mt-1">
          ℹ️ Your department assignments determine visible events
        </p>
      )}
    </div>
  );
}
