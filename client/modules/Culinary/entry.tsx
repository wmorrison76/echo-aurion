import { createRoot } from "react-dom/client";
import CulinaryModule from "./index";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root not found");
}
createRoot(container).render(<CulinaryModule />);
