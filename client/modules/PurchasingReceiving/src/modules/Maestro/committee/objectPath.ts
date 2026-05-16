type PathSegment = string | number;
function normalize(path: string): PathSegment[] {
  if (!path) return [];
  const converted = path.replace(/\[(\d+)\]/g, ".$1");
  return converted
    .split(".")
    .filter(Boolean)
    .map((segment) => {
      if (/^\d+$/.test(segment)) return Number(segment);
      return segment;
    });
}
export function getAtPath<T = unknown>(
  target: unknown,
  path: string,
): T | undefined {
  const segments = normalize(path);
  let node: any = target;
  for (const segment of segments) {
    if (node == null) return undefined;
    node = typeof segment === "number" ? node?.[segment] : node?.[segment];
  }
  return node as T | undefined;
}
export function setAtPath(target: unknown, path: string, value: unknown): void {
  const segments = normalize(path);
  if (!segments.length) return;
  let node: any = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    const nextSegment = segments[i + 1];
    let nextNode =
      typeof segment === "number" ? node?.[segment] : node?.[segment];
    if (nextNode == null) {
      nextNode = typeof nextSegment === "number" ? [] : {};
      if (typeof segment === "number") {
        if (!Array.isArray(node))
          throw new Error(
            `Expected array at segment ${segment} for path ${path}`,
          );
        node[segment] = nextNode;
      } else {
        node[segment] = nextNode;
      }
    }
    node = nextNode;
  }
  const last = segments[segments.length - 1];
  if (typeof last === "number") {
    if (!Array.isArray(node))
      throw new Error(
        `Expected array at terminal segment ${last} for path ${path}`,
      );
    node[last] = value;
  } else {
    node[last] = value;
  }
}
export function unsetAtPath(target: unknown, path: string): void {
  const segments = normalize(path);
  if (!segments.length) return;
  let node: any = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    if (node == null) return;
    node = typeof segment === "number" ? node?.[segment] : node?.[segment];
  }
  if (node == null) return;
  const last = segments[segments.length - 1];
  if (typeof last === "number") {
    if (Array.isArray(node) && last >= 0 && last < node.length) {
      node.splice(last, 1);
    }
  } else if (typeof node === "object" && last in node) {
    delete node[last];
  }
}
export function appendAtPath(
  target: unknown,
  path: string,
  value: unknown,
): void {
  const container = getAtPath(target, path);
  if (!Array.isArray(container))
    throw new Error(`appendAtPath expected array at ${path}`);
  container.push(value);
}
export function upsertAtPath(
  target: unknown,
  path: string,
  key: string,
  id: string,
  value: unknown,
): void {
  const segments = normalize(path);
  let node: any = target;
  for (const segment of segments) {
    if (node == null)
      throw new Error(
        `Cannot upsert, missing segment ${segment} for path ${path}`,
      );
    node = typeof segment === "number" ? node[segment] : node[segment];
  }
  if (!Array.isArray(node))
    throw new Error(`upsertAtPath expected array at ${path}`);
  const index = node.findIndex((entry: any) => entry?.[key] === id);
  if (index >= 0) node[index] = value;
  else node.push(value);
}
