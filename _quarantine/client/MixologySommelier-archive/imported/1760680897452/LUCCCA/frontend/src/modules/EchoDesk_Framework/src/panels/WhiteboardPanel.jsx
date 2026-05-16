import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Pin, PinOff, ChevronDown,
  PenLine, Highlighter, Brush, Pencil, Eraser, StickyNote,
  Shapes, Type, ImagePlus, LayoutTemplate, MousePointer2,
  Undo2, Redo2, Download, Trash2,
  Calendar, ChartNoAxesCombined, PieChart, Users,
  Camera, CameraOff, Mic, MicOff, Video
} from "lucide-react";

/**
 * EchoDesk Whiteboard – mock-accurate shell + real drawing + meeting stubs
 * - Top app bar: draggable, pin, collapses orange
 * - Left rail: pin, tools, Pen flyout (pencil/brush/marker/highlighter)
 * - Canvas: pen/highlighter/eraser w/ size & color + undo/redo/export/clear
 * - Members + meeting controls (camera/mic/background stub)
 * - Avatar pulled from SettingsSuite (lu:settings:apply)
 */

const LS = {
  topX: "ed:wb:top:x",
  topPinned: "ed:wb:top:pinned",
  railPinned: "ed:wb:rail:pinned",
  color: "ed:wb:tool:color",
  size: "ed:wb:tool:size",
  instrument: "ed:wb:tool:instrument",
};

