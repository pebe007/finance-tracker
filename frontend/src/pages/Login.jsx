import { CircleDollarSign } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { access_token } = await login(password);
      localStorage.setItem("token", access_token);
      navigate("/");
    } catch {
      setError("Incorrect password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0b0d17" }}
    >
      <div style={{ width: 380 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "#4f46e5" }}
          >
            <CircleDollarSign size={22} color="#fff" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl leading-tight">FinTrack</h1>
            <p className="text-xs" style={{ color: "#4b5563" }}>Phoebe's Financial Management System</p>
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: "1.75rem" }}>
          <h2 className="text-white font-semibold text-base mb-1">Sign in</h2>
          <p className="text-sm mb-6" style={{ color: "#6b7280" }}>
            Enter your admin password to continue.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field"
                placeholder="Enter password"
                required
                autoFocus
              />
            </div>

            {error && (
              <p
                className="text-sm px-3 py-2 rounded"
                style={{ background: "#450a0a55", color: "#f87171" }}
              >
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
