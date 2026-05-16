import "./global.css";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Editor from "./pages/Editor";
import CakeBuilderPanel from "./entries/CakeBuilderPanel";
import NotFound from "./pages/NotFound";
const App = () => (
  <BrowserRouter>
    {" "}
    <Routes>
      {" "}
      <Route path="/" element={<Index />} />{" "}
      <Route path="/editor" element={<Editor />} />{" "}
      <Route path="/cake-builder" element={<CakeBuilderPanel />} />{" "}
      <Route path="*" element={<NotFound />} />{" "}
    </Routes>{" "}
  </BrowserRouter>
);
createRoot(document.getElementById("root")!).render(<App />);