export default function WhiteboardPanel() {
  /* ───────── top app bar state (draggable + pin + collapse) ───────── */
  const [topPinned, setTopPinned] = useState(() => (localStorage.getItem(LS.topPinned) ?? "true") === "true");
  const [topCollapsed, setTopCollapsed] = useState(false);
  const [topX, setTopX] = useState(() => {
    const raw = localStorage.getItem(LS.topX);
    return Number.isFinite(+raw) ? +raw : 12;
  });
  useEffect(() => localStorage.setItem(LS.topPinned, String(topPinned)), [topPinned]);
  useEffect(() => localStorage.setItem(LS.topX, String(topX)), [topX]);

  // drag along top
  const topRef = useRef(null);
  useEffect(() => {
    const el = topRef.current; if (!el) return;
    let sx=0, ox=0, drag=false;
    const md = (e) => { if (e.target.closest(".ed-top-right")) return; drag=true; sx=e.clientX; ox=topX; e.preventDefault(); };
    const mm = (e) => { if (!drag) return; setTopX(Math.max(12, Math.min(window.innerWidth-420, ox + (e.clientX-sx)))); };
    const mu = () => { drag=false; };
    el.addEventListener("mousedown", md);
    window.addEventListener("mousemove", mm);
    window.addEventListener("mouseup", mu);
    return () => { el.removeEventListener("mousedown", md); window.removeEventListener("mousemove", mm); window.removeEventListener("mouseup", mu); };
  }, [topX]);

  /* ───────── left rail state ───────── */
  const [railPinned, setRailPinned] = useState(() => (localStorage.getItem(LS.railPinned) ?? "true") === "true");
  useEffect(() => localStorage.setItem(LS.railPinned, String(railPinned)), [railPinned]);

  /* ───────── drawing tool state ───────── */
  const [tool, setTool] = useState("pen");
  const [penFly, setPenFly] = useState(false);
  const [instrument, setInstrument] = useState(localStorage.getItem(LS.instrument) || "pencil"); // pencil|brush|marker|highlighter
  const [color, setColor] = useState(localStorage.getItem(LS.color) || "#8be9fd");
  const [size, setSize] = useState(() => +localStorage.getItem(LS.size) || 6);
  useEffect(() => localStorage.setItem(LS.instrument, instrument), [instrument]);
  useEffect(() => localStorage.setItem(LS.color, color), [color]);
  useEffect(() => localStorage.setItem(LS.size, String(size)), [size]);

  /* ───────── meeting state (stubs) ───────── */
  const [meeting, setMeeting] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [bg, setBg] = useState("none"); // none | blur | kitchen | gradient

  /* ───────── avatar from SettingsSuite ───────── */
  const [avatar, setAvatar] = useState(null);
  useEffect(() => {
    const update = (e) => {
      const { avatar: a } = e.detail || {};
      setAvatar(a || null);
    };
    window.addEventListener("lu:settings:apply", update);
    return () => window.removeEventListener("lu:settings:apply", update);
  }, []);

  /* ───────── canvas drawing ───────── */
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawingRef = useRef(false);
  const history = useRef([]);       // stack of ImageData
  const future = useRef([]);

  const pushHistory = () => {
    const c = canvasRef.current; if (!c) return;
    const ctx = ctxRef.current; if (!ctx) return;
    try {
      history.current.push(ctx.getImageData(0,0,c.width,c.height));
      if (history.current.length > 40) history.current.shift();
      future.current = [];
    } catch {}
  };

  const resizeCanvasToParent = () => {
    const c = canvasRef.current; if (!c) return;
    const parent = c.parentElement; if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== Math.floor(rect.width*dpr) || c.height !== Math.floor(rect.height*dpr)) {
      c.width = Math.floor(rect.width*dpr);
      c.height = Math.floor(rect.height*dpr);
      c.style.width = rect.width + "px";
      c.style.height = rect.height + "px";
      const ctx = c.getContext("2d");
      ctx.scale(dpr, dpr);
      ctxRef.current = ctx;
      // reset style
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
    }
  };

  useEffect(() => {
    resizeCanvasToParent();
    const ro = new ResizeObserver(resizeCanvasToParent);
    ro.observe(canvasRef.current.parentElement);
    return () => ro.disconnect();
  }, []);

  // update brush on changes
  useEffect(() => {
    const ctx = ctxRef.current; if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
  }, [color, size]);

  const pointer = useRef({ x:0, y:0 });

  const setBlendForTool = (ctx) => {
    if (tool === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 1;
    } else if (instrument === "highlighter" || tool === "hl") {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.35;
    } else if (instrument === "marker") {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.8;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
  };

  const onDown = (e) => {
    if (!["pen","hl","erase"].includes(tool)) return;
    const rect = canvasRef.current.getBoundingClientRect();
    pointer.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const ctx = ctxRef.current; if (!ctx) return;
    pushHistory();
    drawingRef.current = true;
    setBlendForTool(ctx);
    ctx.beginPath();
    ctx.moveTo(pointer.current.x, pointer.current.y);
  };
  const onMove = (e) => {
    if (!drawingRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const ctx = ctxRef.current; if (!ctx) return;
    ctx.lineWidth = size;
    ctx.strokeStyle = color;
    ctx.lineTo(x,y);
    ctx.stroke();
  };
  const onUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const ctx = ctxRef.current; if (!ctx) return;
    ctx.closePath();
  };

  const doUndo = () => {
    const ctx = ctxRef.current; const c = canvasRef.current;
    if (!ctx || !c) return;
    if (history.current.length) {
      const prev = history.current.pop();
      try {
        future.current.push(ctx.getImageData(0,0,c.width,c.height));
        ctx.putImageData(prev,0,0);
      } catch {}
    }
  };
  const doRedo = () => {
    const ctx = ctxRef.current; const c = canvasRef.current;
    if (!ctx || !c) return;
    if (future.current.length) {
      const next = future.current.pop();
      try {
        history.current.push(ctx.getImageData(0,0,c.width,c.height));
        ctx.putImageData(next,0,0);
      } catch {}
    }
  };
  const doExport = () => {
    const c = canvasRef.current; if (!c) return;
    const a = document.createElement("a");
    a.download = "whiteboard.png";
    a.href = c.toDataURL("image/png");
    a.click();
  };
  const doClear = () => {
    const ctx = ctxRef.current; const c = canvasRef.current;
    if (!ctx || !c) return;
    pushHistory();
    ctx.clearRect(0,0,c.width,c.height);
  };

  /* ───────── mock data ───────── */
  const members = useMemo(
    () => [
      { id: "1", name: "Emily Davis" },
      { id: "2", name: "Jane Smith" },
      { id: "3", name: "Robert Johnson" },
      { id: "4", name: "Michael Lee" },
    ], []);

  return (
    <div className="ed-wb">
      {/* ───────────────── top menu/app bar (draggable) ───────────────── */}
      <div
        ref={topRef}
        className={["ed-top", topCollapsed ? "is-collapsed" : ""].join(" ")}
        style={{ left: topX }}
        onMouseEnter={() => setTopCollapsed(false)}
        onMouseLeave={() => { if (!topPinned) setTopCollapsed(true); }}
      >
        <div className="ed-top-shell">
          <div className="ed-menublock">
            <div className="ed-menubar">
              <button>File</button>
              <button>Edit</button>
              <button>View</button>
              <button>Insert</button>
              <button>Templates</button>
              <button>…</button>
              <div className="grow" />
              <span className="ed-kicker">F7 Spell Check / Fuzzy Spelling</span>
              <div className="grow" />
              <button className="ed-pill">Themes</button>
              <button className="ed-link">Dark / Light</button>
            </div>
            <div className="ed-crumbs">
              <span className="ed-link">Filimté Canvas</span>
              <span className="dot">•</span>
              <span className="ed-link">Incredé</span>
            </div>
          </div>

          <div className="ed-top-right">
            <div className="ed-export">
              <span>Export</span>
              <button className="ed-link">PDF</button>
              <button className="ed-link">PNG</button>
              <button className="ed-link">MP4</button>
              <button className="ed-link">JSON</button>
            </div>

            {/* moved pin here */}
            <div className="ed-top-controls">
              <button
                className={"ed-btn " + (topPinned ? "is-on" : "")}
                title={topPinned ? "Unpin app bar" : "Pin app bar"}
                onClick={() => setTopPinned(v => !v)}
              >
                {topPinned ? <Pin size={15} /> : <PinOff size={15} />}
              </button>
              <button
                className="ed-btn"
                title={topCollapsed ? "Expand app bar" : "Collapse app bar"}
                onClick={() => setTopCollapsed(v => !v)}
              >
                <ChevronDown size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────── left rail ───────────────── */}
      <aside className={["ed-rail", railPinned ? "is-pinned" : ""].join(" ")}>
        <div className="rail-head">Toolbar</div>

        <ToolButton
          icon={<PenLine size={18}/>} label="Pen"
          active={tool === "pen"} onClick={() => { setTool("pen"); setPenFly(v=>!v); }}
          onMouseLeave={() => setPenFly(false)}
        />
        {penFly && (
          <div className="pen-fly">
            <FlyItem icon={<Pencil size={15}/>}  label="Pencil"      active={instrument==="pencil"}      onClick={()=>setInstrument("pencil")} />
            <FlyItem icon={<Brush size={15}/>}   label="Brush"       active={instrument==="brush"}       onClick={()=>setInstrument("brush")} />
            <FlyItem icon={<PenLine size={15}/>} label="Marker"      active={instrument==="marker"}      onClick={()=>setInstrument("marker")} />
            <FlyItem icon={<Highlighter size={15}/>} label="Highlighter" active={instrument==="highlighter"} onClick={()=>setInstrument("highlighter")} />
          </div>
        )}

        <ToolButton icon={<Highlighter size={18}/>} label="Highlighter"
          active={tool==="hl"} onClick={()=>{ setTool("hl"); setPenFly(false); }} />
        <ToolButton icon={<Shapes size={18}/>} label="Shapes" active={tool==="shape"} onClick={()=>setTool("shape")} />
        <ToolButton icon={<Type size={18}/>} label="Text" active={tool==="text"} onClick={()=>setTool("text")} />
        <ToolButton icon={<Eraser size={18}/>} label="Eraser" active={tool==="erase"} onClick={()=>setTool("erase")} />
        <ToolButton icon={<StickyNote size={18}/>} label="Stickynote" active={tool==="note"} onClick={()=>setTool("note")} />
        <ToolButton icon={<ImagePlus size={18}/>} label="Media" active={tool==="media"} onClick={()=>setTool("media")} />
        <ToolButton icon={<LayoutTemplate size={18}/>} label="Templates" active={tool==="tmpl"} onClick={()=>setTool("tmpl")} />
        <ToolButton icon={<MousePointer2 size={18}/>} label="Pointer" active={tool==="ptr"} onClick={()=>setTool("ptr")} />

        <div className="rail-sep" />
        <div className="rail-subhead">Hospitality Shortcuts</div>
        <div className="hosp-grid">
          <SmallIcon><Video size={16} /></SmallIcon>
          <SmallIcon><Mic size={16} /></SmallIcon>
          <SmallIcon><Camera size={16} /></SmallIcon>
          <SmallIcon><LayoutTemplate size={16} /></SmallIcon>
          <SmallIcon><StickyNote size={16} /></SmallIcon>
          <SmallIcon><Shapes size={16} /></SmallIcon>
        </div>

        <div className="rail-sep" />
        <div className="rail-controls">
          <div className="row"><label className="lab">Color</label>
            <input className="chip-color" type="color" value={color} onChange={(e)=>setColor(e.target.value)} />
          </div>
          <div className="row"><label className="lab">Size</label>
            <input className="chip-range" type="range" min={1} max={48} value={size} onChange={(e)=>setSize(+e.target.value)} />
          </div>
          <div className="row gap">
            <button className="chip-btn" title="Undo" onClick={doUndo}><Undo2 size={16}/></button>
            <button className="chip-btn" title="Redo" onClick={doRedo}><Redo2 size={16}/></button>
            <button className="chip-btn" title="Export PNG" onClick={doExport}><Download size={16}/></button>
            <button className="chip-btn" title="Clear" onClick={doClear}><Trash2 size={16}/></button>
          </div>
        </div>

        <button
          className={"rail-pin " + (railPinned ? "is-on" : "")}
          title={railPinned ? "Unpin toolbar" : "Pin toolbar"}
          onClick={() => setRailPinned(v => !v)}
        >
          {railPinned ? <Pin size={15}/> : <PinOff size={15}/>}
        </button>
      </aside>

      {/* ───────────────── right members & meeting ───────────────── */}
      <aside className="ed-members">
        <div className="m-card">
          <div className="m-head"><Users size={16}/> <span>Members Panel</span></div>

          <div className="m-list">
            {members.map(m => (
              <div key={m.id} className="m-row">
                <div className="m-avatar">{initials(m.name)}</div>
                <div className="m-name">{m.name}</div>
              </div>
            ))}
          </div>

          <div className="m-controls">
            <button className={"chip-btn " + (meeting?"is-on":"")} onClick={()=>setMeeting(v=>!v)}>
              <Video size={16}/> <span>{meeting ? "End" : "Start"} meeting</span>
            </button>
            <button className={"chip-btn " + (camOn?"is-on":"")} onClick={()=>setCamOn(v=>!v)}>
              {camOn? <Camera size={16}/>:<CameraOff size={16}/>} <span>{camOn?"Camera on":"Camera off"}</span>
            </button>
            <button className={"chip-btn " + (micOn?"is-on":"")} onClick={()=>setMicOn(v=>!v)}>
              {micOn? <Mic size={16}/>:<MicOff size={16}/>} <span>{micOn?"Mic on":"Mic off"}</span>
            </button>
            <div className="bg-row">
              <label>Background</label>
              <select value={bg} onChange={(e)=>setBg(e.target.value)}>
                <option value="none">None</option>
                <option value="blur">Blur</option>
                <option value="kitchen">Kitchen</option>
                <option value="gradient">Gradient</option>
              </select>
            </div>
          </div>
        </div>
      </aside>

      {/* ───────────────── canvas zone ───────────────── */}
      <main className="ed-canvas">
        {/* avatar bubble (from SettingsSuite) */}
        <div className="my-avatar" title="You">
          {avatar?.url ? <img src={avatar.url} alt="" /> : <div className="inits">Y</div>}
        </div>

        {/* grid backdrop */}
        <div className="grid-wrap">
          <div className="card post yellow"><div className="t">Prep<br/>Timelines</div></div>
          <div className="card post pink"><div className="t">Floor<br/>Plans</div></div>
          <div className="card post cyan"><div className="t">AI Notes<br/>&nbsp;Summaries</div></div>

          <div className="card panel">
            <div className="ph-head"><Calendar size={14}/> Live Calendar</div>
            <div className="ph-graph bars"><div/><div/><div/><div/><div/><div/></div>
          </div>

          <div className="card panel">
            <div className="ph-head"><ChartNoAxesCombined size={14}/> Dashboards (Drag-In)</div>
            <div className="ph-graph line" />
            <div className="ph-graph pie"><PieChart size={40} /></div>
          </div>

          <div className="card panel recipe">
            <div className="ph-head">Recipe</div>
            <ul className="recipe-list">
              <li><span>32</span> Chicken ✓</li>
              <li><span>2</span> Broth ✓</li>
              <li><span>1</span> Onion ✓</li>
              <li><span>3</span> Cloves Garlic ✓</li>
            </ul>
          </div>
        </div>

        {/* actual drawing canvas on top */}
        <canvas
          ref={canvasRef}
          className="draw-surface"
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
        />
      </main>

      {/* ───────────────── styles ───────────────── */}
      <style>{`
        :root { --c-cyan: rgba(22,224,255,.55); --c-border: rgba(22,224,255,.25); --c-bg: rgba(10,16,28,.78); }
        .ed-wb{ position:relative; width:100%; height:100%; border-radius:18px; overflow:hidden;
          background: radial-gradient(900px 600px at 50% -10%, rgba(255,255,255,.06), transparent 60%), #0b111a; }

        /* top app bar */
        .ed-top{ position:absolute; top:8px; z-index:20; transition:transform .25s, opacity .25s; }
        .ed-top-shell{ display:flex; align-items:flex-start; gap:12px; padding:8px 10px; border-radius:14px;
          background: var(--c-bg); border:1px solid var(--c-border);
          box-shadow: 0 18px 60px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.05);
          backdrop-filter: blur(10px); cursor:grab; }
        .ed-top.is-collapsed .ed-top-shell{
          background: rgba(255,160,60,.25); border-color: rgba(255,160,60,.45);
          box-shadow: 0 18px 60px rgba(255,160,60,.18), inset 0 0 0 1px rgba(255,255,255,.04);
        }
        .ed-menublock{ min-width:520px; }
        .ed-menubar{ display:flex; align-items:center; gap:10px; }
        .ed-menubar > button{ font-size:12px; padding:4px 8px; border-radius:8px; background:rgba(255,255,255,.05); border:1px solid var(--c-border); color:#eaf7fb; }
        .ed-menubar > button:hover{ background:rgba(255,255,255,.08); }
        .ed-pill{ border-radius:9999px !important; }
        .ed-link{ background:transparent !important; border-color:transparent !important; color:#94eaff !important; text-decoration:underline; }
        .ed-kicker{ font-size:12px; opacity:.85; color:#d7f6ff; }
        .ed-crumbs{ margin-top:4px; font-size:12px; color:#c9deea; display:flex; gap:10px; align-items:center; }
        .dot{ opacity:.5; }
        .grow{ flex:1; }
        .ed-top-right{ display:flex; align-items:center; gap:10px; }
        .ed-export{ display:flex; gap:10px; align-items:center; color:#eaf7fb; font-size:12px; }
        .ed-top-controls{ display:flex; gap:6px; }
        .ed-btn{ height:28px; min-width:28px; padding:0 6px; border-radius:8px; border:1px solid var(--c-border); background:rgba(255,255,255,.06); color:#d7f6ff; }
        .ed-btn.is-on{ outline:2px solid var(--c-cyan); }

        /* left rail */
        .ed-rail{ position:absolute; top:70px; bottom:12px; left:12px; width:58px; z-index:18; transition: width .2s, transform .25s, opacity .25s; }
        .ed-rail:not(.is-pinned){ transform: translateX(calc(-100% + 16px)); opacity:.98; }
        .ed-rail:hover, .ed-rail.is-pinned{ width:210px; transform: translateX(0); }
        .rail-head{ margin:0 0 8px 0; font-weight:700; color:#eaf7fb; font-size:13px; }
        .tool-btn{ position:relative; display:flex; align-items:center; gap:10px; height:36px; padding:0 10px; margin:3px 0;
          border-radius:10px; border:1px solid var(--c-border); background:rgba(255,255,255,.04); color:#d7f6ff; }
        .tool-btn:hover{ background:rgba(255,255,255,.08); }
        .tool-btn.is-active{ outline:2px solid var(--c-cyan); }
        .lab{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .pen-fly{ position:absolute; left:210px; top:0; display:grid; gap:6px; padding:8px; border-radius:10px;
          background:rgba(10,16,28,.92); border:1px solid var(--c-border); backdrop-filter: blur(8px); }
        .fly-item{ display:flex; align-items:center; gap:8px; height:30px; padding:0 10px; border-radius:8px; border:1px solid var(--c-border); background:rgba(255,255,255,.03); color:#d7f6ff; }
        .fly-item.is-active{ outline:2px solid var(--c-cyan); }
        .rail-sep{ height:10px; }
        .rail-subhead{ margin:8px 0 6px; font-size:12px; color:#cfefff; opacity:.9; }
        .hosp-grid{ display:grid; grid-template-columns: repeat(3, 1fr); gap:6px; }
        .small-ic{ height:30px; border-radius:8px; display:grid; place-items:center; border:1px solid var(--c-border); background:rgba(255,255,255,.04); color:#d7f6ff; }
        .rail-controls{ margin-top:8px; display:grid; gap:8px; }
        .row{ display:flex; align-items:center; gap:8px; }
        .row.gap{ gap:6px; }
        .chip-color{ width:40px; height:32px; border:1px solid var(--c-border); border-radius:8px; background:transparent; padding:0; }
        .chip-range{ flex:1; }
        .chip-btn{ height:32px; min-width:32px; border-radius:8px; border:1px solid var(--c-border); background:rgba(255,255,255,.06); color:#d7f6ff; display:flex; align-items:center; gap:6px; padding:0 8px; }
        .rail-pin{ position:absolute; bottom:8px; left:8px; right:8px; height:32px; border-radius:10px; border:1px solid var(--c-border); background:rgba(255,255,255,.06); color:#d7f6ff; }
        .rail-pin.is-on{ outline:2px solid var(--c-cyan); }

        /* members panel (right) */
        .ed-members{ position:absolute; top:70px; bottom:12px; right:12px; width:260px; }
        .m-card{ height:100%; display:flex; flex-direction:column; gap:8px; border-radius:14px; border:1px solid var(--c-border);
          background:rgba(10,16,28,.72); backdrop-filter: blur(8px); padding:10px; color:#eaf7fb; }
        .m-head{ display:flex; gap:8px; align-items:center; font-weight:700; }
        .m-list{ flex:1; overflow:auto; display:grid; gap:6px; }
        .m-row{ display:grid; grid-template-columns: 34px 1fr; gap:8px; align-items:center; padding:6px 8px; border-radius:10px; background:rgba(255,255,255,.04); border:1px solid var(--c-border); }
        .m-avatar{ width:28px; height:28px; border-radius:9999px; display:grid; place-items:center; background:#1a2a3c; border:1px solid rgba(255,255,255,.15); font-size:11px; }
        .m-controls{ display:grid; gap:6px; }
        .m-controls .chip-btn{ background:rgba(255,255,255,.05); justify-content:center; }
        .m-controls .chip-btn.is-on{ outline:2px solid var(--c-cyan); }
        .bg-row{ display:flex; align-items:center; gap:8px; font-size:12px; }
        .bg-row select{ flex:1; height:30px; border-radius:8px; background:rgba(255,255,255,.06); color:#d7f6ff; border:1px solid var(--c-border); }

        /* canvas and grid */
        .ed-canvas{ position:absolute; top:70px; bottom:12px; left:calc(12px + 58px); right:calc(12px + 260px); padding:14px; }
        .ed-rail:hover ~ .ed-canvas, .ed-rail.is-pinned ~ .ed-canvas{ left:calc(12px + 210px); }
        .grid-wrap{ position:relative; width:100%; height:100%; border-radius:14px; overflow:auto;
          background:
            linear-gradient(to bottom, rgba(255,255,255,.04), rgba(255,255,255,.02)),
            repeating-linear-gradient(0deg, rgba(150,180,210,.10) 0, rgba(150,180,210,.10) 1px, transparent 1px, transparent 24px),
            repeating-linear-gradient(90deg, rgba(150,180,210,.10) 0, rgba(150,180,210,.10) 1px, transparent 1px, transparent 24px);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); padding:18px; display:grid; gap:18px;
          grid-template-columns: repeat(12, 1fr);
        }
        .card{ border-radius:14px; border:1px solid rgba(255,255,255,.10); background:rgba(10,16,28,.66); color:#eaf7fb; padding:12px; }
        .card.post{ display:grid; place-items:center; height:140px; }
        .card.post .t{ font-weight:800; text-align:center; line-height:1.1; font-size:18px; color:#0b2230; }
        .card.post.yellow{ background:#ffd96a; } .card.post.pink{ background:#ff8faf; } .card.post.cyan{ background:#7fd8ff; }
        .card.panel{ grid-column: span 4; }
        .card.panel.recipe{ grid-column: span 5; }
        .ph-head{ font-weight:700; margin-bottom:8px; display:flex; gap:8px; align-items:center; }
        .ph-graph.bars{ height:110px; display:flex; align-items:flex-end; gap:8px; }
        .ph-graph.bars > div{ width:12%; height:50%; background:linear-gradient(180deg, rgba(127,255,212,.42), rgba(127,255,212,.12)); border-radius:6px; }
        .ph-graph.bars > div:nth-child(2){ height:70%; } .ph-graph.bars > div:nth-child(3){ height:40%; }
        .ph-graph.bars > div:nth-child(4){ height:80%; } .ph-graph.bars > div:nth-child(5){ height:60%; }
        .ph-graph.line{ height:80px; background:linear-gradient(180deg, rgba(100,180,255,.35), rgba(100,180,255,.08)); border-radius:8px; margin-bottom:8px; }
        .ph-graph.pie{ display:flex; align-items:center; justify-content:center; height:72px; }

        .recipe-list{ display:grid; gap:6px; font-size:13px; }
        .recipe-list li span{ display:inline-block; width:26px; opacity:.8; }

        .draw-surface{ position:absolute; inset:14px; border-radius:14px; pointer-events:auto; }

        .my-avatar{ position:absolute; top:18px; right:24px; width:38px; height:38px; border-radius:999px; overflow:hidden;
          background:#172431; border:1px solid rgba(255,255,255,.18); display:grid; place-items:center; z-index:5; }
        .my-avatar img{ width:100%; height:100%; object-fit:cover; }
        .my-avatar .inits{ color:#cfefff; font-weight:700; }
      `}</style>
    </div>
  );
}

/* helpers */
function initials(name) {
  const p = String(name).trim().split(/\s+/);
  return ((p[0]||"")[0]||"") + ((p[1]||"")[0]||"");
}

function ToolButton({ icon, label, active, onClick, onMouseLeave }) {
  return (
    <button className={"tool-btn " + (active ? "is-active" : "")} onClick={onClick} onMouseLeave={onMouseLeave} title={label}>
      {icon}<span className="lab">{label}</span>
    </button>
  );
}
function SmallIcon({ children }) { return <div className="small-ic">{children}</div>; }
function FlyItem({ icon, label, active, onClick }) {
  return (
    <button className={"fly-item " + (active?"is-active":"")} onClick={onClick}>{icon}<span>{label}</span></button>
  );
}
