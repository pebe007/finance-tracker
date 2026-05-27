import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createTransaction,
  deleteTransaction,
  getCategories,
  getTransactions,
  parseTransaction,
  updateTransaction,
} from "../api";
import { formatRupiah } from "../utils/format";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ─── Add / Edit modal ─── */
function TxModal({ tx, categories, onSave, onClose }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [form, setForm] = useState(
    tx ?? { amount: "", type: "expense", category_id: "", description: "", date: today }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        category_id: form.category_id ? parseInt(form.category_id) : null,
      };
      if (tx?.id) await updateTransaction(tx.id, payload);
      else await createTransaction(payload);
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
      <div className="card" style={{ width: 420, padding: "1.5rem" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold">{tx?.id ? "Edit Transaction" : "New Transaction"}</h2>
          <button onClick={onClose} style={{ color: "#4b5563" }}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Type toggle */}
          <div className="flex rounded overflow-hidden" style={{ border: "1px solid #374151" }}>
            {[["expense", "Expense"], ["income", "Income"]].map(([t, label]) => (
              <button
                key={t}
                type="button"
                onClick={() => set("type", t)}
                className="flex-1 py-2 text-sm font-semibold transition-all"
                style={
                  form.type === t
                    ? {
                        background: t === "expense" ? "#7f1d1d" : "#14532d",
                        color: t === "expense" ? "#fca5a5" : "#86efac",
                      }
                    : { background: "#1f2937", color: "#4b5563" }
                }
              >
                {label}
              </button>
            ))}
          </div>

          <div>
            <label className="field-label">Amount (Rp)</label>
            <input
              type="number"
              min="1"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              className="field"
              placeholder="50000"
              required
            />
          </div>

          <div>
            <label className="field-label">Category</label>
            <select
              value={form.category_id}
              onChange={(e) => set("category_id", e.target.value)}
              className="field"
            >
              <option value="">— Select category —</option>
              {categories
                .filter((c) => c.type === form.type)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="field-label">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="field"
              placeholder="Optional note"
            />
          </div>

          <div>
            <label className="field-label">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className="field"
              required
            />
          </div>

          {error && (
            <p className="text-sm px-3 py-2 rounded" style={{ background: "#450a0a55", color: "#f87171" }}>
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Column visibility picker ─── */
const ALL_COLS = ["Date", "Category", "Description", "Type", "Amount", "Actions"];

function ColPicker({ visible, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        className="btn btn-ghost"
        style={{ fontSize: 12 }}
        onClick={() => setOpen((v) => !v)}
      >
        Columns
      </button>
      {open && (
        <div
          className="card"
          style={{
            position: "absolute", right: 0, top: "110%",
            width: 160, padding: "8px 0", zIndex: 100,
          }}
        >
          {ALL_COLS.map((col) => (
            <label
              key={col}
              className="flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm"
              style={{ color: "#d1d5db" }}
            >
              <input
                type="checkbox"
                checked={visible.includes(col)}
                onChange={(e) =>
                  onChange(
                    e.target.checked ? [...visible, col] : visible.filter((c) => c !== col)
                  )
                }
                style={{ accentColor: "#6366f1" }}
              />
              {col}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main page ─── */
export default function Transactions() {
  const now = new Date();
  const [month, setMonth]         = useState(now.getMonth() + 1);
  const [year, setYear]           = useState(now.getFullYear());
  const [txs, setTxs]             = useState([]);
  const [categories, setCategories] = useState([]);
  const [modal, setModal]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]           = useState("");
  const [typeFilter, setTypeFilter]   = useState("all");
  const [visibleCols, setVisibleCols] = useState(ALL_COLS);
  const [quickText, setQuickText]     = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError]   = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([getTransactions({ month, year, limit: 500 }), getCategories()])
      .then(([t, c]) => { setTxs(t); setCategories(c); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [month, year]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this transaction?")) return;
    await deleteTransaction(id);
    load();
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  };

  const filtered = useMemo(() => {
    let list = txs;
    if (typeFilter !== "all") list = list.filter((t) => t.type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.description?.toLowerCase().includes(q) ||
          t.category?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [txs, typeFilter, search]);

  const income  = txs.filter((t) => t.type === "income").reduce((s, t) => s + parseFloat(t.amount), 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + parseFloat(t.amount), 0);

  const col = (name) => visibleCols.includes(name);

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickText.trim()) return;
    setQuickLoading(true);
    setQuickError("");
    try {
      const parsed = await parseTransaction(quickText.trim());
      // Pre-fill the modal with parsed values; user reviews before saving
      setModal({
        amount: String(parsed.amount),
        type: parsed.type,
        category_id: parsed.category_id ? String(parsed.category_id) : "",
        description: parsed.description || "",
        date: parsed.date || format(new Date(), "yyyy-MM-dd"),
      });
      setQuickText("");
    } catch (err) {
      setQuickError(err.response?.data?.detail ?? "Could not parse — try again");
    } finally {
      setQuickLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold" style={{ fontSize: 20 }}>Transactions</h1>
          <p style={{ fontSize: 12, color: "#4b5563" }}>Record and manage all financial activity</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Month nav */}
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
          <button onClick={() => setModal({})} className="btn btn-primary">
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* ── Quick-add bar (NLP) ── */}
      <form onSubmit={handleQuickAdd}>
        <div
          className="flex items-center gap-2 field"
          style={{ padding: "9px 14px", background: "#111827", border: "1px solid #374151" }}
        >
          <Sparkles size={14} style={{ color: "#818cf8", flexShrink: 0 }} />
          <input
            value={quickText}
            onChange={(e) => { setQuickText(e.target.value); setQuickError(""); }}
            placeholder='Quick add — type anything: "lunch with team 85k" or "freelance 3.5jt income"'
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: "#e2e8f0", fontSize: 14,
            }}
          />
          {quickText && (
            <button
              type="submit"
              disabled={quickLoading}
              className="btn btn-primary"
              style={{ padding: "4px 12px", fontSize: 12, flexShrink: 0 }}
            >
              {quickLoading ? "Parsing…" : "Add"}
            </button>
          )}
        </div>
        {quickError && (
          <p style={{ fontSize: 12, color: "#f87171", marginTop: 4, paddingLeft: 4 }}>
            {quickError}
          </p>
        )}
      </form>

      {/* ── Summary bar ── */}
      <div className="flex gap-3">
        {[
          ["Income", income, "#4ade80"],
          ["Expense", expense, "#f87171"],
          ["Net", income - expense, income - expense >= 0 ? "#a5b4fc" : "#f87171"],
        ].map(([label, val, color]) => (
          <div
            key={label}
            className="kpi-card"
            style={{ padding: "10px 16px", display: "flex", gap: 8, alignItems: "center" }}
          >
            <span style={{ fontSize: 11, color: "#4b5563", fontWeight: 600 }}>{label}</span>
            <span className="num" style={{ fontSize: 14, fontWeight: 700, color }}>{formatRupiah(val)}</span>
          </div>
        ))}
      </div>

      {/* ── Filters row ── */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="flex items-center gap-2 field" style={{ padding: "7px 12px", flex: "1 1 240px", maxWidth: 320 }}>
          <Search size={13} style={{ color: "#4b5563", flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description or category…"
            style={{ background: "none", border: "none", outline: "none", color: "#e2e8f0", fontSize: 13, width: "100%" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ color: "#4b5563" }}><X size={12} /></button>
          )}
        </div>

        {/* Type filter */}
        <div className="flex rounded overflow-hidden" style={{ border: "1px solid #374151" }}>
          {[["all", "All"], ["expense", "Expense"], ["income", "Income"]].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setTypeFilter(val)}
              className="text-sm px-3 py-1.5 transition-all"
              style={
                typeFilter === val
                  ? { background: "#4f46e5", color: "#fff", fontWeight: 600 }
                  : { background: "#1f2937", color: "#6b7280" }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Column picker */}
        <div style={{ marginLeft: "auto" }}>
          <ColPicker visible={visibleCols} onChange={setVisibleCols} />
        </div>

        {/* Count */}
        <span style={{ fontSize: 12, color: "#4b5563" }}>
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="flex items-center justify-center" style={{ height: 200 }}>
          <p style={{ color: "#4b5563" }}>Loading…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center" style={{ padding: "48px 0" }}>
          <p style={{ color: "#4b5563", fontSize: 13 }}>No transactions found</p>
        </div>
      ) : (
        <div className="card table-scroll" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                {col("Date")        && <th>Date</th>}
                {col("Category")    && <th>Category</th>}
                {col("Description") && <th>Description</th>}
                {col("Type")        && <th>Type</th>}
                {col("Amount")      && <th className="right">Amount</th>}
                {col("Actions")     && <th className="right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr key={tx.id}>
                  {col("Date") && (
                    <td style={{ color: "#6b7280", fontSize: 12, whiteSpace: "nowrap" }}>
                      {format(parseISO(tx.date), "dd MMM yyyy")}
                    </td>
                  )}
                  {col("Category") && (
                    <td style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                      {tx.category ? `${tx.category.icon} ${tx.category.name}` : "—"}
                    </td>
                  )}
                  {col("Description") && (
                    <td
                      style={{
                        color: "#9ca3af", fontSize: 12,
                        maxWidth: 260, overflow: "hidden",
                        whiteSpace: "nowrap", textOverflow: "ellipsis",
                      }}
                    >
                      {tx.description || <span style={{ color: "#374151" }}>—</span>}
                    </td>
                  )}
                  {col("Type") && (
                    <td>
                      <span className={`badge badge-${tx.type}`}>{tx.type}</span>
                    </td>
                  )}
                  {col("Amount") && (
                    <td className="right">
                      <span
                        className="num"
                        style={{
                          fontWeight: 700,
                          color: tx.type === "income" ? "#4ade80" : "#f87171",
                        }}
                      >
                        {tx.type === "income" ? "+" : "−"}{formatRupiah(parseFloat(tx.amount))}
                      </span>
                    </td>
                  )}
                  {col("Actions") && (
                    <td className="right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setModal(tx)}
                          className="btn btn-ghost"
                          style={{ padding: "4px 7px" }}
                          title="Edit"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="btn btn-danger"
                          style={{ padding: "4px 7px" }}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <TxModal
          tx={modal?.id ? modal : null}
          categories={categories}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
