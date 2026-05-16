import React, { useEffect, useState } from "react";
import { PresentationSlide, CanvasState } from "./types";
interface PresentationSlideViewProps {
  slide: PresentationSlide;
  canvasState: CanvasState;
  isActive: boolean;
  showAnimations?: boolean;
}
interface AnimatedElement {
  elementId: string;
  isVisible: boolean;
  delay: number;
  animationType: string;
}
export const PresentationSlideView: React.FC<PresentationSlideViewProps> = ({
  slide,
  canvasState,
  isActive,
  showAnimations = true,
}) => {
  const [animatedElements, setAnimatedElements] = useState<AnimatedElement[]>(
    [],
  );
  useEffect(() => {
    if (!isActive) {
      setAnimatedElements([]);
      return;
    }
    if (!showAnimations) {
      setAnimatedElements(
        slide.elements.map((el) => ({
          elementId: el.id,
          isVisible: true,
          delay: 0,
          animationType: "none",
        })),
      );
      return;
    }
    setAnimatedElements(
      slide.elements.map((el) => ({
        elementId: el.id,
        isVisible: false,
        delay: el.animationDelay || 0,
        animationType: el.animationType || "fade-in",
      })),
    );
    const timers = slide.elements.map((el, idx) => {
      return setTimeout(
        () => {
          setAnimatedElements((prev) =>
            prev.map((anim) =>
              anim.elementId === el.id ? { ...anim, isVisible: true } : anim,
            ),
          );
        },
        el.animationDelay || idx * 100,
      );
    });
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [isActive, slide.elements, showAnimations]);
  const getElementContent = (elementId: string, kind: string) => {
    switch (kind) {
      case "shape":
        const shape = canvasState.shapes.find((s) => s.id === elementId);
        if (!shape) return null;
        return (
          <div
            key={shape.id}
            style={{
              position: "absolute",
              left: `${shape.x}px`,
              top: `${shape.y}px`,
              width: `${shape.width}px`,
              height: `${shape.height}px`,
              backgroundColor: shape.fillColor || shape.color,
              opacity: shape.opacity,
              transform: shape.rotation
                ? `rotate(${shape.rotation}deg)`
                : "none",
              borderRadius: shape.type === "circle" ? "50%" : "8px",
              border: `${shape.lineWidth}px solid ${shape.color}`,
            }}
          />
        );
      case "text":
        const text = canvasState.texts.find((t) => t.id === elementId);
        if (!text) return null;
        return (
          <div
            key={text.id}
            style={{
              position: "absolute",
              left: `${text.x}px`,
              top: `${text.y}px`,
              color: text.color,
              fontSize: `${text.fontSize}px`,
              fontFamily: text.fontFamily,
              fontWeight: text.fontWeight || "normal",
              fontStyle: text.isItalic ? "italic" : "normal",
              textDecoration: text.isUnderline ? "underline" : "none",
              textAlign: text.textAlign || "left",
              opacity: text.fontSize ? 1 : 0.7,
            }}
            className="max-w-sm"
          >
            {" "}
            {text.text}{" "}
          </div>
        );
      case "sticky":
        const sticky = canvasState.stickyNotes.find((s) => s.id === elementId);
        if (!sticky) return null;
        const stickyColors: Record<string, string> = {
          yellow: "#fef3c7",
          pink: "#fbcfe8",
          blue: "#bfdbfe",
          green: "#bbf7d0",
          purple: "#e9d5ff",
          orange: "#fed7aa",
        };
        return (
          <div
            key={sticky.id}
            style={{
              position: "absolute",
              left: `${sticky.x}px`,
              top: `${sticky.y}px`,
              width: `${sticky.width}px`,
              height: `${sticky.height}px`,
              backgroundColor: stickyColors[sticky.color] || "#fef3c7",
              padding: "12px",
              borderRadius: "4px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              fontSize: "14px",
              overflow: "hidden",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {" "}
            {sticky.text}{" "}
          </div>
        );
      case "image":
        const image = canvasState.images.find((i) => i.id === elementId);
        if (!image) return null;
        return (
          <img
            key={image.id}
            src={image.fileUrl}
            alt={image.fileName}
            style={{
              position: "absolute",
              left: `${image.x}px`,
              top: `${image.y}px`,
              width: `${image.width}px`,
              height: `${image.height}px`,
              opacity: image.opacity,
              transform: image.rotation
                ? `rotate(${image.rotation}deg)`
                : "none",
              objectFit: "cover",
              borderRadius: "8px",
            }}
          />
        );
      case "pdf":
        const pdf = canvasState.pdfs.find((p) => p.id === elementId);
        if (!pdf) return null;
        return (
          <div
            key={pdf.id}
            style={{
              position: "absolute",
              left: `${pdf.x}px`,
              top: `${pdf.y}px`,
              width: `${pdf.width}px`,
              height: `${pdf.height}px`,
              opacity: pdf.opacity,
              backgroundColor: "#f3f4f6",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6b7280",
              fontSize: "12px",
            }}
          >
            {" "}
            PDF: {pdf.fileName} (Page {pdf.pageNumber}){" "}
          </div>
        );
      default:
        return null;
    }
  };
  const animatedElementMap = new Map(
    animatedElements.map((el) => [el.elementId, el]),
  );
  return (
    <div
      className="w-full h-full relative overflow-hidden transition-all duration-500"
      style={{
        backgroundColor: slide.backgroundColor || canvasState.backgroundColor,
      }}
    >
      {" "}
      {/* Slide Title */}{" "}
      <div className="absolute top-8 left-8 right-8">
        {" "}
        <h1 className="text-4xl font-bold text-gray-900">{slide.title}</h1>{" "}
        {slide.description && (
          <p className="text-lg text-muted-foreground mt-2">
            {slide.description}
          </p>
        )}{" "}
      </div>{" "}
      {/* Animated Elements */}{" "}
      <div className="relative w-full h-full pt-32">
        {" "}
        {slide.elements.map((element) => {
          const animated = animatedElementMap.get(element.id);
          if (!animated) return null;
          const getAnimationClass = () => {
            if (!showAnimations || animated.animationType === "none") {
              return "";
            }
            const baseClass = "transition-all duration-500";
            switch (animated.animationType) {
              case "fade-in":
                return `${baseClass} ${animated.isVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`;
              case "slide-in":
                return `${baseClass} ${animated.isVisible ? "translate-x-0 opacity-100" : "-translate-x-12 opacity-0 pointer-events-none"}`;
              case "zoom-in":
                return `${baseClass} ${animated.isVisible ? "scale-100 opacity-100" : "scale-75 opacity-0 pointer-events-none"}`;
              default:
                return "";
            }
          };
          return (
            <div
              key={element.id}
              style={{ animationDelay: `${animated.delay}ms` }}
              className={getAnimationClass()}
            >
              {" "}
              {getElementContent(element.id, element.kind)}{" "}
            </div>
          );
        })}{" "}
      </div>{" "}
      {/* Slide Number */}{" "}
      <div className="absolute bottom-4 right-4 text-sm text-muted-foreground">
        {" "}
        {slide.description || "Slide"}{" "}
      </div>{" "}
    </div>
  );
};
export default PresentationSlideView;
