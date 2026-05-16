export interface NotifyEvent {
  type: string;
  actor?: string;
  message: string;
  data?: Record<string, unknown>;
}
export async function postNotify(ev: NotifyEvent) {
  await fetch("/api/notify/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ev),
  });
}
export async function uploadFile(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const res = await fetch("/api/files/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, type: file.type, dataUrl }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: boolean; url: string; mime: string }>;
}
