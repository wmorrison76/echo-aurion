import React, { useState } from 'react';
import { motion } from 'framer-motion';

export const PaneManager = () => {
  const [panes, setPanes] = useState([
    { id: 'pane-1', x: 50, y: 50 }
  ]);

  return (
    <div className="absolute inset-0 border-2 border-dashed border-cyan-500 bg-slate-100 dark:bg-slate-900">
      {panes.map((pane) => (
        <motion.div
          key={pane.id}
          drag
          className="absolute bg-white text-black dark:bg-gray-800 dark:text-white shadow-lg rounded-lg w-64 h-40 p-4 ring-2 ring-indigo-500 cursor-move"
          style={{ top: pane.y, left: pane.x }}
        >
          <span className="text-xl font-bold">{pane.id}</span>
        </motion.div>
      ))}
    </div>
  );
};
