/** * Safe error serialization utilities for EchoEventStudio * Prevents"Cannot convert object to primitive value" crashes when logging complex error objects */ export function safeToString(
  value: unknown,
): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  if (value instanceof Error) return value.message || value.name;
  try {
    return JSON.stringify(value);
  } catch {
    try {
      return Object.prototype.toString.call(value);
    } catch {
      return "[Unserializable]";
    }
  }
}
export function safeConsoleError(label: string, value: unknown) {
  console.error(`${label}: ${safeToString(value)}`);
}
