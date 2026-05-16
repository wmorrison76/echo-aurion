/src/components/EchoCore/EchoAvatar.jsx
// ============================
import React from "react";
import { motion } from "framer-motion";
import { useEchoCore } from "./context";

// [TEAM LOG: Avatar] - Echo AI avatar with emotional states
export default function EchoAvatar() {
const { mood } = useEchoCore();

const moodColor = {
happy: "bg-green-400",
neutral: "bg-blue-400",
alert: "bg-red-400",
}[mood] || "bg-gray-400";

return (
<motion.div
className={w-24 h-24 rounded-full ${moodColor} flex items-center justify-center}
animate={{ scale: [1, 1.1, 1] }}
transition={{ duration: 2, repeat: Infinity }}
>
Echo
</motion.div>
);
}