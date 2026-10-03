const PROJECT_STYLES = {
  ACTIVE: "bg-emerald-100 text-emerald-700 ring-emerald-600/20",
  ON_HOLD: "bg-amber-100 text-amber-700 ring-amber-600/20",
  ARCHIVED: "bg-slate-200 text-slate-600 ring-slate-500/20",
};

const TASK_STYLES = {
  TODO: "bg-slate-200 text-slate-700 ring-slate-500/20",
  IN_PROGRESS: "bg-sky-100 text-sky-700 ring-sky-600/20",
  DONE: "bg-emerald-100 text-emerald-700 ring-emerald-600/20",
};

const PRIORITY_STYLES = {
  LOW: "bg-slate-100 text-slate-600 ring-slate-500/20",
  MEDIUM: "bg-sky-100 text-sky-700 ring-sky-600/20",
  HIGH: "bg-orange-100 text-orange-700 ring-orange-600/20",
  URGENT: "bg-red-100 text-red-700 ring-red-600/20",
};

const ROLE_STYLES = {
  ADMIN: "bg-indigo-100 text-indigo-700 ring-indigo-600/20",
  MEMBER: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

function Badge({ label, styles }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
        styles || "bg-slate-100 text-slate-600 ring-slate-500/20"
      }`}
    >
      {String(label).replace("_", " ")}
    </span>
  );
}

export const StatusBadge = ({ status }) => (
  <Badge label={status} styles={PROJECT_STYLES[status]} />
);
export const TaskStatusBadge = ({ status }) => (
  <Badge label={status} styles={TASK_STYLES[status]} />
);
export const PriorityBadge = ({ priority }) => (
  <Badge label={priority} styles={PRIORITY_STYLES[priority]} />
);
export const RoleBadge = ({ role }) => (
  <Badge label={role} styles={ROLE_STYLES[role]} />
);
