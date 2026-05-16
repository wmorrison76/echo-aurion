import React, { useState, useEffect } from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";
export function LaborVarianceDashboard() {
  const [variances, setVariances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadVariances();
  }, []);
  const loadVariances = async () => {
    try {
      setLoading(true);
      const mockVariances = [
        {
          id: "1",
          employee: "John Chef",
          position: "Head Chef",
          scheduled: 8,
          actual: 8.5,
          variance: 0.5,
          cost: 12.5,
          percent: 6.25,
        },
        {
          id: "2",
          employee: "Sarah Server",
          position: "Server",
          scheduled: 11,
          actual: 10,
          variance: -1,
          cost: -18.0,
          percent: -9.1,
        },
        {
          id: "3",
          employee: "Mike Manager",
          position: "Manager",
          scheduled: 8,
          actual: 8,
          variance: 0,
          cost: 0,
          percent: 0,
        },
      ];
      setVariances(mockVariances);
    } catch (error) {
      console.error("Failed to load variances:", error);
    } finally {
      setLoading(false);
    }
  };
  if (loading)
    return <div className="text-muted-foreground">Loading labor data...</div>;
  const totalCost = variances.reduce((sum, v) => sum + v.cost, 0);
  const overageCount = variances.filter((v) => v.variance > 0).length;
  const costPercent = 32.5; // Would calculate from actual data return ( <div className="bg-background rounded-lg shadow p-6"> <h3 className="text-xl font-bold text-gray-900 mb-4"> Labor Variance Analysis </h3> <div className="grid grid-cols-3 gap-4 mb-6"> <div className="bg-blue-50 p-4 rounded-lg border border-blue-200"> <p className="text-sm text-muted-foreground">Total Variance Cost</p> <p className={`text-2xl font-bold ${totalCost > 0 ?"text-red-600" :"text-green-600"}`} > ${totalCost.toFixed(2)} </p> </div> <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200"> <p className="text-sm text-muted-foreground">Overage Count</p> <p className="text-2xl font-bold text-yellow-600">{overageCount}</p> </div> <div className="bg-green-50 p-4 rounded-lg border border-green-200"> <p className="text-sm text-muted-foreground">Labor Cost %</p> <p className="text-2xl font-bold text-green-600"> {costPercent.toFixed(1)}% </p> </div> </div> <div className="space-y-3"> {variances.map((variance) => ( <div key={variance.id} className="p-3 border border-gray-200 rounded-lg" > <div className="flex items-center justify-between"> <div className="flex-1"> <div className="flex items-center gap-2"> {variance.variance > 0 && ( <AlertTriangle className="w-4 h-4 text-red-500" /> )} <div> <p className="font-semibold text-gray-900"> {variance.employee} </p> <p className="text-sm text-muted-foreground">{variance.position}</p> </div> </div> </div> <div className="text-right"> <p className="font-semibold text-gray-900"> {variance.scheduled}h → {variance.actual}h ( {variance.variance > 0 ?"+" :""} {variance.variance}h) </p> <p className={`font-bold ${variance.cost > 0 ?"text-red-600" :"text-green-600"}`} > ${variance.cost.toFixed(2)} </p> </div> </div> </div> ))} </div> </div> );
}
