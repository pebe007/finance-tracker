import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteBudget, getCategories, getSummary, upsertBudget } from "../api";
import { formatRupiah } from "../utils/format";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ─── Set Budget modal ─── */
function BudgetModal({ categories, month, year, onSave, onClose }) {
  const [form, setForm]   = useState({ category_id: "", limit_amount: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await upsertBudget({
        category_id: parseInt(form.category_id),
        limit_amount: parseFloat(form.limit_amount),
        month,
        year,
      });
      onSave();
    } catch (err) {
      setError(err.response?.data?.detail ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card" style={{ width: 380, padding: "1.5rem" }}>
        <h2 className="text-white font-semibold mb-5">Set Monthly Budget</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="field-label">Category (expense only)</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
              className="field"
              required
            >
              <option value="">Select category</option>
              {categories
                .filter((c) => c.type === "expense")
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
            </select>
          </div>
          <div>
            <label className="field-label">Monthly Limit (Rp)</label>
            <input
              type="number"
              min="1000"
              value={form.limit_amount}
              onChange={(e) => setForm((f) => ({ ...f, limit_amount: e.target.value }))}
              className="field"
              placeholder="e.g. 500000"
              required
            />
          </div>
          {error && (
            <p className="text-sm px-3 py-2 rounded" style={{ background: "#450a0a55", color: "#f87171" }}>
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center">
              {saving ? "Saving…" : "Save Budget"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Budget card ─── */
function BudgetCard({ item, onDelete }) {
  const pct    = Math.min(item.percentage, 100);
  const isOver = item.over_budget;
  const isWarn = !isOver && item.percentage >= 80;
  const color  = isOver ? "#ef4444" : isWarn ? "#f59e0b" : "#22c55e";
  const status = isOver ? "OVER BUDGET" : isWarn ? "WARNING" : "ON TRACK";

  return (
    <div className="card" style={{ position: "relative" }}>
      {/* Status indicator line at top */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "10px 10px 0 0", background: color }} />

      <div className="flex items-start justify-between mb-4" style={{ paddingTop: 4 }}>
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 38, height: 38, borderRadius: 8,
              background: (item.budget.category?.color || "#6366f1") + "22",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, flexShrink: 0,
            }}
          >
            {item.budget.category?.icon || "?"}
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{item.budget.category?.name}</p>
            <span
              className="badge"
              style={{ background: color + "22", color, border: `1px solid ${color}44`, fontSize: 9 }}
            >
              {status}
            </span>
          </div>
        </div>
        <button
          onClick={() => onDelete(item.budget.id)}
          className="btn btn-ghost"
          style={{ padding: "4px 7px", color: "#4b5563" }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Progress */}
      <div className="progress-track mb-2">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="flex justify-between mb-4">
        <span className="num" style={{ fontSize: 11, color: "#6b7280" }}>
          {item.percentage.toFixed(0)}% used
        </span>
        <span className="num" style={{ fontSize: 11, color: "#6b7280" }}>
          {formatRupiah(item.remaining)} left
        </span>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8, borderTop: "1px solid #1f2937", paddingTop: 12,
        }}
      >
        {[
          ["Spent",     formatRupiah(item.spent),                color    ],
          ["Remaining", formatRupiah(item.remaining),            "#9ca3af"],
          ["Limit",     formatRupiah(item.budget.limit_amount),  "#6b7280"],
        ].map(([label, value, col]) => (
          <div key={label} style={{ textAlign: "center" }}>
            <p style={{ fontSize: 10, color: "#4b5563", marginBottom: 2 }}>{label}</p>
            <p className="num" style={{ fontSize: 12, fontWeight: 700, color: col }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function Budgets() {
  const now = new Date();
  const [month, setMonth]       = useState(now.getMonth() + 1);
  const [year, setYear]         = useState(now.getFullYear());
  const [summary, setSummary]   = useState(null);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal]   = useState(false);
  const [loading, setLoading]       = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([getSummary(month, year), getCategories()])
      .then(([s, c]) => { setSummary(s); setCategories(c); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [month, year]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this budget?")) return;
    await deleteBudget(id);
    load();
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  };

  const items  = summary?.budget_status ?? [];
  const total  = items.reduce((s, i) => s + parseFloat(i.budget.limit_amount), 0);
  const spent  = items.reduce((s, i) => s + i.spent, 0);
  const overCt = items.filter((i) => i.over_budget).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold" style={{ fontSize: 20 }}>Budget Management</h1>
          <p style={{ fontSize: 12, color: "#4b5563" }}>Set and track monthly spending limits</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="btn btn-ghost" style={{ padding: "5px 8px" }}>
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-semibold text-white" style={{ minWidth: 100, textAlign: "center" }}>
            {MONTHS[month - 1]} {year}
          </span>
          <button onClick={nextMonth} className="btn btn-ghost" style={{ padding: "5px 8px" }}>
            <ChevronRight size={15} />
          </button>
          <div style={{ width: 1, height: 24, background: "#1f2937", margin: "0 4px" }} />
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={14} /> Set Budget
          </button>
        </div>
      </div>

      {/* ── Summary bar ── */}
      {items.length > 0 && (
        <div className="flex gap-3">
          {[
            ["Budgeted", formatRupiah(total), "#a5b4fc"],
            ["Spent", formatRupiah(spent), spent > total ? "#f87171" : "#9ca3af"],
            ["Remaining", formatRupiah(Math.max(total - spent, 0)), "#4ade80"],
            ["Over Budget", `${overCt} categor${overCt !== 1 ? "ies" : "y"}`, overCt > 0 ? "#f87171" : "#4b5563"],
          ].map(([label, value, color]) => (
            <div key={label} className="kpi-card" style={{ padding: "10px 16px" }}>
              <p className="kpi-label">{label}</p>
              <p className="num" style={{ fontSize: 16, fontWeight: 700, color, marginTop: 2 }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Budget grid ── */}
      {loading ? (
        <div className="flex items-center justify-center" style={{ height: 200 }}>
          <p style={{ color: "#4b5563" }}>Loading…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center justify-center" style={{ padding: "64px 0" }}>
          <p style={{ color: "#4b5563", fontSize: 13, marginBottom: 12 }}>
            No budgets set for {MONTHS[month - 1]} {year}
          </p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={14} /> Set first budget
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 12,
          }}
        >
          {items.map((item) => (
            <BudgetCard key={item.budget.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showModal && (
        <BudgetModal
          categories={categories}
          month={month}
          year={year}
          onSave={() => { setShowModal(false); load(); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
