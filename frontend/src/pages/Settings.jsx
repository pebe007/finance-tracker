import {
  CheckCircle,
  Download,
  MessageSquare,
  Plus,
  Send,
  Tag,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  createCategory,
  deleteCategory,
  getAppSettings,
  getCategories,
  getTransactions,
  registerWebhook,
  sendDigest,
  testTelegram,
  updateAppSettings,
} from "../api";

const COLORS = [
  "#6366F1","#4F46E5","#22C55E","#1DB954","#F97316","#EF4444",
  "#EC4899","#3B82F6","#F59E0B","#8B5CF6","#06B6D4","#64748B",
];

/* ─── Section wrapper ─── */
function Section({ title, icon: Icon, children }) {
  return (
    <div className="card">
      <div
        className="flex items-center gap-2 mb-4"
        style={{ paddingBottom: 10, borderBottom: "1px solid #1f2937" }}
      >
        {Icon && <Icon size={15} style={{ color: "#6366f1" }} />}
        <h2 className="text-white font-semibold text-sm">{title}</h2>
      </div>
      {children}
    </div>
  );
}

/* ─── Toggle ─── */
function Toggle({ checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  );
}

/* ─── Category row ─── */
function CategoryRow({ cat, onDelete }) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: "8px 0", borderBottom: "1px solid #111827" }}
    >
      <div className="flex items-center gap-3">
        <div
          style={{
            width: 28, height: 28, borderRadius: 6,
            background: (cat.color || "#6366f1") + "22",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
          }}
        >
          {cat.icon || "•"}
        </div>
        <span style={{ fontSize: 13, color: "#d1d5db" }}>{cat.name}</span>
        <span
          className="badge"
          style={
            cat.type === "income"
              ? { background: "#052e1640", color: "#4ade80", border: "1px solid #16a34a40" }
              : { background: "#450a0a40", color: "#f87171", border: "1px solid #dc262640" }
          }
        >
          {cat.type}
        </span>
      </div>
      <button
        onClick={() => onDelete(cat.id)}
        className="btn btn-ghost"
        style={{ padding: "4px 7px", color: "#4b5563" }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

/* ─── Telegram config panel ─── */
function TelegramPanel() {
  const [cfg, setCfg]             = useState(null);
  const [saving, setSaving]       = useState(false);
  const [testing, setTesting]     = useState(false);
  const [digesting, setDigesting] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [renderUrl, setRenderUrl] = useState("https://fintrack-api.onrender.com");
  const [status, setStatus]       = useState(null); // {ok, msg}

  useEffect(() => {
    getAppSettings()
      .then((s) => setCfg(s.telegram))
      .catch(() => setStatus({ ok: false, msg: "Could not load settings." }));
  }, []);

  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await updateAppSettings({ telegram: cfg });
      setStatus({ ok: true, msg: "Settings saved." });
    } catch {
      setStatus({ ok: false, msg: "Save failed." });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setStatus(null);
    try {
      await testTelegram();
      setStatus({ ok: true, msg: "Test message sent — check Telegram." });
    } catch (err) {
      setStatus({ ok: false, msg: err.response?.data?.detail ?? "Test failed." });
    } finally {
      setTesting(false);
    }
  };

  const handleDigest = async () => {
    setDigesting(true);
    setStatus(null);
    try {
      await sendDigest();
      setStatus({ ok: true, msg: "Digest queued — check Telegram." });
    } catch (err) {
      setStatus({ ok: false, msg: err.response?.data?.detail ?? "Digest failed." });
    } finally {
      setDigesting(false);
    }
  };

  const handleRegisterWebhook = async () => {
    setRegistering(true);
    setStatus(null);
    try {
      const res = await registerWebhook(renderUrl);
      setStatus({ ok: true, msg: `Webhook registered: ${res.webhook_url}` });
    } catch (err) {
      setStatus({ ok: false, msg: err.response?.data?.detail ?? "Registration failed." });
    } finally {
      setRegistering(false);
    }
  };

  if (!cfg) return <p style={{ color: "#4b5563", fontSize: 13 }}>Loading…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Master toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white text-sm font-semibold">Enable Telegram Integration</p>
          <p style={{ fontSize: 12, color: "#4b5563" }}>No extra hosting needed — uses Telegram Bot API directly</p>
        </div>
        <Toggle checked={cfg.enabled} onChange={(v) => set("enabled", v)} />
      </div>

      {/* Bot config */}
      <div
        style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
          opacity: cfg.enabled ? 1 : 0.4,
          pointerEvents: cfg.enabled ? "auto" : "none",
        }}
      >
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="field-label">Bot Token</label>
          <input
            className="field"
            type="password"
            value={cfg.bot_token}
            onChange={(e) => set("bot_token", e.target.value)}
            placeholder="1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ (from @BotFather)"
          />
        </div>
        <div>
          <label className="field-label">Your Chat ID</label>
          <input
            className="field"
            value={cfg.chat_id}
            onChange={(e) => set("chat_id", e.target.value)}
            placeholder="123456789 (get via getUpdates)"
          />
        </div>
        <div>
          <label className="field-label">Digest Schedule</label>
          <div className="flex rounded overflow-hidden" style={{ border: "1px solid #374151" }}>
            {[["daily", "Daily"], ["weekly", "Weekly"]].map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => set("digest_schedule", val)}
                className="text-sm px-4 py-1.5 transition-all"
                style={
                  cfg.digest_schedule === val
                    ? { background: "#4f46e5", color: "#fff", flex: 1 }
                    : { background: "#1f2937", color: "#6b7280", flex: 1 }
                }
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feature toggles */}
      <div
        style={{
          borderTop: "1px solid #1f2937", paddingTop: 12,
          display: "flex", flexDirection: "column", gap: 10,
          opacity: cfg.enabled ? 1 : 0.4,
          pointerEvents: cfg.enabled ? "auto" : "none",
        }}
      >
        <p className="section-title">Features</p>
        {[
          ["budget_alerts", "Budget over-limit alerts",  "Sends a Telegram message when a category hits ≥80% of its budget"],
          ["bot_enabled",   "Transaction bot",            "Log transactions by messaging the bot: 'coffee 45000' or 'salary 5jt income'"],
          ["digest_enabled","Scheduled digest",           "Monthly income/expense summary — trigger manually or via a scheduled task"],
        ].map(([key, label, desc]) => (
          <div key={key} className="flex items-start justify-between gap-4">
            <div>
              <p style={{ fontSize: 13, color: "#d1d5db", fontWeight: 500 }}>{label}</p>
              <p style={{ fontSize: 11, color: "#4b5563" }}>{desc}</p>
            </div>
            <Toggle checked={cfg[key]} onChange={(v) => set(key, v)} />
          </div>
        ))}
      </div>

      {/* Status */}
      {status && (
        <div
          className="flex items-center gap-2 text-sm px-3 py-2 rounded"
          style={{
            background: status.ok ? "#052e1640" : "#450a0a40",
            color: status.ok ? "#4ade80" : "#f87171",
          }}
        >
          {status.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {status.msg}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? "Saving…" : "Save Settings"}
        </button>
        <button onClick={handleTest} disabled={testing || !cfg.enabled} className="btn btn-ghost">
          <Send size={13} />
          {testing ? "Sending…" : "Send Test"}
        </button>
        <button onClick={handleDigest} disabled={digesting || !cfg.enabled} className="btn btn-ghost">
          <MessageSquare size={13} />
          {digesting ? "Sending…" : "Send Digest"}
        </button>
      </div>

      {/* Webhook registration */}
      <div
        className="rounded"
        style={{ background: "#1e2040", border: "1px solid #2d3158", padding: "12px" }}
      >
        <p style={{ color: "#a5b4fc", fontWeight: 600, fontSize: 12, marginBottom: 8 }}>
          Webhook Registration
        </p>
        <p style={{ color: "#6b7280", fontSize: 11, marginBottom: 10, lineHeight: 1.6 }}>
          Register your Render backend URL with Telegram so the bot receives messages.
          Run once after deploying or changing the bot token.
        </p>
        <div className="flex gap-2 items-center">
          <input
            className="field"
            style={{ flex: 1, fontSize: 12 }}
            value={renderUrl}
            onChange={(e) => setRenderUrl(e.target.value)}
            placeholder="https://fintrack-api.onrender.com"
          />
          <button
            onClick={handleRegisterWebhook}
            disabled={registering || !cfg.enabled}
            className="btn btn-ghost"
            style={{ whiteSpace: "nowrap" }}
          >
            {registering ? "Registering…" : "Register Webhook"}
          </button>
        </div>
        <p style={{ color: "#4b5563", fontSize: 11, marginTop: 8 }}>
          Then message <span style={{ color: "#c7d2fe" }}>@YourBotName</span> on Telegram:{" "}
          <span style={{ color: "#c7d2fe" }}>coffee 45000</span> or{" "}
          <span style={{ color: "#c7d2fe" }}>salary 5000000 income</span>
        </p>
      </div>
    </div>
  );
}

