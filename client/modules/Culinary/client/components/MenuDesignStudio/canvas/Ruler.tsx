import { cn } from "@/lib/utils";

interface RulerProps {
  orientation: "horizontal" | "vertical";
  size: number;
  zoom: number;
  offset: number;
  pixelsPerInch?: number;
}

const RULER_HEIGHT = 24;
const RULER_WIDTH = 24;
const TICK_SPACING = 16; // pixels between major ticks

export function HorizontalRuler({ size, zoom, offset, pixelsPerInch = 96 }: RulerProps) {
  const visibleTicks: number[] = [];
  const majorTickSize = 8;
  const minorTickSize = 4;

  // Generate tick marks
  for (let i = 0; i < size; i += TICK_SPACING / zoom) {
    visibleTicks.push(i);
  }

  return (
    <div
      className="relative bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
      style={{
        height: RULER_HEIGHT,
        width: `calc(100% - ${RULER_WIDTH}px)`,
        marginLeft: RULER_WIDTH,
      }}
    >
      <svg width="100%" height={RULER_HEIGHT} className="absolute inset-0">
        <defs>
          <pattern
            id="ruler-pattern"
            x={TICK_SPACING}
            y="0"
            width={TICK_SPACING}
            height={RULER_HEIGHT}
            patternUnits="userSpaceOnUse"
          >
            {/* Major tick */}
            <line
              x1="0"
              y1={RULER_HEIGHT - majorTickSize}
              x2="0"
              y2={RULER_HEIGHT}
              stroke="currentColor"
              className="text-gray-400 dark:text-gray-500"
              strokeWidth="1"
            />
            {/* Minor ticks */}
            {[0.25, 0.5, 0.75].map((pos) => (
              <line
                key={pos}
                x1={TICK_SPACING * pos}
                y1={RULER_HEIGHT - minorTickSize}
                x2={TICK_SPACING * pos}
                y2={RULER_HEIGHT}
                stroke="currentColor"
                className="text-gray-300 dark:text-gray-600"
                strokeWidth="1"
              />
            ))}
          </pattern>
        </defs>

        {/* Background */}
        <rect width="100%" height={RULER_HEIGHT} className="fill-gray-50 dark:fill-gray-900" />

        {/* Tick pattern */}
        <rect width="100%" height={RULER_HEIGHT} fill="url(#ruler-pattern)" />

        {/* Numbers */}
        {visibleTicks.map((tick, i) => {
          if (i % 4 === 0) {
            const inches = Math.round((tick / pixelsPerInch) * 10) / 10;
            return (
              <text
                key={`label-${i}`}
                x={tick}
                y={12}
                fontSize="10"
                className="fill-gray-600 dark:fill-gray-400 pointer-events-none"
                textAnchor="middle"
              >
                {inches}
              </text>
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
}

export function VerticalRuler({ size, zoom, offset, pixelsPerInch = 96 }: RulerProps) {
  const visibleTicks: number[] = [];

  // Generate tick marks
  for (let i = 0; i < size; i += TICK_SPACING / zoom) {
    visibleTicks.push(i);
  }

  const majorTickSize = 8;
  const minorTickSize = 4;

  return (
    <div
      className="relative bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700"
      style={{
        height: `calc(100vh - ${RULER_HEIGHT + 80}px)`,
        width: RULER_WIDTH,
        marginTop: RULER_HEIGHT,
      }}
    >
      <svg width={RULER_WIDTH} height="100%" className="absolute inset-0">
        <defs>
          <pattern
            id="v-ruler-pattern"
            x="0"
            y={TICK_SPACING}
            width={RULER_WIDTH}
            height={TICK_SPACING}
            patternUnits="userSpaceOnUse"
          >
            {/* Major tick */}
            <line
              x1={RULER_WIDTH - majorTickSize}
              y1="0"
              x2={RULER_WIDTH}
              y2="0"
              stroke="currentColor"
              className="text-gray-400 dark:text-gray-500"
              strokeWidth="1"
            />
            {/* Minor ticks */}
            {[0.25, 0.5, 0.75].map((pos) => (
              <line
                key={pos}
                x1={RULER_WIDTH - minorTickSize}
                y1={TICK_SPACING * pos}
                x2={RULER_WIDTH}
                y2={TICK_SPACING * pos}
                stroke="currentColor"
                className="text-gray-300 dark:text-gray-600"
                strokeWidth="1"
              />
            ))}
          </pattern>
        </defs>

        {/* Background */}
        <rect width={RULER_WIDTH} height="100%" className="fill-gray-50 dark:fill-gray-900" />

        {/* Tick pattern */}
        <rect width={RULER_WIDTH} height="100%" fill="url(#v-ruler-pattern)" />

        {/* Numbers */}
        {visibleTicks.map((tick, i) => {
          if (i % 4 === 0) {
            const inches = Math.round((tick / pixelsPerInch) * 10) / 10;
            return (
              <text
                key={`label-${i}`}
                x={6}
                y={tick + 3}
                fontSize="9"
                className="fill-gray-600 dark:fill-gray-400 pointer-events-none"
              >
                {inches}
              </text>
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
}

export function RulerCorner() {
  return (
    <div
      className="bg-gray-100 dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700"
      style={{ width: RULER_WIDTH, height: RULER_HEIGHT }}
    />
  );
}
