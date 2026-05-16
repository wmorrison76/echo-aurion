export function TurtleLoader({
  message = "Processing…",
  note = "Our turtle is on it (and may wink).",
  small = false,
}: {
  message?: string;
  note?: string;
  small?: boolean;
}) {
  const w = small ? 40 : 64;
  const h = small ? 30 : 48;
  return (
    <div
      className={`mx-auto my-2 flex items-center gap-3 ${small ? "max-w-xs" : "max-w-sm"}`}
    >
      {" "}
      <svg
        width={w}
        height={h}
        viewBox="0 0 64 48"
        className="drop-shadow-[0_0_8px_hsl(var(--ring)/0.4)]"
      >
        {" "}
        <g>
          {" "}
          <ellipse
            cx="28"
            cy="30"
            rx="18"
            ry="12"
            fill="hsl(var(--accent))"
            opacity="0.9"
          >
            {" "}
            <animate
              attributeName="rx"
              values="16;18;16"
              dur="2.4s"
              repeatCount="indefinite"
            />{" "}
          </ellipse>{" "}
          <circle cx="48" cy="22" r="6" fill="hsl(var(--accent))" />{" "}
          <circle cx="50" cy="20" r="1.5" fill="black">
            {" "}
            <animate
              attributeName="cx"
              values="50;49;50"
              dur="3s"
              repeatCount="indefinite"
            />{" "}
          </circle>{" "}
          <path
            d="M8 30 q8 -6 16 0"
            stroke="hsl(var(--accent))"
            strokeWidth="4"
            fill="none"
          >
            {" "}
            <animate
              attributeName="d"
              values="M8 30 q8 -6 16 0; M8 30 q8 -2 16 0; M8 30 q8 -6 16 0"
              dur="1.6s"
              repeatCount="indefinite"
            />{" "}
          </path>{" "}
        </g>{" "}
      </svg>{" "}
      <div className="text-xs sm:text-sm">
        {" "}
        <div className="font-semibold">{message}</div>{" "}
        <div className="text-muted-foreground">{note}</div>{" "}
      </div>{" "}
    </div>
  );
}
