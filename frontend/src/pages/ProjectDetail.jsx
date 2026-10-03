import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  PriorityBadge,
  StatusBadge,
  TaskStatusBadge,
} from "../components/Badges.jsx";
import Modal, { ConfirmDialog } from "../components/Modal.jsx";
import Spinner from "../components/Spinner.jsx";

const COLUMNS = ["TODO", "IN_PROGRESS", "DONE"];
const EMPTY_TASK = {
  title: "",
  description: "",
  priority: "MEDIUM",
  status: "TODO",
  dueDate: "",
  assigneeId: "",
};

const initials = (name = "?") =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [taskModal, setTaskModal] = useState({ open: false, editing: null });
  const [taskForm, setTaskForm] = useState(EMPTY_TASK);
  const [taskError, setTaskError] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  const [toDeleteTask, setToDeleteTask] = useState(null);
  const [toDeleteProject, setToDeleteProject] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [memberEmail, setMemberEmail] = useState("");
  const [memberError, setMemberError] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", status: "ACTIVE" });
  const [savingProject, setSavingProject] = useState(false);
  const [editError, setEditError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api(`/projects/${id}`);
      setProject(res.data);
      setError("");
    } catch (err) {
      setError(err.message);
      if (err.status === 403 || err.status === 404) setProject(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-600">{error || "Project not found"}</p>
        <Link
          to="/projects"
          className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-500"
        >
          ← Back to projects
        </Link>
      </div>
    );
  }

  const isOwnerOrAdmin = user?.role === "ADMIN" || project.ownerId === user?.id;
  const members = project.members || [];
  const tasks = project.tasks || [];
  const participants = [
    { id: project.owner.id, name: project.owner.name },
    ...members.filter((m) => m.userId !== project.owner.id).map((m) => m.user),
  ];

  // ---------- tasks ----------
  const openCreateTask = (status = "TODO") => {
    setTaskModal({ open: true, editing: null });
    setTaskForm({ ...EMPTY_TASK, status });
    setTaskError("");
  };

  const openEditTask = (task) => {
    setTaskModal({ open: true, editing: task });
    setTaskForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      assigneeId: task.assigneeId || "",
    });
    setTaskError("");
  };

  const saveTask = async (e) => {
    e.preventDefault();
    setSavingTask(true);
    setTaskError("");
    const payload = {
      ...taskForm,
      dueDate: taskForm.dueDate || null,
      assigneeId: taskForm.assigneeId || null,
    };
    try {
      if (taskModal.editing) {
        await api(`/tasks/${taskModal.editing.id}`, { method: "PUT", body: payload });
      } else {
        await api(`/projects/${project.id}/tasks`, { method: "POST", body: payload });
      }
      setTaskModal({ open: false, editing: null });
      await load();
    } catch (err) {
      setTaskError(err.message);
    } finally {
      setSavingTask(false);
    }
  };

  const deleteTask = async () => {
    setDeleting(true);
    try {
      await api(`/tasks/${toDeleteTask.id}`, { method: "DELETE" });
      setToDeleteTask(null);
      await load();
    } catch (err) {
      setError(err.message);
      setToDeleteTask(null);
    } finally {
      setDeleting(false);
    }
  };

  // ---------- members ----------
  const addMember = async (e) => {
    e.preventDefault();
    setAddingMember(true);
    setMemberError("");
    try {
      await api(`/projects/${project.id}/members`, {
        method: "POST",
        body: { email: memberEmail.trim() },
      });
      setMemberEmail("");
      await load();
    } catch (err) {
      setMemberError(err.message);
    } finally {
      setAddingMember(false);
    }
  };

  const removeMember = async (userId) => {
    setMemberError("");
    try {
      await api(`/projects/${project.id}/members/${userId}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setMemberError(err.message);
    }
  };

  // ---------- project ----------
  const openEdit = () => {
    setEditForm({
      name: project.name,
      description: project.description || "",
      status: project.status,
    });
    setEditError("");
    setEditOpen(true);
  };

  const saveProject = async (e) => {
    e.preventDefault();
    setSavingProject(true);
    setEditError("");
    try {
      await api(`/projects/${project.id}`, { method: "PUT", body: editForm });
      setEditOpen(false);
      await load();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSavingProject(false);
    }
  };

  const deleteProject = async () => {
    setDeleting(true);
    try {
      await api(`/projects/${project.id}`, { method: "DELETE" });
      navigate("/projects");
    } catch (err) {
      setError(err.message);
      setToDeleteProject(false);
      setDeleting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/projects" className="text-sm text-slate-500 hover:text-indigo-600">
          ← Projects
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              {project.description || "No description"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Owner: {project.owner.name} · {tasks.length} tasks · {members.length}{" "}
              members
            </p>
          </div>

          {isOwnerOrAdmin && (
            <div className="flex gap-2">
              <button
                onClick={openEdit}
                className="rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
              >
                Edit
              </button>
              <button
                onClick={() => setToDeleteProject(true)}
                className="rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      {/* Members */}
      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-700">Members</h2>
          {isOwnerOrAdmin && (
            <form onSubmit={addMember} className="flex gap-2">
              <input
                type="email"
                required
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="Add member by email"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
              <button
                type="submit"
                disabled={addingMember}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {addingMember ? "..." : "Add"}
              </button>
            </form>
          )}
        </div>

        {memberError && (
          <p className="mt-2 text-xs text-red-600">{memberError}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-sm text-indigo-700 ring-1 ring-inset ring-indigo-200">
            {initials(project.owner.name)} {project.owner.name}
            <span className="text-[10px] font-bold uppercase">owner</span>
          </span>
          {members
            .filter((m) => m.userId !== project.owner.id)
            .map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700 ring-1 ring-inset ring-slate-200"
              >
                {initials(m.user.name)} {m.user.name}
                {isOwnerOrAdmin && (
                  <button
                    onClick={() => removeMember(m.userId)}
                    className="text-slate-400 hover:text-red-600"
                    title="Remove member"
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
        </div>
      </div>

      {/* Kanban board */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Task board</h2>
        <button
          onClick={() => openCreateTask("TODO")}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          + New task
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col);
          return (
            <div key={col} className="rounded-xl bg-slate-200/60 p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <TaskStatusBadge status={col} />
                <span className="text-xs font-semibold text-slate-500">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-3">
                {colTasks.map((t) => (
                  <div
                    key={t.id}
                    className="cursor-pointer rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:ring-indigo-300"
                    onClick={() => openEditTask(t)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-800">{t.title}</h3>
                      <PriorityBadge priority={t.priority} />
                    </div>
                    {t.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {t.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span>
                        {t.dueDate
                          ? "Due " + new Date(t.dueDate).toLocaleDateString()
                          : "No due date"}
                      </span>
                      {t.assignee ? (
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700"
                          title={t.assignee.name}
                        >
                          {initials(t.assignee.name)}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">
                          unassigned
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {colTasks.length === 0 && (
                  <button
                    onClick={() => openCreateTask(col)}
                    className="w-full rounded-lg border border-dashed border-slate-300 py-6 text-xs text-slate-400 hover:border-indigo-300 hover:text-indigo-500"
                  >
                    + Add task
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task modal */}
      <Modal
        open={taskModal.open}
        title={taskModal.editing ? "Edit task" : "New task"}
        onClose={() => setTaskModal({ open: false, editing: null })}
        footer={
          <>
            {taskModal.editing && isOwnerOrAdmin && (
              <button
                onClick={() => {
                  setToDeleteTask(taskModal.editing);
                  setTaskModal({ open: false, editing: null });
                }}
                className="mr-auto rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            )}
            <button
              onClick={() => setTaskModal({ open: false, editing: null })}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              form="task-form"
              type="submit"
              disabled={savingTask}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {savingTask ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <form id="task-form" onSubmit={saveTask} className="space-y-4">
          {taskError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-inset ring-red-200">
              {taskError}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
            <input
              type="text"
              required
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="Design the landing page"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              rows={2}
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select
                value={taskForm.status}
                onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              >
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Priority
              </label>
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Due date</label>
              <input
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Assignee</label>
              <select
                value={taskForm.assigneeId}
                onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Unassigned</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit project modal */}
      <Modal
        open={editOpen}
        title="Edit project"
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <button
              onClick={() => setEditOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              form="edit-project-form"
              type="submit"
              disabled={savingProject}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {savingProject ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <form id="edit-project-form" onSubmit={saveProject} className="space-y-4">
          {editError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-inset ring-red-200">
              {editError}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
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
        open={Boolean(toDeleteTask)}
        title="Delete task"
        message={`Delete "${toDeleteTask?.title}"? This cannot be undone.`}
        onConfirm={deleteTask}
        onCancel={() => setToDeleteTask(null)}
        busy={deleting}
      />

      <ConfirmDialog
        open={toDeleteProject}
        title="Delete project"
        message={`Delete "${project.name}"? All tasks and members will be removed permanently.`}
        onConfirm={deleteProject}
        onCancel={() => setToDeleteProject(false)}
        busy={deleting}
      />
    </div>
  );
}
