
import React, { useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";

export default function EKGView() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });

  useEffect(() => {
    fetch("/pulse_status.json")
      .then(res => res.json())
      .then(data => {
        const nodes = Object.keys(data).map((id, i) => ({
          id,
          status: data[id].status,
          heat: data[id].heat,
          group: data[id].linked
        }));
        const links = [];
        Object.entries(data).forEach(([source, props]) => {
          (props.connections || []).forEach(target => {
            links.push({ source, target });
          });
        });
        setGraphData({ nodes, links });
      });
  }, []);

  return (
    <div className="p-4 bg-black h-[600px]">
      <ForceGraph2D
        graphData={graphData}
        nodeLabel="id"
        nodeAutoColorBy="status"
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.id;
          const fontSize = 10 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.fillStyle = node.color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.heat / 20, 0, 2 * Math.PI, false);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.fillText(label, node.x + 6, node.y + 3);
        }}
      />
    </div>
  );
}
