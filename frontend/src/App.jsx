import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Budgets from "./pages/Budgets";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import Transactions from "./pages/Transactions";

function PrivateRoute({ children }) {
  return localStorage.getItem("token") ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <div className="flex min-h-screen">
                <Navbar />
                {/*
                  Desktop: ml-64 (sidebar width) + standard padding
                  Mobile:  no left margin, top padding for header bar, bottom padding for tab bar
                */}
                <main className="flex-1 min-w-0
                  md:ml-64 md:p-6
                  ml-0 pt-16 pb-20 px-3"
                >
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/budgets" element={<Budgets />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </main>
              </div>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
