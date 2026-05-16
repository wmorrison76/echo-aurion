import React from "react";
import { motion } from "framer-motion";

const animations = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 20, opacity: 0 },
  },
};

const EchoAnimator = ({ type = "fade", children, duration = 0.3 }) => {
  const anim = animations[type] || animations.fade;
  return (
    <motion.div
      initial={anim.initial}
      animate={anim.animate}
      exit={anim.exit}
      transition={{ duration }}
    >
      {children}
    </motion.div>
  );
};

export default EchoAnimator;
