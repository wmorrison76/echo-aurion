/**
 * Paystubs Panel · MyEcho · ADP-style tabbed view (iter 5.4)
 * ============================================================================
 * 8-tab payroll experience:
 *   1. Current Pay Statement
 *   2. Pay History
 *   3. YTD Earnings & Deductions
 *   4. Total Compensation
 *   5. Direct Deposit
 *   6. Income Tax Summary
 *   7. W-2 Wage & Tax Statement
 *   8. Model My Pay (what-if scenario)
 *
 * Real-math note: federal withholding uses IRS Pub 15-T (2026) brackets;
 * FICA/Medicare use 2026 statutory rates. The INPUTS (hours/rate) come
 * from the demo seed — the response carries `demo: true` and the UI
 * surfaces a §1.1 banner per the no-mock-without-disclosure rule.
 *
 * Gated by the PIN flow built in iter 5.3 (myecho_pin.py).
 */
import { useCallback, useEffect, useState } from "react";

interface PaystubsPanelProps {
  userId: string;
  userName?: string;
  onClose: () => void;
}

type Stage = "loading" | "setup" | "verify" | "unlocked";
type Tab = "current" | "history" | "ytd" | "totalcomp" | "direct-deposit" | "income-tax" | "w2" | "model";

interface PayrollPayload {
  ok: boolean;
  demo: boolean;
  employee: { id: string; name: string; filing_status: string; state: string; pay_frequency: string };
  current: any;
  history: any[];
  ytd: {
    earnings: any;
    deductions: any;
    taxes: any;
    total_compensation: any;
  };
  direct_deposit: any[];
  w2: any;
  tax_constants: any;
  generated_at: string;
}

const fmt = (v: number) =>
  v == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

const fmtPct = (v: number, d = 2) =>
  v == null ? "—" : `${(v * 100).toFixed(d)}%`;

const fmtDate = (iso: string) => {
  const dt = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" });
};

