import React, { useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ToolsPanelScrollWrapperProps {
  children: React.ReactNode;
  maxHeight?: number;
}

export default function ToolsPanelScrollWrapper({
  children,
  maxHeight = 400,
}: ToolsPanelScrollWrapperProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;

    setCanScrollUp(scrollTop > 0);
    setCanScrollDown(scrollTop < scrollHeight - clientHeight - 5);
  };

  const scroll = (direction: "up" | "down") => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = 100;
    scrollContainerRef.current.scrollBy({
      top: direction === "up" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;

    // Allow scroll if we haven't reached the end
    if (e.deltaY < 0 && scrollTop === 0) {
      // Scrolling up at top
      e.preventDefault();
    } else if (e.deltaY > 0 && scrollTop >= scrollHeight - clientHeight) {
      // Scrolling down at bottom
      e.preventDefault();
    }
  };

  React.useEffect(() => {
    handleScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, []);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Scroll Up Arrow */}
      {canScrollUp && (
        <button
          onClick={() => scroll("up")}
          style={{
            position: "absolute",
            top: "0",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            width: "24px",
            height: "20px",
            backgroundColor: "rgba(0, 240, 255, 0.1)",
            border: "1px solid #c8a97e",
            borderBottom: "none",
            color: "#c8a97e",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderTopLeftRadius: "4px",
            borderTopRightRadius: "4px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "rgba(0, 240, 255, 0.2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "rgba(0, 240, 255, 0.1)";
          }}
          title="Scroll up (more tools available)"
        >
          <ChevronUp size={14} />
        </button>
      )}

      {/* Scrollable Content */}
      <div
        ref={scrollContainerRef}
        onWheel={handleWheel}
        style={{
          flex: 1,
          overflowY: "auto",
          maxHeight: `${maxHeight}px`,
          paddingTop: canScrollUp ? "20px" : "0",
          paddingBottom: canScrollDown ? "20px" : "0",
          scrollBehavior: "smooth",
        }}
      >
        {children}
      </div>

      {/* Scroll Down Arrow */}
      {canScrollDown && (
        <button
          onClick={() => scroll("down")}
          style={{
            position: "absolute",
            bottom: "0",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            width: "24px",
            height: "20px",
            backgroundColor: "rgba(0, 240, 255, 0.1)",
            border: "1px solid #c8a97e",
            borderTop: "none",
            color: "#c8a97e",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottomLeftRadius: "4px",
            borderBottomRightRadius: "4px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "rgba(0, 240, 255, 0.2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "rgba(0, 240, 255, 0.1)";
          }}
          title="Scroll down (more tools available)"
        >
          <ChevronDown size={14} />
        </button>
      )}

      <style>{`
        div::-webkit-scrollbar {
          width: 6px;
        }
        div::-webkit-scrollbar-track {
          background: rgba(0, 240, 255, 0.05);
        }
        div::-webkit-scrollbar-thumb {
          background: rgba(0, 240, 255, 0.2);
          border-radius: 3px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 240, 255, 0.3);
        }
      `}</style>
    </div>
  );
}
