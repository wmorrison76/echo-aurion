const FRACTION_MAP: Record<string, string> = {
  "¼": "1/4",
  "½": "1/2",
  "¾": "3/4",
  "⅐": "1/7",
  "⅑": "1/9",
  "⅒": "1/10",
  "⅓": "1/3",
  "⅔": "2/3",
  "⅕": "1/5",
  "⅖": "2/5",
  "⅗": "3/5",
  "⅘": "4/5",
  "⅙": "1/6",
  "⅚": "5/6",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
};

const FRACTION_CHARS = Object.keys(FRACTION_MAP).join("");

const FRACTION_PATTERNS = [
  new RegExp(`^[-+]?\\d+\\s+\\d+/\\d+`),
  new RegExp(`^[-+]?\\d+[${FRACTION_CHARS}]`),
  new RegExp(`^[-+]?\\d+/\\d+`),
  new RegExp(`^[-+]?\\d*\\.\\d+`),
  new RegExp(`^[-+]?\\d+`),
  new RegExp(`^[${FRACTION_CHARS}]`),
];

export const FRACTION_CHAR_CLASS = FRACTION_CHARS;

export const normalizeUnicodeFractions = (value: string): string =>
  value.replace(/[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, (ch) => FRACTION_MAP[ch] ?? ch);

export const parseQuantity = (value: string): number => {
  if (!value) return Number.NaN;
  let text = String(value).trim();
  text = normalizeUnicodeFractions(text);
  text = text.replace(/(\d)\s*(\d\/\d)/g, "$1 $2");

  const mixed = text.match(/^(-?\d+)(?:\s+(\d+\/\d+))?$/);
  if (mixed) {
    const base = Number(mixed[1]);
    if (mixed[2]) {
      const [n, d] = mixed[2].split("/").map(Number);
      return Number.isFinite(n) && Number.isFinite(d) && d !== 0
        ? base + n / d
        : Number.NaN;
    }
    return base;
  }

  if (/^-?\d+\/\d+$/.test(text)) {
    const [n, d] = text.split("/").map(Number);
    return Number.isFinite(n) && Number.isFinite(d) && d !== 0
      ? n / d
      : Number.NaN;
  }

  const numeric = Number(text.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(numeric) ? numeric : Number.NaN;
};

export const parseCostValue = (value: string): number => {
  const numeric = Number(
    String(value ?? "")
      .replace(/[$€£¥,\s]/g, "")
      .replace(/,/g, "."),
  );
  return Number.isFinite(numeric) ? numeric : Number.NaN;
};

type ExtractedQuantity = {
  leading: string;
  raw: string;
  remainder: string;
  value: number;
};

export const extractLeadingQuantity = (input: string): ExtractedQuantity | null => {
  if (typeof input !== "string" || !input.trim()) return null;
  const leadingWhitespaceLength = input.length - input.trimStart().length;
  const leading = input.slice(0, leadingWhitespaceLength);
  const trimmed = input.slice(leadingWhitespaceLength);

  for (const pattern of FRACTION_PATTERNS) {
    const match = trimmed.match(pattern);
    if (!match) continue;
    const raw = match[0];
    const nextChar = trimmed.charAt(raw.length);
    if (nextChar === "-" && /\d/.test(trimmed.charAt(raw.length + 1))) {
      continue;
    }
    if (nextChar === ":") {
      continue;
    }
    const value = parseQuantity(raw);
    if (!Number.isFinite(value)) continue;
    const remainder = trimmed.slice(raw.length);
    return { leading, raw, remainder, value };
  }

  return null;
};

const gcd = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y > Number.EPSILON) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x || 1;
};

const FRACTION_DENOMS = [2, 3, 4, 6, 8, 10, 12, 16];

export const formatQuantity = (value: number): string => {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value) < 1e-9) return "0";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const roundedInt = Math.round(abs);
  if (Math.abs(abs - roundedInt) < 1e-6) {
    return `${sign}${roundedInt}`;
  }

  const whole = Math.floor(abs + 1e-6);
  let remainder = abs - whole;
  let fraction = "";

  for (const denom of FRACTION_DENOMS) {
    const scaled = remainder * denom;
    const numerator = Math.round(scaled);
    if (numerator === 0) {
      continue;
    }
    if (Math.abs(scaled - numerator) < 1e-4) {
      const divisor = gcd(numerator, denom);
      const simpleNumerator = numerator / divisor;
      const simpleDenom = denom / divisor;
      fraction = `${simpleNumerator}/${simpleDenom}`;
      break;
    }
  }

  if (fraction) {
    if (whole === 0) {
      return `${sign}${fraction}`;
    }
    return `${sign}${whole} ${fraction}`;
  }

  const precision = abs >= 100 ? 1 : abs >= 10 ? 2 : 3;
  const decimal = Number(abs.toFixed(precision));
  return `${sign}${decimal}`;
};

export const scaleIngredientText = (text: string, factor: number): string => {
  if (typeof text !== "string" || !Number.isFinite(factor) || factor <= 0) {
    return text;
  }
  if (Math.abs(factor - 1) < 1e-9) {
    return text;
  }
  const extracted = extractLeadingQuantity(text);
  if (!extracted) return text;

  const scaledValue = extracted.value * factor;
  if (!Number.isFinite(scaledValue)) return text;
  const formatted = formatQuantity(scaledValue);
  if (!formatted) return text;

  const safeRemainder = extracted.remainder;
  return `${extracted.leading}${formatted}${safeRemainder}`;
};

export const applyScaleToIngredients = (
  lines: readonly string[],
  factor: number,
): string[] => {
  if (!Array.isArray(lines) || Math.abs(factor - 1) < 1e-9) {
    return [...lines];
  }
  return lines.map((line) => scaleIngredientText(line, factor));
};

export const deriveScaledValue = (
  current: number | undefined,
  factor: number,
): number | undefined => {
  if (!Number.isFinite(current) || !Number.isFinite(factor)) return current;
  if (factor <= 0) return current;
  const scaled = current * factor;
  const rounded = Math.min(
    Math.max(Math.round(scaled * 1000) / 1000, 0),
    Number.MAX_SAFE_INTEGER,
  );
  return rounded;
};
