// Echo Cinematic Landing — Blank Start + Logo Fade + EchoScope Reveal
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import useSound from "use-sound";
import chalkSound from "./assets/chalk-sketch.mp3";
import chalkBG from "./assets/chalkboard-bg.png";
import logo from "./assets/luccca-logo-tagged.png";
import EchoScopeWheel from "./EchoScopeWheel";

export default function LandingPage() {
  const [showBlank, setShowBlank] = useState(true);
  const [showLogo, setShowLogo] = useState(false);
  const [showPanels, setShowPanels] = useState(false);
  const [play] = useSound(chalkSound);

  useEffect(() => {
    // Step-by-step sequence
    const timer1 = setTimeout(() => setShowLogo(true), 2000);       // Logo fades in
    const timer2 = setTimeout(() => setShowPanels(true), 4000);     // Panels open
    const timer3 = setTimeout(() => setShowBlank(false), 5500);     // End intro state
    play();
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [play]);

  if (showBlank) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        {showLogo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="flex flex-col items-center"
          >
            <img src={logo} alt="LUCCCA Logo" className="w-48 mb-4" />
            <p className="text-xs text-white opacity-70 italic">
              Powered by Echo — Reimagine what’s possible
            </p>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-white overflow-hidden font-serif">
      {/* Unzip line */}
      <motion.div
        className="absolute top-1/2 left-0 w-full h-[2px] bg-black z-30"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1 }}
        style={{ transformOrigin: "left center" }}
      />

      {/* Top and Bottom Panels */}
      <motion.div
        className="absolute top-0 left-0 w-full h-1/3 bg-white z-10"
        initial={{ y: 0 }}
        animate={showPanels ? { y: -300 } : {}}
        transition={{ duration: 1 }}
      />
      <motion.div
        className="absolute bottom-0 left-0 w-full h-1/3 bg-white z-10"
        initial={{ y: 0 }}
        animate={showPanels ? { y: 300 } : {}}
        transition={{ duration: 1 }}
      />

      {/* LUCCCA Logo and Tagline */}
      <img src={logo} alt="LUCCCA Logo" className="absolute top-6 left-6 w-36 z-20" />
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-light text-black z-20">
        Powered by Echo — Reimagine what is possible
      </div>

      {/* EchoScopeWheel */}
      <div className="z-0">
        <EchoScopeWheel />
      </div>
    </div>
  );
}
