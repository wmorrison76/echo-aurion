/** iter254 · ApprovalHierarchyPanel — embedded inside PurchRec module
 *  (replaces the deleted standalone PurchasingApprovals module).
 *  Three tabs: Pending My Approval · My Requests · Onboarding Controls.
 *  Hits real `/api/approvals/*` endpoints already wired by iter252/253.
 */
import React from "react";
import { useAuth as useEchoAuth } from "@/lib/auth-context";

const API = (typeof window !== "undefined" ? window.location.origin : "");

type LimitRow = {
  role: string; label: string; limit: number;
  approver_role: string | null; updated_at?: string;
};
type ApprovalRow = {
  id: string;
  requested_by_name: string; requested_by_role_label: string;
  outlet: string; company?: string; vendor?: string;
  item_description: string; amount: number;
  status: string; current_approver_role?: string | null;
  approval_chain: any[]; created_at: string;
  notes?: string; invoice_id?: string;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD",
    maximumFractionDigits: 0 }).format(n);

const TABS = [
  { id: "pending", label: "Pending My Approval", testid: "tab-pending" },
  { id: "mine", label: "My Requests", testid: "tab-mine" },
  { id: "controls", label: "Onboarding Controls", testid: "tab-controls" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function ApprovalHierarchyPanel() {
  const { user } = useEchoAuth();
  const [tab, setTab] = React.useState<TabId>("pending");
  const isAdminOrDirector = user?.role === "admin" || user?.role === "director";

  return (
    <div data-testid="purchasing-approvals-panel"
      className="h-full flex flex-col bg-background text-foreground">
      <div className="border-b border-border px-4 py-3">
        <div className="text-[9px] tracking-[3px] font-bold text-amber-500">
          PURCHASING APPROVALS · ECHO AURION
        </div>
        <h2 className="text-2xl font-light mt-1" style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          letterSpacing: -0.4,
        }}>Spending authority &amp; approval chain</h2>
        <div className="mt-3 flex gap-1 border-b border-border/40">
          {TABS.map(t => {
            if (t.id === "controls" && !isAdminOrDirector) return null;
            const active = tab === t.id;
            return (
              <button key={t.id} data-testid={t.testid}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-[11px] font-bold tracking-wider uppercase border-b-2 ${
                  active ? "border-amber-500 text-amber-500 bg-amber-500/10" : "border-transparent text-slate-400"
                }`}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {tab === "pending" && <PendingTab />}
        {tab === "mine" && <MyRequestsTab />}
        {tab === "controls" && isAdminOrDirector && <ControlsTab />}
      </div>
    </div>
  );
}

function PendingTab() {
  const { user } = useEchoAuth();
  const [rows, setRows] = React.useState<ApprovalRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);

  const refresh = React.useCallback(() => {
    if (!user) return;
    setLoading(true);
    fetch(`${API}/api/approvals/requests/pending?for_user=${user.id}`,
      { credentials: "include" })
      .then(r => r.ok ? r.json() : { rows: [] })
      .then(d => { setRows(d.rows || []); setLoading(false); });
  }, [user]);

  React.useEffect(() => { refresh(); }, [refresh]);

  const act = async (rid: string, action: "approve" | "reject") => {
    if (!user) return;
    setBusy(rid);
    let note = "";
    if (action === "reject") {
      note = prompt("Reason for not approving?") || "";
      if (!note) { setBusy(null); return; }
    }
    await fetch(`${API}/api/approvals/requests/${rid}/${action}`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        approver_id: user.id, approver_name: user.name,
        ...(action === "reject" ? { reason: note } : { note }),
      }),
    });
    setBusy(null);
    refresh();
    window.dispatchEvent(new CustomEvent("approvals:refresh"));
  };

  if (loading) return <div className="p-10 text-center text-sm text-slate-400">Loading pending approvals…</div>;
  if (rows.length === 0) return <div className="p-10 text-center text-sm text-slate-500">Nothing waiting on you. ✓</div>;

  return (
    <div data-testid="pending-approvals-list" className="flex flex-col gap-3">
      {rows.map(r => (
        <div key={r.id} data-testid={`pending-row-${r.id}`}
          className="p-4 rounded-lg border border-amber-500/25 bg-amber-500/5">
          <div className="grid grid-cols-[1fr_auto] gap-4">
            <div>
              <div className="text-[9px] tracking-widest text-slate-400 font-bold uppercase">
                FROM · {r.requested_by_role_label}
              </div>
              <div className="text-base font-bold mt-1">{r.requested_by_name}</div>
              <div className="text-sm text-slate-300 mt-2">{r.item_description}</div>
              <div className="flex gap-4 mt-2 text-xs text-slate-400">
                <span><b className="text-slate-200">Outlet:</b> {r.outlet}</span>
                {r.company && <span><b className="text-slate-200">Company:</b> {r.company}</span>}
                {r.vendor && <span><b className="text-slate-200">Vendor:</b> {r.vendor}</span>}
              </div>
              {r.notes && (
                <div className="mt-2 text-xs text-slate-400 px-3 py-2 rounded bg-white/5">
                  &ldquo;{r.notes}&rdquo;
                </div>
              )}
              {r.approval_chain.length > 0 && (
                <div className="mt-2 text-[10px] text-slate-500">
                  Chain: {r.approval_chain.map(c => `${c.action} by ${c.actor_name || c.role}`).join(" → ")}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold text-amber-500 tabular-nums">{fmt(r.amount)}</div>
              <div className="mt-3 flex gap-2 justify-end">
                <button data-testid={`pending-reject-${r.id}`} disabled={busy === r.id}
                  onClick={() => act(r.id, "reject")}
                  className="px-3 py-1.5 text-[10px] tracking-wider font-extrabold rounded border border-red-500/45 bg-red-500/12 text-red-300">
                  REJECT
                </button>
                <button data-testid={`pending-approve-${r.id}`} disabled={busy === r.id}
                  onClick={() => act(r.id, "approve")}
                  className="px-3 py-1.5 text-[10px] tracking-wider font-extrabold rounded border border-green-500/55 bg-green-500/18 text-green-300">
                  APPROVE
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MyRequestsTab() {
  const { user } = useEchoAuth();
  const [rows, setRows] = React.useState<ApprovalRow[]>([]);
  const [showForm, setShowForm] = React.useState(false);

  const refresh = React.useCallback(() => {
    if (!user) return;
    fetch(`${API}/api/approvals/requests?requested_by_id=${user.id}`,
      { credentials: "include" })
      .then(r => r.ok ? r.json() : { rows: [] })
      .then(d => setRows(d.rows || []));
  }, [user]);
  React.useEffect(() => { refresh(); }, [refresh]);

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs font-bold tracking-wider uppercase text-slate-400">
          My recent requests
        </h3>
        <button data-testid="new-request-btn" onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded text-[10px] tracking-wider font-extrabold border border-amber-500/55 bg-amber-500/18 text-amber-400">
          + NEW REQUEST
        </button>
      </div>
      {showForm && <NewRequestForm onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); refresh(); }} />}
      <div data-testid="my-requests-list" className="flex flex-col gap-2">
        {rows.length === 0 && <div className="p-10 text-center text-sm text-slate-500">No requests yet.</div>}
        {rows.map(r => (
          <div key={r.id} data-testid={`my-row-${r.id}`}
            className="px-4 py-3 rounded border border-white/5 bg-white/2 text-xs grid grid-cols-[1.4fr_1fr_0.6fr_auto] gap-3 items-center">
            <div>
              <div className="font-bold">{r.item_description}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {new Date(r.created_at).toLocaleString()} · {r.outlet}
              </div>
            </div>
            <div className="text-[11px] text-slate-400">
              {r.current_approver_role
                ? <>Awaiting <b className="text-slate-200">{r.current_approver_role}</b></>
                : `${r.approval_chain.length} step${r.approval_chain.length === 1 ? "" : "s"} done`}
            </div>
            <div className="text-sm font-bold text-amber-500 text-right tabular-nums">{fmt(r.amount)}</div>
            <div className={`px-2 py-0.5 rounded-full text-[9px] tracking-wider font-extrabold uppercase text-center ${
              r.status === "approved" || r.status === "auto-approved" ? "bg-green-500/15 text-green-400 border border-green-500/40" :
              r.status === "rejected" ? "bg-red-500/15 text-red-400 border border-red-500/40" :
              "bg-amber-500/15 text-amber-400 border border-amber-500/40"
            }`}>{r.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewRequestForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useEchoAuth();
  const [v, setV] = React.useState({ outlet: "Signature Italian", company: "", vendor: "", item: "", amount: "", notes: "" });
  const [submitting, setSubmitting] = React.useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !v.item || !v.amount) return;
    setSubmitting(true);
    await fetch(`${API}/api/approvals/requests`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requested_by_id: user.id, requested_by_name: user.name, requested_by_role: user.role,
        outlet: v.outlet, company: v.company, vendor: v.vendor,
        item_description: v.item, amount: parseFloat(v.amount), notes: v.notes,
      }),
    });
    setSubmitting(false);
    window.dispatchEvent(new CustomEvent("approvals:refresh"));
    onSaved();
  };
  return (
    <form data-testid="new-request-form" onSubmit={submit}
      className="p-4 mb-4 rounded-lg border border-amber-500/25 bg-amber-500/5 grid grid-cols-2 gap-3">
      <div className="col-span-2 text-[11px] font-bold tracking-wider text-amber-500 uppercase">New purchase request</div>
      {[
        ["outlet","Outlet","text",false], ["company","Company","text",false],
        ["vendor","Vendor","text",false], ["amount","Amount (USD)","number",false],
      ].map(([k,l,t]) => (
        <label key={String(k)} className="block">
          <div className="text-[9px] tracking-widest text-slate-400 font-bold mb-1">{l}</div>
          <input data-testid={`form-${k}`} type={t as string} value={(v as any)[k as string]}
            onChange={e => setV({ ...v, [k as string]: e.target.value })}
            className="w-full px-3 py-2 rounded bg-black/40 border border-white/10 text-sm" />
        </label>
      ))}
      <label className="col-span-2 block">
        <div className="text-[9px] tracking-widest text-slate-400 font-bold mb-1">Item / description</div>
        <input data-testid="form-item" required value={v.item} onChange={e => setV({ ...v, item: e.target.value })}
          className="w-full px-3 py-2 rounded bg-black/40 border border-white/10 text-sm" />
      </label>
      <label className="col-span-2 block">
        <div className="text-[9px] tracking-widest text-slate-400 font-bold mb-1">Notes</div>
        <input data-testid="form-notes" value={v.notes} onChange={e => setV({ ...v, notes: e.target.value })}
          className="w-full px-3 py-2 rounded bg-black/40 border border-white/10 text-sm" />
      </label>
      <div className="col-span-2 flex gap-2 justify-end mt-1">
        <button type="button" data-testid="form-cancel" onClick={onClose}
          className="px-4 py-2 rounded text-[10px] tracking-wider font-extrabold border border-white/10 bg-white/5 text-slate-400">CANCEL</button>
        <button type="submit" data-testid="form-submit" disabled={submitting}
          className="px-4 py-2 rounded text-[10px] tracking-wider font-extrabold border border-amber-500/55 bg-amber-500/18 text-amber-400">
          {submitting ? "SENDING…" : "SUBMIT FOR APPROVAL"}
        </button>
      </div>
    </form>
  );
}

function ControlsTab() {
  const [rows, setRows] = React.useState<LimitRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState({ limit: "", approver: "" });

  const refresh = () => {
    setLoading(true);
    fetch(`${API}/api/approvals/limits`, { credentials: "include" })
      .then(r => r.json()).then(d => { setRows(d.rows || []); setLoading(false); });
  };
  React.useEffect(refresh, []);

  const startEdit = (r: LimitRow) => {
    setEditing(r.role);
    setDraft({ limit: String(r.limit), approver: r.approver_role || "" });
  };
  const save = async (role: string) => {
    await fetch(`${API}/api/approvals/limits/${role}`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: parseFloat(draft.limit) || 0,
                              approver_role: draft.approver || null }),
    });
    setEditing(null);
    refresh();
  };

  if (loading) return <div className="p-10 text-center text-sm text-slate-400">Loading hierarchy…</div>;

  return (
    <div data-testid="controls-tab">
      <div className="mb-4 p-3 rounded border border-amber-500/20 bg-amber-500/5 text-xs text-slate-300 leading-relaxed">
        <b className="text-amber-500">Onboarding Controls.</b>{" "}
        Set the maximum dollar amount each role can authorize without escalation, and define
        which role they report to for approvals. Requests above a role's limit auto-route up
        the chain. Admin is always the final escalation.
      </div>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-white/10 text-slate-400 text-[9px] tracking-wider">
            <th className="text-left p-2 font-bold uppercase">Role</th>
            <th className="text-left p-2 font-bold uppercase">Limit</th>
            <th className="text-left p-2 font-bold uppercase">Reports / Escalates To</th>
            <th className="text-left p-2 font-bold uppercase">Updated</th>
            <th className="text-left p-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.role} data-testid={`controls-row-${r.role}`}
              className="border-b border-white/5">
              <td className="p-2.5 align-middle">
                <div className="font-bold">{r.label}</div>
                <div className="text-[9px] text-slate-500">{r.role}</div>
              </td>
              <td className="p-2.5 align-middle">
                {editing === r.role ? (
                  <input type="number" value={draft.limit}
                    data-testid={`controls-edit-limit-${r.role}`}
                    onChange={e => setDraft({ ...draft, limit: e.target.value })}
                    className="px-2 py-1 rounded bg-black/40 border border-white/15 text-[11px] w-32" />
                ) : (
                  <span className="font-bold text-amber-500">{fmt(r.limit)}</span>
                )}
              </td>
              <td className="p-2.5 align-middle">
                {editing === r.role ? (
                  <input value={draft.approver}
                    data-testid={`controls-edit-approver-${r.role}`}
                    placeholder="role-id"
                    onChange={e => setDraft({ ...draft, approver: e.target.value })}
                    className="px-2 py-1 rounded bg-black/40 border border-white/15 text-[11px] w-36" />
                ) : (r.approver_role || <i className="text-slate-500">final</i>)}
              </td>
              <td className="p-2.5 align-middle">
                <span className="text-[10px] text-slate-500">
                  {r.updated_at ? new Date(r.updated_at).toLocaleDateString() : ""}
                </span>
              </td>
              <td className="p-2.5 align-middle">
                {editing === r.role ? (
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(null)}
                      data-testid={`controls-cancel-${r.role}`}
                      className="px-3 py-1 rounded text-[10px] font-extrabold border border-white/10 bg-white/5 text-slate-400">×</button>
                    <button onClick={() => save(r.role)}
                      data-testid={`controls-save-${r.role}`}
                      className="px-3 py-1 rounded text-[10px] font-extrabold border border-green-500/55 bg-green-500/18 text-green-400">SAVE</button>
                  </div>
                ) : (
                  <button onClick={() => startEdit(r)}
                    data-testid={`controls-edit-${r.role}`}
                    className="px-3 py-1 rounded text-[10px] font-extrabold border border-white/10 bg-white/5 text-slate-400">EDIT</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
