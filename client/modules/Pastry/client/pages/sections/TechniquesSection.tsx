export default function TechniquesSection() {
  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      {" "}
      <div className="text-center max-w-md">
        {" "}
        <h2 className="text-2xl font-bold text-foreground mb-2">
          🎓 Techniques
        </h2>{" "}
        <p className="text-muted-foreground mb-4">
          {" "}
          Master pastry and baking techniques with step-by-step guides and video
          tutorials.{" "}
        </p>{" "}
        <div className="bg-muted/50 rounded-lg p-6 mb-4">
          {" "}
          <p className="text-sm text-muted-foreground mb-4">
            {" "}
            Coming soon: Advanced pastry techniques, troubleshooting guides, and
            expert tips.{" "}
          </p>{" "}
          <div className="space-y-3 text-left text-sm">
            {" "}
            <div className="flex gap-2">
              {" "}
              <span className="text-primary">✓</span>{" "}
              <span>Lamination techniques</span>{" "}
            </div>{" "}
            <div className="flex gap-2">
              {" "}
              <span className="text-primary">✓</span>{" "}
              <span>Fermentation guides</span>{" "}
            </div>{" "}
            <div className="flex gap-2">
              {" "}
              <span className="text-primary">✓</span>{" "}
              <span>Decoration methods</span>{" "}
            </div>{" "}
            <div className="flex gap-2">
              {" "}
              <span className="text-primary">✓</span>{" "}
              <span>Troubleshooting tips</span>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
