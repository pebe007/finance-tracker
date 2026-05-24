import {
  BarChart3,
  CircleDollarSign,
  LogOut,
  PiggyBank,
  Settings,
  Wallet,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

const NAV_LINKS = [
  { to: "/",             label: "Dashboard",     icon: BarChart3        },
  { to: "/transactions", label: "Transactions",  icon: Wallet           },
  { to: "/budgets",      label: "Budgets",       icon: PiggyBank        },
  { to: "/settings",     label: "Settings",      icon: Settings         },
];

const ACTIVE_STYLE  = { background: "#1e2040", borderLeft: "3px solid #6366f1", color: "#a5b4fc" };
const DEFAULT_STYLE = { borderLeft: "3px solid transparent" };

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <aside
      className="fixed top-0 left-0 h-full w-64 flex flex-col"
      style={{ background: "#0d0f1e", borderRight: "1px solid #1f2937" }}
    >
      {/* ── App header ── */}
      <div
        className="flex items-center gap-3 px-5 py-4"
        style={{ borderBottom: "1px solid #1f2937" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "#4f46e5" }}
        >
          <CircleDollarSign size={18} color="#fff" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold text-sm leading-tight">FinTrack</p>
          <p className="text-xs" style={{ color: "#4b5563" }}>Phoebe's Finance Hub</p>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <p
          className="px-5 mb-2"
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#374151",
          }}
        >
          Navigation
        </p>
        {NAV_LINKS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors"
            style={({ isActive }) => (isActive ? ACTIVE_STYLE : DEFAULT_STYLE)}
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  style={{ color: isActive ? "#818cf8" : "#4b5563", flexShrink: 0 }}
                />
                <span style={{ color: isActive ? "#c7d2fe" : "#6b7280" }}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div style={{ borderTop: "1px solid #1f2937" }}>
        <button
          onClick={() => {
            localStorage.removeItem("token");
            window.location.href = "/login";
          }}
          className="w-full flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-white/5"
          style={{ color: "#4b5563" }}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
