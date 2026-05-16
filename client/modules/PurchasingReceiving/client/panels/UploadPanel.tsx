import React, { useMemo, useState } from "react";
type Gateway = "stripe" | "square" | "adyen";
type ApiResult<T = any> = {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
};
async function postForm(url: string, form: FormData): Promise<ApiResult> {
  try {
    const res = await fetch(url, { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      status: res.status,
      data,
      error: res.ok ? undefined : JSON.stringify(data),
    };
  } catch (error) {
    return { ok: false, status: 0, error: String(error) };
  }
}
async function postJson(url: string, body?: any): Promise<ApiResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      status: res.status,
      data,
      error: res.ok ? undefined : JSON.stringify(data),
    };
  } catch (error) {
    return { ok: false, status: 0, error: String(error) };
  }
}
export default function UploadPanel() {
  const [orgId, setOrgId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [erp, setErp] = useState<ERP>("r365");
  const [gateway, setGateway] = useState<Gateway>("stripe");
  const [amountOverride, setAmountOverride] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const addLog = (line: string) =>
    setLog((prev) => [line, ...prev].slice(0, 200));
  const canUpload = useMemo(() => Boolean(orgId && file), [orgId, file]);
  const canContinue = useMemo(() => Boolean(invoiceId), [invoiceId]);
  async function handleUpload() {
    if (!canUpload) return;
    setBusy(true);
    addLog("Uploading invoice…");
    const form = new FormData();
    form.append("org_id", orgId);
    form.append("file", file as Blob);
    const res = await postForm("/functions/v1/invoices-upload", form);
    if (res.ok && res.data?.id) {
      setInvoiceId(res.data.id);
      addLog(`✅ Uploaded. Invoice ID: ${res.data.id}`);
    } else {
      addLog(`❌ Upload failed: ${res.error ?? res.status}`);
    }
    setBusy(false);
  }
  async function handleNormalize() {
    if (!invoiceId) return;
    setBusy(true);
    addLog("Normalizing invoice…");
    const res = await postJson(`/functions/v1/invoices-normalize/${invoiceId}`);
    if (res.ok) addLog(`✅ Normalized: ${JSON.stringify(res.data)}`);
    else addLog(`❌ Normalize failed: ${res.error ?? res.status}`);
    setBusy(false);
  }
  async function handleExport() {
    if (!invoiceId) return;
    setBusy(true);
    addLog(`Exporting invoice to ERP (${erp})…`);
    const res = await postJson(
      `/functions/v1/invoices-export/${invoiceId}/${erp}`,
    );
    if (res.ok) addLog(`✅ Exported: ${JSON.stringify(res.data)}`);
    else addLog(`❌ Export failed: ${res.error ?? res.status}`);
    setBusy(false);
  }
  async function handlePay() {
    if (!invoiceId) return;
    setBusy(true);
    const amount = amountOverride.trim().length
      ? Number(amountOverride)
      : undefined;
    addLog(
      `Triggering payment via ${gateway}${amount ? ` (override ${amount})` : ""}…`,
    );
    const res = await postJson(`/functions/v1/invoices-pay/${invoiceId}`, {
      gateway,
      amount_override: amount,
    });
    if (res.ok) addLog(`✅ Payment: ${JSON.stringify(res.data)}`);
    else addLog(`❌ Payment failed: ${res.error ?? res.status}`);
    setBusy(false);
  }
  async function handleRunAll() {
    if (!invoiceId) {
      await handleUpload();
      if (!invoiceId && !file) return;
    }
    await handleNormalize();
    await handleExport();
    await handlePay();
  }
  return (
    <div className="p-4 rounded-2xl border border-border bg-card text-card-foreground shadow-sm max-w-3xl">
      {" "}
      <h2 className="text-xl font-semibold mb-3 text-foreground">
        LUCCCA — Invoice Import Orchestrator
      </h2>{" "}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4">
        {" "}
        <div>
          {" "}
          <label className="block text-sm font-medium mb-1 text-foreground">
            Org ID
          </label>{" "}
          <input
            type="text"
            placeholder="00000000-0000-0000-0000-000000000000"
            value={orgId}
            onChange={(event) => setOrgId(event.target.value)}
            className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
          />{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="block text-sm font-medium mb-1 text-foreground">
            Invoice File
          </label>{" "}
          <input
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="w-full text-sm text-foreground"
            accept=".pdf,.png,.jpg,.jpeg"
          />{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="block text-sm font-medium mb-1 text-foreground">
            ERP Target
          </label>{" "}
          <select
            value={erp}
            onChange={(event) => setErp(event.target.value as ERP)}
            className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {" "}
            <option value="r365">Restaurant365</option>{" "}
            <option value="simphony">Oracle Simphony</option>{" "}
            <option value="netsuite">NetSuite</option>{" "}
          </select>{" "}
        </div>{" "}
        <div className="grid grid-cols-2 gap-2">
          {" "}
          <div>
            {" "}
            <label className="block text-sm font-medium mb-1 text-foreground">
              Payment Gateway
            </label>{" "}
            <select
              value={gateway}
              onChange={(event) => setGateway(event.target.value as Gateway)}
              className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {" "}
              <option value="stripe">Stripe</option>{" "}
              <option value="square">Square</option>{" "}
              <option value="adyen">Adyen</option>{" "}
            </select>{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="block text-sm font-medium mb-1 text-foreground">
              Amount Override (optional)
            </label>{" "}
            <input
              type="number"
              step="0.01"
              value={amountOverride}
              onChange={(event) => setAmountOverride(event.target.value)}
              className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="e.g., 123.45"
            />{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      <div className="flex flex-wrap gap-2 mb-4">
        {" "}
        <button
          onClick={handleUpload}
          disabled={!canUpload || busy}
          className={`px-4 py-2 rounded text-primary-foreground transition-colors ${canUpload && !busy ? "bg-primary hover:opacity-90" : "bg-muted cursor-not-allowed opacity-50"}`}
        >
          {" "}
          1) Upload{" "}
        </button>{" "}
        <button
          onClick={handleNormalize}
          disabled={!canContinue || busy}
          className={`px-4 py-2 rounded text-primary-foreground transition-colors ${canContinue && !busy ? "bg-primary hover:opacity-90" : "bg-muted cursor-not-allowed opacity-50"}`}
        >
          {" "}
          2) Normalize{" "}
        </button>{" "}
        <button
          onClick={handleExport}
          disabled={!canContinue || busy}
          className={`px-4 py-2 rounded text-primary-foreground transition-colors ${canContinue && !busy ? "bg-primary hover:opacity-90" : "bg-muted cursor-not-allowed opacity-50"}`}
        >
          {" "}
          3) Export to ERP{" "}
        </button>{" "}
        <button
          onClick={handlePay}
          disabled={!canContinue || busy}
          className={`px-4 py-2 rounded text-primary-foreground transition-colors ${canContinue && !busy ? "bg-primary hover:opacity-90" : "bg-muted cursor-not-allowed opacity-50"}`}
        >
          {" "}
          4) Pay{" "}
        </button>{" "}
        <button
          onClick={handleRunAll}
          disabled={busy || (!invoiceId && !canUpload)}
          className={`ml-auto px-4 py-2 rounded text-primary-foreground transition-colors ${!busy && (invoiceId || canUpload) ? "bg-primary hover:opacity-90" : "bg-muted cursor-not-allowed opacity-50"}`}
          title="Runs Upload → Normalize → Export → Pay"
        >
          {" "}
          Run All{" "}
        </button>{" "}
      </div>{" "}
      <div className="mb-3 text-sm text-muted-foreground">
        {" "}
        <span className="font-medium text-foreground">Current Invoice ID:</span>
        {""}{" "}
        {invoiceId ? (
          <code className="bg-muted text-foreground px-2 py-1 rounded">
            {invoiceId}
          </code>
        ) : (
          <em>none yet</em>
        )}{" "}
      </div>{" "}
      <div>
        {" "}
        <label className="block text-sm font-medium mb-1 text-foreground">
          Activity Log
        </label>{" "}
        <div className="h-48 overflow-auto rounded border border-border bg-surface text-foreground p-2 text-xs leading-relaxed">
          {" "}
          {log.length === 0 ? (
            <div className="text-muted-foreground">No activity yet.</div>
          ) : (
            log.map((line, index) => (
              <div key={index} className="whitespace-pre-wrap text-foreground">
                {" "}
                {line}{" "}
              </div>
            ))
          )}{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