export default function PaystubsPanel({ userId, userName, onClose }: PaystubsPanelProps) {
  const [stage, setStage] = useState<Stage>("loading");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<PayrollPayload | null>(null);
  const [tab, setTab] = useState<Tab>("current");
  const [openHistId, setOpenHistId] = useState<string | null>(null);

  // PIN gate
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/myecho/pin/status?user_id=${encodeURIComponent(userId)}`);
        const s = await r.json();
        if (cancelled) return;
        if (s.locked) { setStage("verify"); setError(`Locked. Try again after ${new Date(s.locked_until).toLocaleTimeString()}.`); }
        else if (s.has_pin) setStage("verify");
        else setStage("setup");
      } catch (e: any) { setError(String(e?.message || e)); }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const onSetup = useCallback(async () => {
    setError(null);
    if (!/^\d{4,6}$/.test(pin)) return setError("PIN must be 4–6 digits.");
    if (pin !== pinConfirm) return setError("PIN entries don't match.");
    setBusy(true);
    try {
      const r = await fetch("/api/myecho/pin/setup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, pin }),
      });
      if (!r.ok) throw new Error((await r.json()).detail || `HTTP ${r.status}`);
      const d = await r.json();
      setToken(d.token); setStage("unlocked"); setPin(""); setPinConfirm("");
    } catch (e: any) { setError(String(e?.message || e)); } finally { setBusy(false); }
  }, [pin, pinConfirm, userId]);

  const onVerify = useCallback(async () => {
    setError(null); setBusy(true);
    try {
      const r = await fetch("/api/myecho/pin/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, pin }),
      });
      if (!r.ok) throw new Error((await r.json()).detail || `HTTP ${r.status}`);
      const d = await r.json();
      setToken(d.token); setStage("unlocked"); setPin("");
    } catch (e: any) { setError(String(e?.message || e)); setPin(""); } finally { setBusy(false); }
  }, [pin, userId]);

  // Fetch comprehensive payroll after unlock
  useEffect(() => {
    if (stage !== "unlocked" || !token || data) return;
    (async () => {
      try {
        const r = await fetch("/api/myecho/payroll/comprehensive?limit=12", {
          headers: { "x-user-id": userId, "x-pin-token": token },
        });
        if (r.ok) setData(await r.json());
        else throw new Error(`HTTP ${r.status}`);
      } catch (e: any) { setError(String(e?.message || e)); }
    })();
  }, [stage, token, data, userId]);

  return (
    <div data-testid="paystubs-modal" style={modalBg} onClick={onClose}>
      <div data-testid="paystubs-card" style={modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={modalHeader}>
          <div>
            <div style={eyebrow}>MYECHO · SECURE PAYROLL PANEL</div>
            <div style={titleText}>Paystubs &amp; Tax Documents</div>
            {(userName || data?.employee?.name) && (
              <div style={subText}>
                {data?.employee?.name ?? userName}{" "}
                {data?.employee && (<><span style={{ color: "#8a8478" }}>·</span> <code style={{ color: "#c8a97e" }}>{data.employee.filing_status}</code> <span style={{ color: "#8a8478" }}>·</span> <code style={{ color: "#c8a97e" }}>{data.employee.state}</code> <span style={{ color: "#8a8478" }}>·</span> <code style={{ color: "#c8a97e" }}>{data.employee.pay_frequency}</code></>)}
              </div>
            )}
          </div>
          <button data-testid="paystubs-close" onClick={onClose} style={closeBtn}>×</button>
        </div>

        {/* Body */}
        <div style={modalBody}>
          {stage === "loading" && <div style={muted}>Checking PIN…</div>}

          {stage === "setup" && (
            <PinGate kind="setup" pin={pin} setPin={setPin} pinConfirm={pinConfirm} setPinConfirm={setPinConfirm} onSubmit={onSetup} busy={busy} />
          )}

          {stage === "verify" && (
            <PinGate kind="verify" pin={pin} setPin={setPin} onSubmit={onVerify} busy={busy} />
          )}

          {stage === "unlocked" && !data && <div style={muted}>Loading payroll…</div>}

          {stage === "unlocked" && data && (
            <div data-testid="paystubs-unlocked">
              {data.demo && (
                <div data-testid="paystubs-demo-banner" style={demoBanner}>
                  <strong style={{ color: "#d9a85a" }}>§1.1 — Demo inputs · real IRS math.</strong>{" "}
                  Hours / rate / tips below come from a deterministic demo seed. The federal-withholding
                  brackets, FICA OASDI (6.2% on $168,600 base) and Medicare (1.45%) rates ARE the real
                  IRS-published 2026 figures. {data.tax_constants.state_name} state tax: {fmtPct(data.tax_constants.state_tax_rate)}.
                  Wire ADP / Gusto / Paychex to replace the demo inputs with live payroll runs.
                </div>
              )}

              {/* Tabs */}
              <div style={tabsBar} role="tablist" data-testid="paystubs-tabs">
                {([
                  ["current",         "Current"],
                  ["history",         "History"],
                  ["ytd",             "YTD"],
                  ["totalcomp",       "Total Comp"],
                  ["direct-deposit",  "Direct Deposit"],
                  ["income-tax",      "Income Tax"],
                  ["w2",              "W-2"],
                  ["model",           "Model My Pay"],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    data-testid={`paystubs-tab-${id}`}
                    onClick={() => setTab(id)}
                    style={{ ...tabBtn, ...(tab === id ? tabBtnActive : {}) }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === "current" && <CurrentTab p={data.current} />}
              {tab === "history" && <HistoryTab rows={data.history} openId={openHistId} setOpenId={setOpenHistId} />}
              {tab === "ytd" && <YtdTab ytd={data.ytd} />}
              {tab === "totalcomp" && <TotalCompTab ytd={data.ytd} />}
              {tab === "direct-deposit" && <DirectDepositTab accounts={data.direct_deposit} />}
              {tab === "income-tax" && <IncomeTaxTab ytd={data.ytd} constants={data.tax_constants} />}
              {tab === "w2" && <W2Tab w2={data.w2} />}
              {tab === "model" && <ModelMyPayTab token={token} userId={userId} />}
            </div>
          )}

          {error && <div data-testid="paystubs-error" style={errorBox}>{error}</div>}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PIN Gate — shared component for both setup + verify
// ============================================================================
function PinGate(props: { kind: "setup" | "verify"; pin: string; setPin: (s: string) => void; pinConfirm?: string; setPinConfirm?: (s: string) => void; onSubmit: () => void; busy: boolean }) {
  const isSetup = props.kind === "setup";
  return (
    <div data-testid={`paystubs-pin-${props.kind}`}>
      <div style={gateTitle}>🔒 {isSetup ? "Set up your PIN" : "Enter your PIN"}</div>
      <div style={gateBody}>
        {isSetup
          ? "Your payroll information is sensitive. Choose a 4–6 digit PIN to gate this view. The PIN is bcrypt-hashed in storage; we never store the plaintext. After 5 failed attempts the gate locks for 15 minutes."
          : "Confirm your PIN to view payroll information."}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
        <input data-testid={`paystubs-pin-${props.kind}-input`}
          type="password" inputMode="numeric" pattern="\d*" maxLength={6}
          placeholder={isSetup ? "PIN (4–6 digits)" : "PIN"}
          value={props.pin} onChange={(e) => props.setPin(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && !isSetup && props.onSubmit()}
          style={pinInput} autoFocus />
        {isSetup && props.setPinConfirm && (
          <input data-testid="paystubs-pin-setup-confirm"
            type="password" inputMode="numeric" pattern="\d*" maxLength={6}
            placeholder="Confirm PIN" value={props.pinConfirm}
            onChange={(e) => props.setPinConfirm!(e.target.value.replace(/\D/g, ""))}
            style={pinInput} />
        )}
        <button data-testid={`paystubs-pin-${props.kind}-submit`}
          onClick={props.onSubmit} disabled={props.busy || !props.pin || (isSetup && !props.pinConfirm)}
          style={primaryBtn}>
          {props.busy ? "Working…" : isSetup ? "Set PIN & Continue" : "Unlock"}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Tab 1 · Current Pay Statement
// ============================================================================
function CurrentTab({ p }: { p: any }) {
  return (
    <div data-testid="tab-current">
      <SectionTitle>Pay statement · {fmtDate(p.period_start)} — {fmtDate(p.period_end)}</SectionTitle>
      <KvGrid cols={3} items={[
        ["Pay Date", fmtDate(p.pay_date)],
        ["Doc Number", <code key="dn" style={code}>{p.doc_number}</code>],
        ["Pay Type", p.pay_type],
        ["Week #", String(p.week_number)],
        ["Job", p.job],
        ["Current Rate", fmt(p.earnings.regular_pay.rate)],
      ]} />

      <SectionTitle>Earnings</SectionTitle>
      <table style={dataTable}>
        <thead><tr><th>Type</th><th style={right}>Hours</th><th style={right}>Rate</th><th style={right}>Amount</th></tr></thead>
        <tbody>
          {[
            ["Regular Pay",  p.earnings.regular_pay],
            ["Overtime",     p.earnings.overtime_pay],
            ["Bonus",        p.earnings.bonus],
            ["Tips",         p.earnings.tips],
            ["GTL Imputed",  p.earnings.gtl_imputed],
            ["Cell (non-tax)", p.earnings.cell_non_tax],
          ].map(([label, e]: any) => (
            <tr key={label}>
              <td>{label}</td>
              <td style={right}>{e.hours == null ? "—" : e.hours}</td>
              <td style={right}>{e.rate == null ? "—" : fmt(e.rate)}</td>
              <td style={right}>{fmt(e.amount)}</td>
            </tr>
          ))}
          <tr style={{ borderTop: "1px solid rgba(200,169,126,0.4)" }}>
            <td style={bold}>Gross Total</td><td></td><td></td><td style={{ ...right, ...bold, color: "#c8a97e" }}>{fmt(p.gross_total)}</td>
          </tr>
        </tbody>
      </table>

      <SectionTitle>Pre-tax deductions</SectionTitle>
      <KvGrid cols={2} items={[
        ["Medical", fmt(p.deductions_pretax.medical)],
        ["Dental",  fmt(p.deductions_pretax.dental)],
        ["Vision",  fmt(p.deductions_pretax.vision)],
        ["FSA",     fmt(p.deductions_pretax.fsa)],
        ["401(k)",  fmt(p.deductions_pretax.retire_401k)],
        ["Total",   <strong key="t" style={{ color: "#c8a97e" }}>{fmt(p.deductions_pretax.total)}</strong>],
      ]} />

      <SectionTitle>Employee taxes</SectionTitle>
      <KvGrid cols={2} items={[
        ["Federal Income Tax", fmt(p.employee_taxes.federal_wh)],
        [`State (${p.employee_taxes.state_name})`, fmt(p.employee_taxes.state_wh)],
        ["FICA · Social Security (OASDI)", fmt(p.employee_taxes.fica_oasdi)],
        ["FICA · Medicare", fmt(p.employee_taxes.fica_medicare)],
        ["Total", <strong key="t" style={{ color: "#c87065" }}>{fmt(p.employee_taxes.total)}</strong>],
      ]} />

      <div style={netBigCard} data-testid="current-net-pay">
        <div style={netLbl}>Net pay this period</div>
        <div style={netVal}>{fmt(p.net_pay)}</div>
      </div>
    </div>
  );
}

// ============================================================================
// Tab 2 · Pay History
// ============================================================================
function HistoryTab({ rows, openId, setOpenId }: { rows: any[]; openId: string | null; setOpenId: (s: string | null) => void }) {
  return (
    <div data-testid="tab-history">
      <SectionTitle>Pay history · last {rows.length} periods</SectionTitle>
      <ul style={listReset}>
        {rows.map((r) => (
          <li key={r.id} data-testid={`history-row-${r.id}`} style={{ marginBottom: 4 }}>
            <button onClick={() => setOpenId(openId === r.id ? null : r.id)} style={historyTrigger}>
              <span style={{ color: "#c8a97e", fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>{fmtDate(r.pay_date)}</span>
              <code style={code}>{r.doc_number}</code>
              <span style={{ marginLeft: "auto", color: "#f5efe4", fontFamily: "JetBrains Mono, monospace", fontSize: 13 }}>{fmt(r.net_pay)}</span>
              <span style={{ color: "#8a8478", fontSize: 11 }}>{openId === r.id ? "▾" : "▸"}</span>
            </button>
            {openId === r.id && (
              <div style={historyDrawer}>
                <KvGrid cols={3} items={[
                  ["Earnings (gross)", fmt(r.gross_total)],
                  ["Deductions", fmt(r.deductions_pretax.total + r.deductions_posttax.total)],
                  ["Taxes",     fmt(r.employee_taxes.total)],
                ]} />
                <a href={r.pdf_url} target="_blank" rel="noreferrer" style={downloadBtn}>⤓ Paystub PDF</a>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Tab 3 · YTD
// ============================================================================
function YtdTab({ ytd }: { ytd: any }) {
  return (
    <div data-testid="tab-ytd">
      <SectionTitle>Year-to-date earnings</SectionTitle>
      <KvGrid cols={2} items={[
        ["Regular Pay", fmt(ytd.earnings.regular_pay)],
        ["Overtime", fmt(ytd.earnings.overtime_pay)],
        ["Bonus", fmt(ytd.earnings.bonus)],
        ["Tips", fmt(ytd.earnings.tips)],
        ["GTL Imputed", fmt(ytd.earnings.gtl_imputed)],
        ["Cell (non-tax)", fmt(ytd.earnings.cell_non_tax)],
        ["Total Hours", `${ytd.earnings.total_hours} h`],
        ["Total Amount", <strong key="t" style={{ color: "#c8a97e" }}>{fmt(ytd.earnings.total_amount)}</strong>],
      ]} />

      <SectionTitle>Year-to-date deductions</SectionTitle>
      <KvGrid cols={2} items={[
        ["Medical", fmt(ytd.deductions.medical)],
        ["Dental", fmt(ytd.deductions.dental)],
        ["Vision", fmt(ytd.deductions.vision)],
        ["FSA", fmt(ytd.deductions.fsa)],
        ["401(k)", fmt(ytd.deductions.retire_401k)],
        ["Union Dues", fmt(ytd.deductions.union_dues)],
        ["Total Deductions", <strong key="t" style={{ color: "#c8a97e" }}>{fmt(ytd.deductions.total)}</strong>],
      ]} />

      <SectionTitle>Year-to-date taxes</SectionTitle>
      <KvGrid cols={2} items={[
        ["Federal Income Tax", fmt(ytd.taxes.federal_wh)],
        ["State Income Tax", fmt(ytd.taxes.state_wh)],
        ["FICA · OASDI", fmt(ytd.taxes.fica_oasdi)],
        ["FICA · Medicare", fmt(ytd.taxes.fica_medicare)],
        ["Total Taxes", <strong key="t" style={{ color: "#c87065" }}>{fmt(ytd.taxes.total)}</strong>],
      ]} />
    </div>
  );
}

// ============================================================================
// Tab 4 · Total Compensation
// ============================================================================
function TotalCompTab({ ytd }: { ytd: any }) {
  const t = ytd.total_compensation;
  const eePct = t.gross_earnings / t.total_compensation;
  const benPct = t.employer_paid_benefits_total / t.total_compensation;
  const taxPct = t.employer_paid_taxes_total / t.total_compensation;
  return (
    <div data-testid="tab-totalcomp">
      <SectionTitle>Total compensation · year-to-date</SectionTitle>
      <div style={{ background: "rgba(200,169,126,0.06)", border: "1px solid rgba(200,169,126,0.25)", borderRadius: 8, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: "#c8a97e", fontWeight: 700, marginBottom: 6 }}>TOTAL COMPENSATION</div>
        <div style={{ fontSize: 24, color: "#c8a97e", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>{fmt(t.total_compensation)}</div>
        <div style={{ fontSize: 11, color: "#8a8478", marginTop: 4 }}>your earnings + everything your employer pays for you</div>
      </div>

      {/* Stacked bar */}
      <div style={{ height: 30, display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(200,169,126,0.25)", marginBottom: 14 }}>
        <div title="Gross earnings" style={{ width: `${eePct * 100}%`, background: "linear-gradient(180deg, #e5c26e, #c8a97e)" }} />
        <div title="Employer benefits" style={{ width: `${benPct * 100}%`, background: "#6e8fa8" }} />
        <div title="Employer taxes" style={{ width: `${taxPct * 100}%`, background: "#8a8478" }} />
      </div>

      <KvGrid cols={2} items={[
        ["You earned (gross)", <span key="e" style={{ color: "#c8a97e" }}>{fmt(t.gross_earnings)} ({fmtPct(eePct, 1)})</span>],
        ["Employer benefits", <span key="b" style={{ color: "#6e8fa8" }}>{fmt(t.employer_paid_benefits_total)} ({fmtPct(benPct, 1)})</span>],
        ["Employer taxes (FICA + FUTA + WC)", <span key="t" style={{ color: "#8a8478" }}>{fmt(t.employer_paid_taxes_total)} ({fmtPct(taxPct, 1)})</span>],
        ["Your net take-home", <strong key="n" style={{ color: "#7fb084" }}>{fmt(t.ytd_net_pay)}</strong>],
      ]} />
    </div>
  );
}

// ============================================================================
// Tab 5 · Direct Deposit
// ============================================================================
function DirectDepositTab({ accounts }: { accounts: any[] }) {
  return (
    <div data-testid="tab-direct-deposit">
      <SectionTitle>Direct deposit accounts</SectionTitle>
      {accounts.length === 0 ? (
        <div style={muted}>No direct-deposit accounts on file. Add one via HR to enable paperless pay.</div>
      ) : (
        <ul style={listReset}>
          {accounts.map((a) => (
            <li key={a.id} data-testid={`dd-${a.id}`} style={ddCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ color: "#f5efe4", fontSize: 13, fontWeight: 600 }}>{a.bank_name}</div>
                  <div style={{ color: "#8a8478", fontSize: 10 }}>{a.account_type} · ••••{a.account_last4} · routing ••••{a.routing_last4}</div>
                </div>
                {a.primary && <span style={primaryBadge}>PRIMARY</span>}
              </div>
              <div style={{ color: "#c8a97e", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>
                {a.allocation_type === "percent" ? `${a.allocation_value}% of net pay` : `${fmt(a.allocation_value)} flat`}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================================
// Tab 6 · Income Tax Summary
// ============================================================================
function IncomeTaxTab({ ytd, constants }: { ytd: any; constants: any }) {
  const taxes = ytd.taxes;
  const grossYtd = ytd.earnings.total_amount;
  const effRate = grossYtd > 0 ? taxes.total / grossYtd : 0;
  return (
    <div data-testid="tab-income-tax">
      <SectionTitle>Income tax summary · {new Date().getFullYear()} YTD</SectionTitle>
      <KvGrid cols={2} items={[
        ["Federal Income Tax (Withheld)", fmt(taxes.federal_wh)],
        [`State Income Tax (${constants.state_name})`, fmt(taxes.state_wh)],
        ["FICA · OASDI (Social Security)", fmt(taxes.fica_oasdi)],
        ["FICA · Medicare", fmt(taxes.fica_medicare)],
        ["Total withholding", <strong key="t" style={{ color: "#c87065" }}>{fmt(taxes.total)}</strong>],
        ["Effective tax rate", <strong key="r" style={{ color: "#c8a97e" }}>{fmtPct(effRate, 2)}</strong>],
      ]} />

      <SectionTitle>2026 statutory rates · source: {constants.source}</SectionTitle>
      <KvGrid cols={2} items={[
        ["FICA OASDI rate", fmtPct(constants.fica_oasdi_rate)],
        ["OASDI wage base (2026)", fmt(constants.fica_oasdi_wage_base)],
        ["FICA Medicare rate", fmtPct(constants.fica_medicare_rate)],
        ["Additional Medicare rate", `${fmtPct(constants.additional_medicare_rate)} above ${fmt(constants.additional_medicare_threshold)}`],
        ["FUTA rate (employer)", `${fmtPct(constants.futa_rate)} on first ${fmt(constants.futa_wage_base)}`],
        ["State income tax rate", `${fmtPct(constants.state_tax_rate)} (${constants.state_name})`],
      ]} />
    </div>
  );
}

// ============================================================================
// Tab 7 · W-2 layout
// ============================================================================
function W2Tab({ w2 }: { w2: any }) {
  return (
    <div data-testid="tab-w2">
      <SectionTitle>U.S. Wage &amp; Tax Statement · Form W-2 · {w2.year}</SectionTitle>
      <div style={w2Card}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={brkLbl}>Employer</div>
            <div style={{ color: "#f5efe4", fontSize: 13 }}>{w2.employer_name}</div>
            <div style={{ color: "#8a8478", fontSize: 10 }}>EIN {w2.employer_ein}</div>
          </div>
          <div>
            <div style={brkLbl}>Employee SSN</div>
            <code style={{ color: "#c8a97e", fontSize: 13 }}>{w2.employee_id_masked}</code>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <W2Box num="1"  label="Wages, tips, other comp" value={w2.box_1_wages} />
          <W2Box num="2"  label="Federal income tax withheld" value={w2.box_2_federal_wh} />
          <W2Box num="3"  label="Social Security wages" value={w2.box_3_ss_wages} />
          <W2Box num="4"  label="Social Security tax withheld" value={w2.box_4_ss_tax} />
          <W2Box num="5"  label="Medicare wages and tips" value={w2.box_5_medicare_wages} />
          <W2Box num="6"  label="Medicare tax withheld" value={w2.box_6_medicare_tax} />
          <W2Box num="15" label={`State (${w2.box_15_state})`} value={null} valueText={w2.box_15_state} />
          <W2Box num="17" label="State income tax" value={w2.box_17_state_wh} />
          <W2Box num="12" label="See codes →" value={null} valueText={`${w2.box_12_codes.length} entries`} />
        </div>

        {w2.box_12_codes.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={brkLbl}>Box 12 codes</div>
            <ul style={listReset}>
              {w2.box_12_codes.map((c: any) => (
                <li key={c.code} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#f5efe4", borderBottom: "1px solid rgba(200,169,126,0.08)" }}>
                  <span><strong style={{ color: "#c8a97e" }}>{c.code}</strong> · {c.label}</span>
                  <span>{fmt(c.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function W2Box({ num, label, value, valueText }: { num: string; label: string; value: number | null; valueText?: string }) {
  return (
    <div style={w2Box} data-testid={`w2-box-${num}`}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: "#8a8478", letterSpacing: 1 }}>BOX {num}</span>
      </div>
      <div style={{ fontSize: 9, color: "#c8a97e", marginBottom: 4, lineHeight: 1.3 }}>{label}</div>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: "#f5efe4" }}>
        {value != null ? fmt(value) : (valueText ?? "—")}
      </div>
    </div>
  );
}

// ============================================================================
// Tab 8 · Model My Pay
// ============================================================================
function ModelMyPayTab({ token, userId }: { token: string | null; userId: string }) {
  const [hourly, setHourly] = useState(22);
  const [reg, setReg] = useState(80);
  const [ot, setOt] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [retire, setRetire] = useState(0.05);
  const [out, setOut] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  // iter265 · "Compare to current" toggle (P2)
  const [compareMode, setCompareMode] = useState(false);
  const [current, setCurrent] = useState<any>(null);
  const [currentLoading, setCurrentLoading] = useState(false);

  const run = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/myecho/payroll/model-my-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId, "x-pin-token": token ?? "" },
        body: JSON.stringify({ hourly_rate: hourly, regular_hours: reg, overtime_hours: ot, bonus, retire_401k_pct: retire }),
      });
      if (r.ok) setOut(await r.json());
    } finally { setBusy(false); }
  }, [hourly, reg, ot, bonus, retire, userId, token]);

  // Fetch the operator's most-recent real paycheck for the comparison column.
  const fetchCurrent = useCallback(async () => {
    setCurrentLoading(true);
    try {
      const r = await fetch("/api/myecho/payroll/comprehensive", {
        headers: { "x-user-id": userId, "x-pin-token": token ?? "" },
      });
      if (r.ok) {
        const data = await r.json();
        // Try common shapes: { latest_stub: {per_period, annualized} } or { stubs: [...] }
        const stub = data?.latest_stub ?? data?.stubs?.[0] ?? data?.current ?? null;
        setCurrent(stub);
        // Prefill modeled inputs from current paycheck so deltas start at 0
        if (stub?.per_period) {
          if (typeof stub.hourly_rate === "number") setHourly(stub.hourly_rate);
          if (typeof stub.regular_hours === "number") setReg(stub.regular_hours);
          if (typeof stub.overtime_hours === "number") setOt(stub.overtime_hours);
        }
      }
    } finally { setCurrentLoading(false); }
  }, [userId, token]);

  useEffect(() => { run(); }, [run]);
  useEffect(() => {
    if (compareMode && !current) fetchCurrent();
  }, [compareMode, current, fetchCurrent]);

  const p = out?.per_period;
  const a = out?.annualized;
  const cp = current?.per_period;
  const ca = current?.annualized;

  // Build delta = (modeled - current). Returns formatted string + color.
  const delta = (modeled: number | undefined, currentVal: number | undefined) => {
    if (typeof modeled !== "number" || typeof currentVal !== "number") return null;
    const diff = modeled - currentVal;
    if (Math.abs(diff) < 0.005) return <span style={{ color: "#8a8478" }}>=</span>;
    const positive = diff > 0;
    return (
      <span
        data-testid="model-delta"
        style={{ color: positive ? "#7fb084" : "#c87065", fontSize: 11, marginLeft: 6 }}
      >
        {positive ? "▲" : "▼"} {fmt(Math.abs(diff))}
      </span>
    );
  };

  return (
    <div data-testid="tab-model-my-pay">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <SectionTitle>Model my pay · what-if scenarios</SectionTitle>
        <label
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#c8a97e", cursor: "pointer" }}
          data-testid="compare-to-current-toggle"
        >
          <input
            type="checkbox"
            checked={compareMode}
            onChange={(e) => setCompareMode(e.target.checked)}
            data-testid="compare-to-current-checkbox"
          />
          Compare to current
          {currentLoading && <span style={{ fontSize: 9, color: "#8a8478" }}>(loading…)</span>}
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 10, marginBottom: 14 }}>
        <NumInput data-testid="model-hourly" label="Hourly rate ($/hr)" value={hourly} step={0.25} onChange={setHourly} />
        <NumInput data-testid="model-reg" label="Regular hrs / period" value={reg} step={1} onChange={setReg} />
        <NumInput data-testid="model-ot" label="Overtime hrs / period" value={ot} step={1} onChange={setOt} />
        <NumInput data-testid="model-bonus" label="Bonus ($)" value={bonus} step={50} onChange={setBonus} />
        <NumInput data-testid="model-retire" label="401(k) %" value={retire * 100} step={1} onChange={(v) => setRetire(v / 100)} />
      </div>
      {p && a && (
        <>
          <SectionTitle>
            Projected per pay period
            {compareMode && cp && (
              <span style={{ fontSize: 10, color: "#8a8478", marginLeft: 8, fontWeight: "normal" }}>
                · vs your current paycheck
              </span>
            )}
          </SectionTitle>
          <KvGrid cols={3} items={[
            ["Regular pay", <span key="rp">{fmt(p.regular_pay)}{compareMode && delta(p.regular_pay, cp?.regular_pay)}</span>],
            ["Overtime pay", <span key="op">{fmt(p.overtime_pay)}{compareMode && delta(p.overtime_pay, cp?.overtime_pay)}</span>],
            ["Bonus", <span key="bn">{fmt(p.bonus)}{compareMode && delta(p.bonus, cp?.bonus)}</span>],
            ["Gross taxable", <span key="g"><strong style={{ color: "#c8a97e" }}>{fmt(p.gross_taxable)}</strong>{compareMode && delta(p.gross_taxable, cp?.gross_taxable)}</span>],
            ["Pre-tax deductions", <span key="pd">{fmt(p.pretax_deductions)}{compareMode && delta(p.pretax_deductions, cp?.pretax_deductions)}</span>],
            ["Federal WH", <span key="fw">{fmt(p.federal_wh)}{compareMode && delta(p.federal_wh, cp?.federal_wh)}</span>],
            ["State WH", <span key="sw">{fmt(p.state_wh)}{compareMode && delta(p.state_wh, cp?.state_wh)}</span>],
            ["FICA OASDI", <span key="fo">{fmt(p.fica_oasdi)}{compareMode && delta(p.fica_oasdi, cp?.fica_oasdi)}</span>],
            ["FICA Medicare", <span key="fm">{fmt(p.fica_medicare)}{compareMode && delta(p.fica_medicare, cp?.fica_medicare)}</span>],
            ["Net pay", <span key="n"><strong style={{ color: "#7fb084" }}>{fmt(p.net_pay)}</strong>{compareMode && delta(p.net_pay, cp?.net_pay)}</span>],
          ]} />

          <SectionTitle>
            Annualized projection
            {compareMode && ca && (
              <span style={{ fontSize: 10, color: "#8a8478", marginLeft: 8, fontWeight: "normal" }}>
                · vs current annualized
              </span>
            )}
          </SectionTitle>
          <KvGrid cols={3} items={[
            ["Gross / year", <span key="g">{fmt(a.gross)}{compareMode && delta(a.gross, ca?.gross)}</span>],
            ["Taxes / year", <span key="t">{fmt(a.taxes)}{compareMode && delta(a.taxes, ca?.taxes)}</span>],
            ["Net / year", <span key="n"><strong style={{ color: "#c8a97e" }}>{fmt(a.net)}</strong>{compareMode && delta(a.net, ca?.net)}</span>],
            ["Effective tax rate", fmtPct(a.effective_tax_rate, 2)],
          ]} />

          {compareMode && !current && !currentLoading && (
            <div style={{ ...muted, color: "#c87065", marginTop: 8 }}>
              No current paycheck on file. Compare mode is showing the modeled scenario only.
            </div>
          )}

          {/* Simple stacked-bar graph */}
          <div style={{ height: 28, display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(200,169,126,0.25)", marginTop: 14 }}>
            <div title="Net pay" style={{ width: `${a.net / a.gross * 100}%`, background: "linear-gradient(180deg, #7fb084, #5d8866)" }} />
            <div title="Taxes" style={{ width: `${a.taxes / a.gross * 100}%`, background: "#c87065" }} />
            <div title="Pre-tax deductions" style={{ width: `${a.pretax_deductions / a.gross * 100}%`, background: "#6e8fa8" }} />
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 6, fontSize: 10, color: "#8a8478" }}>
            <span><span style={{ ...legendDot, background: "#7fb084" }} /> Take-home</span>
            <span><span style={{ ...legendDot, background: "#c87065" }} /> Taxes</span>
            <span><span style={{ ...legendDot, background: "#6e8fa8" }} /> Deductions</span>
          </div>

          <div style={{ marginTop: 14, fontSize: 10, color: "#8a8478", fontStyle: "italic" }}>
            Math: {out.math_source}. Inputs are your own — no demo data here.
          </div>
        </>
      )}
      {busy && <div style={muted}>Computing…</div>}
    </div>
  );
}

function NumInput({ label, value, step, onChange, ...rest }: { label: string; value: number; step: number; onChange: (v: number) => void } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest}>
      <div style={{ fontSize: 9, color: "#8a8478", letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>{label}</div>
      <input type="number" value={value} step={step} onChange={(e) => onChange(Number(e.target.value) || 0)} style={numInputStyle} />
    </div>
  );
}

// ============================================================================
// Shared little components
// ============================================================================
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={sectionLabel}>{children}</div>;
}

function KvGrid({ cols, items }: { cols: number; items: Array<[string, React.ReactNode]> }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10, marginBottom: 16 }}>
      {items.map(([label, val], i) => (
        <div key={i} style={kvCell}>
          <div style={kvLbl}>{label}</div>
          <div style={kvVal}>{val}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================
const modalBg: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 2147483647,
  background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)",
  display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "4vh",
};
const modalCard: React.CSSProperties = {
  width: "min(780px, 96vw)", maxHeight: "92vh", overflowY: "auto",
  background: "linear-gradient(180deg, #0b0d14, #05070d)",
  border: "1px solid rgba(200,169,126,0.4)", borderRadius: 14,
  boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
  color: "#f5efe4", fontFamily: "'Inter', sans-serif",
};
const modalHeader: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
  padding: "16px 22px", borderBottom: "1px solid rgba(200,169,126,0.2)",
  position: "sticky", top: 0, background: "linear-gradient(180deg, #0b0d14, #05070d)", zIndex: 1,
};
const eyebrow: React.CSSProperties = { color: "#c8a97e", fontSize: 9, letterSpacing: 2, fontWeight: 700 };
const titleText: React.CSSProperties = { color: "#f5efe4", fontSize: 17, fontWeight: 600, marginTop: 2 };
const subText: React.CSSProperties = { color: "#8a8478", fontSize: 11, marginTop: 4 };
const closeBtn: React.CSSProperties = { background: "transparent", border: "none", color: "#c8a97e", fontSize: 24, cursor: "pointer", width: 28, height: 28, lineHeight: 1 };
const modalBody: React.CSSProperties = { padding: 22 };
const muted: React.CSSProperties = { color: "#8a8478", fontSize: 12, fontStyle: "italic", padding: "20px 0" };

const tabsBar: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 18, borderBottom: "1px solid rgba(200,169,126,0.18)", paddingBottom: 0 };
const tabBtn: React.CSSProperties = { background: "transparent", border: "none", color: "#8a8478", padding: "8px 12px", fontSize: 11, letterSpacing: 0.8, cursor: "pointer", fontFamily: "inherit", borderBottom: "2px solid transparent" };
const tabBtnActive: React.CSSProperties = { color: "#c8a97e", borderBottom: "2px solid #c8a97e" };

const demoBanner: React.CSSProperties = { background: "rgba(217,168,90,0.08)", border: "1px solid rgba(217,168,90,0.35)", borderLeft: "3px solid #d9a85a", borderRadius: 4, padding: "10px 14px", marginBottom: 14, fontSize: 11, lineHeight: 1.5 };

const gateTitle: React.CSSProperties = { fontSize: 18, color: "#c8a97e", fontWeight: 600, marginBottom: 6 };
const gateBody: React.CSSProperties = { fontSize: 12, color: "#f5efe4", opacity: 0.85, lineHeight: 1.5 };
const pinInput: React.CSSProperties = { background: "rgba(0,0,0,0.4)", border: "1px solid rgba(200,169,126,0.35)", color: "#f5efe4", padding: "10px 14px", fontSize: 16, letterSpacing: 6, textAlign: "center", borderRadius: 8, outline: "none", fontFamily: "JetBrains Mono, monospace" };
const primaryBtn: React.CSSProperties = { background: "linear-gradient(180deg, #e5c26e, #c8a97e)", color: "#0a0a0c", fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", padding: "10px 16px", borderRadius: 8, border: "1px solid #c8a97e", cursor: "pointer" };

const sectionLabel: React.CSSProperties = { fontSize: 10, letterSpacing: 2, color: "#c8a97e", fontWeight: 700, marginTop: 4, marginBottom: 10, textTransform: "uppercase" };
const kvCell: React.CSSProperties = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,169,126,0.18)", borderRadius: 6, padding: "8px 10px" };
const kvLbl: React.CSSProperties = { fontSize: 9, color: "#8a8478", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 };
const kvVal: React.CSSProperties = { fontSize: 12, color: "#f5efe4", fontFamily: "JetBrains Mono, monospace" };

const dataTable: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 14 };
const right: React.CSSProperties = { textAlign: "right" };
const bold: React.CSSProperties = { fontWeight: 700 };
const code: React.CSSProperties = { color: "#c8a97e", fontSize: 10, fontFamily: "JetBrains Mono, monospace" };

const historyTrigger: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,169,126,0.18)", borderRadius: 6, cursor: "pointer", color: "#f5efe4", fontFamily: "inherit", textAlign: "left" };
const historyDrawer: React.CSSProperties = { background: "rgba(0,0,0,0.3)", border: "1px solid rgba(200,169,126,0.18)", borderTop: "none", borderRadius: "0 0 6px 6px", padding: "12px 14px", marginTop: -3 };
const listReset: React.CSSProperties = { listStyle: "none", padding: 0, margin: 0 };

const netBigCard: React.CSSProperties = { background: "linear-gradient(180deg, rgba(127,176,132,0.12), rgba(127,176,132,0.03))", border: "1px solid rgba(127,176,132,0.4)", borderRadius: 8, padding: 18, textAlign: "center", marginTop: 16 };
const netLbl: React.CSSProperties = { fontSize: 9, letterSpacing: 2, color: "#7fb084", fontWeight: 700, marginBottom: 6 };
const netVal: React.CSSProperties = { fontSize: 28, color: "#7fb084", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 };

const ddCard: React.CSSProperties = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,169,126,0.25)", borderRadius: 8, padding: 14, marginBottom: 8 };
const primaryBadge: React.CSSProperties = { background: "rgba(200,169,126,0.15)", color: "#c8a97e", border: "1px solid rgba(200,169,126,0.4)", padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, letterSpacing: 1 };

const w2Card: React.CSSProperties = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,169,126,0.25)", borderRadius: 8, padding: 16 };
const w2Box: React.CSSProperties = { background: "rgba(0,0,0,0.3)", border: "1px solid rgba(200,169,126,0.2)", borderRadius: 4, padding: "8px 10px" };
const brkLbl: React.CSSProperties = { fontSize: 9, color: "#8a8478", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 };

const numInputStyle: React.CSSProperties = { width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(200,169,126,0.35)", color: "#f5efe4", padding: "6px 10px", fontSize: 13, borderRadius: 6, outline: "none", fontFamily: "JetBrains Mono, monospace" };
const legendDot: React.CSSProperties = { display: "inline-block", width: 9, height: 9, borderRadius: "50%", marginRight: 4, verticalAlign: "middle" };

const downloadBtn: React.CSSProperties = { display: "inline-block", marginTop: 10, background: "transparent", border: "1px solid #c8a97e", color: "#c8a97e", padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, textDecoration: "none" };
const errorBox: React.CSSProperties = { marginTop: 14, padding: "8px 12px", background: "rgba(200,112,101,0.1)", border: "1px solid rgba(200,112,101,0.4)", color: "#c87065", borderRadius: 6, fontSize: 11 };
