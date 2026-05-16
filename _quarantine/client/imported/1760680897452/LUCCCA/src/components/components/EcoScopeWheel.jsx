import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const wheelItems = [
  { id: "spend", label: "Spend Forecast", description: "Echo helps predict spend trends and upsell windows." },
  { id: "menu", label: "Menu Builder", description: "Compose stunning, costed menus with chef-driven inputs." },
  { id: "guest", label: "Guest Profiles", description: "Store preferences, allergies, and booking history." },
  { id: "qr", label: "QR Generator", description: "Auto-generate interactive menus with scan-to-view access." },
];

export default function EchoScopeWheel() {
  const [activeItem, setActiveItem] = useState(wheelItems[0]);

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <div className="w-1/2 p-10 flex flex-col justify-center text-black bg-white shadow-inner z-10">
        <h2 className="text-2xl font-bold mb-4">{activeItem.label}</h2>
        <p className="text-sm text-gray-600">{activeItem.description}</p>
      </div>

      {/* Right Wheel */}
      <div className="w-1/2 relative flex items-center justify-center">
        <motion.div
          className="w-[500px] h-[500px] rounded-full border-4 border-gold bg-black text-white flex flex-wrap items-center justify-center shadow-2xl"
          initial={{ rotate: -15 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 1 }}
        >
          {wheelItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveItem(item)}
              className="m-2 p-4 bg-gold text-black rounded-full hover:scale-105 transition-transform text-xs"
            >
              {item.label}
            </button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
