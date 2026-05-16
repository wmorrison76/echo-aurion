import React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmployeeRow } from "@/lib/schedule";
import { generatePrintHTML, PrintOptions } from "@/lib/printSchedule";
import { Printer } from "lucide-react";
interface Props {
  weekStartISO: string;
  employees: EmployeeRow[];
}
export default function PrintScheduleDialog({
  weekStartISO,
  employees,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [layout, setLayout] = React.useState<"horizontal" | "vertical">("horizontal");
  const [companyLogo, setCompanyLogo] = React.useState("");
  const [outletLogo, setOutletLogo] = React.useState("");
  const handleLogoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setter(result);
    };
    reader.readAsDataURL(file);
  };
  const handlePrint = () => {
    const options: PrintOptions = {
      layout,
      companyLogo: companyLogo || undefined,
      outletLogo: outletLogo || undefined,
      includeTotals: false,
    };
    const html = generatePrintHTML(weekStartISO, employees, options);
    const printWindow = window.open("", "", "width=900,height=700");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Printer className="mr-1 h-4 w-4" /> Print
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          {" "}
          <DialogTitle>Print Schedule</DialogTitle>{" "}
        </DialogHeader>{" "}
        <div className="grid gap-4 py-4">
          {" "}
          <div className="grid gap-2">
            {" "}
            <Label className="text-sm font-medium">Layout</Label>{" "}
            <div className="flex gap-3">
              {" "}
              <label className="flex items-center gap-2 cursor-pointer">
                {" "}
                <input
                  type="radio"
                  name="layout"
                  value="horizontal"
                  checked={layout === "horizontal"}
                  onChange={(e) => setLayout(e.target.value as "horizontal")}
                />{" "}
                <span className="text-sm">Horizontal (Table)</span>{" "}
              </label>{" "}
              <label className="flex items-center gap-2 cursor-pointer">
                {" "}
                <input
                  type="radio"
                  name="layout"
                  value="vertical"
                  checked={layout === "vertical"}
                  onChange={(e) => setLayout(e.target.value as "vertical")}
                />{" "}
                <span className="text-sm">Vertical (Daily)</span>{" "}
              </label>{" "}
            </div>{" "}
          </div>{" "}
          <div className="grid gap-2">
            {" "}
            <Label htmlFor="company-logo" className="text-sm font-medium">
              {" "}
              Company Logo{" "}
            </Label>{" "}
            <Input
              id="company-logo"
              type="file"
              accept="image/*"
              onChange={(e) => handleLogoUpload(e, setCompanyLogo)}
              className="text-xs"
            />{" "}
            {companyLogo && (
              <img
                src={companyLogo}
                alt="Company Logo Preview"
                className="h-12 w-auto border rounded-md p-1"
              />
            )}{" "}
          </div>{" "}
          <div className="grid gap-2">
            {" "}
            <Label htmlFor="outlet-logo" className="text-sm font-medium">
              {" "}
              Outlet Logo{" "}
            </Label>{" "}
            <Input
              id="outlet-logo"
              type="file"
              accept="image/*"
              onChange={(e) => handleLogoUpload(e, setOutletLogo)}
              className="text-xs"
            />{" "}
            {outletLogo && (
              <img
                src={outletLogo}
                alt="Outlet Logo Preview"
                className="h-12 w-auto border rounded-md p-1"
              />
            )}{" "}
          </div>{" "}
          <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded-md">
            {" "}
            <p className="font-medium mb-1">Print Settings:</p>{" "}
            <ul className="space-y-1 ml-2">
              {" "}
              <li>• Margins: Narrow</li> <li>• Color: Yes</li>{" "}
              <li>• Mode: Light</li>{" "}
              <li>• Content: Scheduled hours only</li>{" "}
            </ul>{" "}
          </div>{" "}
        </div>{" "}
        <DialogFooter>
          {" "}
          <Button variant="secondary" onClick={() => setOpen(false)}>
            {" "}
            Cancel{" "}
          </Button>{" "}
          <Button onClick={handlePrint}>Print Schedule</Button>{" "}
        </DialogFooter>{" "}
      </DialogContent>{" "}
    </Dialog>
  );
}
