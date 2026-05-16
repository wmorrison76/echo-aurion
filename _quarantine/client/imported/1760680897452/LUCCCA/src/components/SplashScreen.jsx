// src/components/SplashScreen.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SplashScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/dashboard"); // redirect to main dashboard after splash
    }, 1500); // 3.5 seconds

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen bg-white dark:bg-zinc-900">
      <img
        src="/src/assets/logo-animated.png"
        alt="LUCCCA Logo"
        className="h-24 animate-pulse transition-opacity duration-1000"
      />
    </div>
  );
};

export default SplashScreen;
