/**
 * LUCCCA | DB-05
 * Toggleable floating Echo Assistant panel.
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';

const EchoAssistantPanel = ({ children }) => {
  const [visible, setVisible] = useState(true);
  return (
    <motion.div
      className="fixed bottom-4 right-4 w-64 h-64 bg-white shadow-xl rounded-lg p-4"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.8 }}
      transition={{ duration: 0.3 }}
    >
      <button onClick={() => setVisible(!visible)} className="absolute top-2 right-2">✖</button>
      {children}
    </motion.div>
  );
};

export default EchoAssistantPanel;
