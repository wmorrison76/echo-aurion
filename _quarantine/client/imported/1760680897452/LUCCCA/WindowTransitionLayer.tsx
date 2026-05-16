import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export const WindowTransitionLayer = ({ panes }) => {
  return (
    <AnimatePresence>
      {panes.map((pane) => (
        <motion.div
          key={pane.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="absolute bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4"
          style={{ top: pane.y, left: pane.x }}
        >
          {pane.content}
        </motion.div>
      ))}
    </AnimatePresence>
  );
};