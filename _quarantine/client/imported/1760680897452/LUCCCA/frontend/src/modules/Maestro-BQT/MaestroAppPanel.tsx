import React from "react";
import "./client/global.css";
import App from "./client/App";
export default function MaestroBqtPanel(props: any) {
  return <div className="h-full w-full overflow-auto"><App {...props} /></div>;
}
