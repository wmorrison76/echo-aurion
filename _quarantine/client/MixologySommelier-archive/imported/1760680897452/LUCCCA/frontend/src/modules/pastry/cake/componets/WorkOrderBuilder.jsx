// src/modules/pastry/cake/components/WorkOrderBuilder.jsx

import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const WorkOrderBuilder = ({ cakeData, towerData, layoutData, onExport }) => {
  const tasks = [];

  if (cakeData?.layers) {
    cakeData.layers.forEach((layer, idx) => {
      tasks.push({
        step: `Layer ${idx + 1}`,
        task: layer.type === "filling" ? `Prepare filling: ${layer.filling}` : `Bake: ${layer.flavor}`,
        notes: layer.notes || "",
      });
    });
  }

  if (towerData?.length > 0) {
    towerData.forEach((level, idx) => {
      tasks.push({
        step: `Tower Level ${idx + 1}`,
        task: `Bake ${level.count} cupcakes – Flavor: ${level.flavor}`,
        notes: level.decor ? `Decorate: ${level.decor}` : "",
      });
    });
  }

  if (layoutData) {
    tasks.push({
      step: `Cupcake Tray`,
      task: `Arrange ${layoutData.totalCupcakes} cupcakes in ${layoutData.traySize} tray`,
      notes: `Spell: ${layoutData.shape} + filler`,
    });
  }

  const exportToFile = () => {
    const payload = {
      title: cakeData?.cakeName || "Custom Cake Work Order",
      createdAt: new Date().toISOString(),
      instructions: tasks,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${payload.title.replace(/\s+/g, "_")}_WorkOrder.json`;
    anchor.click();
    if (onExport) onExport(payload);
  };

  return (
    <Card className="p-6 border border-emerald-500 bg-emerald-50 space-y-4">
      <h3 className="text-sm font-semibold text-emerald-700">Kitchen Work Order Summary</h3>

      <ul className="list-disc pl-5 text-sm space-y-1 text-slate-700">
        {tasks.map((t, i) => (
          <li key={i}>
            <strong>{t.step}:</strong> {t.task}
            {t.notes && <span className="ml-2 italic text-slate-500">({t.notes})</span>}
          </li>
        ))}
      </ul>

      <Button onClick={exportToFile}>Download Work Order</Button>
    </Card>
  );
};

export default WorkOrderBuilder;
