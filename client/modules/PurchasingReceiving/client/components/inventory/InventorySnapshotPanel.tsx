import React, { useState } from "react";
import { useInventorySnapshots } from "../../hooks/useInventorySync";
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
import { Badge } from "../ui/badge";
import { Camera, Download, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
interface InventorySnapshotPanelProps {
  outletId: string;
}
export function InventorySnapshotPanel({
  outletId,
}: InventorySnapshotPanelProps) {
  const { snapshots, loading, error, createSnapshot, refetch } =
    useInventorySnapshots(outletId);
  const [creating, setCreating] = useState(false);
  const handleCreateSnapshot = async () => {
    setCreating(true);
    await createSnapshot("manual");
    setCreating(false);
  };
  const getTypeColor = (type: string) => {
    switch (type) {
      case "daily":
        return "bg-blue-100 text-blue-800";
      case "weekly":
        return "bg-purple-100 text-purple-800";
      case "monthly":
        return "bg-green-100 text-green-800";
      case "manual":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-surface text-gray-800";
    }
  };
  const downloadSnapshot = (snapshot: any) => {
    const dataStr = JSON.stringify(snapshot, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory-snapshot-${new Date(snapshot.created_at).getTime()}.json`;
    link.click();
  };
  if (loading) {
    return (
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Inventory Snapshots</CardTitle>{" "}
          <CardDescription>Loading snapshot data...</CardDescription>{" "}
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
                <Camera className="w-5 h-5" /> Inventory Snapshots{" "}
              </CardTitle>{" "}
              <CardDescription>
                {" "}
                Historical inventory records for audit and variance
                tracking{" "}
              </CardDescription>{" "}
            </div>{" "}
            <Button
              onClick={handleCreateSnapshot}
              disabled={creating}
              size="sm"
            >
              {" "}
              {creating ? "Creating..." : "Create Snapshot"}{" "}
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
                  <TableHead>Date</TableHead> <TableHead>Type</TableHead>{" "}
                  <TableHead className="text-right">Items</TableHead>{" "}
                  <TableHead className="text-right">Total Value</TableHead>{" "}
                  <TableHead>Actions</TableHead>{" "}
                </TableRow>{" "}
              </TableHeader>{" "}
              <TableBody>
                {" "}
                {snapshots.length === 0 ? (
                  <TableRow>
                    {" "}
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {" "}
                      No snapshots yet. Create one to begin tracking inventory
                      history.{" "}
                    </TableCell>{" "}
                  </TableRow>
                ) : (
                  snapshots.map((snapshot) => (
                    <TableRow key={snapshot.id}>
                      {" "}
                      <TableCell>
                        {" "}
                        <div>
                          {" "}
                          <p className="font-medium">
                            {" "}
                            {new Date(
                              snapshot.created_at,
                            ).toLocaleDateString()}{" "}
                          </p>{" "}
                          <p className="text-xs text-muted-foreground">
                            {" "}
                            {new Date(
                              snapshot.created_at,
                            ).toLocaleTimeString()}{" "}
                          </p>{" "}
                        </div>{" "}
                      </TableCell>{" "}
                      <TableCell>
                        {" "}
                        <Badge className={getTypeColor(snapshot.snapshot_type)}>
                          {" "}
                          {snapshot.snapshot_type}{" "}
                        </Badge>{" "}
                      </TableCell>{" "}
                      <TableCell className="text-right font-semibold">
                        {" "}
                        {snapshot.total_items}{" "}
                      </TableCell>{" "}
                      <TableCell className="text-right font-semibold">
                        {" "}
                        ${snapshot.total_value?.toFixed(2) || "0.00"}{" "}
                      </TableCell>{" "}
                      <TableCell>
                        {" "}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadSnapshot(snapshot)}
                          className="gap-2"
                        >
                          {" "}
                          <Download className="w-4 h-4" /> Download{" "}
                        </Button>{" "}
                      </TableCell>{" "}
                    </TableRow>
                  ))
                )}{" "}
              </TableBody>{" "}
            </Table>{" "}
          </div>{" "}
          {snapshots.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              {" "}
              <h4 className="text-sm font-semibold mb-2">
                Latest Snapshot Analysis
              </h4>{" "}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {" "}
                <div>
                  {" "}
                  <p className="text-muted-foreground">Total Items</p>{" "}
                  <p className="text-lg font-semibold">
                    {snapshots[0].total_items}
                  </p>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <p className="text-muted-foreground">Total Value</p>{" "}
                  <p className="text-lg font-semibold">
                    {" "}
                    ${snapshots[0].total_value?.toFixed(2) || "0.00"}{" "}
                  </p>{" "}
                </div>{" "}
                {snapshots.length > 1 && (
                  <>
                    {" "}
                    <div>
                      {" "}
                      <p className="text-muted-foreground">Item Change</p>{" "}
                      <p
                        className={`text-lg font-semibold ${snapshots[0].total_items > snapshots[1].total_items ? "text-green-600" : "text-red-600"}`}
                      >
                        {" "}
                        {snapshots[0].total_items - snapshots[1].total_items > 0
                          ? "+"
                          : ""}{" "}
                        {snapshots[0].total_items -
                          snapshots[1].total_items}{" "}
                      </p>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <p className="text-muted-foreground">Value Change</p>{" "}
                      <p
                        className={`text-lg font-semibold ${(snapshots[0].total_value || 0) > (snapshots[1].total_value || 0) ? "text-green-600" : "text-red-600"}`}
                      >
                        {" "}
                        {(snapshots[0].total_value || 0) -
                          (snapshots[1].total_value || 0) >
                        0
                          ? "+"
                          : ""}{" "}
                        $
                        {(
                          (snapshots[0].total_value || 0) -
                          (snapshots[1].total_value || 0)
                        ).toFixed(2)}{" "}
                      </p>{" "}
                    </div>{" "}
                  </>
                )}{" "}
              </div>{" "}
            </div>
          )}{" "}
        </CardContent>{" "}
      </Card>{" "}
    </div>
  );
}
