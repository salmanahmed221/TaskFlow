import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { StatusBadge } from "../components/Badges.jsx";
import Spinner from "../components/Spinner.jsx";
import EmptyState from "../components/EmptyState.jsx";

function StatCard({ label, value, hint, accent }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent || "text-slate-800"}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await api("/projects");
        if (!alive) return;
        setProjects(p.data);

        if (user?.role === "ADMIN") {
          const u = await api("/users");
          if (alive) setUsers(u.data);
        }
      } catch {
        /* handled by api() */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const totalTasks = projects.reduce((sum, p) => sum + (p._count?.tasks || 0), 0);
  const recent = [...projects]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 4);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Welcome back, {user?.name} — here is your workspace at a glance.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Projects" value={projects.length} hint="You can access" />
        <StatCard label="Tasks" value={totalTasks} hint="Across all projects" accent="text-indigo-600" />
        <StatCard label="Your role" value={user?.role} hint="Access level" accent="text-emerald-600" />
        <StatCard
          label={user?.role === "ADMIN" ? "Registered users" : "Project members"}
          value={user?.role === "ADMIN" ? users.length : projects.reduce((s, p) => s + (p.members?.length || 0), 0)}
          hint={user?.role === "ADMIN" ? "Total accounts" : "Sum over your projects"}
          accent="text-amber-600"
        />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Recent projects</h2>
        <Link
          to="/projects"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          View all →
        </Link>
      </div>

      <div className="mt-4">
        {recent.length === 0 ? (
          <EmptyState
            title="No projects yet"
            message="Create your first project to start organizing tasks."
            action={
              <Link
                to="/projects"
                className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Go to Projects
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {recent.map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:ring-indigo-300"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800">{p.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {p.description || "No description"}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                  <span>{p._count?.tasks ?? 0} tasks</span>
                  <span>{p.members?.length ?? 0} members</span>
                  <span>Owner: {p.owner?.name}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
