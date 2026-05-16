import { useState, useRef, useEffect } from "react";
import { Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FontStyle } from "@/components/RDLab/EnhancedLabWhiteboard";

interface LabSettingsPopupProps {
  fontStyle: FontStyle;
  onFontStyleChange: (style: FontStyle) => void;
  onClose?: () => void;
}

export function LabSettingsPopup({
  fontStyle,
  onFontStyleChange,
  onClose,
}: LabSettingsPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleFontChange = (style: FontStyle) => {
    onFontStyleChange(style);
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  return (
    <div className="relative">
      {/* Settings Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-full hover:bg-slate-700/30 transition-colors duration-200 group"
        title="Lab Settings"
      >
        <Settings className="h-5 w-5 text-slate-400 group-hover:text-slate-200 group-hover:rotate-90 transition-all duration-300" />
      </button>

      {/* Apple-style Popup */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 mt-2 w-64 bg-slate-900/95 border border-slate-700/50 rounded-xl shadow-2xl backdrop-blur-md z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/30 bg-gradient-to-r from-slate-900 to-slate-800/50">
            <h3 className="text-sm font-semibold text-slate-100">Lab Settings</h3>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-slate-700/50 rounded-md transition-colors"
            >
              <X className="h-4 w-4 text-slate-400 hover:text-slate-200" />
            </button>
          </div>

          {/* Settings Content */}
          <div className="p-4 space-y-6">
            {/* Font Style Section */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Font Style
              </label>

              <div className="space-y-2">
                {/* Chalkboard Option */}
                <button
                  onClick={() => {
                    handleFontChange("chalkboard");
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-lg border transition-all duration-200 text-left group ${
                    fontStyle === "chalkboard"
                      ? "bg-amber-600/20 border-amber-500/50 shadow-lg shadow-amber-500/10"
                      : "border-slate-600/30 hover:border-amber-500/30 hover:bg-amber-600/10"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-100 group-hover:text-amber-200 transition-colors">
                        Chalkboard
                      </p>
                      <p
                        className="text-xs text-slate-400 mt-1"
                        style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}
                      >
                        Handwritten style...
                      </p>
                    </div>
                    {fontStyle === "chalkboard" && (
                      <div className="h-2 w-2 rounded-full bg-amber-400 mt-1.5" />
                    )}
                  </div>
                </button>

                {/* Teletype Option */}
                <button
                  onClick={() => {
                    handleFontChange("teletype");
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-lg border transition-all duration-200 text-left group ${
                    fontStyle === "teletype"
                      ? "bg-green-600/20 border-green-500/50 shadow-lg shadow-green-500/10"
                      : "border-slate-600/30 hover:border-green-500/30 hover:bg-green-600/10"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-100 group-hover:text-green-200 transition-colors">
                        Teletype
                      </p>
                      <p
                        className="text-xs text-slate-400 mt-1 font-mono tracking-tight"
                        style={{ fontSize: "11px" }}
                      >
                        // Technical style...
                      </p>
                    </div>
                    {fontStyle === "teletype" && (
                      <div className="h-2 w-2 rounded-full bg-green-400 mt-1.5" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Info Section */}
            <div className="border-t border-slate-700/30 pt-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Your preference is saved automatically with this lab session.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-slate-700/30 bg-slate-900/50 space-y-2">
            <p className="text-xs text-slate-500">
              💡 Tip: Switch fonts anytime during your session.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
