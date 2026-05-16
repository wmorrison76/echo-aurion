import React, { useState } from "react";
import { useParLevels } from "../../hooks/useInventorySync";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { AlertCircle, Settings, Plus } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
interface ParLevelManagerProps {
  outletId: string;
}
export function ParLevelManager({ outletId }: ParLevelManagerProps) {
  const { parLevels, loading, error, createParLevel, updateParLevel, refetch } =
    useParLevels(outletId);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<any>(null);
  const [formData, setFormData] = useState({
    standardProductId: "",
    parQuantity: "",
    minQuantity: "",
    maxQuantity: "",
    reorderPoint: "",
    reorderQuantity: "",
    leadTimeDays: "2",
    autoReorder: false,
  });
  const handleOpenDialog = (level?: any) => {
    if (level) {
      setSelectedLevel(level);
      setFormData({
        standardProductId: level.standard_product_id,
        parQuantity: level.par_quantity.toString(),
        minQuantity: level.min_quantity.toString(),
        maxQuantity: level.max_quantity.toString(),
        reorderPoint: level.reorder_point.toString(),
        reorderQuantity: level.reorder_quantity.toString(),
        leadTimeDays: level.lead_time_days.toString(),
        autoReorder: level.auto_reorder,
      });
    } else {
      setSelectedLevel(null);
      setFormData({
        standardProductId: "",
        parQuantity: "",
        minQuantity: "",
        maxQuantity: "",
        reorderPoint: "",
        reorderQuantity: "",
        leadTimeDays: "2",
        autoReorder: false,
      });
    }
    setShowDialog(true);
  };
  const handleSave = async () => {
    if (selectedLevel) {
      await updateParLevel(selectedLevel.id, {
        par_quantity: parseFloat(formData.parQuantity),
        min_quantity: parseFloat(formData.minQuantity),
        max_quantity: parseFloat(formData.maxQuantity),
        reorder_point: parseFloat(formData.reorderPoint),
        reorder_quantity: parseFloat(formData.reorderQuantity),
        lead_time_days: parseInt(formData.leadTimeDays),
        auto_reorder: formData.autoReorder,
      });
    } else {
      await createParLevel({
        standardProductId: formData.standardProductId,
        parQuantity: parseFloat(formData.parQuantity),
        minQuantity: parseFloat(formData.minQuantity),
        maxQuantity: parseFloat(formData.maxQuantity),
        reorderPoint: parseFloat(formData.reorderPoint),
        reorderQuantity: parseFloat(formData.reorderQuantity),
        leadTimeDays: parseInt(formData.leadTimeDays),
        autoReorder: formData.autoReorder,
      });
    }
    setShowDialog(false);
  };
  if (loading) {
    return (
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Par Levels</CardTitle>{" "}
          <CardDescription>Loading par level data...</CardDescription>{" "}
        </CardHeader>{" "}
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <div className="flex items-center justify-between">
            {" "}
            <div>
              {" "}
              <CardTitle className="flex items-center gap-2">
                {" "}
                <Settings className="w-5 h-5" /> Par Level Configuration{" "}
              </CardTitle>{" "}
              <CardDescription>
                {" "}
                Manage minimum and maximum stock levels{" "}
              </CardDescription>{" "}
            </div>{" "}
            <Button
              onClick={() => handleOpenDialog()}
              size="sm"
              className="gap-2"
            >
              {" "}
              <Plus className="w-4 h-4" /> New Par Level{" "}
            </Button>{" "}
          </div>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          {error && (
            <Alert variant="destructive" className="mb-4">
              {" "}
              <AlertCircle className="h-4 w-4" />{" "}
              <AlertDescription>{error}</AlertDescription>{" "}
            </Alert>
          )}{" "}
          <div className="overflow-x-auto">
            {" "}
            <Table>
              {" "}
              <TableHeader>
                {" "}
                <TableRow>
                  {" "}
                  <TableHead>Product</TableHead>{" "}
                  <TableHead className="text-right">Par Qty</TableHead>{" "}
                  <TableHead className="text-right">Min</TableHead>{" "}
                  <TableHead className="text-right">Max</TableHead>{" "}
                  <TableHead className="text-right">Reorder Point</TableHead>{" "}
                  <TableHead className="text-right">Reorder Qty</TableHead>{" "}
                  <TableHead className="text-center">Lead Time</TableHead>{" "}
                  <TableHead className="text-center">Auto-Reorder</TableHead>{" "}
                  <TableHead>Actions</TableHead>{" "}
                </TableRow>{" "}
              </TableHeader>{" "}
              <TableBody>
                {" "}
                {parLevels.length === 0 ? (
                  <TableRow>
                    {" "}
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {" "}
                      No par levels configured. Click"New Par Level" to create
                      one.{" "}
                    </TableCell>{" "}
                  </TableRow>
                ) : (
                  parLevels.map((level) => (
                    <TableRow key={level.id}>
                      {" "}
                      <TableCell className="font-medium">
                        {" "}
                        <div>
                          {" "}
                          <p>{level.standard_products?.name}</p>{" "}
                          <p className="text-xs text-muted-foreground">
                            {" "}
                            {level.standard_products?.base_unit}{" "}
                          </p>{" "}
                        </div>{" "}
                      </TableCell>{" "}
                      <TableCell className="text-right">
                        {" "}
                        {level.par_quantity.toFixed(2)}{" "}
                      </TableCell>{" "}
                      <TableCell className="text-right">
                        {" "}
                        {level.min_quantity.toFixed(2)}{" "}
                      </TableCell>{" "}
                      <TableCell className="text-right">
                        {" "}
                        {level.max_quantity.toFixed(2)}{" "}
                      </TableCell>{" "}
                      <TableCell className="text-right">
                        {" "}
                        {level.reorder_point.toFixed(2)}{" "}
                      </TableCell>{" "}
                      <TableCell className="text-right">
                        {" "}
                        {level.reorder_quantity.toFixed(2)}{" "}
                      </TableCell>{" "}
                      <TableCell className="text-center">
                        {" "}
                        {level.lead_time_days} days{" "}
                      </TableCell>{" "}
                      <TableCell className="text-center">
                        {" "}
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${level.auto_reorder ? "bg-blue-100 text-blue-800" : "bg-surface text-gray-800"}`}
                        >
                          {" "}
                          {level.auto_reorder ? "Yes" : "No"}{" "}
                        </span>{" "}
                      </TableCell>{" "}
                      <TableCell>
                        {" "}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(level)}
                        >
                          {" "}
                          Edit{" "}
                        </Button>{" "}
                      </TableCell>{" "}
                    </TableRow>
                  ))
                )}{" "}
              </TableBody>{" "}
            </Table>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        {" "}
        <DialogContent className="max-w-2xl">
          {" "}
          <DialogHeader>
            {" "}
            <DialogTitle>
              {" "}
              {selectedLevel ? "Edit Par Level" : "Create Par Level"}{" "}
            </DialogTitle>{" "}
          </DialogHeader>{" "}
          <div className="space-y-4">
            {" "}
            <div className="grid grid-cols-2 gap-4">
              {" "}
              <div>
                {" "}
                <Label htmlFor="par-qty">Par Quantity</Label>{" "}
                <Input
                  id="par-qty"
                  type="number"
                  step="0.01"
                  value={formData.parQuantity}
                  onChange={(e) =>
                    setFormData({ ...formData, parQuantity: e.target.value })
                  }
                  placeholder="Target quantity"
                />{" "}
              </div>{" "}
              <div>
                {" "}
                <Label htmlFor="min-qty">Minimum Quantity</Label>{" "}
                <Input
                  id="min-qty"
                  type="number"
                  step="0.01"
                  value={formData.minQuantity}
                  onChange={(e) =>
                    setFormData({ ...formData, minQuantity: e.target.value })
                  }
                  placeholder="Minimum threshold"
                />{" "}
              </div>{" "}
              <div>
                {" "}
                <Label htmlFor="max-qty">Maximum Quantity</Label>{" "}
                <Input
                  id="max-qty"
                  type="number"
                  step="0.01"
                  value={formData.maxQuantity}
                  onChange={(e) =>
                    setFormData({ ...formData, maxQuantity: e.target.value })
                  }
                  placeholder="Maximum threshold"
                />{" "}
              </div>{" "}
              <div>
                {" "}
                <Label htmlFor="reorder-pt">Reorder Point</Label>{" "}
                <Input
                  id="reorder-pt"
                  type="number"
                  step="0.01"
                  value={formData.reorderPoint}
                  onChange={(e) =>
                    setFormData({ ...formData, reorderPoint: e.target.value })
                  }
                  placeholder="Trigger reorder at"
                />{" "}
              </div>{" "}
              <div>
                {" "}
                <Label htmlFor="reorder-qty">Reorder Quantity</Label>{" "}
                <Input
                  id="reorder-qty"
                  type="number"
                  step="0.01"
                  value={formData.reorderQuantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reorderQuantity: e.target.value,
                    })
                  }
                  placeholder="Quantity to order"
                />{" "}
              </div>{" "}
              <div>
                {" "}
                <Label htmlFor="lead-time">Lead Time (Days)</Label>{" "}
                <Input
                  id="lead-time"
                  type="number"
                  value={formData.leadTimeDays}
                  onChange={(e) =>
                    setFormData({ ...formData, leadTimeDays: e.target.value })
                  }
                  placeholder="Supplier lead time"
                />{" "}
              </div>{" "}
            </div>{" "}
            <div className="flex items-center gap-2">
              {" "}
              <input
                type="checkbox"
                id="auto-reorder"
                checked={formData.autoReorder}
                onChange={(e) =>
                  setFormData({ ...formData, autoReorder: e.target.checked })
                }
                className="rounded border-border"
              />{" "}
              <Label htmlFor="auto-reorder" className="cursor-pointer">
                {" "}
                Enable auto-reorder when stock drops below reorder point{" "}
              </Label>{" "}
            </div>{" "}
            <div className="flex gap-2 justify-end pt-4">
              {" "}
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {" "}
                Cancel{" "}
              </Button>{" "}
              <Button onClick={handleSave}>
                {" "}
                {selectedLevel ? "Update" : "Create"}{" "}
              </Button>{" "}
            </div>{" "}
          </div>{" "}
        </DialogContent>{" "}
      </Dialog>{" "}
    </div>
  );
}
