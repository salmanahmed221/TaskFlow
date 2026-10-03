import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { StatusBadge } from "../components/Badges.jsx";
import Modal, { ConfirmDialog } from "../components/Modal.jsx";
import Spinner from "../components/Spinner.jsx";
import EmptyState from "../components/EmptyState.jsx";

const EMPTY_FORM = { name: "", description: "", status: "ACTIVE" };

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create mode
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api("/projects");
      setProjects(res.data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (project) => {
    setEditing(project);
    setForm({
      name: project.name,
      description: project.description || "",
      status: project.status,
    });
    setFormError("");
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        await api(`/projects/${editing.id}`, { method: "PUT", body: form });
      } else {
        await api("/projects", { method: "POST", body: form });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api(`/projects/${toDelete.id}`, { method: "DELETE" });
      setToDelete(null);
      await load();
    } catch (err) {
      setError(err.message);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const canManage = (p) => user?.role === "ADMIN" || p.ownerId === user?.id;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Projects</h1>
          <p className="text-sm text-slate-500">
            {projects.length} project{projects.length === 1 ? "" : "s"} you can access
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          + New Project
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      {projects.length === 0 && !error ? (
        <EmptyState
          title="No projects yet"
          message="Create your first project — you will automatically become its owner and a member."
          action={
            <button
              onClick={openCreate}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Create project
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p.id}
              className="flex flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex items-start justify-between gap-3">
                <Link to={`/projects/${p.id}`} className="min-w-0">
                  <h3 className="truncate font-semibold text-slate-800 hover:text-indigo-600">
                    {p.name}
                  </h3>
                </Link>
                <StatusBadge status={p.status} />
              </div>

              <p className="mt-2 line-clamp-2 flex-1 text-sm text-slate-500">
                {p.description || "No description"}
              </p>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>{p._count?.tasks ?? 0} tasks</span>
                <span>{p.members?.length ?? 0} members</span>
                <span>Owner: {p.owner?.name}</span>
              </div>

              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="flex-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Open
                </button>
                {canManage(p) && (
                  <>
                    <button
                      onClick={() => openEdit(p)}
                      className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setToDelete(p)}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit modal */}
      <Modal
        open={modalOpen}
        title={editing ? "Edit project" : "New project"}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              form="project-form"
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : editing ? "Save changes" : "Create"}
            </button>
          </>
        }
      >
        <form id="project-form" onSubmit={save} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-inset ring-red-200">
              {formError}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="Website Redesign"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="What is this project about?"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On hold</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete project"
        message={`Delete "${toDelete?.name}"? All of its tasks and members will be removed permanently.`}
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
        busy={deleting}
      />
    </div>
  );
}
