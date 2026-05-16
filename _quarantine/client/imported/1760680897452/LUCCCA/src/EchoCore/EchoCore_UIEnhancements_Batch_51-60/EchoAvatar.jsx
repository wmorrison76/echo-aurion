// EchoAvatar.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './EchoAvatar.css';

/** Renders the EchoAvatar with mood-based animations */
const EchoAvatar = ({ mood }) => {
  const animationProps = mood === 'happy'
    ? { scale: 1.1, rotate: 5 }
    : mood === 'thinking'
    ? { scale: 1.0, rotate: 0, opacity: 0.8 }
    : { scale: 0.9, rotate: -5, opacity: 0.6 };

  return (
    <motion.div className="echo-avatar"
      animate={animationProps}
      transition={{ type: 'spring', stiffness: 200 }}
    >
      <img src="/avatar.png" alt="Echo Avatar" />
    </motion.div>
  );
};

export default EchoAvatar;
