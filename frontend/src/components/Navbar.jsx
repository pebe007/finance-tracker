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
  { to: "/",             label: "Dashboard",    icon: BarChart3  },
  { to: "/transactions", label: "Transactions", icon: Wallet     },
  { to: "/budgets",      label: "Budgets",      icon: PiggyBank  },
  { to: "/settings",     label: "Settings",     icon: Settings   },
];

const ACTIVE_STYLE  = { background: "#1e2040", borderLeft: "3px solid #6366f1", color: "#a5b4fc" };
const DEFAULT_STYLE = { borderLeft: "3px solid transparent" };

/* ─── Desktop sidebar ─── */
function Sidebar() {
  return (
    <aside
      className="fixed top-0 left-0 h-full w-64 flex-col hidden md:flex"
      style={{ background: "#0d0f1e", borderRight: "1px solid #1f2937", zIndex: 40 }}
    >
      {/* App header */}
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

      {/* Nav links */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <p
          className="px-5 mb-2"
          style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#374151" }}
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
                <Icon size={16} style={{ color: isActive ? "#818cf8" : "#4b5563", flexShrink: 0 }} />
                <span style={{ color: isActive ? "#c7d2fe" : "#6b7280" }}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div style={{ borderTop: "1px solid #1f2937" }}>
        <button
          onClick={() => { localStorage.removeItem("token"); window.location.href = "/login"; }}
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

/* ─── Mobile top bar + bottom tab nav ─── */
function MobileNav() {
  return (
    <>
      {/* Top bar */}
      <header
        className="fixed top-0 left-0 right-0 flex items-center justify-between px-4 py-3 md:hidden"
        style={{ background: "#0d0f1e", borderBottom: "1px solid #1f2937", zIndex: 40 }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "#4f46e5" }}
          >
            <CircleDollarSign size={15} color="#fff" />
          </div>
          <span className="text-white font-bold text-sm">FinTrack</span>
        </div>
        <button
          onClick={() => { localStorage.removeItem("token"); window.location.href = "/login"; }}
          style={{ color: "#4b5563" }}
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 flex md:hidden"
        style={{ background: "#0d0f1e", borderTop: "1px solid #1f2937", zIndex: 40 }}
      >
        {NAV_LINKS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
            style={({ isActive }) => ({
              color: isActive ? "#818cf8" : "#4b5563",
              borderTop: isActive ? "2px solid #6366f1" : "2px solid transparent",
            })}
          >
            {({ isActive }) => (
              <>
                <Icon size={20} style={{ color: isActive ? "#818cf8" : "#4b5563" }} />
                <span style={{ fontSize: 10, color: isActive ? "#c7d2fe" : "#4b5563" }}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export default function Navbar() {
  return (
    <>
      <Sidebar />
      <MobileNav />
    </>
  );
}
