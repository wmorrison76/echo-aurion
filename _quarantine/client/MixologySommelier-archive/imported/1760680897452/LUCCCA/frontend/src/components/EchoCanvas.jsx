import React, { Suspense } from "react";

// Lazy + resilient import: works whether the page exports default or named "Studio"
const CustomCakeStudio = React.lazy(() =>
  import("../modules/CustomCakeStudio/pages/Studio").then((m) => ({
    default: m.default || m.Studio || (() => (
      <div className="p-3 text-white/80">
        Could not load CustomCakeStudio/pages/Studio.
      </div>
    )),
  }))
);

class EchoBoundary extends React.Component {
  constructor(props){ super(props); this.state = { hasError:false, error:null } }
  static getDerivedStateFromError(err){ return { hasError:true, error:err } }
  componentDidCatch(err, info){ console.error("[EchoCanvas boundary]", err, info) }
  render(){
    if (this.state.hasError){
      return (
        <div className="p-3 text-sm bg-red-900/30 border border-red-700 rounded">
          <div className="font-semibold mb-1">EchoCanvas crashed</div>
          <pre className="text-xs whitespace-pre-wrap">
            {String(this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function EchoCanvas(){
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        // panel-friendly height; adjust if your panel header/footer differ
        height: "calc(100vh - 220px)",
        border: "1px solid rgba(34,211,238,.28)",
        background: "linear-gradient(180deg, rgba(4,10,22,.96), rgba(4,10,22,.92))",
        boxShadow: "0 40px 120px rgba(0,0,0,.55)",
      }}
    >
      <EchoBoundary>
        <Suspense fallback={<div className="p-3 text-white/80">Loading EchoCanvas…</div>}>
          <CustomCakeStudio />
        </Suspense>
      </EchoBoundary>
    </div>
  );
}
