import React, { useEffect, useState } from "react";
import { X, ChevronRight, Sparkles } from "lucide-react";
interface DemoStep {
  title: string;
  description: string;
  action?: string;
  duration: number;
}
interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}
const demoSteps: DemoStep[] = [
  {
    title: "Create a New Project",
    description: "Start by creating a new blank project in EchoCanva Ai",
    action: "Click 'Create Project'",
    duration: 2000,
  },
  {
    title: "Enter Your AI Prompt",
    description:
      "Describe exactly what image you want to create. Be as detailed as possible.",
    action:
      "Type: 'A futuristic cyberpunk cityscape with neon lights and flying cars'",
    duration: 3000,
  },
  {
    title: "Generate with AI",
    description:
      "Our AI instantly creates your image based on your description",
    action: "Click 'Generate Image'",
    duration: 4000,
  },
  {
    title: "Edit & Refine",
    description:
      "Use professional tools to edit, enhance, and perfect your image",
    action: "Apply filters, adjust colors, add effects",
    duration: 3000,
  },
  {
    title: "Add More Images",
    description:
      "Generate and add additional images as layers for complex compositions",
    action: "Create more AI images and combine them",
    duration: 2500,
  },
  {
    title: "Save & Export",
    description: "Save your project and export in multiple formats",
    action: "Save as PNG, JPG, or PSD",
    duration: 2000,
  },
];
export default function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  useEffect(() => {
    if (!isOpen || !isPlaying) return;
    const timer = setTimeout(() => {
      if (currentStep < demoSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        setIsPlaying(false);
      }
    }, demoSteps[currentStep].duration);
    return () => clearTimeout(timer);
  }, [currentStep, isPlaying, isOpen]);
  if (!isOpen) return null;
  const step = demoSteps[currentStep];
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      {" "}
      <div
        style={{
          backgroundColor: "#0a1a33",
          borderRadius: "12px",
          border: "1px solid rgba(0, 245, 255, 0.3)",
          padding: "48px",
          maxWidth: "600px",
          width: "90%",
          position: "relative",
          boxShadow: "0 20px 60px rgba(0, 245, 255, 0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {" "}
        {/* Close button */}{" "}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "none",
            border: "none",
            color: "#00f0ff",
            cursor: "pointer",
            padding: "8px",
            display: "flex",
          }}
        >
          {" "}
          <X size={20} />{" "}
        </button>{" "}
        {/* Step indicator */}{" "}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "24px",
            justifyContent: "center",
          }}
        >
          {" "}
          {demoSteps.map((_, index) => (
            <div
              key={index}
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor:
                  index === currentStep
                    ? "#00f0ff"
                    : index < currentStep
                      ? "rgba(0, 245, 255, 0.5)"
                      : "rgba(0, 245, 255, 0.2)",
                transition: "all 0.3s ease",
              }}
            />
          ))}{" "}
        </div>{" "}
        {/* Content */}{" "}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          {" "}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "48px",
              height: "48px",
              backgroundColor: "rgba(0, 245, 255, 0.1)",
              borderRadius: "8px",
              marginBottom: "16px",
              margin: "0 auto 16px",
            }}
          >
            {" "}
            <Sparkles size={24} style={{ color: "#00f0ff" }} />{" "}
          </div>{" "}
          <h2
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "#00f0ff",
              marginBottom: "12px",
            }}
          >
            {" "}
            {step.title}{" "}
          </h2>{" "}
          <p
            style={{
              fontSize: "14px",
              color: "rgba(0, 245, 255, 0.7)",
              marginBottom: "16px",
              lineHeight: "1.6",
            }}
          >
            {" "}
            {step.description}{" "}
          </p>{" "}
          {step.action && (
            <div
              style={{
                backgroundColor: "rgba(0, 245, 255, 0.08)",
                border: "1px solid rgba(0, 245, 255, 0.2)",
                borderRadius: "8px",
                padding: "12px 16px",
                fontSize: "12px",
                color: "#00f0ff",
                fontFamily: "monospace",
                marginBottom: "16px",
              }}
            >
              {" "}
              {step.action}{" "}
            </div>
          )}{" "}
        </div>{" "}
        {/* Controls */}{" "}
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          {" "}
          <button
            onClick={() => {
              if (currentStep > 0) {
                setCurrentStep(currentStep - 1);
                setIsPlaying(false);
              }
            }}
            disabled={currentStep === 0}
            style={{
              padding: "10px 20px",
              borderRadius: "6px",
              backgroundColor: "rgba(0, 245, 255, 0.1)",
              border: "1px solid rgba(0, 245, 255, 0.2)",
              color: "#00f0ff",
              cursor: currentStep === 0 ? "not-allowed" : "pointer",
              fontSize: "12px",
              fontWeight: "600",
              opacity: currentStep === 0 ? 0.5 : 1,
              transition: "all 0.2s",
            }}
          >
            {" "}
            Previous{" "}
          </button>{" "}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              padding: "10px 20px",
              borderRadius: "6px",
              backgroundColor: "rgba(0, 245, 255, 0.2)",
              border: "1px solid rgba(0, 245, 255, 0.3)",
              color: "#00f0ff",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
              transition: "all 0.2s",
            }}
          >
            {" "}
            {isPlaying ? "Pause" : "Play"}{" "}
          </button>{" "}
          <button
            onClick={() => {
              if (currentStep < demoSteps.length - 1) {
                setCurrentStep(currentStep + 1);
                setIsPlaying(false);
              }
            }}
            disabled={currentStep === demoSteps.length - 1}
            style={{
              padding: "10px 20px",
              borderRadius: "6px",
              backgroundColor: "rgba(0, 245, 255, 0.1)",
              border: "1px solid rgba(0, 245, 255, 0.2)",
              color: "#00f0ff",
              cursor:
                currentStep === demoSteps.length - 1
                  ? "not-allowed"
                  : "pointer",
              fontSize: "12px",
              fontWeight: "600",
              opacity: currentStep === demoSteps.length - 1 ? 0.5 : 1,
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            disabled={currentStep === demoSteps.length - 1}
          >
            {" "}
            Next <ChevronRight size={14} />{" "}
          </button>{" "}
        </div>{" "}
        {/* Progress text */}{" "}
        <div
          style={{
            marginTop: "16px",
            fontSize: "11px",
            color: "rgba(0, 245, 255, 0.5)",
            textAlign: "center",
          }}
        >
          {" "}
          Step {currentStep + 1} of {demoSteps.length}{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
