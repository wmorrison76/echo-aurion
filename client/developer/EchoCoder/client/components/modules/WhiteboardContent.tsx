import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Type,
  Minus,
  Circle,
  Square,
  Copy,
  Download,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface DrawingAction {
  type: "line" | "rect" | "circle" | "text";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  size: number;
  text?: string;
}

export default function WhiteboardContent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [actions, setActions] = useState<DrawingAction[]>([]);
  const [tool, setTool] = useState<"line" | "rect" | "circle" | "text">("line");
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(2);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [textInput, setTextInput] = useState("");

  const canvas = canvasRef.current;

  // Draw all actions on canvas
  useEffect(() => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    actions.forEach((action) => {
      ctx.strokeStyle = action.color;
      ctx.fillStyle = action.color;
      ctx.lineWidth = action.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      switch (action.type) {
        case "line":
          ctx.beginPath();
          ctx.moveTo(action.startX, action.startY);
          ctx.lineTo(action.endX, action.endY);
          ctx.stroke();
          break;
        case "rect":
          ctx.strokeRect(
            Math.min(action.startX, action.endX),
            Math.min(action.startY, action.endY),
            Math.abs(action.endX - action.startX),
            Math.abs(action.endY - action.startY),
          );
          break;
        case "circle": {
          const dx = action.endX - action.startX;
          const dy = action.endY - action.startY;
          const radius = Math.sqrt(dx * dx + dy * dy);
          ctx.beginPath();
          ctx.arc(action.startX, action.startY, radius, 0, 2 * Math.PI);
          ctx.stroke();
          break;
        }
        case "text":
          ctx.font = `${action.size * 8}px Arial`;
          ctx.fillText(action.text || "", action.startX, action.startY);
          break;
      }
    });
  }, [actions, canvas]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setStartPos({ x, y });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Redraw with preview
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Redraw all previous actions
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    actions.forEach((action) => {
      ctx.strokeStyle = action.color;
      ctx.fillStyle = action.color;
      ctx.lineWidth = action.size;

      switch (action.type) {
        case "line":
          ctx.beginPath();
          ctx.moveTo(action.startX, action.startY);
          ctx.lineTo(action.endX, action.endY);
          ctx.stroke();
          break;
        case "rect":
          ctx.strokeRect(
            Math.min(action.startX, action.endX),
            Math.min(action.startY, action.endY),
            Math.abs(action.endX - action.startX),
            Math.abs(action.endY - action.startY),
          );
          break;
        case "circle": {
          const dx = action.endX - action.startX;
          const dy = action.endY - action.startY;
          const radius = Math.sqrt(dx * dx + dy * dy);
          ctx.beginPath();
          ctx.arc(action.startX, action.startY, radius, 0, 2 * Math.PI);
          ctx.stroke();
          break;
        }
      }
    });

    // Draw preview
    ctx.strokeStyle = color;
    ctx.lineWidth = size;

    switch (tool) {
      case "line":
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        break;
      case "rect":
        ctx.strokeRect(
          Math.min(startPos.x, x),
          Math.min(startPos.y, y),
          Math.abs(x - startPos.x),
          Math.abs(y - startPos.y),
        );
        break;
      case "circle": {
        const dx = x - startPos.x;
        const dy = y - startPos.y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === "text") {
      setTextInput("");
    } else {
      const newAction: DrawingAction = {
        type: tool,
        startX: startPos.x,
        startY: startPos.y,
        endX: x,
        endY: y,
        color,
        size,
      };
      setActions([...actions, newAction]);
    }
  };

  const handleAddText = () => {
    if (!textInput.trim()) return;

    const newAction: DrawingAction = {
      type: "text",
      startX: startPos.x,
      startY: startPos.y,
      endX: 0,
      endY: 0,
      color,
      size,
      text: textInput,
    };

    setActions([...actions, newAction]);
    setTextInput("");
    setTool("line");
  };

  const handleClear = () => {
    setActions([]);
  };

  const handleUndo = () => {
    if (actions.length > 0) {
      setActions(actions.slice(0, -1));
    }
  };

  const handleDownload = () => {
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "whiteboard.png";
    link.click();
  };

  const handleCopy = () => {
    if (!canvas) {
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) return;
      navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);
    });
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Toolbar */}
      <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg border flex flex-wrap gap-4">
        <div className="flex gap-2">
          <Button
            variant={tool === "line" ? "default" : "outline"}
            size="sm"
            onClick={() => setTool("line")}
            className="gap-2"
          >
            <Minus className="h-4 w-4" /> Line
          </Button>
          <Button
            variant={tool === "rect" ? "default" : "outline"}
            size="sm"
            onClick={() => setTool("rect")}
            className="gap-2"
          >
            <Square className="h-4 w-4" /> Rect
          </Button>
          <Button
            variant={tool === "circle" ? "default" : "outline"}
            size="sm"
            onClick={() => setTool("circle")}
            className="gap-2"
          >
            <Circle className="h-4 w-4" /> Circle
          </Button>
          <Button
            variant={tool === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => setTool("text")}
            className="gap-2"
          >
            <Type className="h-4 w-4" /> Text
          </Button>
        </div>

        <div className="flex gap-2 items-center">
          <label className="text-sm">Color:</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-10 rounded border cursor-pointer"
          />
        </div>

        <div className="flex gap-2 items-center">
          <label className="text-sm">Size:</label>
          <input
            type="range"
            min="1"
            max="20"
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value))}
            className="w-24"
          />
          <span className="text-sm font-semibold">{size}px</span>
        </div>

        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" /> Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2"
          >
            <Copy className="h-4 w-4" /> Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="gap-2"
          >
            <Download className="h-4 w-4" /> Save
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClear}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" /> Clear
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="flex-1 border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white cursor-crosshair"
      />

      {/* Text Input Modal */}
      {tool === "text" && (
        <Card className="border-blue-500">
          <CardContent className="pt-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Click on canvas where you want to place text, then enter it
                below:
              </p>
              <div className="flex gap-2">
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Enter text..."
                  onKeyPress={(e) => e.key === "Enter" && handleAddText()}
                  autoFocus
                />
                <Button onClick={handleAddText} size="sm">
                  Add Text
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