/* ─── Main Settings page ─── */
export default function Settings() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: "", type: "expense", icon: "", color: COLORS[0] });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [exporting, setExporting] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = () => getCategories().then(setCategories);
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await createCategory(form);
      setForm({ name: "", type: "expense", icon: "", color: COLORS[0] });
      load();
    } catch (err) {
      setError(err.response?.data?.detail ?? "Failed to add category.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this category? Related transactions will be uncategorised.")) return;
    await deleteCategory(id);
    load();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const txs = await getTransactions({ limit: 500 });
      const csv = [
        ["ID","Date","Type","Amount","Category","Description"],
        ...txs.map((t) => [
          t.id, t.date, t.type, t.amount,
          t.category?.name ?? "",
          t.description ?? "",
        ]),
      ]
        .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
        download: `transactions_${new Date().toISOString().slice(0, 10)}.csv`,
      });
      a.click();
    } finally {
      setExporting(false);
    }
  };

  const expense  = categories.filter((c) => c.type === "expense");
  const income   = categories.filter((c) => c.type === "income");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      <div>
        <h1 className="text-white font-bold" style={{ fontSize: 20 }}>Settings</h1>
        <p style={{ fontSize: 12, color: "#4b5563" }}>Manage categories, integrations, and data</p>
      </div>

      {/* ── Telegram ── */}
      <Section title="Telegram Integration" icon={MessageSquare}>
        <TelegramPanel />
      </Section>

      {/* ── Export ── */}
      <Section title="Data Export" icon={Download}>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
          Download all transactions as a UTF-8 CSV file.
        </p>
        <button onClick={handleExport} disabled={exporting} className="btn btn-ghost">
          <Download size={13} />
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </Section>

      {/* ── Add category ── */}
      <Section title="Add Category" icon={Plus}>
        <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="field-label">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="field"
                placeholder="e.g. Netflix"
                required
              />
            </div>
            <div>
              <label className="field-label">Type</label>
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                className="field"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="field-label">Icon (emoji)</label>
              <input
                type="text"
                value={form.icon}
                onChange={(e) => set("icon", e.target.value)}
                maxLength={4}
                className="field"
                placeholder="🎬"
              />
            </div>
            <div>
              <label className="field-label">Colour</label>
              <div className="flex gap-1.5 flex-wrap pt-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("color", c)}
                    style={{
                      width: 22, height: 22, borderRadius: "50%", background: c,
                      border: form.color === c ? "2px solid #fff" : "2px solid transparent",
                      cursor: "pointer", transition: "transform 0.1s",
                      transform: form.color === c ? "scale(1.2)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          {error && (
            <p className="text-sm px-3 py-2 rounded" style={{ background: "#450a0a55", color: "#f87171" }}>
              {error}
            </p>
          )}
          <div>
            <button type="submit" disabled={saving} className="btn btn-primary">
              <Plus size={13} /> {saving ? "Adding…" : "Add Category"}
            </button>
          </div>
        </form>
      </Section>

      {/* ── Category list ── */}
      <Section title="Categories" icon={Tag}>
        <div className="mb-4">
          <p className="section-title">Expense</p>
          {expense.length === 0 ? (
            <p style={{ fontSize: 12, color: "#374151" }}>None</p>
          ) : (
            expense.map((c) => <CategoryRow key={c.id} cat={c} onDelete={handleDelete} />)
          )}
        </div>
        <div>
          <p className="section-title">Income</p>
          {income.length === 0 ? (
            <p style={{ fontSize: 12, color: "#374151" }}>None</p>
          ) : (
            income.map((c) => <CategoryRow key={c.id} cat={c} onDelete={handleDelete} />)
          )}
        </div>
      </Section>

    </div>
  );
}
