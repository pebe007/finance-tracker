import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getTransactions, getSummary } from "../api";
import { formatCompact, formatRupiah } from "../utils/format";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ─── helpers ─── */
function MonthNav({ month, year, onPrev, onNext }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onPrev} className="btn btn-ghost" style={{ padding: "5px 8px" }}>
        <ChevronLeft size={15} />
      </button>
      <span className="text-sm font-semibold text-white" style={{ minWidth: 110, textAlign: "center" }}>
        {MONTHS[month - 1]} {year}
      </span>
      <button onClick={onNext} className="btn btn-ghost" style={{ padding: "5px 8px" }}>
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

function RpTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: "8px 12px", fontSize: 12, minWidth: 140 }}>
      <p className="section-title mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill || p.color }}>
          {p.name}: <span className="num">{formatRupiah(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

/* ─── KPI card ─── */
function KpiCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between mb-3">
        <p className="kpi-label">{label}</p>
        {Icon && <Icon size={16} color={color || "#4b5563"} />}
      </div>
      <p className="kpi-value num" style={{ color: color || "#f9fafb" }}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs" style={{ color: "#4b5563" }}>{sub}</p>}
    </div>
  );
}

/* ─── 6-month bar chart ─── */
function TrendChart({ trend }) {
  return (
    <div className="card">
      <p className="section-title">6-Month Trend</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={trend} barGap={3} barCategoryGap="30%">
          <XAxis
            dataKey="month"
            tickFormatter={(m) => MONTHS[m - 1]}
            tick={{ fontSize: 11, fill: "#4b5563" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatCompact(v)}
            tick={{ fontSize: 11, fill: "#4b5563" }}
            axisLine={false}
            tickLine={false}
            width={54}
          />
          <Tooltip content={<RpTooltip />} cursor={{ fill: "#ffffff08" }} />
          <Bar dataKey="income" name="Income" fill="#22c55e" radius={[3,3,0,0]} />
          <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Category breakdown ─── */
function CategoryBreakdown({ categories }) {
  const sorted = [...categories].sort((a, b) => b.total - a.total);
  const total = sorted.reduce((s, c) => s + c.total, 0);
  const [hovered, setHovered] = useState(null);

  if (!sorted.length) {
    return (
      <div className="card flex items-center justify-center" style={{ minHeight: 200 }}>
        <p style={{ color: "#4b5563", fontSize: 13 }}>No expense data for this month</p>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="section-title">Spending by Category</p>
      <div className="flex gap-4 items-center">
        {/* Donut */}
        <div style={{ width: 130, height: 130, flexShrink: 0, position: "relative" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sorted}
                dataKey="total"
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={60}
                paddingAngle={2}
                onMouseEnter={(_, i) => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {sorted.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.category_color || "#6366f1"}
                    opacity={hovered === null || hovered === i ? 1 : 0.25}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.[0] ? (
                    <div className="card" style={{ padding: "6px 10px", fontSize: 12 }}>
                      <p style={{ color: payload[0].payload.category_color }}>
                        {payload[0].payload.category_icon} {payload[0].payload.category_name}
                      </p>
                      <p className="num" style={{ color: "#e2e8f0" }}>
                        {formatRupiah(payload[0].value)}
                      </p>
                    </div>
                  ) : null
                }
              />
            </PieChart>
          </ResponsiveContainer>
          <div
            style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <span style={{ fontSize: 10, color: "#4b5563" }}>Total</span>
            <span className="num" style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>
              {formatCompact(total)}
            </span>
          </div>
        </div>

        {/* Legend table */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {sorted.slice(0, 8).map((c, i) => {
            const pct = total > 0 ? (c.total / total) * 100 : 0;
            return (
              <div
                key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className="flex items-center gap-2"
                style={{
                  padding: "4px 0",
                  opacity: hovered === null || hovered === i ? 1 : 0.35,
                  transition: "opacity 0.12s",
                  cursor: "default",
                  borderBottom: "1px solid #111827",
                }}
              >
                <div
                  style={{
                    width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                    background: c.category_color || "#6366f1",
                  }}
                />
                <span
                  style={{
                    fontSize: 12, color: "#9ca3af", flex: 1,
                    overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                  }}
                >
                  {c.category_icon} {c.category_name}
                </span>
                <span className="num" style={{ fontSize: 11, color: "#6b7280", marginLeft: "auto" }}>
                  {pct.toFixed(0)}%
                </span>
                <div className="progress-track" style={{ width: 42 }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${pct}%`, background: c.category_color || "#6366f1" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Budget status ─── */
function BudgetStatus({ items }) {
  if (!items.length) {
    return (
      <div className="card flex items-center justify-center" style={{ minHeight: 200 }}>
        <p style={{ color: "#4b5563", fontSize: 13 }}>No budgets set for this month</p>
      </div>
    );
  }
  return (
    <div className="card">
      <p className="section-title">Budget Status</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item) => {
          const pct = Math.min(item.percentage, 100);
          const color = item.over_budget ? "#ef4444" : item.percentage >= 80 ? "#f59e0b" : "#22c55e";
          const status = item.over_budget ? "OVER" : item.percentage >= 80 ? "WARN" : "OK";
          return (
            <div key={item.budget.id}>
              <div className="flex items-center justify-between mb-1.5">
                <span style={{ fontSize: 13, color: "#d1d5db" }}>
                  {item.budget.category?.icon} {item.budget.category?.name}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="badge"
                    style={{
                      background: color + "22",
                      color,
                      border: `1px solid ${color}44`,
                      fontSize: 9,
                    }}
                  >
                    {status}
                  </span>
                  <span className="num" style={{ fontSize: 12, color, fontWeight: 700 }}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="num" style={{ fontSize: 10, color: "#4b5563" }}>
                  {formatCompact(item.spent)} / {formatCompact(item.budget.limit_amount)}
                </span>
                <span className="num" style={{ fontSize: 10, color: "#4b5563" }}>
                  {formatRupiah(item.remaining)} left
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Recent transactions table ─── */
function RecentTransactions({ transactions }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #1f2937" }}>
        <p className="section-title" style={{ marginBottom: 0 }}>Recent Transactions</p>
      </div>
      {transactions.length === 0 ? (
        <p style={{ padding: "24px", textAlign: "center", color: "#4b5563", fontSize: 13 }}>
          No transactions this month
        </p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Type</th>
              <th className="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td style={{ color: "#6b7280", fontSize: 12 }}>
                  {new Date(tx.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                </td>
                <td>
                  <span style={{ fontSize: 13 }}>
                    {tx.category ? `${tx.category.icon} ${tx.category.name}` : "—"}
                  </span>
                </td>
                <td style={{ color: "#9ca3af", fontSize: 12, maxWidth: 200 }} className="truncate">
                  {tx.description || <span style={{ color: "#374151" }}>—</span>}
                </td>
                <td>
                  <span className={`badge badge-${tx.type}`}>{tx.type}</span>
                </td>
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ─── Main Dashboard ─── */
export default function Dashboard() {
  const now = new Date();
  const [month, setMonth]       = useState(now.getMonth() + 1);
  const [year, setYear]         = useState(now.getFullYear());
  const [summary, setSummary]   = useState(null);
  const [recentTxs, setRecentTxs] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getSummary(month, year),
      getTransactions({ month, year, limit: 10 }),
    ])
      .then(([s, t]) => { setSummary(s); setRecentTxs(t); })
      .finally(() => setLoading(false));
  }, [month, year]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  };

  if (loading) return (
    <div className="flex items-center justify-center" style={{ height: "60vh" }}>
      <p style={{ color: "#4b5563" }}>Loading…</p>
    </div>
  );
  if (!summary) return null;

  const totalBudget = summary.budget_status.reduce(
    (s, b) => s + parseFloat(b.budget.limit_amount), 0
  );
  const budgetPct = totalBudget > 0
    ? Math.min((summary.total_expense / totalBudget) * 100, 100)
    : 0;
  const prevTrend = summary.monthly_trend[summary.monthly_trend.length - 2];
  const expenseDelta = prevTrend?.expense > 0
    ? ((summary.total_expense - prevTrend.expense) / prevTrend.expense) * 100
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold" style={{ fontSize: 20 }}>
            Financial Overview
          </h1>
          <p style={{ fontSize: 12, color: "#4b5563" }}>
            {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <MonthNav month={month} year={year} onPrev={prevMonth} onNext={nextMonth} />
      </div>

      {/* ── KPI row ── */}
      <div className="grid-4">
        <KpiCard
          label="Total Income"
          value={formatRupiah(summary.total_income)}
          icon={TrendingUp}
          color="#4ade80"
        />
        <KpiCard
          label="Total Expense"
          value={formatRupiah(summary.total_expense)}
          sub={
            expenseDelta !== null
              ? `${expenseDelta > 0 ? "+" : ""}${expenseDelta.toFixed(0)}% vs last month`
              : undefined
          }
          icon={TrendingDown}
          color="#f87171"
        />
        <KpiCard
          label="Net Balance"
          value={formatRupiah(summary.net)}
          color={summary.net >= 0 ? "#a5b4fc" : "#f87171"}
        />
        <KpiCard
          label="Budget Utilisation"
          value={`${budgetPct.toFixed(1)}%`}
          sub={totalBudget > 0 ? `of ${formatRupiah(totalBudget)}` : "No budgets set"}
          color={budgetPct >= 90 ? "#ef4444" : budgetPct >= 75 ? "#f59e0b" : "#a5b4fc"}
        />
      </div>

      {/* ── Trend chart ── */}
      <TrendChart trend={summary.monthly_trend} />

      {/* ── Category + Budget row ── */}
      <div className="grid-2">
        <CategoryBreakdown categories={summary.by_category} />
        <BudgetStatus items={summary.budget_status} />
      </div>

      {/* ── Recent transactions ── */}
      <RecentTransactions transactions={recentTxs} />

    </div>
  );
}
