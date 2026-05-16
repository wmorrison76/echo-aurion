import React from "react";

export default function CakeSupportDisplay({ designData = {} }) {
  const diameter = Number(designData.diameter ?? 8);
  const height   = Number(designData.height ?? 4);

  const { internalRods, baseBoards } = calculateCakeSupports({ diameter, height });

  return (
    <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg shadow">
      <h2 className="font-bold">Structural Supports</h2>
      <p>Internal Rods Required: {internalRods}</p>
      <p>Base Boards Required: {baseBoards}</p>
    </div>
  );
}

function calculateCakeSupports({ diameter, height }) {
  let internalRods = 0;
  let baseBoards = 1;
  if (diameter >= 10) internalRods = Math.floor(diameter / 4);
  if (height >= 6) baseBoards = 2;
  return { internalRods, baseBoards };
}
