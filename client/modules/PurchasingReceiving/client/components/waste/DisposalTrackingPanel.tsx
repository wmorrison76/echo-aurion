import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useWasteDisposals,
  useDisposalMethods,
  useEnvironmentalImpact,
} from "@/hooks/useWasteDisposal";
import { Leaf, Trash2, CheckCircle2 } from "lucide-react";
interface DisposalTrackingPanelProps {
  organizationId: string;
  outletId?: string;
}
export function DisposalTrackingPanel({
  organizationId,
  outletId,
}: DisposalTrackingPanelProps) {
  const {
    disposals,
    summary: disposalSummary,
    loading: disposalsLoading,
  } = useWasteDisposals({
    organizationId,
    outletId,
    autoRefresh: true,
    refreshInterval: 300,
  });
  const { methods, methodsByCategory } = useDisposalMethods({ organizationId });
  const { impact, loading: impactLoading } = useEnvironmentalImpact({
    organizationId,
    outletId,
    autoRefresh: true,
    refreshInterval: 3600,
  });
  return (
    <div className="space-y-6">
      {" "}
      {/* Disposal Cost Summary */}{" "}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {" "}
              <Trash2 className="w-4 h-4" /> Total Disposals{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {disposalSummary.total}
            </div>{" "}
            <div className="text-xs text-muted-foreground mt-1">
              items disposed
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Disposal Cost
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-red-600">
              ${disposalSummary.totalCost.toFixed(2)}
            </div>{" "}
            <div className="text-xs text-muted-foreground mt-1">
              total spent
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Disposal Revenue
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-green-600">
              {" "}
              ${disposalSummary.totalRevenue.toFixed(2)}{" "}
            </div>{" "}
            <div className="text-xs text-muted-foreground mt-1">
              from sales/recycling
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Disposal Methods */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle className="flex items-center gap-2">
            {" "}
            <CheckCircle2 className="w-5 h-5" /> Disposal Methods{" "}
          </CardTitle>{" "}
          <CardDescription>Available disposal options</CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {" "}
            {Object.entries(methodsByCategory).map(([category, methodList]) => (
              <div key={category} className="border rounded-lg p-3">
                {" "}
                <h4 className="font-medium text-sm mb-2 capitalize">
                  {category}
                </h4>{" "}
                <div className="space-y-2">
                  {" "}
                  {methodList.map((method) => (
                    <div
                      key={method.id}
                      className="text-sm flex items-start justify-between"
                    >
                      {" "}
                      <div>
                        {" "}
                        <p className="font-medium text-xs">
                          {method.name}
                        </p>{" "}
                        {method.environmental_rating && (
                          <Badge className="text-xs mt-1" variant="outline">
                            {" "}
                            {method.environmental_rating} impact{" "}
                          </Badge>
                        )}{" "}
                      </div>{" "}
                      {method.cost_per_unit && (
                        <p className="text-xs text-muted-foreground">
                          ${method.cost_per_unit}
                        </p>
                      )}{" "}
                    </div>
                  ))}{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Recent Disposals */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Recent Disposals</CardTitle>{" "}
          <CardDescription>Latest waste disposal records</CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          {disposalsLoading ? (
            <div className="flex justify-center py-8">
              {" "}
              <div className="text-muted-foreground">Loading...</div>{" "}
            </div>
          ) : disposals.length === 0 ? (
            <div className="flex justify-center py-8">
              {" "}
              <div className="text-muted-foreground">
                No disposal records yet
              </div>{" "}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {" "}
              {disposals.slice(0, 10).map((disposal) => (
                <div
                  key={disposal.id}
                  className="p-3 border rounded-lg hover:bg-surface"
                >
                  {" "}
                  <div className="flex items-start justify-between">
                    {" "}
                    <div className="flex-1">
                      {" "}
                      <p className="font-medium text-sm">
                        Disposal #{disposal.id.slice(0, 8)}
                      </p>{" "}
                      <p className="text-xs text-muted-foreground mt-1">
                        {" "}
                        {disposal.quantity_disposed}{" "}
                        {disposal.unit_of_measure}{" "}
                      </p>{" "}
                      {disposal.carrier_name && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Carrier: {disposal.carrier_name}
                        </p>
                      )}{" "}
                    </div>{" "}
                    <div className="text-right">
                      {" "}
                      <p className="font-medium text-sm text-red-600">
                        {" "}
                        ${disposal.cost?.toFixed(2)}{" "}
                      </p>{" "}
                      <p className="text-xs text-muted-foreground">
                        {" "}
                        {new Date(
                          disposal.created_at,
                        ).toLocaleDateString()}{" "}
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </div>
          )}{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Environmental Impact */}{" "}
      {impact && (
        <Card className="border-green-200 bg-green-50">
          {" "}
          <CardHeader>
            {" "}
            <CardTitle className="flex items-center gap-2 text-green-900">
              {" "}
              <Leaf className="w-5 h-5" /> Environmental Impact{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-green-900">
              {" "}
              <div>
                {" "}
                <p className="text-xs text-green-700 mb-1">Total Waste</p>{" "}
                <p className="text-lg font-bold">
                  {impact.total_waste_kg} kg
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <p className="text-xs text-green-700 mb-1">Recycled</p>{" "}
                <p className="text-lg font-bold">
                  {impact.recycled_waste_kg} kg
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <p className="text-xs text-green-700 mb-1">Composted</p>{" "}
                <p className="text-lg font-bold">
                  {impact.composted_waste_kg} kg
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <p className="text-xs text-green-700 mb-1">
                  Sustainability Score
                </p>{" "}
                <p className="text-lg font-bold">
                  {(impact.sustainability_score || 0).toFixed(2)}
                </p>{" "}
              </div>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
    </div>
  );
}
