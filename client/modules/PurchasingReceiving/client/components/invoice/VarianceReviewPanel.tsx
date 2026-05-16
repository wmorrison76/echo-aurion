import React, { useState } from "react";
import { useInvoiceVariances } from "../../hooks/useInvoiceGLIntegration";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
interface VarianceReviewPanelProps {
  invoiceId?: string;
}
export function VarianceReviewPanel({ invoiceId }: VarianceReviewPanelProps) {
  const { variances, loading, error, reviewVariance, refetch } =
    useInvoiceVariances(50);
  const [selectedVariance, setSelectedVariance] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [notes, setNotes] = useState("");
  const handleReview = async () => {
    if (!selectedVariance) return;
    await reviewVariance(selectedVariance.id, notes);
    setShowDialog(false);
    setNotes("");
    setSelectedVariance(null);
  };
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-surface text-gray-800";
    }
  };
  const getVarianceIcon = (severity: string) => {
    switch (severity) {
      case "critical":
      case "high":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };
  const unreviewed = variances.filter((v) => !v.reviewedAt);
  const critical = unreviewed.filter((v) => v.severity === "critical").length;
  const high = unreviewed.filter((v) => v.severity === "high").length;
  const filteredVariances = invoiceId
    ? unreviewed.filter((v) => v.invoiceId === invoiceId)
    : unreviewed;
  if (loading) {
    return (
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Variances</CardTitle>{" "}
          <CardDescription>Loading variance data...</CardDescription>{" "}
        </CardHeader>{" "}
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {" "}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {" "}
              <AlertTriangle className="w-4 h-4 text-red-500" /> Critical{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-red-600">
              {critical}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium">
              High Priority
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-orange-600">
              {high}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium">
              Total Unreviewed
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {filteredVariances.length}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <div className="flex items-center justify-between">
            {" "}
            <div>
              {" "}
              <CardTitle>Invoice Variances</CardTitle>{" "}
              <CardDescription>
                Variance detection and resolution
              </CardDescription>{" "}
            </div>{" "}
            <Button onClick={() => refetch()} variant="outline" size="sm">
              {" "}
              Refresh{" "}
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
                  <TableHead>Invoice</TableHead> <TableHead>Type</TableHead>{" "}
                  <TableHead>Severity</TableHead>{" "}
                  <TableHead className="text-right">Variance</TableHead>{" "}
                  <TableHead>Description</TableHead>{" "}
                  <TableHead>Actions</TableHead>{" "}
                </TableRow>{" "}
              </TableHeader>{" "}
              <TableBody>
                {" "}
                {filteredVariances.length === 0 ? (
                  <TableRow>
                    {" "}
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {" "}
                      No variances detected. Everything looks good!{" "}
                    </TableCell>{" "}
                  </TableRow>
                ) : (
                  filteredVariances.map((variance) => (
                    <TableRow key={variance.id} className="hover:bg-surface">
                      {" "}
                      <TableCell className="font-medium">
                        {" "}
                        {variance.invoice?.number || "N/A"}{" "}
                      </TableCell>{" "}
                      <TableCell>
                        {" "}
                        <span className="text-sm">
                          {" "}
                          {variance.variance_type.replace(/_/g, "")}{" "}
                        </span>{" "}
                      </TableCell>{" "}
                      <TableCell>
                        {" "}
                        <Badge className={getSeverityColor(variance.severity)}>
                          {" "}
                          {variance.severity}{" "}
                        </Badge>{" "}
                      </TableCell>{" "}
                      <TableCell className="text-right">
                        {" "}
                        <div className="flex items-center justify-end gap-1">
                          {" "}
                          {getVarianceIcon(variance.severity)}{" "}
                          <span className="font-semibold">
                            {" "}
                            {variance.variance_amount
                              ? `$${Math.abs(variance.variance_amount).toFixed(2)}`
                              : "N/A"}{" "}
                          </span>{" "}
                        </div>{" "}
                      </TableCell>{" "}
                      <TableCell>
                        {" "}
                        <p className="text-sm text-muted-foreground max-w-xs">
                          {" "}
                          {variance.description}{" "}
                        </p>{" "}
                      </TableCell>{" "}
                      <TableCell>
                        {" "}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedVariance(variance);
                            setShowDialog(true);
                          }}
                        >
                          {" "}
                          Review{" "}
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
        <DialogContent>
          {" "}
          <DialogHeader>
            {" "}
            <DialogTitle>Review Variance</DialogTitle>{" "}
          </DialogHeader>{" "}
          {selectedVariance && (
            <div className="space-y-4">
              {" "}
              <div>
                {" "}
                <p className="text-sm font-medium">Type</p>{" "}
                <p className="text-sm text-muted-foreground">
                  {" "}
                  {selectedVariance.variance_type.replace(/_/g, "")}{" "}
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <p className="text-sm font-medium">Description</p>{" "}
                <p className="text-sm text-muted-foreground">
                  {" "}
                  {selectedVariance.description}{" "}
                </p>{" "}
              </div>{" "}
              {selectedVariance.variance_amount && (
                <div>
                  {" "}
                  <p className="text-sm font-medium">Variance Amount</p>{" "}
                  <p className="text-lg font-bold">
                    {" "}
                    ${selectedVariance.variance_amount.toFixed(2)}{" "}
                  </p>{" "}
                </div>
              )}{" "}
              <div>
                {" "}
                <p className="text-sm font-medium mb-2">
                  Resolution Notes
                </p>{" "}
                <textarea
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  rows={3}
                  placeholder="Document how this variance was handled..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />{" "}
              </div>{" "}
              <div className="flex gap-2 justify-end">
                {" "}
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  {" "}
                  Cancel{" "}
                </Button>{" "}
                <Button onClick={handleReview} className="gap-2">
                  {" "}
                  <CheckCircle className="w-4 h-4" /> Mark Reviewed{" "}
                </Button>{" "}
              </div>{" "}
            </div>
          )}{" "}
        </DialogContent>{" "}
      </Dialog>{" "}
    </div>
  );
}
