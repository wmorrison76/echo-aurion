// File: src/components/CrashTest.jsx
import React from "react";

const CrashTest = () => {
  throw new Error("🔥 Intentional crash triggered in CrashTest component.");
};

export default CrashTest;
