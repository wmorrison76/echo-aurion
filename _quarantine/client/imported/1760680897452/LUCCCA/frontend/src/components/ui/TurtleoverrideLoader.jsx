
// ✅ BLOCK 4 – Override Control Enforcement & Turtle Spinner Integration
// Locks override behind Director-level auth, adds visual deterrent loading block.

// File: components/ui/TurtleOverrideLoader.jsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import turtleImg from '../../assets/turtle.png'; // Walking turtle
import smileImg from '../../assets/turtle-smile.png'; // Smiling pause turtle

const TurtleOverrideLoader = ({ onFinish }) => {
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const pause = setTimeout(() => setPaused(true), 3000);
    const finish = setTimeout(() => {
      setDone(true);
      setTimeout(() => onFinish(), 1500);
    }, 11000);
    return () => {
      clearTimeout(pause);
      clearTimeout(finish);
    };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
      <AnimatePresence>
        <motion.div
          className="relative w-full h-32"
          initial={{ x: '-100%' }}
          animate={{ x: done ? '110%' : paused ? '50%' : '100%' }}
          transition={{ duration: done ? 1.3 : paused ? 3 : 5, ease: 'easeInOut' }}
        >
          <img
            src={paused ? smileImg : turtleImg}
            alt="Turtle Spinner"
            className="h-32 mx-auto"
          />
          {paused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-90 px-4 py-2 rounded shadow"
            >
              <p className="text-center text-black font-semibold">
                🐢 HACCP Override Approval Has Been Logged.
              </p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default TurtleOverrideLoader;
