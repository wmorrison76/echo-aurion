import { useEffect, useState } from "react";
import { cn } from "@/lib/glass";

interface LoadingTrailProps {
  isLoading?: boolean;
  reduceMotion?: boolean;
}

export default function LoadingTrail({
  isLoading = true,
  reduceMotion = false,
}: LoadingTrailProps) {
  const [particles, setParticles] = useState<
    Array<{ id: string; x: number; y: number; opacity: number }>
  >([]);

  useEffect(() => {
    if (!isLoading || reduceMotion) {
      setParticles([]);
      return;
    }

    const interval = setInterval(() => {
      const newParticles = Array.from({ length: 3 }, (_, i) => ({
        id: `${Date.now()}-${i}`,
        x: Math.random() * 100,
        y: Math.random() * 100,
        opacity: Math.random() * 0.8 + 0.2,
      }));

      setParticles((prev) => [...prev.slice(-8), ...newParticles]);
    }, 100);

    return () => clearInterval(interval);
  }, [isLoading, reduceMotion]);

  if (reduceMotion || !isLoading) return null;

  return (
    <div className="fixed inset-0 pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-1 h-1 rounded-full bg-primary/40 animate-pulse"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            opacity: particle.opacity,
            animation: `fadeOut 1s ease-out forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: scale(0.5);
          }
        }
      `}</style>
    </div>
  );
}
