export async function cloudSaveSchedule(
  outlet: string,
  weekStartISO: string,
  data: unknown,
) {
  try {
    // sanitize to avoid non-serializable properties
    const dataObj = data as any;
    const cleanData = {
      weekStartISO: dataObj?.weekStartISO ?? weekStartISO,
      employees: (dataObj?.employees || []).map((emp: any) => ({
        id: emp.id,
        name: emp.name,
        role: emp.role,
        rate: emp.rate,
        shifts: emp.shifts || {},
      })),
      managerMessage: dataObj?.managerMessage ?? "",
      headerLogoDataUrl: dataObj?.headerLogoDataUrl ?? "",
    };

    const response = await fetch("/api/schedule/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outlet, weekStartISO, data: cleanData }),
    });

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.warn(`Failed to save schedule: ${response.status}`);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("Error saving schedule to cloud:", e);
  }
}

export async function cloudGetSchedule(outlet: string, weekStartISO: string) {
  try {
    const r = await fetch(
      `/api/schedule/get?outlet=${encodeURIComponent(outlet)}&weekStartISO=${encodeURIComponent(weekStartISO)}`,
    );
    if (!r.ok) return null;
    const j = await r.json();
    return j?.record || null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("Error loading schedule from cloud:", e);
    return null;
  }
}
