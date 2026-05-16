import React, { useEffect, useState } from "react";

export function FireworksContainer() {
  const [fireworks, setFireworks] = useState([]);

  useEffect(() => {
    const handleFireworks = () => {
      const now = Date.now();
      
      // CENTER BURST - 150 large fast particles
      const centerBurst = Array.from({ length: 150 }, (_, i) => {
        const angle = (i / 150) * Math.PI * 2;
        const velocity = 3 + Math.random() * 5;
        return {
          id: `${now}-burst-${i}`,
          angle,
          velocity,
          delay: 0,
          type: "burst",
          size: "large",
          rotation: Math.random() * 360,
        };
      });

      // SECONDARY WAVE - 120 medium particles, delayed burst
      const secondaryWave = Array.from({ length: 120 }, (_, i) => {
        const angle = (i / 120) * Math.PI * 2 + Math.PI / 120;
        const velocity = 2 + Math.random() * 3;
        return {
          id: `${now}-wave-${i}`,
          angle,
          velocity,
          delay: 0.15,
          type: "burst",
          size: "medium",
          rotation: Math.random() * 360,
        };
      });

      // LIGHT RAYS - 80 elegant light beams emanating from center
      const lightRays = Array.from({ length: 80 }, (_, i) => {
        const angle = (i / 80) * Math.PI * 2;
        return {
          id: `${now}-ray-${i}`,
          angle,
          delay: Math.random() * 0.3,
          type: "lightray",
          duration: 2.5 + Math.random() * 1,
          color: ["gold", "cyan", "rose"][Math.floor(Math.random() * 3)],
        };
      });

      // ADDITIONAL LIGHT RAYS - Extra rays for more dramatic effect
      const extraRays = Array.from({ length: 40 }, (_, i) => {
        const angle = (i / 40) * Math.PI * 2 + Math.PI / 40;
        return {
          id: `${now}-ray-extra-${i}`,
          angle,
          delay: 0.1 + Math.random() * 0.2,
          type: "lightray",
          duration: 2 + Math.random() * 0.8,
          color: ["gold", "cyan", "rose"][Math.floor(Math.random() * 3)],
        };
      });

      // SPINNING SYMBOLS - 60 celebratory emoji that spin
      const symbols = Array.from({ length: 60 }, (_, i) => ({
        id: `${now}-symbol-${i}`,
        startX: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 3 + Math.random() * 2,
        type: "symbol",
        rotation: Math.random() * 360,
      }));

      // GLOWING ORBS - 40 small glowing particles with trails
      const glowOrbs = Array.from({ length: 40 }, (_, i) => {
        const angle = (i / 40) * Math.PI * 2;
        const velocity = 1.5 + Math.random() * 2.5;
        return {
          id: `${now}-glow-${i}`,
          angle,
          velocity,
          delay: 0.2 + Math.random() * 0.4,
          type: "glow",
        };
      });

      const allFireworks = [
        ...centerBurst,
        ...secondaryWave,
        ...lightRays,
        ...extraRays,
        ...symbols,
        ...glowOrbs,
      ];
      setFireworks(allFireworks);

      setTimeout(() => {
        setFireworks([]);
      }, 7000);
    };

    window.addEventListener("trigger-fireworks", handleFireworks);
    return () => window.removeEventListener("trigger-fireworks", handleFireworks);
  }, []);

  if (fireworks.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {fireworks.map((fw) => {
        switch (fw.type) {
          case "burst":
            return <BurstParticle key={fw.id} {...fw} />;
          case "lightray":
            return <LightRay key={fw.id} {...fw} />;
          case "symbol":
            return <SpinningSymbol key={fw.id} {...fw} />;
          case "glow":
            return <GlowingOrb key={fw.id} {...fw} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

function BurstParticle({ angle, velocity, delay, size, rotation }) {
  const emojis = [
    "✨", "🎉", "⭐", "💫", "🌟", "🎊", "🎆", "🎇",
    "💥", "🔥", "🏆", "👑", "💎", "🌈", "🎯", "⚡",
  ];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];

  const distance = velocity * 350;
  const tx = Math.cos(angle) * distance;
  const ty = Math.sin(angle) * distance;

  const sizeClass = size === "large" ? "text-2xl" : "text-lg";
  const duration = 2.5 + Math.random() * 0.8;

  return (
    <div
      className={`fixed ${sizeClass} font-bold animate-pulse drop-shadow-2xl`}
      style={{
        left: "50%",
        top: "50%",
        marginLeft: "-20px",
        marginTop: "-20px",
        animation: `burst-particle ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
        animationDelay: `${delay}s`,
        "--tx": `${tx}px`,
        "--ty": `${ty}px`,
        "--rotation": `${rotation}deg`,
        filter: "drop-shadow(0 0 10px rgba(255, 215, 0, 0.9)) drop-shadow(0 0 20px rgba(255, 100, 0, 0.7))",
      }}
    >
      {emoji}
    </div>
  );
}

function LightRay({ angle, delay, duration, color }) {
  const colorMap = {
    gold: "from-yellow-300 via-yellow-200 to-transparent",
    cyan: "from-cyan-300 via-cyan-200 to-transparent",
    rose: "from-rose-300 via-pink-200 to-transparent",
  };

  const distance = 500 + Math.random() * 300;
  const tx = Math.cos(angle) * distance;
  const ty = Math.sin(angle) * distance;

  return (
    <div
      className="fixed pointer-events-none"
      style={{
        left: "50%",
        top: "50%",
        width: "4px",
        height: "300px",
        marginLeft: "-2px",
        marginTop: "-150px",
        background: `linear-gradient(180deg, var(--color-start), var(--color-end))`,
        "--color-start": color === "gold" ? "rgba(255, 215, 0, 0.8)" :
                         color === "cyan" ? "rgba(0, 255, 255, 0.8)" :
                         "rgba(244, 114, 182, 0.8)",
        "--color-end": "rgba(255, 255, 255, 0)",
        animation: `light-ray-burst ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
        animationDelay: `${delay}s`,
        "--tx": `${tx}px`,
        "--ty": `${ty}px`,
        filter: `drop-shadow(0 0 15px ${color === "gold" ? "rgba(255, 215, 0, 0.6)" :
                                          color === "cyan" ? "rgba(0, 255, 255, 0.6)" :
                                          "rgba(244, 114, 182, 0.6)"})`,
        transform: `rotate(${angle * 180 / Math.PI}deg)`,
      }}
    />
  );
}


function SpinningSymbol({ startX, delay, duration, rotation }) {
  const symbols = [
    "🏆", "👑", "💎", "🎖️", "⭐", "🌟", "💫", "✨",
    "🎯", "🔥", "💥", "🎊", "🎉", "🌈", "💝", "🎁",
  ];
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];

  return (
    <div
      className="fixed text-3xl font-bold pointer-events-none"
      style={{
        left: `${startX}%`,
        top: "-50px",
        animation: `symbol-spin-fall ${duration}s ease-in forwards`,
        animationDelay: `${delay}s`,
        filter: "drop-shadow(0 0 8px rgba(255, 215, 0, 0.7)) drop-shadow(0 0 12px rgba(255, 100, 0, 0.5))",
      }}
    >
      {symbol}
    </div>
  );
}

function GlowingOrb({ angle, velocity, delay }) {
  const distance = velocity * 300;
  const tx = Math.cos(angle) * distance;
  const ty = Math.sin(angle) * distance;
  const colors = ["gold", "cyan", "blue", "purple"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const colorShadow = 
    color === "gold" ? "rgba(255, 215, 0, 0.8)" :
    color === "cyan" ? "rgba(0, 255, 255, 0.8)" :
    color === "blue" ? "rgba(100, 150, 255, 0.8)" :
    "rgba(200, 100, 255, 0.8)";

  return (
    <div
      className="fixed w-1.5 h-1.5 rounded-full pointer-events-none"
      style={{
        left: "50%",
        top: "50%",
        marginLeft: "-3px",
        marginTop: "-3px",
        backgroundColor: color === "gold" ? "#ffd700" : 
                         color === "cyan" ? "#00ffff" :
                         color === "blue" ? "#6495ed" : "#c864ff",
        animation: `glow-burst ${2.8 + Math.random() * 0.6}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
        animationDelay: `${delay}s`,
        "--tx": `${tx}px`,
        "--ty": `${ty}px`,
        boxShadow: `0 0 15px ${colorShadow}, 0 0 30px ${colorShadow}`,
        filter: `drop-shadow(0 0 10px ${colorShadow})`,
      }}
    />
  );
}

export function triggerFireworks() {
  playFireworksSounds();
  window.dispatchEvent(new CustomEvent("trigger-fireworks"));
}

/**
 * Generate and play celebratory fireworks sounds using Web Audio API
 */
function playFireworksSounds() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    playOpeningBurst(audioContext, 0);
    playExplosionSequence(audioContext, 0.3);
    playVictoryFanfare(audioContext, 2);
  } catch (error) {
    console.warn("[ChefNet Fireworks] Could not play sounds:", error);
  }
}

function playOpeningBurst(audioContext, startTime) {
  const now = audioContext.currentTime;
  const time = now + startTime;

  // Deep bass boom
  const bassOsc = audioContext.createOscillator();
  const bassGain = audioContext.createGain();
  bassOsc.connect(bassGain);
  bassGain.connect(audioContext.destination);
  
  bassOsc.frequency.setValueAtTime(200, time);
  bassOsc.frequency.exponentialRampToValueAtTime(50, time + 0.15);
  bassOsc.type = "sine";
  
  bassGain.gain.setValueAtTime(0.5, time);
  bassGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
  
  bassOsc.start(time);
  bassOsc.stop(time + 0.15);

  // Bright chime layer
  const chimes = [523.25, 659.25, 783.99, 1046.5];
  chimes.forEach((freq, i) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.frequency.value = freq;
    osc.type = "sine";
    
    const chimeTime = time + i * 0.04;
    gain.gain.setValueAtTime(0, chimeTime);
    gain.gain.linearRampToValueAtTime(0.25, chimeTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, chimeTime + 0.35);
    
    osc.start(chimeTime);
    osc.stop(chimeTime + 0.35);
  });
}

function playExplosionSequence(audioContext, startTime) {
  const now = audioContext.currentTime;
  const times = [0, 0.08, 0.16, 0.25, 0.35, 0.5, 0.7, 0.9, 1.1];

  times.forEach((offset) => {
    const time = now + startTime + offset;
    const bufferSize = audioContext.sampleRate * 0.08;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = noiseBuffer;
    const gain = audioContext.createGain();
    
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

    noise.connect(gain);
    gain.connect(audioContext.destination);

    noise.start(time);
    noise.stop(time + 0.1);

    // Pitch variation
    const freq = 100 + Math.random() * 100;
    const osc = audioContext.createOscillator();
    const oscGain = audioContext.createGain();
    
    osc.connect(oscGain);
    oscGain.connect(audioContext.destination);
    
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.08);
    osc.type = "sine";
    
    oscGain.gain.setValueAtTime(0.15, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
    
    osc.start(time);
    osc.stop(time + 0.08);
  });
}

function playVictoryFanfare(audioContext, startTime) {
  const now = audioContext.currentTime;
  const fanfareNotes = [
    { freq: 523.25, time: 0 },     // C5
    { freq: 659.25, time: 0.15 },  // E5
    { freq: 783.99, time: 0.3 },   // G5
    { freq: 1046.5, time: 0.45 },  // C6
    { freq: 1174.66, time: 0.6 },  // D6
  ];

  fanfareNotes.forEach(({ freq, time }) => {
    const noteTime = now + startTime + time;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.frequency.value = freq;
    osc.type = "sine";
    
    gain.gain.setValueAtTime(0, noteTime);
    gain.gain.linearRampToValueAtTime(0.35, noteTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.4);
    
    osc.start(noteTime);
    osc.stop(noteTime + 0.4);
  });
}

// Add CSS for all animations
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes burst-particle {
      0% {
        opacity: 1;
        transform: translate(0, 0) scale(1) rotate(0deg);
      }
      30% {
        opacity: 1;
        transform: translate(var(--tx) * 0.4, var(--ty) * 0.4) scale(1.15) rotate(90deg);
      }
      60% {
        opacity: 0.8;
        transform: translate(var(--tx) * 0.75, var(--ty) * 0.75) scale(1) rotate(180deg);
      }
      85% {
        opacity: 0.3;
        transform: translate(var(--tx) * 0.95, var(--ty) * 0.95) scale(0.7) rotate(270deg);
      }
      100% {
        opacity: 0;
        transform: translate(var(--tx), var(--ty)) scale(0.3) rotate(360deg);
      }
    }

    @keyframes light-ray-burst {
      0% {
        opacity: 0.9;
        transform: translate(0, 0) scaleY(0.5);
      }
      25% {
        opacity: 0.95;
        transform: translate(var(--tx) * 0.35, var(--ty) * 0.35) scaleY(0.8);
      }
      50% {
        opacity: 0.7;
        transform: translate(var(--tx) * 0.65, var(--ty) * 0.65) scaleY(1);
      }
      75% {
        opacity: 0.3;
        transform: translate(var(--tx) * 0.9, var(--ty) * 0.9) scaleY(1.1);
      }
      100% {
        opacity: 0;
        transform: translate(var(--tx), var(--ty)) scaleY(0.8);
      }
    }


    @keyframes symbol-spin-fall {
      0% {
        transform: translateY(0) rotateZ(0deg) scale(0.8);
        opacity: 1;
      }
      25% {
        transform: translateY(25vh) rotateZ(90deg) scale(1.1);
        opacity: 0.95;
      }
      50% {
        transform: translateY(50vh) rotateZ(180deg) scale(1);
        opacity: 0.8;
      }
      75% {
        transform: translateY(75vh) rotateZ(270deg) scale(0.8);
        opacity: 0.4;
      }
      100% {
        transform: translateY(100vh) rotateZ(360deg) scale(0.5);
        opacity: 0;
      }
    }

    @keyframes glow-burst {
      0% {
        opacity: 1;
        transform: translate(0, 0) scale(1);
      }
      40% {
        opacity: 0.9;
        transform: translate(var(--tx) * 0.5, var(--ty) * 0.5) scale(1.3);
      }
      70% {
        opacity: 0.5;
        transform: translate(var(--tx) * 0.85, var(--ty) * 0.85) scale(1);
      }
      100% {
        opacity: 0;
        transform: translate(var(--tx), var(--ty)) scale(0.3);
      }
    }
  `;
  document.head.appendChild(style);
}
