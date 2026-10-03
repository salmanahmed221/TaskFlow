import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? "bg-indigo-500/20 text-white"
      : "text-slate-300 hover:bg-white/5 hover:text-white"
  }`;

const initials = (name = "?") =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col bg-slate-900 text-white">
        <div className="flex items-center gap-2 px-5 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 text-lg font-bold">
            T
          </div>
          <div>
            <p className="text-lg font-semibold leading-tight">TaskFlow</p>
            <p className="text-xs text-slate-400">Project Management</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          <NavLink to="/" end className={linkClass}>
            <span className="text-base">▦</span> Dashboard
          </NavLink>
          <NavLink to="/projects" className={linkClass}>
            <span className="text-base">▤</span> Projects
          </NavLink>
          {user?.role === "ADMIN" && (
            <NavLink to="/users" className={linkClass}>
              <span className="text-base">◉</span> Users
            </NavLink>
          )}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold">
              {initials(user?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
            >
              ↪
            </button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
