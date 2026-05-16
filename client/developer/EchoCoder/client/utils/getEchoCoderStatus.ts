export async function getEchoCoderStatus() {
  // DEV MODE: no backend, no waiting, no lock
  if (import.meta.env.VITE_DISABLE_ECHOCODER_BACKEND === "true") {
    return {
      locked: false,
      expiresAt: null,
      devMode: true,
    };
  }

  // REAL backend (future)
  const res = await fetch("/api/echocoder/status");
  if (!res.ok) throw new Error("EchoCoder status fetch failed");
  return res.json();
}
