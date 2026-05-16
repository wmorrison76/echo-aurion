// File: src/components/EchoCore/components/interaction/EchoAnimator.jsx
import React from 'react';
import { motion } from 'framer-motion';

const EchoAnimator = ({ children, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      {children}
    </motion.div>
  );
};

export default EchoAnimator;