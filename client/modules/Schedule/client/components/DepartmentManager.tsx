import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Settings } from "lucide-react";
export interface Department {
  id: string;
  name: string;
  description: string;
  positions: string[];
  minStaffing: number;
  maxStaffing: number;
  color: string;
}
export const DEFAULT_DEPARTMENTS: Department[] = [
  {
    id: "kitchen",
    name: "Kitchen",
    description: "Food preparation and cooking",
    positions: [
      "Executive Chef",
      "Sous Chef",
      "Line Cook",
      "Prep Cook",
      "Dishwasher",
    ],
    minStaffing: 3,
    maxStaffing: 12,
    color: "bg-red-100",
  },
  {
    id: "foh",
    name: "Front of House",
    description: "Guest-facing services",
    positions: ["Host/Hostess", "Server", "Bartender", "Busser", "Runner"],
    minStaffing: 4,
    maxStaffing: 15,
    color: "bg-blue-100",
  },
  {
    id: "bar",
    name: "Bar",
    description: "Beverage service and cocktails",
    positions: ["Head Bartender", "Bartender", "Bar Back"],
    minStaffing: 1,
    maxStaffing: 5,
    color: "bg-purple-100",
  },
  {
    id: "pastry",
    name: "Pastry",
    description: "Baking and desserts",
    positions: ["Pastry Chef", "Baker", "Pastry Assistant"],
    minStaffing: 1,
    maxStaffing: 4,
    color: "bg-amber-100",
  },
  {
    id: "management",
    name: "Management",
    description: "Administrative and supervisory",
    positions: ["General Manager", "Assistant Manager", "Shift Manager"],
    minStaffing: 1,
    maxStaffing: 3,
    color: "bg-green-100",
  },
];
interface DepartmentManagerProps {
  departments: Department[];
  onDepartmentsChange: (departments: Department[]) => void;
}
export function DepartmentManager({
  departments,
  onDepartmentsChange,
}: DepartmentManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newDept, setNewDept] = useState({
    name: "",
    description: "",
    positions: "",
    minStaffing: 1,
    maxStaffing: 5,
  });
  const addDepartment = () => {
    if (!newDept.name.trim()) return;
    const dept: Department = {
      id: newDept.name.toLowerCase().replace(/\s+/g, "-"),
      name: newDept.name,
      description: newDept.description,
      positions: newDept.positions
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p),
      minStaffing: newDept.minStaffing,
      maxStaffing: newDept.maxStaffing,
      color: `bg-${["red", "blue", "green", "purple", "amber"][departments.length % 5]}-100`,
    };
    onDepartmentsChange([...departments, dept]);
    setNewDept({
      name: "",
      description: "",
      positions: "",
      minStaffing: 1,
      maxStaffing: 5,
    });
    setIsOpen(false);
  };
  const removeDepartment = (id: string) => {
    onDepartmentsChange(departments.filter((d) => d.id !== id));
  };
  return (
    <div className="space-y-4">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <h3 className="text-lg font-semibold">Departments</h3>{" "}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          {" "}
          <DialogTrigger asChild>
            {" "}
            <Button size="sm" variant="outline" className="gap-2">
              {" "}
              <Plus size={16} /> Add Department{" "}
            </Button>{" "}
          </DialogTrigger>{" "}
          <DialogContent>
            {" "}
            <DialogHeader>
              {" "}
              <DialogTitle>Add Department</DialogTitle>{" "}
            </DialogHeader>{" "}
            <div className="space-y-4">
              {" "}
              <div>
                {" "}
                <label className="text-sm font-medium">
                  Department Name
                </label>{" "}
                <Input
                  placeholder="e.g., Kitchen, Front of House"
                  value={newDept.name}
                  onChange={(e) =>
                    setNewDept({ ...newDept, name: e.target.value })
                  }
                />{" "}
              </div>{" "}
              <div>
                {" "}
                <label className="text-sm font-medium">Description</label>{" "}
                <Input
                  placeholder="Department description"
                  value={newDept.description}
                  onChange={(e) =>
                    setNewDept({ ...newDept, description: e.target.value })
                  }
                />{" "}
              </div>{" "}
              <div>
                {" "}
                <label className="text-sm font-medium">
                  Positions (comma-separated)
                </label>{" "}
                <Input
                  placeholder="e.g., Chef, Cook, Assistant"
                  value={newDept.positions}
                  onChange={(e) =>
                    setNewDept({ ...newDept, positions: e.target.value })
                  }
                />{" "}
              </div>{" "}
              <div className="grid grid-cols-2 gap-4">
                {" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium">
                    Min Staffing
                  </label>{" "}
                  <Input
                    type="number"
                    min="1"
                    value={newDept.minStaffing}
                    onChange={(e) =>
                      setNewDept({
                        ...newDept,
                        minStaffing: parseInt(e.target.value),
                      })
                    }
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium">
                    Max Staffing
                  </label>{" "}
                  <Input
                    type="number"
                    min="1"
                    value={newDept.maxStaffing}
                    onChange={(e) =>
                      setNewDept({
                        ...newDept,
                        maxStaffing: parseInt(e.target.value),
                      })
                    }
                  />{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
            <DialogFooter>
              {" "}
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                {" "}
                Cancel{" "}
              </Button>{" "}
              <Button onClick={addDepartment}>Add Department</Button>{" "}
            </DialogFooter>{" "}
          </DialogContent>{" "}
        </Dialog>{" "}
      </div>{" "}
      <div className="grid grid-cols-1 gap-3">
        {" "}
        {departments.map((dept) => (
          <Card key={dept.id} className={`${dept.color} border`}>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <div className="flex items-start justify-between">
                {" "}
                <div className="flex-1">
                  {" "}
                  <CardTitle className="text-base">{dept.name}</CardTitle>{" "}
                  <CardDescription className="text-xs mt-1">
                    {dept.description}
                  </CardDescription>{" "}
                </div>{" "}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDepartment(dept.id)}
                  className="h-8 w-8 p-0 hover:bg-red-200"
                >
                  {" "}
                  <Trash2 size={14} />{" "}
                </Button>{" "}
              </div>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-3">
              {" "}
              <div>
                {" "}
                <p className="text-xs font-medium mb-2">Positions:</p>{" "}
                <div className="flex flex-wrap gap-2">
                  {" "}
                  {dept.positions.map((pos, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {" "}
                      {pos}{" "}
                    </Badge>
                  ))}{" "}
                </div>{" "}
              </div>{" "}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {" "}
                <div className="bg-background rounded p-2">
                  {" "}
                  <p className="text-foreground/60">Min Staff</p>{" "}
                  <p className="font-semibold">{dept.minStaffing}</p>{" "}
                </div>{" "}
                <div className="bg-background rounded p-2">
                  {" "}
                  <p className="text-foreground/60">Max Staff</p>{" "}
                  <p className="font-semibold">{dept.maxStaffing}</p>{" "}
                </div>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>
        ))}{" "}
      </div>{" "}
    </div>
  );
}
