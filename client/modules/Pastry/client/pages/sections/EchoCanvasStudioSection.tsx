export default function EchoCanvasStudioSection() {
  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-foreground mb-2">🎨 Echo Canvas Studio</h2>
        <p className="text-muted-foreground mb-4">
          Design professional pastry artwork with advanced digital tools.
        </p>
        <div className="bg-muted/50 rounded-lg p-6 mb-4">
          <p className="text-sm text-muted-foreground mb-4">
            Coming soon: Canvas-based design tools, pattern creation, and digital painting for pastry decoration.
          </p>
          <div className="space-y-3 text-left text-sm">
            <div className="flex gap-2">
              <span className="text-primary">✓</span>
              <span>Digital design tools</span>
            </div>
            <div className="flex gap-2">
              <span className="text-primary">✓</span>
              <span>Pattern libraries</span>
            </div>
            <div className="flex gap-2">
              <span className="text-primary">✓</span>
              <span>Export templates</span>
            </div>
            <div className="flex gap-2">
              <span className="text-primary">✓</span>
              <span>Collaboration features</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
